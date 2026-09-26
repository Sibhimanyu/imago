/* The hosted-AI waitlist function: what it accepts, what it refuses, and
   that it stores only what the form asks for. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { validate, handle, MAX_BODY } = require('../functions/waitlist/waitlist.js');

const GOOD = { email: ' Ada@Example.COM ', use_case: 'Checking\u0000 new APIs', has_key: 'no', price: '99', consent: true };
const post = (obj) => ({ method: 'POST', body: JSON.stringify(obj) });

describe('what a sign-up must look like', () => {
  it('keeps only the four fields, cleaned: email lower-cased, control characters gone', () => {
    const r = validate(Object.assign({ extra: 'x', ip: '1.2.3.4' }, GOOD));
    expect(r).toEqual({ ok: true, row: { email: 'ada@example.com', use_case: 'Checking new APIs', has_key: 'no', price: '99' } });
  });

  it('refuses a bad email, an unknown price or key answer, and no consent', () => {
    expect(validate(Object.assign({}, GOOD, { email: 'not-an-email' })).ok).toBe(false);
    expect(validate(Object.assign({}, GOOD, { price: '5' })).ok).toBe(false);
    expect(validate(Object.assign({}, GOOD, { has_key: 'maybe' })).ok).toBe(false);
    expect(validate(Object.assign({}, GOOD, { consent: 'true' })).ok).toBe(false);
    expect(validate([]).ok).toBe(false);
  });

  it('cuts the use case to the 255 characters the table holds', () => {
    expect(validate(Object.assign({}, GOOD, { use_case: 'x'.repeat(400) })).row.use_case).toHaveLength(255);
  });
});

describe('handling a request', () => {
  it('stores a good sign-up once', async () => {
    const rows = [];
    const out = await handle(post(GOOD), async (row) => { rows.push(row); });
    expect(out).toEqual({ status: 200, body: { ok: true } });
    expect(rows).toEqual([{ email: 'ada@example.com', use_case: 'Checking new APIs', has_key: 'no', price: '99' }]);
  });

  it('answers a filled-in spam trap with a quiet yes and stores nothing', async () => {
    const rows = [];
    const out = await handle(post(Object.assign({ website: 'http://spam.test' }, GOOD)), async (row) => { rows.push(row); });
    expect(out.status).toBe(200);
    expect(rows).toHaveLength(0);
  });

  it('says a repeat email is already on the list instead of failing', async () => {
    const out = await handle(post(GOOD), async () => { throw new Error('Duplicate value for the unique column email'); });
    expect(out).toEqual({ status: 200, body: { ok: true, already: true } });
  });

  it('refuses other methods, oversized bodies, bad JSON and bad fields; hides storage errors', async () => {
    const never = async () => { throw new Error('should not store'); };
    expect((await handle({ method: 'GET', body: '' }, never)).status).toBe(405);
    expect((await handle({ method: 'POST', body: 'x'.repeat(MAX_BODY + 1) }, never)).status).toBe(413);
    expect((await handle({ method: 'POST', body: '{nope' }, never)).status).toBe(400);
    expect((await handle(post(Object.assign({}, GOOD, { price: '1' })), never)).status).toBe(400);
    const broken = await handle(post(GOOD), async () => { throw new Error('connection reset'); });
    expect(broken.status).toBe(500);
    expect(JSON.stringify(broken.body)).not.toContain('connection reset');
  });
});
