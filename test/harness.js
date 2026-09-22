/* Boots app.js inside jsdom and hands back its test seam.
   app.js is one IIFE with no module boundary, so it exposes `window.__imago`
   (see the "Test seam" block at the bottom of app.js). Nothing here reaches
   past that seam. */
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

/**
 * @param {object}   opts
 * @param {Function} opts.fetch     stub for window.fetch
 * @param {boolean}  opts.confirm   what window.confirm returns
 * @param {string}   opts.url       document URL
 * @param {object}   opts.session   seed sessionStorage
 * @param {object}   opts.local     seed localStorage (values are JSON-encoded)
 */
export async function boot(opts = {}) {
  const dom = new JSDOM(HTML, {
    url: opts.url || 'https://imago.test/',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;

  // Wait for the document to finish loading BEFORE evaluating app.js. If we
  // eval while readyState is still 'loading', app.js defers init() to
  // DOMContentLoaded and then runs it a second time when that fires — which
  // re-runs cacheDom and re-wires every event handler behind the test's back.
  if (window.document.readyState !== 'complete') {
    await new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  }

  for (const [k, v] of Object.entries(opts.local || {})) {
    window.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  for (const [k, v] of Object.entries(opts.session || {})) {
    window.sessionStorage.setItem(k, v);
  }

  window.fetch = opts.fetch || (() => Promise.reject(new Error('fetch not stubbed')));
  window.confirm = () => (opts.confirm === undefined ? true : opts.confirm);
  window.scrollTo = () => {};
  window.alert = () => {};

  // jsdom has no layout, so every measurement is 0. Give the timeline layout
  // pass non-zero boxes so it exercises its real branches.
  Object.defineProperties(window.HTMLElement.prototype, {
    offsetWidth: { get() { return 80; }, configurable: true },
    offsetHeight: { get() { return 20; }, configurable: true },
    clientWidth: { get() { return 800; }, configurable: true }
  });

  window.eval(APP);

  const api = window.__imago;
  if (!api) throw new Error('app.js did not expose its test seam');
  if (!api.dom.urlInput) throw new Error('app.js did not initialise (cacheDom never ran)');

  return { dom, window, ...api, api };
}

/** A fetch stub returning one JSON body. */
export function jsonFetch(body, init = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return () => Promise.resolve({
    ok: init.ok !== undefined ? init.ok : true,
    status: init.status || 200,
    headers: { get: (n) => (n.toLowerCase() === 'content-type' ? 'application/json' : null) },
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(JSON.parse(text))
  });
}

/** Lets pending promise jobs drain. */
export const flush = () => new Promise((r) => setTimeout(r, 0));
