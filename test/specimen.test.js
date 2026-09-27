/* The landing demo is a live request drawn by the real renderer: nothing on
   it is hand-written. It is always the weather example, with no tabs. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { boot, jsonFetch, flush, LANDING } from './harness.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const settle = async () => { for (let i = 0; i < 4; i += 1) await flush(); };

describe('the landing demo is live', () => {
  it('ships no hand-written response or interface', () => {
    const landing = html.slice(html.indexOf('id="landingView"'), html.indexOf('id="appView"'));
    expect(landing).not.toMatch(/data:image\/png;base64/);
    expect(landing).not.toMatch(/pikachu|Chennai|Tolkien|"base_stat"/i);
    expect(landing).not.toMatch(/From schema cache<\/span>\s*<\/div>\s*<div class="si-hero"/);
  });

  it('fetches the example it shows and draws it with the renderer', async () => {
    const calls = [];
    const app = await boot({ fetch: (url) => { calls.push(String(url)); return jsonFetch({ name: 'widget', score: 7 })(url); } });
    app.showSpecimen('Library');
    await settle();
    const doc = app.window.document;
    expect(calls.some((u) => u.includes('openlibrary.org'))).toBe(true);
    expect(doc.getElementById('specimenUrl').textContent).toContain('openlibrary.org');
    expect(doc.getElementById('specimenJson').textContent).toContain('"widget"');
    expect(doc.querySelector('#specimenOut .stage-title').textContent).toBe('Widget');
    expect(doc.querySelector('#specimenOut .spec-body')).not.toBeNull();
    expect(doc.getElementById('specimenPane').getAttribute('aria-busy')).toBe('false');
  });

  it('fetches each example once, then reuses it', async () => {
    const calls = [];
    const app = await boot({ fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    app.showSpecimen('Weather'); await settle();
    const before = calls.length;
    app.showSpecimen('Library'); await settle();
    app.showSpecimen('Weather'); await settle();
    expect(calls.filter((u) => u.includes('open-meteo')).length).toBe(1);
    expect(calls.length).toBe(before + 1);
  });

  it('says so plainly when the example cannot be reached', async () => {
    const app = await boot({ fetch: () => Promise.reject(new TypeError('Failed to fetch')) });
    app.showSpecimen('Pokémon');
    await settle();
    const doc = app.window.document;
    expect(doc.getElementById('specimenNote').textContent).toMatch(/Could not reach pokeapi\.co/);
    expect(doc.getElementById('specimenOut').children.length).toBe(0);
  });

  it('always shows the weather example, and offers no others', async () => {
    for (let i = 0; i < 6; i += 1) {
      const calls = [];
      const app = await boot({ url: LANDING, fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
      await settle();
      expect(app.specimen.name).toBe('Weather');
      expect(calls).toEqual([app.specimenDemo('Weather').url]);
      const doc = app.window.document;
      expect(doc.getElementById('specimenUrl').textContent).toContain('open-meteo.com');
      expect(doc.querySelector('.specimen [role="tab"], .specimen button')).toBeNull();
    }
  });

  it('credits Open-Meteo, whose CC BY 4.0 data it shows, with a link beside the demo', async () => {
    const app = await boot({ url: LANDING, fetch: jsonFetch({ a: 1 }) });
    await settle();
    const doc = app.window.document;
    expect(new URL(app.specimenDemo(app.specimen.name).url).hostname).toBe('api.open-meteo.com');
    const credit = doc.querySelector('.specimen a[href="https://open-meteo.com/"]');
    expect(credit).not.toBeNull();
    expect(credit.textContent).toBe('Weather data by Open-Meteo.com');
    expect(credit.getAttribute('rel')).toContain('noopener');
  });

  it('starts fetching as soon as the landing page shows', async () => {
    const calls = [];
    await boot({ url: LANDING, fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    await settle();
    expect(calls.length).toBe(1);
  });

  it('does not fetch anything while the app is showing', async () => {
    const calls = [];
    await boot({ url: 'https://imago.test/app/', fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    await settle();
    expect(calls.length).toBe(0);
  });

  it('Try an example opens the app on the example that is showing', async () => {
    const calls = [];
    const app = await boot({ fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    app.showSpecimen('Library'); await settle();
    app.dom.landingTry.click();
    await settle();
    expect(app.state.view).toBe('app');
    expect(app.state.url).toContain('openlibrary.org');
  });
});

describe('the landing hero follows the brand banner', () => {
  it('sets the promise beside the demo, the URL on the response and the examples below', async () => {
    const app = await boot({ url: LANDING, fetch: jsonFetch({ a: 1 }) });
    const doc = app.window.document;
    const top = doc.querySelector('.landing-main > .landing-top');
    expect([...top.children].map((c) => c.className)).toEqual(['landing-hero', 'specimen']);
    expect(doc.querySelector('.spec-response').contains(doc.getElementById('specimenUrl'))).toBe(true);
    const foot = doc.querySelector('.specimen > .specimen-foot');
    expect(foot.querySelector('.specimen-switch')).toBeNull();
    expect(foot.contains(doc.getElementById('specimenNote'))).toBe(true);
    expect(doc.querySelector('.spec-seam')).toBeNull();
  });
});

describe('the landing bar is the call to action', () => {
  const recorder = (calls) => (url, init) => {
    calls.push({ url: String(url), headers: (init && init.headers) || {} });
    return jsonFetch({ name: 'widget' })(url);
  };
  // A text field keeps the spaces a url field would strip before the code sees them.
  const runBlank = (app) => { app.dom.landingUrl.setAttribute('type', 'text'); app.dom.landingUrl.value = '   '; submit(app); };
  const submit = (app) => app.dom.landingForm.dispatchEvent(new app.window.Event('submit', { cancelable: true }));

  it('opens the app on a pasted URL and runs it', async () => {
    const calls = [];
    const app = await boot({ url: LANDING, fetch: recorder(calls) });
    await settle(); calls.length = 0;   // the demo's own fetch
    app.dom.landingUrl.value = '  https://mine.test/api  ';
    submit(app);
    await settle();
    expect(app.state.view).toBe('app');
    expect(app.dom.urlInput.value).toBe('https://mine.test/api');
    expect(calls.map((c) => c.url)).toContain('https://mine.test/api');
    expect(app.dom.landingUrl.value).toBe('');
  });

  it('only spaces count as empty: no request, no error', async () => {
    const calls = [];
    const app = await boot({ url: LANDING, fetch: recorder(calls) });
    await settle(); calls.length = 0;
    runBlank(app);
    await settle();
    expect(app.state.view).toBe('app');
    expect(calls).toHaveLength(0);
    expect(app.dom.toast.getAttribute('data-kind')).not.toBe('error');
  });

  it('empty, it only opens the app, with the URL box focused', async () => {
    const calls = [];
    const app = await boot({ url: LANDING, fetch: recorder(calls) });
    await settle(); calls.length = 0;
    submit(app);
    await settle();
    expect(app.state.view).toBe('app');
    expect(calls).toHaveLength(0);
    expect(app.window.document.activeElement).toBe(app.dom.urlInput);
  });

  it('a pasted curl command runs at once, headers and all', async () => {
    const calls = [];
    const app = await boot({ url: LANDING, fetch: recorder(calls) });
    await settle(); calls.length = 0;
    const ev = new app.window.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: { getData: () => "curl 'https://a.test/me' -H 'X-Team: blue'" } });
    app.dom.landingUrl.dispatchEvent(ev);
    await settle();
    expect(ev.defaultPrevented).toBe(true);
    expect(app.state.view).toBe('app');
    expect(app.dom.urlInput.value).toBe('https://a.test/me');
    const call = calls.find((c) => c.url === 'https://a.test/me');
    expect(JSON.stringify(call.headers)).toContain('blue');
  });

  it('a pasted plain URL is left in the box to be sent', async () => {
    const app = await boot({ url: LANDING, fetch: jsonFetch({ a: 1 }) });
    const ev = new app.window.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: { getData: () => 'https://a.test/me' } });
    app.dom.landingUrl.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(app.state.view).toBe('landing');
  });
});

describe('the demo holds its size', () => {
  // jsdom has no layout, so the rule is pinned in the stylesheet: a fixed
  // height, not a cap, or every example and every fetch resizes the hero.
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const base = css.match(/\n\.spec-interface \{ position: relative; overflow: hidden;[^}]*\}/);
  it('gives the interface card a fixed height, on desktop and on phones', () => {
    expect(base).not.toBeNull();
    expect(base[0]).toMatch(/[^-]height: \d+px/);
    expect(base[0]).not.toMatch(/max-height/);
    const after = css.slice(base.index + base[0].length);
    expect(after).toMatch(/@media \(max-width: 720px\) \{ \.spec-interface \{ height: \d+px; \} \}/);
    expect(css).toMatch(/\.spec-response \{ grid-column: 1; contain: none; height: \d+px;/);
  });
});
