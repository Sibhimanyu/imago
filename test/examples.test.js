/* The example picker: one dropdown, one DEMOS list, keyless GETs only.
   A dead example (key-gated API, POST endpoint) is worse than no example,
   so these tests pin the list shape and the picker behaviour. */
import { describe, it, expect } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

describe('example APIs (DEMOS)', () => {
  it('every example has a label and a keyless https URL', async () => {
    const app = await boot();
    expect(app.DEMOS.length).toBeGreaterThan(0);
    for (const demo of app.DEMOS) {
      expect(typeof demo.name === 'string' && demo.name.trim(), 'name: ' + JSON.stringify(demo)).toBeTruthy();
      expect(typeof demo.url === 'string' && demo.url.indexOf('https://') === 0, 'url: ' + JSON.stringify(demo)).toBe(true);
    }
  });

  it('example URLs are unique — no two options fetch the same endpoint', async () => {
    const app = await boot();
    const urls = app.DEMOS.map((demo) => demo.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('covers the requested free APIs', async () => {
    // The user-supplied list, minus the entries that cannot work as a
    // one-click browser GET (TMDB/USDA/Unsplash/TinyURL need keys,
    // LibreTranslate now needs a key, Gemini is the model provider).
    const app = await boot();
    const urls = app.DEMOS.map((demo) => demo.url);
    for (const host of ['open-meteo', 'dictionaryapi', 'frankfurter', 'opentdb',
                        'openlibrary', 'pokeapi', 'wikipedia', 'sunrise-sunset', 'kural']) {
      expect(urls.some((url) => url.indexOf(host) !== -1), 'missing: ' + host).toBe(true);
    }
  });
});

describe('example picker', () => {
  it('fills a select with a placeholder plus one option per example', async () => {
    const app = await boot();
    const select = app.window.document.createElement('select');
    app.fillExampleSelect(select);
    expect(select.options.length).toBe(app.DEMOS.length + 1);
    expect(select.options[0].value).toBe('');
    expect(select.value).toBe('');
    for (let i = 0; i < app.DEMOS.length; i += 1) {
      expect(select.options[i + 1].value).toBe(app.DEMOS[i].url);
      expect(select.options[i + 1].textContent).toBe(app.DEMOS[i].name);
    }
  });

  it('tolerates a missing select instead of throwing', async () => {
    const app = await boot();
    expect(() => app.fillExampleSelect(null)).not.toThrow();
    expect(app.pickExample(null)).toBe(false);
  });

  it('ignores the placeholder instead of fetching', async () => {
    let calls = 0;
    const app = await boot({ fetch: () => { calls += 1; return jsonFetch({ ok: 1 })(); } });
    const select = app.window.document.createElement('select');
    app.fillExampleSelect(select);
    expect(app.pickExample(select)).toBe(false);
    await flush();
    expect(calls).toBe(0);
  });

  it('picking an example loads it into the request bar, fetches, and resets the picker', async () => {
    const app = await boot({ fetch: jsonFetch({ hello: 'world' }) });
    const select = app.window.document.createElement('select');
    app.fillExampleSelect(select);
    select.value = app.DEMOS[0].url;
    expect(app.pickExample(select)).toBe(true);
    await flush();
    expect(app.dom.urlInput.value).toBe(app.DEMOS[0].url);
    // Back on the placeholder, so the same example can be picked again.
    expect(select.value).toBe('');
  });

  it('the persistent Examples dropdown is populated on boot', async () => {
    const app = await boot();
    expect(app.dom.exampleSelect.options.length).toBe(app.DEMOS.length + 1);
  });

  it('the empty state offers the examples dropdown', async () => {
    const app = await boot();
    const picker = app.dom.interfaceOut.querySelector('.example-select');
    expect(picker).toBeTruthy();
    expect(picker.options.length).toBe(app.DEMOS.length + 1);
  });
});
