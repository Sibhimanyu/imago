/* Full-HTML builder: the model writes the whole page, Imago shows it
   sandboxed. These tests pin the trust boundary (opaque frame, no scripts),
   the validator, and the snapshot semantics of a generated page. */
import { describe, it, expect } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

const DOC = '<!DOCTYPE html><html><head><style>body{font-family:sans-serif}</style>' +
  '</head><body><h1>Pokédex</h1><p>Pikachu</p></body></html>';

describe('normalizeHtmlDoc', () => {
  it('passes a complete document through untouched', async () => {
    const app = await boot();
    expect(app.normalizeHtmlDoc(DOC)).toBe(DOC);
  });

  it('strips code fences the model wraps around the document', async () => {
    const app = await boot();
    expect(app.normalizeHtmlDoc('```html\n' + DOC + '\n```')).toBe(DOC);
  });

  it('accepts a markup fragment, not only a full document', async () => {
    const app = await boot();
    expect(app.normalizeHtmlDoc('<div><h1>Hi</h1></div>')).toBe('<div><h1>Hi</h1></div>');
  });

  it('rejects prose, emptiness and oversized docs', async () => {
    const app = await boot();
    // Prose is not a page — without this, a chatty model renders as text soup.
    expect(app.normalizeHtmlDoc('Here is your HTML: <oops')).toBe(null);
    expect(app.normalizeHtmlDoc('')).toBe(null);
    expect(app.normalizeHtmlDoc(null)).toBe(null);
    expect(app.normalizeHtmlDoc('<div>' + 'x'.repeat(300 * 1024) + '</div>')).toBe(null);
  });
});

describe('normalizeHtmlDoc with a chatty preamble', () => {
  // gpt-oss on Groq often opens with a line of prose. The page after it was
  // thrown away as "not a usable HTML document".
  it('keeps the fenced page after a line of prose', async () => {
    const app = await boot();
    expect(app.normalizeHtmlDoc('Here is the page:\n\n```html\n' + DOC + '\n```\nEnjoy!')).toBe(DOC);
  });

  it('starts at the document when prose precedes an unfenced page', async () => {
    const app = await boot();
    expect(app.normalizeHtmlDoc('Sure! Below is the page.\n' + DOC)).toBe(DOC);
  });
});

describe('generateHtml', () => {
  const groq = (...replies) => {
    const bodies = [];
    let i = 0;
    const fetch = (url, init) => {
      bodies.push(JSON.parse(init.body));
      const body = replies[Math.min(i++, replies.length - 1)];
      return Promise.resolve({
        ok: true, status: 200, headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(body)),
        json: () => Promise.resolve(body)
      });
    };
    return { fetch, bodies };
  };
  const says = (content, finish = 'stop') => ({ choices: [{ message: { content }, finish_reason: finish }] });
  const opts = { url: 'https://x.test/api', schema: {}, sample: '{}', provider: 'groq', model: 'openai/gpt-oss-20b', apiKey: 'gsk_x' };

  it('asks gpt-oss for low reasoning effort so the reply has room for the page', async () => {
    const stub = groq(says(DOC));
    const app = await boot({ fetch: stub.fetch });
    await app.generateHtml(opts);
    expect(stub.bodies[0].reasoning_effort).toBe('low');
  });

  it('sends no reasoning effort to a model that would reject it', async () => {
    const stub = groq(says(DOC));
    const app = await boot({ fetch: stub.fetch });
    await app.generateHtml({ ...opts, model: 'llama-4-scout' });
    expect('reasoning_effort' in stub.bodies[0]).toBe(false);
  });

  it('asks once more when the first reply is not a page', async () => {
    const stub = groq(says(''), says(DOC));
    const app = await boot({ fetch: stub.fetch });
    await expect(app.generateHtml(opts)).resolves.toBe(DOC);
    expect(stub.bodies.length).toBe(2);
  });

  it('says the reply was empty when both tries come back empty', async () => {
    const stub = groq(says(''));
    const app = await boot({ fetch: stub.fetch });
    await expect(app.generateHtml(opts)).rejects.toThrow('empty reply');
    expect(stub.bodies.length).toBe(2);
  });

  it('says the model ran out of room when the reply was cut off', async () => {
    const stub = groq(says('', 'length'));
    const app = await boot({ fetch: stub.fetch });
    await expect(app.generateHtml(opts)).rejects.toThrow('ran out of room');
  });

  it('reads Gemini running out of room too', async () => {
    const stub = groq({ candidates: [{ content: { parts: [{ text: 'thinking' }] }, finishReason: 'MAX_TOKENS' }] });
    const app = await boot({ fetch: stub.fetch });
    await expect(app.generateHtml({ ...opts, provider: 'gemini' })).rejects.toThrow('ran out of room');
  });

  it('keeps the generic reason for prose that is not a page', async () => {
    const stub = groq(says('I cannot help with that.'));
    const app = await boot({ fetch: stub.fetch });
    await expect(app.generateHtml(opts)).rejects.toThrow('did not return a usable HTML document');
  });

  it('does not retry a failure a second call cannot fix', async () => {
    let calls = 0;
    const fetch = () => {
      calls += 1;
      return Promise.resolve({ ok: false, status: 429, headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"error":{"message":"slow down"}}') });
    };
    const app = await boot({ fetch });
    await expect(app.generateHtml(opts)).rejects.toThrow('slow down');
    expect(calls).toBe(1);
  });
});

describe('buildHtmlPrompt', () => {
  it('forbids scripts and external assets, mandates safe links', async () => {
    const app = await boot();
    const prompt = app.buildHtmlPrompt({ url: 'https://x.test/api', schema: { a: 'string' }, sample: '{"a":"b"}' });
    expect(prompt).toContain('Do not include <script>');
    expect(prompt).toContain('target="_blank" rel="noopener"');
    expect(prompt).toContain('https://x.test/api');
    expect(prompt).toContain('no {{placeholders}}');
  });

  // The old brief (system font, 900px column, "enjoy reading") produced
  // pages that looked like rendered Markdown. The prompt now asks for an
  // app screen, and must not bring the narrow-document constraint back.
  it('asks for a designed interface, not a document', async () => {
    const app = await boot();
    const prompt = app.buildHtmlPrompt({ url: 'https://x.test/api', schema: {}, sample: '{}' });
    expect(prompt).toContain('designed app screen, not a document');
    expect(prompt).toContain('Be creative with layout');
    expect(prompt).toContain('read like a Markdown file, redesign it');
    expect(prompt).not.toMatch(/max-width around 900px/);
  });

  // A dark navy page with neon accents stood out of the light app like a
  // pasted-in screenshot. Colour is pinned to Imago's palette plus one accent.
  it('limits colour to the app palette and one accent', async () => {
    const app = await boot();
    const prompt = app.buildHtmlPrompt({ url: 'https://x.test/api', schema: {}, sample: '{}' });
    expect(prompt).toContain('Colours come ONLY from these CSS custom properties');
    expect(prompt).toContain('--bg: #ffffff');
    expect(prompt).toContain('No dark themes of your own');
    expect(prompt).toContain('--accent is ONE mid-tone colour');
    expect(prompt).toContain('Never add facts, judgements or advice the data does not contain');
  });
});

describe('applyHtml', () => {
  async function applied() {
    const app = await boot();
    app.state.builder = 'html';
    app.state.url = 'https://x.test/api';
    app.state.data = { a: 1 };
    app.state.dataUrl = 'https://x.test/api';
    app.state.dataSig = app.dataSignature({ a: 1 });
    app.applyHtml(DOC, 'generated');
    return app;
  }

  it('renders the doc in a scriptless opaque-origin frame', async () => {
    const app = await applied();
    const frame = app.dom.interfaceOut.querySelector('iframe.html-frame');
    expect(frame).toBeTruthy();
    // The doc goes in as written, behind a policy of its own.
    expect(frame.srcdoc).toContain('<h1>Pokédex</h1><p>Pikachu</p>');
    expect(frame.srcdoc).toContain('body{font-family:sans-serif}');
    expect(frame.srcdoc).toContain('Content-Security-Policy');
    // The whole trust boundary is this token list: popups for _blank links,
    // and nothing that could reach the app (no scripts, no same-origin).
    const tokens = (frame.getAttribute('sandbox') || '').split(/\s+/);
    expect(tokens).toContain('allow-popups');
    expect(tokens).not.toContain('allow-scripts');
    expect(tokens).not.toContain('allow-same-origin');
    expect(tokens).not.toContain('allow-top-navigation');
  });

  it('marks the render source and snapshots what it was built from', async () => {
    const app = await applied();
    expect(app.dom.cacheBadge.textContent).toBe('Generated');
    expect(app.state.htmlSig).toBe(app.dataSignature({ a: 1 }));
    expect(app.state.htmlUrl).toBe('https://x.test/api');
    expect(app.dom.interfaceOut.querySelector('.html-stale').hidden).toBe(true);
  });

  it('flags the page stale the moment fresh data lands', async () => {
    const app = await applied();
    app.state.data = { a: 2 };   // a refresh landed after generation
    app.state.dataSig = app.dataSignature({ a: 2 });
    app.updateMeta();
    expect(app.dom.interfaceOut.querySelector('.html-stale').hidden).toBe(false);
  });
});

describe('html request flow', () => {
  it('reuses a remembered page from the schema cache', async () => {
    const probe = await boot({ fetch: jsonFetch({ hello: 'world' }) });
    const hash = probe.fingerprint({ hello: 'world' }).hash;
    const app = await boot({
      fetch: jsonFetch({ hello: 'world' }),
      local: { 'imago.schemaSpecs': { [hash]: { html: DOC, htmlUrl: 'https://x.test/api' } } }
    });
    app.state.builder = 'html';
    app.navigateTo('https://x.test/api');
    await flush();
    await flush();
    const frame = app.dom.interfaceOut.querySelector('iframe.html-frame');
    expect(frame).toBeTruthy();
    expect(frame.srcdoc).toContain('<p>Pikachu</p>');
    expect(app.dom.cacheBadge.textContent).toBe('From schema cache');
  });

  it('falls back to the heuristic plan without a key — never a blank frame', async () => {
    const app = await boot({ fetch: jsonFetch({ hello: 'world' }) });
    app.state.builder = 'html';
    app.navigateTo('https://x.test/api');
    await flush();
    await flush();
    expect(app.dom.interfaceOut.querySelector('iframe.html-frame')).toBe(null);
    expect(app.state.spec).toBeTruthy();
    expect(app.dom.interfaceOut.querySelector('.keyline')).not.toBeNull();
  });

  it('falls back when the model returns prose instead of a document', async () => {
    // The stub answers the model call with JSON that has no candidates —
    // extract() yields '', so validation fails exactly as with a chatty model.
    const app = await boot({
      fetch: jsonFetch({ choices: [] }),
      local: { 'imago.key.gemini': 'AIza-test-key' }
    });
    app.state.builder = 'html';
    app.state.data = { a: 1 };
    app.state.schema = { a: 'number' };
    app.state.url = 'https://x.test/api';
    app.resolveSpec('https://x.test/api', { hash: 'h_nope', schema: { a: 'number' } }, true);
    await flush();
    await flush();
    expect(app.dom.interfaceOut.querySelector('iframe.html-frame')).toBe(null);
    expect(app.state.spec).toBeTruthy();
  });
});

describe('builder setting', () => {
  it('defaults to the structured plan, switch off and no warning', async () => {
    const app = await boot();
    expect(app.state.builder).toBe('spec');
    expect(app.dom.builderToggle.getAttribute('aria-checked')).toBe('false');
    expect(app.dom.builderWarn.hidden).toBe(true);
  });
  it('persists across reloads', async () => {
    const app = await boot();
    app.state.builder = 'html';
    app.savePrefs();
    expect(app.getPrefs().builder).toBe('html');
    const again = await boot({ local: { 'imago.preferences': { builder: 'html' } } });
    expect(again.state.builder).toBe('html');
    expect(again.dom.builderToggle.getAttribute('aria-checked')).toBe('true');
    expect(again.dom.builderWarn.hidden).toBe(false);
  });

  // The switch lives on the page, not in Settings, and says what it costs
  // for as long as it is on.
  it('the page switch turns Full HTML on with a quota warning, and off again', async () => {
    const app = await boot();
    expect(app.window.document.getElementById('builderSelect')).toBeNull();
    app.dom.builderToggle.click();
    expect(app.state.builder).toBe('html');
    expect(app.dom.builderToggle.getAttribute('aria-checked')).toBe('true');
    expect(app.dom.builderWarn.hidden).toBe(false);
    expect(app.dom.builderWarn.textContent).toContain('more of your API quota');
    expect(app.dom.builderToggle.getAttribute('aria-describedby')).toBe('builderWarn');
    app.dom.builderToggle.click();
    expect(app.state.builder).toBe('spec');
    expect(app.dom.builderToggle.getAttribute('aria-checked')).toBe('false');
    expect(app.dom.builderWarn.hidden).toBe(true);
  });

  it('switching with data on screen re-resolves instead of going blank', async () => {
    const app = await boot({ fetch: jsonFetch({ hello: 'world' }) });
    app.state.data = { hello: 'world' };
    app.state.schema = { hello: 'string' };
    app.state.schemaHash = 'h_toggle';
    app.state.url = 'https://x.test/api';
    app.setBuilder('html');
    await flush();
    // No key anywhere: the honest fallback plus the plain message, not a void.
    expect(app.state.spec).toBeTruthy();
    expect(app.dom.interfaceOut.textContent).toContain('No Google Gemini key');
  });
});
