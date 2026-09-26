/* A Watch tick is calm. It used to clear the pane and build every component
   again, every 10-60s: images reloaded (a sprite drew blurred until it was
   marked pixel art again), focus fell to the body, and a Full HTML page's
   iframe was created again and showed blank white until it loaded. Now a
   tick that keeps the layout swaps only the values that moved, and those get
   a short amber highlight. A request the reader starts still rebuilds. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { boot, flush } from './harness.js';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const URL_A = 'https://a.test/weather';

// A fetch whose body the test can change between ticks.
function liveFetch(initial) {
  const box = { body: initial };
  box.fetch = () => {
    const text = JSON.stringify(box.body);
    return Promise.resolve({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      text: () => Promise.resolve(text)
    });
  };
  return box;
}

async function settle() { for (let i = 0; i < 4; i += 1) await flush(); }

function part(app, label) {
  const labels = app.dom.interfaceOut.querySelectorAll('.fact-label, .comp-label');
  for (const node of labels) if (node.textContent === label) return node.closest('[data-ck]');
  return null;
}

// The basic layout (no key), opened by the reader, then watched.
async function watched(body) {
  const live = liveFetch(body);
  const app = await boot({ fetch: live.fetch });
  app.setUrlInput(URL_A);
  app.performRequest(false);
  await settle();
  return { app, live };
}

const BODY = { temperature: 20.5, city: 'Chennai', humidity: 81, wind: 6.8 };

describe('a Watch tick with the same layout', () => {
  it('keeps the page on screen and swaps only the value that changed', async () => {
    // Broken, the whole pane was cleared and rebuilt: every node below was new.
    const { app, live } = await watched(BODY);
    const out = app.dom.interfaceOut;
    const head = out.querySelector('.stage-head');
    const body = out.querySelector('.spec-body');
    const city = part(app, 'City');
    const temp = part(app, 'Temperature');
    expect(city).toBeTruthy();
    expect(temp).toBeTruthy();

    const removed = [];
    new app.window.MutationObserver((records) => {
      records.forEach((r) => r.removedNodes.forEach((n) => removed.push(n)));
    }).observe(out, { childList: true });

    live.body = { ...BODY, temperature: 21.1 };
    app.performRequest(true);
    await settle();

    expect(app.state.changedCount).toBe(1);
    expect(removed).toEqual([]);                        // the pane never emptied
    expect(out.querySelector('.stage-head')).toBe(head);
    expect(out.querySelector('.spec-body')).toBe(body);
    expect(part(app, 'City')).toBe(city);               // unchanged: the same node
    const fresh = part(app, 'Temperature');
    expect(fresh).not.toBe(temp);                       // changed: swapped in
    expect(fresh.textContent).toContain('21.1');
    expect(fresh.classList.contains('is-changed')).toBe(true);
    expect(fresh.classList.contains('is-fresh')).toBe(true);
    expect(city.classList.contains('is-fresh')).toBe(false);
    expect(app.dom.cacheBadge.parentNode).toBe(head.querySelector('.stage-head-top'));
    expect(out.querySelectorAll('.keyline').length).toBe(1);
  });

  it('keeps nothing stale: last tick\'s CHANGED flag goes when the value holds', async () => {
    const { app, live } = await watched(BODY);
    live.body = { ...BODY, temperature: 21.1 };
    app.performRequest(true);
    await settle();
    const flagged = part(app, 'Temperature');
    expect(flagged.classList.contains('is-changed')).toBe(true);
    app.performRequest(true);                           // same body again
    await settle();
    const settled = part(app, 'Temperature');
    expect(settled).not.toBe(flagged);
    expect(settled.classList.contains('is-changed')).toBe(false);
    expect(settled.classList.contains('is-fresh')).toBe(false);
  });

  it('a moved link in the page head swaps the page in one step, focus kept', async () => {
    // The follow button's target is in the head, so the layout differs and
    // the page is swapped whole. Broken, focus fell to the body.
    const { app, live } = await watched({ ...BODY, next: 'https://a.test/1' });
    const button = app.dom.interfaceOut.querySelector('.stage-head .action-btn');
    expect(button.title).toBe('https://a.test/1');
    button.focus();
    live.body = { ...BODY, next: 'https://a.test/2' };
    app.performRequest(true);
    await settle();
    const now = app.window.document.activeElement;
    expect(now).not.toBe(button);
    expect(now.classList.contains('action-btn')).toBe(true);
    expect(now.title).toBe('https://a.test/2');
  });

  it('compares a component with how it was built, not what it became on screen', async () => {
    // An image marks itself is-pixel once loaded. Compared as it stood, the
    // sprite's card never matched and was rebuilt, and redrawn, every tick.
    const { app } = await watched({ ...BODY, sprite: 'https://img.test/pika.png' });
    const card = app.dom.interfaceOut.querySelector('.comp-image').closest('[data-ck]');
    const img = card.querySelector('img');
    Object.defineProperty(img, 'naturalWidth', { value: 96 });
    img.dispatchEvent(new app.window.Event('load'));
    expect(img.classList.contains('is-pixel')).toBe(true);
    app.performRequest(true);
    await settle();
    expect(app.dom.interfaceOut.querySelector('.comp-image img')).toBe(img);
    expect(app.dom.interfaceOut.querySelector('.comp-image').closest('[data-ck]')).toBe(card);
  });
});

describe('every way a tick draws a page is calm', () => {
  it('a plan from the schema cache', async () => {
    const live = liveFetch(BODY);
    const probe = await boot();
    const hash = probe.fingerprint(BODY).hash;
    const spec = { title: 'Weather', layout: 'dashboard', actions: [],
      components: [{ type: 'metric', path: 'temperature', label: 'Temp' }, { type: 'text', path: 'city', label: 'Town' }] };
    const app = await boot({ fetch: live.fetch, local: { 'imago.schemaSpecs': { [hash]: { hash, spec, sourceUrl: URL_A } } } });
    app.setUrlInput(URL_A);
    app.performRequest(false);
    await settle();
    expect(app.dom.cacheBadge.textContent).toBe('From schema cache');
    const town = part(app, 'Town');
    live.body = { ...BODY, temperature: 22 };
    app.performRequest(true);
    await settle();
    expect(part(app, 'Town')).toBe(town);
    expect(part(app, 'Temp').classList.contains('is-fresh')).toBe(true);
  });

  it('the basic layout standing in for Full HTML without a key', async () => {
    const { app, live } = await watched(BODY);
    app.state.builder = 'html';
    const city = part(app, 'City');
    live.body = { ...BODY, temperature: 22 };
    app.performRequest(true);
    await settle();
    expect(part(app, 'City')).toBe(city);
    expect(part(app, 'Temperature').classList.contains('is-fresh')).toBe(true);
  });
});

describe('a calm render, driven directly', () => {
  async function page() {
    const app = await boot();
    app.state.url = URL_A;
    app.state.data = { temp: 20, city: 'X', pic: 'https://img.test/a.png', home: 'https://a.test/h1' };
    app.state.diff = null;
    const spec = app.normalizeSpec({
      title: 'Weather', layout: 'dashboard', actions: [],
      components: [
        { type: 'metric', path: 'temp', label: 'Temp' },
        { type: 'text', path: 'city', label: 'City' },
        { type: 'image', path: 'pic', label: 'Pic' },
        { type: 'link', path: 'home', label: 'Home' }
      ]
    });
    app.applySpec(spec, 'cache');
    return { app, spec };
  }

  it('puts focus back on the twin of a focused element whose value changed', async () => {
    // Broken, focus fell to the body on every tick.
    const { app, spec } = await page();
    const city = part(app, 'City');
    const link = part(app, 'Home').querySelector('a');
    link.focus();
    app.state.data = { ...app.state.data, home: 'https://a.test/h2' };
    app.state.diff = { home: { type: 'changed', before: 'https://a.test/h1', after: 'https://a.test/h2' } };
    app.applySpec(spec, 'cache', { calm: true });
    const now = app.window.document.activeElement;
    expect(now).not.toBe(link);
    expect(now.tagName).toBe('A');
    expect(now.getAttribute('href')).toBe('https://a.test/h2');
    expect(part(app, 'City')).toBe(city);
  });

  it('a replaced component keeps its image, so it does not reload', async () => {
    const { app, spec } = await page();
    const card = part(app, 'Pic');
    const img = card.querySelector('img');
    app.state.diff = { pic: { type: 'changed', before: 'x', after: 'https://img.test/a.png' } };
    app.applySpec(spec, 'cache', { calm: true });
    const again = part(app, 'Pic');
    expect(again).not.toBe(card);
    expect(again.querySelector('img')).toBe(img);
  });

  it('a replaced component with a new image address gets the new image', async () => {
    const { app, spec } = await page();
    const img = part(app, 'Pic').querySelector('img');
    app.state.data = { ...app.state.data, pic: 'https://img.test/b.png' };
    app.state.diff = { pic: { type: 'changed', before: 'https://img.test/a.png', after: 'https://img.test/b.png' } };
    app.applySpec(spec, 'cache', { calm: true });
    const now = part(app, 'Pic').querySelector('img');
    expect(now).not.toBe(img);
    expect(now.getAttribute('src')).toBe('https://img.test/b.png');
  });

  it('a new layout swaps the page in one step and keeps focus on its twin', async () => {
    const { app, spec } = await page();
    const old = part(app, 'City');
    // The same page with a section heading added: the skeleton differs.
    const wider = app.normalizeSpec({
      title: 'Weather', layout: 'dashboard', actions: [],
      components: [
        { type: 'section', label: 'Now' },
        { type: 'metric', path: 'temp', label: 'Temp' },
        { type: 'text', path: 'city', label: 'City' },
        { type: 'image', path: 'pic', label: 'Pic' },
        { type: 'link', path: 'home', label: 'Home' }
      ]
    });
    app.state.diff = { temp: { type: 'changed', before: 19, after: 20 } };
    const link = part(app, 'Home').querySelector('a');
    link.focus();
    app.applySpec(wider, 'cache', { calm: true });
    expect(part(app, 'City')).not.toBe(old);
    expect(app.dom.interfaceOut.querySelector('.spec-section-head').textContent).toBe('Now');
    const twin = part(app, 'Home').querySelector('a');
    expect(twin).not.toBe(link);
    expect(app.window.document.activeElement).toBe(twin);
    expect(part(app, 'Temp').classList.contains('is-fresh')).toBe(true);
    expect(app.dom.cacheBadge.parentNode).toBe(app.dom.interfaceOut.querySelector('.stage-head-top'));
  });

  it('a new layout puts the reader back where they had scrolled', async () => {
    const { app } = await page();
    const calls = [];
    Object.defineProperty(app.window, 'scrollY', { configurable: true, get: () => 640 });
    app.window.scrollTo = (x, y) => calls.push([x, y]);
    const wider = app.normalizeSpec({
      title: 'Weather', layout: 'dashboard', actions: [],
      components: [{ type: 'section', label: 'Now' }, { type: 'text', path: 'city', label: 'City' }]
    });
    app.applySpec(wider, 'cache', { calm: true });
    expect(calls).toEqual([[0, 640]]);
  });

  it('focus on something the new layout no longer has is simply let go', async () => {
    const { app } = await page();
    part(app, 'Home').querySelector('a').focus();
    const narrower = app.normalizeSpec({
      title: 'Weather', layout: 'dashboard', actions: [],
      components: [{ type: 'text', path: 'city', label: 'City' }]
    });
    app.applySpec(narrower, 'cache', { calm: true });
    expect(part(app, 'Home')).toBe(null);
    expect(app.window.document.activeElement).toBe(app.window.document.body);
  });

  it('a render the reader asked for still rebuilds, without the highlight', async () => {
    const { app, spec } = await page();
    const city = part(app, 'City');
    app.state.diff = { temp: { type: 'changed', before: 19, after: 20 } };
    app.applySpec(spec, 'cache');
    expect(part(app, 'City')).not.toBe(city);
    expect(part(app, 'Temp').classList.contains('is-changed')).toBe(true);
    expect(part(app, 'Temp').classList.contains('is-fresh')).toBe(false);
  });

  it('while editing, a tick rebuilds as before', async () => {
    const { app, spec } = await page();
    app.setEditing(true);
    const city = part(app, 'City');
    app.applySpec(spec, 'cache', { calm: true });
    expect(part(app, 'City')).not.toBe(city);
  });
});

describe('a Watch tick on a Full HTML page', () => {
  const DOC = '<!doctype html><html><head><style>body{margin:0}</style></head><body><h1>Weather</h1></body></html>';

  async function htmlPage() {
    const app = await boot();
    app.state.builder = 'html';
    app.state.url = URL_A;
    app.state.dataUrl = URL_A;
    app.state.data = { a: 1 };
    app.state.dataSig = app.dataSignature({ a: 1 });
    app.applyHtml(DOC, 'generated');
    return app;
  }

  it('keeps the iframe when the tick would write the same frame', async () => {
    // Broken, the frame was created again and drew blank white until it loaded.
    const app = await htmlPage();
    const frame = app.dom.interfaceOut.querySelector('iframe.html-frame');
    app.applyHtml(DOC, 'cache', { url: URL_A, sig: app.state.dataSig }, { calm: true });
    expect(app.dom.interfaceOut.querySelector('iframe.html-frame')).toBe(frame);
    expect(app.dom.cacheBadge.textContent).toBe('From schema cache');
  });

  it('keeps it when the data moved too, flags it stale and drops an old alert', async () => {
    const app = await htmlPage();
    const frame = app.dom.interfaceOut.querySelector('iframe.html-frame');
    const alert = app.window.document.createElement('div');   // a failed tick's notice
    alert.className = 'alert';
    app.dom.interfaceOut.insertBefore(alert, app.dom.interfaceOut.firstChild);
    const sig = app.state.dataSig;
    app.state.data = { a: 2 };
    app.state.dataSig = app.dataSignature({ a: 2 });
    app.applyHtml(DOC, 'cache', { url: URL_A, sig: sig }, { calm: true });
    expect(app.dom.interfaceOut.querySelector('iframe.html-frame')).toBe(frame);
    expect(app.dom.interfaceOut.querySelector('.alert')).toBe(null);
    expect(app.dom.interfaceOut.querySelector('.html-stale').hidden).toBe(false);
  });

  it('writes a new frame for a different page, or when the reader asked', async () => {
    const app = await htmlPage();
    const frame = app.dom.interfaceOut.querySelector('iframe.html-frame');
    app.applyHtml(DOC.replace('Weather', 'Rain'), 'cache', null, { calm: true });
    const other = app.dom.interfaceOut.querySelector('iframe.html-frame');
    expect(other).not.toBe(frame);
    expect(other.srcdoc).toContain('Rain');
    app.applyHtml(DOC.replace('Weather', 'Rain'), 'cache');
    expect(app.dom.interfaceOut.querySelector('iframe.html-frame')).not.toBe(other);
  });

  it('through the request flow: a tick with the same body keeps the frame', async () => {
    const live = liveFetch({ hello: 'world' });
    const probe = await boot();
    const hash = probe.fingerprint({ hello: 'world' }).hash;
    const app = await boot({
      fetch: live.fetch,
      local: { 'imago.schemaSpecs': { [hash]: { html: DOC, htmlUrl: URL_A } } }
    });
    app.state.builder = 'html';
    app.navigateTo(URL_A);
    await settle();
    const frame = app.dom.interfaceOut.querySelector('iframe.html-frame');
    expect(frame).toBeTruthy();
    app.performRequest(true);
    await settle();
    expect(app.dom.interfaceOut.querySelector('iframe.html-frame')).toBe(frame);
    app.performRequest(false);                          // the reader's Go
    await settle();
    expect(app.dom.interfaceOut.querySelector('iframe.html-frame')).not.toBe(frame);
  });
});

describe('the change highlight', () => {
  it('is brief, amber, eased out, and off under reduced motion', () => {
    const wash = css.match(/\.fact\.is-fresh, \.comp\.is-fresh \{ animation: fresh-wash \.(\d+)s ease-out; \}/);
    const rise = css.match(/\.is-fresh \.val-main \{ animation: fresh-rise \.(\d+)s ease-out; \}/);
    expect(wash).toBeTruthy();
    expect(rise).toBeTruthy();
    for (const m of [wash, rise]) {
      const ms = Number('0.' + m[1]) * 1000;
      expect(ms).toBeGreaterThanOrEqual(120);
      expect(ms).toBeLessThanOrEqual(220);
    }
    expect(css).toMatch(/@keyframes fresh-wash \{ from \{ background-color: var\(--yellow-bg\); \} \}/);
    // The reduced-motion rule must come after the rules it cancels, at the
    // same specificity, or it loses.
    const off = css.lastIndexOf('.fact.is-fresh, .comp.is-fresh, .is-fresh .val-main { animation: none; }');
    expect(off).toBeGreaterThan(css.indexOf('.fact.is-fresh, .comp.is-fresh { animation'));
    expect(css.slice(css.lastIndexOf('@media', off), off)).toContain('prefers-reduced-motion: reduce');
  });
});
