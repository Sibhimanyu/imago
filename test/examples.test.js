/* The examples: one DEMOS list, keyless GETs only. A dead example (key-gated
   API, POST endpoint) is worse than no example, so these tests pin the list
   shape and where it is offered. */
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

// The examples used to be offered three times at once on an empty page: the
// rail list, a dropdown in the empty state, and a hidden toolbar dropdown.
// Now the rail owns the list; phones, where the rail is a sheet, get four
// buttons in the empty state.
describe('the empty page', () => {
  it('offers four example buttons, one per kind of page, and no dropdown', async () => {
    const app = await boot();
    app.showInterfaceEmpty();
    expect(app.dom.interfaceOut.querySelector('select')).toBeNull();
    expect(app.window.document.getElementById('exampleSelect')).toBeNull();
    const chips = [...app.dom.interfaceOut.querySelectorAll('.empty-example')].map((b) => b.textContent);
    expect(chips).toEqual(app.EMPTY_EXAMPLES);
  });

  it('every offered example exists in DEMOS', async () => {
    const app = await boot();
    const names = app.DEMOS.map((d) => d.name);
    for (const name of app.EMPTY_EXAMPLES) expect(names).toContain(name);
  });

  it('an example button fetches that example with no headers', async () => {
    const seen = [];
    const app = await boot({ fetch: (url, init) => { seen.push({ url: String(url), headers: (init && init.headers) || {} }); return jsonFetch({ a: 1 })(url); } });
    app.dom.headersInput.value = 'Authorization: Bearer SECRET';
    app.showInterfaceEmpty();
    const weather = [...app.dom.interfaceOut.querySelectorAll('.empty-example')].find((b) => b.textContent === 'Weather');
    weather.click();
    await flush();
    const demo = app.DEMOS.find((d) => d.name === 'Weather');
    expect(app.dom.urlInput.value).toBe(demo.url);
    expect(JSON.stringify(seen[seen.length - 1].headers)).not.toContain('SECRET');
  });
});

// The empty Playground showed two identical "Try an example" pickers, one in
// the toolbar and one in the empty state. The toolbar copy now hides while the
// empty state is up, and comes back once a response renders.
describe('one example picker at a time', () => {
  it('marks the pane empty on first run and clears the mark once an interface renders', async () => {
    const app = await boot({ fetch: jsonFetch({ hello: 'world' }) });
    app.showInterfaceEmpty();
    expect(app.dom.panePlayground.classList.contains('is-empty')).toBe(true);

    app.state.data = { hello: 'world' };
    app.state.schema = { hello: 'string' };
    app.state.schemaHash = 'h_test';
    app.state.url = 'https://x.test/api';
    app.resolveSpec('https://x.test/api', { hash: 'h_test', schema: {} }, false);
    await flush();
    expect(app.state.spec).toBeTruthy();
    expect(app.dom.panePlayground.classList.contains('is-empty')).toBe(false);
  });
});

// Save always looked live; pressing it with an empty URL box answered with an
// error toast. It now reads as unavailable until there is a URL to save.
describe('Save button', () => {
  it('reads as unavailable with an empty URL and live once a URL is set or typed', async () => {
    const app = await boot();
    app.setUrlInput('');
    expect(app.dom.saveBtn.getAttribute('aria-disabled')).toBe('true');
    app.setUrlInput('https://pokeapi.co/api/v2/pokemon/pikachu');
    expect(app.dom.saveBtn.getAttribute('aria-disabled')).toBe('false');
    app.dom.urlInput.value = '   ';
    app.dom.urlInput.dispatchEvent(new app.window.Event('input', { bubbles: true }));
    expect(app.dom.saveBtn.getAttribute('aria-disabled')).toBe('true');
  });
});
