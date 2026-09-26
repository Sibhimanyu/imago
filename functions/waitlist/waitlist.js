'use strict';
/* The hosted-AI waitlist: what a sign-up must look like, and how one is
   handled. Kept apart from the Catalyst wiring in index.js so it can be
   tested without the SDK. Nothing here stores more than the form asks for. */

const MAX_BODY = 4096;
const PRICES = ['49', '99', '199', 'free'];
const HAS_KEY = ['yes', 'no', 'unsure'];
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// → { ok: true, row } | { ok: false, error } | { ok: true, trap: true }
function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Send the form as JSON.' };
  // A field no person fills in: a bot that fills every box gets a quiet yes.
  if (clean(input.website, 200)) return { ok: true, trap: true };
  const email = clean(input.email, 254).toLowerCase();
  if (!RE_EMAIL.test(email)) return { ok: false, error: 'That email address does not look right.' };
  const price = clean(input.price, 10);
  if (PRICES.indexOf(price) === -1) return { ok: false, error: 'Pick one of the prices.' };
  const hasKey = clean(input.has_key, 10);
  if (hasKey && HAS_KEY.indexOf(hasKey) === -1) return { ok: false, error: 'Pick yes, no or not sure.' };
  if (input.consent !== true) return { ok: false, error: 'Tick the box so we can email you if it opens.' };
  return { ok: true, row: { email: email, use_case: clean(input.use_case, 255), has_key: hasKey, price: price } };
}

function isDuplicate(err) {
  return /duplicate|unique/i.test(String(err && (err.message || err)));
}

// handle({ method, body }, insert) → { status, body }. `insert(row)` stores a row.
async function handle(request, insert) {
  if (request.method !== 'POST') return { status: 405, body: { ok: false, error: 'Use POST.' } };
  if (Buffer.byteLength(request.body || '') > MAX_BODY) return { status: 413, body: { ok: false, error: 'That is too long.' } };
  let input;
  try { input = JSON.parse(request.body || ''); } catch (e) { return { status: 400, body: { ok: false, error: 'Send the form as JSON.' } }; }
  const checked = validate(input);
  if (!checked.ok) return { status: 400, body: { ok: false, error: checked.error } };
  if (checked.trap) return { status: 200, body: { ok: true } };
  try {
    await insert(checked.row);
  } catch (err) {
    if (isDuplicate(err)) return { status: 200, body: { ok: true, already: true } };
    return { status: 500, body: { ok: false, error: 'Could not save that just now. Try again later.' } };
  }
  return { status: 200, body: { ok: true } };
}

module.exports = { validate, handle, isDuplicate, MAX_BODY, PRICES, HAS_KEY };
