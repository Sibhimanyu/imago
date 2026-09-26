/* Boots the app inside jsdom and hands back its test seam.
   The browser loads js/main.js as native ES modules (no build step). jsdom
   cannot run module scripts, so the suite bundles the same modules into one
   classic script, once per test file, and evaluates it in each fresh jsdom.
   The app exposes `window.__imago` (the "Test seam" block in js/main.js);
   nothing here reaches past that seam. */
import { JSDOM } from 'jsdom';
import { buildSync } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// The bundle is written to disk with a source map and evaluated under its
// own file URL, so V8 coverage can follow it back to the modules in js/.
// Test files run in parallel workers, each building the same bundle: write
// it under a private name and rename it into place, so no worker ever reads
// a half-written file.
const BUNDLE = path.join(ROOT, '.cache', 'app.js');
const BUILT = buildSync({
  entryPoints: [path.join(ROOT, 'js/main.js')],
  bundle: true, format: 'iife', sourcemap: 'inline', outfile: BUNDLE, write: false, logLevel: 'silent'
}).outputFiles[0].text;
fs.mkdirSync(path.dirname(BUNDLE), { recursive: true });
const PRIVATE = BUNDLE + '.' + process.pid + '.' + Math.random().toString(36).slice(2);
fs.writeFileSync(PRIVATE, BUILT);
fs.renameSync(PRIVATE, BUNDLE);
export const APP = BUILT + '\n//# sourceURL=' + pathToFileURL(BUNDLE).href;

/**
 * @param {object}   opts
 * @param {Function} opts.fetch     stub for window.fetch
 * @param {boolean}  opts.confirm   what window.confirm returns
 * @param {string}   opts.url       document URL (default: the app, #app; pass LANDING for the landing page)
 * @param {object}   opts.session   seed sessionStorage
 * @param {object}   opts.local     seed localStorage (values are JSON-encoded)
 * @param {string}   opts.app       a patched copy of APP to evaluate instead (e.g. a constant changed)
 */
// The bare URL is the landing page, which fetches its live demo; most tests
// are about the app, so that is where boot() lands unless told otherwise.
export const APP_URL = 'https://imago.test/#app';
export const LANDING = 'https://imago.test/';

export async function boot(opts = {}) {
  const dom = new JSDOM(HTML, {
    url: opts.url || APP_URL,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;

  // Wait for the document to finish loading BEFORE evaluating the app. If we
  // eval while readyState is still 'loading', main.js defers init() to
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

  // A patched copy is not the bundle on disk: every offset after the patch
  // has moved, so coverage recorded under the bundle's URL would be mapped
  // onto the wrong lines and wreck the merged report. Run it anonymous.
  window.eval(opts.app ? opts.app.replace(/\n\/\/# sourceURL=[^\n]*$/, '') : APP);

  const api = window.__imago;
  if (!api) throw new Error('js/main.js did not expose its test seam');
  if (!api.dom.urlInput) throw new Error('js/main.js did not initialise (cacheDom never ran)');

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
