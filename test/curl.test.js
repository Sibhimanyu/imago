/* Real APIs on the first try: paste a curl command, and when the browser
   cannot read an API, say why in words the reader can act on.
   API docs and dev tools ("Copy as cURL") hand out curl, not URLs; and
   "Failed to fetch" used to be reported the same way whether you were
   offline, the server was down, or it refused a web page (CORS). */
import { describe, it, expect } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

// What Chrome's "Copy as cURL (bash)" produces, trimmed.
const CHROME_CURL = `curl 'https://api.example.test/v1/me?x=1' \\
  -H 'accept: application/json' \\
  -H 'authorization: Bearer tok_123' \\
  -H 'cookie: sid=abc' \\
  -H 'user-agent: Mozilla/5.0' \\
  -H $'x-note: it\\'s fine' \\
  --compressed`;

describe('shellWords', () => {
  it('honours single, double and $\'…\' quoting, escapes and line continuations', async () => {
    const app = await boot();
    expect(app.shellWords(`curl 'a b' "c \\"d\\"" $'e\\tf' g\\ h \\\n i`)).toEqual(['curl', 'a b', 'c "d"', 'e\tf', 'g h', 'i']);
    expect(app.shellWords('curl ^\n "x"')).toEqual(['curl', 'x']);   // Windows cmd continuation
  });
});

describe('parseCurl', () => {
  it('reads a dev-tools curl: URL, headers, and leaves out what the browser owns', async () => {
    const app = await boot();
    const r = app.parseCurl(CHROME_CURL);
    expect(r.error).toBe('');
    expect(r.url).toBe('https://api.example.test/v1/me?x=1');
    expect(r.headers).toEqual({ accept: 'application/json', authorization: 'Bearer tok_123', 'x-note': "it's fine" });
    expect(r.dropped).toEqual(['cookie', 'user-agent']);
  });

  it('turns -u into Basic auth and reads --url= and glued -H', async () => {
    const app = await boot();
    const r = app.parseCurl("curl -u 'ann:secret' --url=https://a.test/x -H'X-Key: k1' -s -o out.json");
    expect(r.url).toBe('https://a.test/x');
    expect(r.headers).toEqual({ Authorization: 'Basic ' + app.window.btoa('ann:secret'), 'X-Key': 'k1' });
  });

  it('-G moves -d data into the query string, which keeps it a GET', async () => {
    const app = await boot();
    const r = app.parseCurl("curl -G https://a.test/search -d q=hobbit -d limit=5");
    expect(r.error).toBe('');
    expect(r.url).toBe('https://a.test/search?q=hobbit&limit=5');
  });

  it('refuses anything that is not a GET, and says why', async () => {
    const app = await boot();
    expect(app.parseCurl('curl -XPOST https://a.test/x').error).toMatch(/sends a POST.*only runs GET/);
    expect(app.parseCurl('curl -X DELETE https://a.test/x').error).toMatch(/sends a DELETE/);
    expect(app.parseCurl("curl https://a.test/x --data-raw '{\"a\":1}'").error).toMatch(/request body/);
    expect(app.parseCurl('curl -I https://a.test/x').error).toMatch(/sends a HEAD/);
    expect(app.parseCurl('curl -X GET https://a.test/x').error).toBe('');
  });

  it('names the problem when there is no URL or it is not curl at all', async () => {
    const app = await boot();
    expect(app.parseCurl('curl -H "a: b"').error).toMatch(/No URL/);
    expect(app.parseCurl('wget https://a.test').error).toMatch(/not a curl command/);
    expect(app.looksLikeCurl('  curl https://a.test')).toBe(true);
    expect(app.looksLikeCurl('https://curl.se')).toBe(false);
  });
});

describe('importing into the command bar', () => {
  const calls = [];
  const recording = () => (url, init) => { calls.push({ url: String(url), headers: (init && init.headers) || {} }); return jsonFetch({ ok: 1 })(url); };

  it('fills the URL and headers, shows the header count, and names what it left out', async () => {
    const app = await boot();
    expect(app.dom.headersChip.hidden).toBe(true);
    expect(app.importCurl(CHROME_CURL)).toBe(true);
    expect(app.dom.urlInput.value).toBe('https://api.example.test/v1/me?x=1');
    expect(app.dom.headersInput.value).toContain('authorization: Bearer tok_123');
    expect(app.dom.headersChip.hidden).toBe(false);
    expect(app.dom.headersChip.textContent).toBe('3 headers');
    expect(app.dom.toast.textContent).toContain('Imported from curl: 3 headers.');
    expect(app.dom.toast.textContent).toContain('Left out cookie, user-agent');
    app.dom.headersChip.click();
    expect(app.state.tab).toBe('headers');
  });

  it('a refused command changes nothing', async () => {
    const app = await boot();
    app.setUrlInput('https://keep.test/');
    expect(app.importCurl('curl -X POST https://a.test/x')).toBe(false);
    expect(app.dom.urlInput.value).toBe('https://keep.test/');
    expect(app.dom.toast.getAttribute('data-kind')).toBe('error');
  });

  it('pasting a curl command runs it with its headers', async () => {
    calls.length = 0;
    const app = await boot({ fetch: recording() });
    const ev = new app.window.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: { getData: () => "curl 'https://a.test/me' -H 'Authorization: Bearer t1'" } });
    app.dom.urlInput.dispatchEvent(ev);
    await flush();
    expect(ev.defaultPrevented).toBe(true);
    expect(calls[0].url).toBe('https://a.test/me');
    expect(calls[0].headers).toEqual({ Authorization: 'Bearer t1' });
  });

  it('pasting a plain URL is left to the browser', async () => {
    const app = await boot();
    const ev = new app.window.Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'clipboardData', { value: { getData: () => 'https://a.test/me' } });
    app.dom.urlInput.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });

  it('a curl command typed and submitted is imported, not fetched as a URL', async () => {
    calls.length = 0;
    const app = await boot({ fetch: recording() });
    app.dom.urlInput.value = 'curl https://a.test/typed -H "X-Key: k"';
    app.dom.reqForm.dispatchEvent(new app.window.Event('submit', { cancelable: true }));
    await flush();
    expect(calls[0].url).toBe('https://a.test/typed');
    expect(calls[0].headers).toEqual({ 'X-Key': 'k' });
  });

  it('a refused command typed and submitted does not fetch', async () => {
    calls.length = 0;
    const app = await boot({ fetch: recording() });
    app.dom.urlInput.value = 'curl -d a=1 https://a.test/typed';
    app.dom.reqForm.dispatchEvent(new app.window.Event('submit', { cancelable: true }));
    await flush();
    expect(calls).toHaveLength(0);
  });
});

describe('headers the browser would refuse are caught before sending', () => {
  it('names the header and does not fetch', async () => {
    let calls = 0;
    const app = await boot({ fetch: () => { calls += 1; return jsonFetch({})(); } });
    expect(app.headerProblem({ 'Bad Name': 'x' })).toMatch(/"Bad Name" is not a valid header name/);
    expect(app.headerProblem({ Cookie: 'a=1' })).toMatch(/do not let a page send Cookie/);
    expect(app.headerProblem({ 'X-Ok': 'fine', Authorization: 'Bearer t' })).toBe('');
    app.setUrlInput('https://a.test/x');
    app.dom.headersInput.value = 'Bad Name: x';
    app.dom.reqForm.dispatchEvent(new app.window.Event('submit', { cancelable: true }));
    await flush();
    expect(calls).toBe(0);
    expect(app.dom.toast.textContent).toMatch(/not a valid header name/);
  });
});

describe('explaining a failed fetch', () => {
  const network = () => new TypeError('Failed to fetch');

  it('the server answered a no-cors probe: it is CORS, and the headers may be why', async () => {
    const probes = [];
    const app = await boot({ fetch: (url, init) => { probes.push(init); return Promise.resolve({ ok: false, status: 0, type: 'opaque' }); } });
    const plain = await app.explainFailure(network(), 'https://api.a.test/x', {});
    expect(plain.title).toBe('This API does not allow browser apps');
    expect(plain.detail).toContain('api.a.test answered');
    expect(plain.detail).toContain('CORS proxy');
    const withAuth = await app.explainFailure(network(), 'https://api.a.test/x', { Authorization: 'Bearer t' });
    expect(withAuth.detail).toContain('sending Authorization makes the browser ask the API for permission');
    // The probe carries no headers and no cookies.
    expect(probes[0]).toMatchObject({ mode: 'no-cors', credentials: 'omit' });
    expect(probes[0].headers).toBeUndefined();
  });

  it('the probe fails too: the server is unreachable', async () => {
    const app = await boot({ fetch: () => Promise.reject(network()) });
    const why = await app.explainFailure(network(), 'https://down.test/x', {});
    expect(why.title).toBe('Could not reach down.test');
  });

  it('offline is said as offline, without probing', async () => {
    let probed = false;
    const app = await boot({ fetch: () => { probed = true; return Promise.resolve({}); } });
    Object.defineProperty(app.window.navigator, 'onLine', { value: false, configurable: true });
    const why = await app.explainFailure(network(), 'https://a.test/x', {});
    expect(why.title).toBe('You are offline');
    expect(probed).toBe(false);
  });

  it('an error that already has a title passes through untouched', async () => {
    const app = await boot();
    const err = Object.assign(new Error('HTTP 404'), { title: 'HTTP 404', detail: 'Not found' });
    expect(await app.explainFailure(err, 'https://a.test/x', {})).toBe(err);
  });

  it('end to end: a CORS-blocked endpoint shows the CORS explanation on the page', async () => {
    let n = 0;
    const app = await boot({ fetch: () => (n++ === 0 ? Promise.reject(network()) : Promise.resolve({ type: 'opaque' })) });
    app.setUrlInput('https://blocked.test/api');
    app.dom.reqForm.dispatchEvent(new app.window.Event('submit', { cancelable: true }));
    await flush(); await flush(); await flush();
    expect(app.dom.interfaceOut.textContent).toContain('This API does not allow browser apps');
    expect(app.dom.interfaceOut.textContent).toContain('blocked.test answered');
  });
});

describe('the headers chip follows the headers box', () => {
  it('updates as headers are typed, and hides when New request clears them', async () => {
    const app = await boot();
    app.dom.headersInput.value = 'Authorization: Bearer t\nX-Key: k';
    app.dom.headersInput.dispatchEvent(new app.window.Event('input'));
    expect(app.dom.headersChip.hidden).toBe(false);
    expect(app.dom.headersChip.textContent).toBe('2 headers');
    app.dom.headersInput.value = 'X-Key: k';
    app.dom.headersInput.dispatchEvent(new app.window.Event('input'));
    expect(app.dom.headersChip.textContent).toBe('1 header');
    app.dom.newRequestBtn.click();
    expect(app.dom.headersChip.hidden).toBe(true);
  });

  it('shows on boot when the session already has headers', async () => {
    const app = await boot({ session: { 'imago.lastHeaders': 'X-Key: k' } });
    expect(app.dom.headersChip.hidden).toBe(false);
  });
});
