/* Share links: a link that reopens a page for someone else. It carries the
   endpoint and the layout and nothing else: never headers, keys or the
   response body. The layout arrives out of a URL, so it is untrusted input
   and goes through the same normaliser a model's plan does. */
import { describe, it, expect } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

const PLAN = {
  title: 'Pikachu', subtitle: 'Electric', layout: 'profile',
  components: [{ type: 'metric', path: 'height', label: 'Height' }],
  actions: []
};

function encode(app, payload) {
  return '#share=' + app.window.btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function withPage(source) {
  const app = await boot();
  app.state.url = 'https://pokeapi.co/api/v2/pokemon/pikachu';
  app.state.data = { height: 4, note: 'BODY_MARKER' };
  app.applySpec(app.normalizeSpec(PLAN), source);
  return app;
}

describe('building a link', () => {
  it('carries the endpoint and the layout, never headers, keys or the body', async () => {
    const app = await withPage('generated');
    app.dom.headersInput.value = 'Authorization: Bearer SECRET';
    app.state.headers = { Authorization: 'Bearer SECRET' };
    app.window.localStorage.setItem('imago.key.gemini', 'AIzaSECRETKEY');
    const { link, withLayout } = app.buildShareLink();
    expect(withLayout).toBe(true);
    const read = app.readShareLink(link.slice(link.indexOf('#')));
    expect(read.url).toBe('https://pokeapi.co/api/v2/pokemon/pikachu');
    expect(read.spec.title).toBe('Pikachu');
    const decoded = decodeURIComponent(escape(app.window.atob(link.split('#share=')[1].replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((link.split('#share=')[1].length + 3) % 4))));
    expect(decoded).not.toContain('SECRET');
    expect(decoded).not.toContain('BODY_MARKER');    // no response body
    expect(Object.keys(JSON.parse(decoded)).sort()).toEqual(['s', 'u', 'v']);
  });

  it('leaves the layout out when it is the basic one, or too big to fit a link', async () => {
    const basic = await withPage('fallback');
    expect(basic.buildShareLink().withLayout).toBe(false);
    const big = await withPage('generated');
    big.state.spec = Object.assign({}, big.state.spec, { subtitle: 'x'.repeat(9000) });
    const built = big.buildShareLink();
    expect(built.withLayout).toBe(false);
    expect(built.link.length).toBeLessThan(8000);
  });
});

describe('reading a link', () => {
  it('rejects a damaged link, and a URL that is not http(s)', async () => {
    const app = await boot();
    expect(app.readShareLink('')).toBeNull();
    expect(app.readShareLink('#other')).toBeNull();
    expect(app.readShareLink('#share=%%%').error).toMatch(/damaged/);
    expect(app.readShareLink(encode(app, { v: 1, u: 'javascript:alert(1)' })).error).toMatch(/damaged/);
    expect(app.readShareLink(encode(app, { v: 1, u: 'https://a.test/x', s: 'nope' })).spec).toBeNull();
  });
});

describe('opening a link', () => {
  it('goes straight to the page: fetches with no headers, shows the shared layout, clears the address bar', async () => {
    const seen = [];
    const probe = await boot();
    const hash = encode(probe, { v: 1, u: 'https://pokeapi.co/api/v2/pokemon/pikachu', s: PLAN });
    const app = await boot({
      url: 'https://imago.test/' + hash,
      session: { 'imago.lastHeaders': 'Authorization: Bearer MINE' },
      fetch: (url, init) => { seen.push({ url: String(url), headers: (init && init.headers) || {} }); return jsonFetch({ height: 4 })(url); }
    });
    await flush(); await flush();
    expect(app.state.view).toBe('app');
    expect(seen[0].url).toBe('https://pokeapi.co/api/v2/pokemon/pikachu');
    expect(seen[0].headers).toEqual({});                       // the recipient's own headers stay home
    expect(app.window.location.hash).toBe('#app');                 // the link itself is gone; a reload opens the app
    expect(app.dom.interfaceOut.querySelector('.stage-title').textContent).toBe('Pikachu');
    expect(app.dom.cacheBadge.textContent).toBe('Shared layout');
    // Used for this view only, never written to the recipient's cache.
    expect(Object.keys(app.getSchemaSpecs())).toHaveLength(0);
  });

  it('a shared layout is untrusted: it is normalised, and its text stays text', async () => {
    const probe = await boot();
    const evil = { title: '<img src=x onerror=alert(1)>', layout: 'dashboard',
      components: [{ type: 'script', path: 'a' }, { type: 'metric', path: 'height' }] };
    const app = await boot({ url: 'https://imago.test/' + encode(probe, { v: 1, u: 'https://a.test/x', s: evil }), fetch: jsonFetch({ height: 4 }) });
    await flush(); await flush();
    expect(app.dom.interfaceOut.querySelector('img[src="x"]')).toBeNull();
    expect(app.dom.interfaceOut.querySelector('.stage-title').textContent).toBe('<img src=x onerror=alert(1)>');
    // The normaliser ran: the unknown component type is gone from the plan.
    expect(app.state.spec.components.map((c) => c.type)).not.toContain('script');
  });

  it('a shared layout the normaliser rejects falls back to the basic layout', async () => {
    const probe = await boot();
    const junk = { title: 'Junk', components: 'not a list' };
    const app = await boot({ url: 'https://imago.test/' + encode(probe, { v: 1, u: 'https://a.test/x', s: junk }), fetch: jsonFetch({ height: 4 }) });
    await flush(); await flush();
    expect(app.state.specSource).not.toBe('shared');
    expect(app.state.spec.title).not.toBe('Junk');
  });

  it('a damaged link says so and opens the app without fetching', async () => {
    let calls = 0;
    const app = await boot({ url: 'https://imago.test/#share=%%%', fetch: () => { calls += 1; return jsonFetch({})(); } });
    await flush();
    expect(app.state.view).toBe('app');
    expect(calls).toBe(0);
    expect(app.dom.toast.textContent).toMatch(/damaged/);
  });
});

describe('the Share button', () => {
  function clipboard(app, fail) {
    const copied = [];
    Object.defineProperty(app.window.navigator, 'clipboard', { configurable: true, value: {
      writeText: (t) => { copied.push(t); return fail ? Promise.reject(new Error('denied')) : Promise.resolve(); }
    } });
    return copied;
  }

  it('is unavailable until there is a page, then copies the link', async () => {
    const app = await withPage('generated');
    app.state.data = null; app.updateMeta();
    expect(app.dom.shareBtn.disabled).toBe(true);
    app.state.data = { height: 4 }; app.updateMeta();
    expect(app.dom.shareBtn.disabled).toBe(false);
    const copied = clipboard(app);
    app.dom.shareBtn.click();
    await flush();
    expect(copied[0]).toContain('#share=');
    expect(app.dom.toast.textContent).toBe('Link copied.');
  });

  it('says when the endpoint needs headers the link leaves out', async () => {
    const app = await withPage('generated');
    app.state.headers = { Authorization: 'Bearer t' };
    clipboard(app);
    app.dom.shareBtn.click();
    await flush();
    expect(app.dom.toast.textContent).toContain("leaves out this endpoint's headers");
  });

  it('says so when the clipboard refuses', async () => {
    const app = await withPage('generated');
    clipboard(app, true);
    app.dom.shareBtn.click();
    await flush();
    expect(app.dom.toast.textContent).toMatch(/Could not copy/);
  });
});

describe('toolbar buttons on phones', () => {
  // Below 720px the labels hide so the toolbar stays one row; the buttons
  // must keep a name for assistive tech.
  it('Save, Share and Inspect have accessible names independent of their visible label', async () => {
    const app = await boot();
    for (const id of ['saveBtn', 'shareBtn', 'inspectBtn']) {
      const btn = app.dom[id];
      expect(btn.getAttribute('aria-label')).toBe(btn.querySelector('.btn-label').textContent);
    }
  });
});

describe('an open link', () => {
  it('is the readable kind a docs page writes by hand: the endpoint, encoded or not', async () => {
    const app = await boot();
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=13.08&longitude=80.27&current=temperature_2m';
    expect(app.readShareLink('#open=' + url)).toEqual({ url, spec: null });
    expect(app.readShareLink('#open=' + encodeURIComponent(url))).toEqual({ url, spec: null });
    // A stray % that is not an escape is read as written, not refused.
    expect(app.readShareLink('#open=https://a.test/x?q=100%').url).toBe('https://a.test/x?q=100%');
  });

  it('is held to the share link rules: public https only', async () => {
    const app = await boot();
    expect(app.readShareLink('#open=http://api.test/x').error).toMatch(/not a public https endpoint/);
    expect(app.readShareLink('#open=https://localhost/x').error).toMatch(/not a public https endpoint/);
    expect(app.readShareLink('#open=javascript:alert(1)').error).toMatch(/damaged/);
    expect(app.readShareLink('#open=').error).toMatch(/damaged/);
  });

  it('opens straight into the app and fetches the endpoint once, Watch off', async () => {
    const seen = [];
    const app = await boot({
      url: 'https://imago.test/#open=https://pokeapi.co/api/v2/pokemon/pikachu',
      fetch: (url) => { seen.push(String(url)); return jsonFetch({ name: 'pikachu', height: 4 })(url); }
    });
    await flush(); await flush();
    expect(app.state.view).toBe('app');
    expect(seen).toEqual(['https://pokeapi.co/api/v2/pokemon/pikachu']);
    expect(app.window.location.hash).toBe('#app');
    expect(app.state.refreshIntervalMs).toBe(0);
  });
});

describe('a link pasted into an open tab', () => {
  it('opens it: only the hash changes, so there is no reload to read it', async () => {
    const seen = [];
    const app = await boot({
      url: 'https://imago.test/#app',
      fetch: (url) => { seen.push(String(url)); return jsonFetch({ name: 'pikachu', height: 4 })(url); }
    });
    await flush();
    app.window.history.pushState(null, '', '#open=https://pokeapi.co/api/v2/pokemon/pikachu');
    app.window.dispatchEvent(new app.window.PopStateEvent('popstate', { state: null }));
    await flush(); await flush();
    expect(seen).toContain('https://pokeapi.co/api/v2/pokemon/pikachu');
    expect(app.state.view).toBe('app');
    expect(app.window.location.hash).toBe('#app');
  });
});
