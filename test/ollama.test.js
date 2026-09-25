/* Ollama: the local machine as a provider. Keyless, configurable endpoint,
   and — critically — no Authorization header, which its CORS preflight
   would reject before the request starts.

   Uses Ollama's NATIVE /api/chat, not its OpenAI-compatible endpoint: the
   compat route gives no way to set the context window, so a real generation
   hit the model's 4096-token default and returned JSON truncated mid-string.
   Confirmed live on 2026-09-22: finish_reason "length", total_tokens 4096. */
import { describe, it, expect } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

// Let the test's promise chain drain: the Ollama path is tags -> completion.
const settled = async () => { for (let i = 0; i < 8; i += 1) await flush(); };

const SPEC = { title: 'Designed', components: [{ type: 'jsonBlock', path: '' }] };

describe('ollama endpoint', () => {
  it('defaults to a stock local install and honours an override', async () => {
    const app = await boot();
    // 127.0.0.1, not localhost: localhost resolves to ::1 first on macOS and
    // Ollama listens on IPv4 only, so ::1 refuses the connection.
    expect(app.getProvider('ollama').endpoint()).toBe('http://127.0.0.1:11434/api/chat');
    app.setPrefs(Object.assign(app.getPrefs(), { ollamaEndpoint: 'http://lanbox:11434/' }));
    expect(app.getProvider('ollama').endpoint()).toBe('http://lanbox:11434/api/chat');
  });

  it('the Settings endpoint field persists', async () => {
    const app = await boot();
    expect(app.dom.ollamaEndpoint).toBeTruthy();
    app.dom.ollamaEndpoint.value = 'http://lanbox:11434';
    app.dom.ollamaEndpoint.dispatchEvent(new app.window.Event('input', { bubbles: true }));
    expect(app.getPrefs().ollamaEndpoint).toBe('http://lanbox:11434');
    expect(app.getProvider('ollama').endpoint()).toBe('http://lanbox:11434/api/chat');
  });

  it('the server field only shows for the Ollama provider', async () => {
    const app = await boot();
    expect(app.dom.ollamaServerGroup.hidden).toBe(true);
    app.dom.providerSelect.value = 'ollama';
    app.dom.providerSelect.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    expect(app.dom.ollamaServerGroup.hidden).toBe(false);
    expect(app.dom.ollamaNoteOrigin.textContent).toBe('https://imago.test');
  });

  it('sends no Authorization header, ever', async () => {
    const app = await boot();
    const headers = app.getProvider('ollama').headers('anything');
    expect(headers['Content-Type']).toBe('application/json');
    expect('Authorization' in headers).toBe(false);
  });
});

describe('ollama needs no key', () => {
  it('the pill is ready with zero keys stored', async () => {
    const app = await boot();
    app.setSessionProvider('ollama');
    // Drive the real path: switching provider refreshes the pill.
    app.dom.providerSelect.value = 'ollama';
    app.dom.providerSelect.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    expect(app.dom.keyStatus.textContent).toBe('Ollama ready');
    expect(app.dom.keyStatus.getAttribute('data-state')).toBe('ready');
  });

  it('a keyless Ollama stays put instead of triggering the no-key path', async () => {
    const app = await boot({ fetch: jsonFetch({ hello: 'world' }) });
    app.setSessionProvider('ollama');
    app.state.data = { hello: 'world' };
    app.state.schema = { hello: 'string' };
    app.state.schemaHash = 'h_ollama';
    app.state.url = 'https://x.test/api';
    // New shape, no keys anywhere: not user-triggered, so the generate
    // prompt — not the fallback — is the honest answer.
    app.resolveSpec('https://x.test/api', { hash: 'h_ollama', schema: {} }, false);
    await flush();
    expect(app.getSessionProvider()).toBe('ollama');
    expect(app.state.pendingGenerate).toBe(true);
    expect(app.dom.interfaceOut.querySelector('.keyline')).toBeNull();
  });

  it('never re-homes a keyless user to localhost uninvited', async () => {
    const app = await boot({ fetch: jsonFetch({ hello: 'world' }) });
    app.state.data = { hello: 'world' };
    app.state.schema = { hello: 'string' };
    app.state.schemaHash = 'h_stay';
    app.state.url = 'https://x.test/api';
    app.resolveSpec('https://x.test/api', { hash: 'h_stay', schema: {} }, false);
    await flush();
    // Gemini is active with no key and no keys anywhere: fallback + alert,
    // provider untouched. Bouncing to Ollama here would strand the user on
    // a server they may not run.
    expect(app.getSessionProvider()).toBe('gemini');
    expect(app.state.spec).toBeTruthy();
    expect(app.dom.interfaceOut.textContent).toContain('No Google Gemini key');
  });
});

describe('ollama generation', () => {
  function ollamaFetch(seen, script) {
    return (url, init) => {
      seen.push({ url, body: JSON.parse(init.body), headers: init.headers });
      const step = script[seen.length - 1];
      return Promise.resolve({
        ok: step.ok,
        status: step.status,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve(typeof step.body === 'string' ? step.body : JSON.stringify(step.body))
      });
    };
  }

  async function ollamaApp(script) {
    const seen = [];
    const app = await boot({ fetch: ollamaFetch(seen, script) });
    app.setSessionProvider('ollama');
    app.dom.modelName.value = 'qwen3';
    app.state.data = { a: 1 };
    app.state.schemaHash = 'OLLAHASH';
    return { app, seen };
  }

  it('pins the spec schema and caches the plan, keyless', async () => {
    const { app, seen } = await ollamaApp([{
      ok: true, status: 200,
      body: { message: { content: JSON.stringify(SPEC) }, done_reason: 'stop' }
    }]);
    app.state.url = 'https://a.test/x';   // a reply is used only for the page it was asked for
    await app.callGemini('https://a.test/x', { hash: 'OLLAHASH', schema: { a: 'number' } });
    expect(seen.length).toBe(1);
    expect(seen[0].url).toBe('http://127.0.0.1:11434/api/chat');
    expect('Authorization' in seen[0].headers).toBe(false);
    expect(seen[0].body.model).toBe('qwen3');
    // The schema goes in `format`, and the context has to be big enough for
    // prompt + spec or the JSON comes back cut in half.
    expect(seen[0].body.format).toBeTypeOf('object');
    expect(seen[0].body.stream).toBe(false);
    expect(seen[0].body.options.num_ctx).toBeGreaterThanOrEqual(8192);
    expect(app.getSchemaSpecs().OLLAHASH).toBeTruthy();
    expect(app.state.spec.title).toBe('Designed');
  });

  it('retries in plain JSON when the model ignores the schema pin', async () => {
    const { app, seen } = await ollamaApp([
      { ok: false, status: 400, body: { error: 'unsupported params' } },
      { ok: true, status: 200, body: { message: { content: JSON.stringify(SPEC) }, done_reason: 'stop' } }
    ]);
    app.state.url = 'https://a.test/x';   // a reply is used only for the page it was asked for
    await app.callGemini('https://a.test/x', { hash: 'OLLAHASH', schema: { a: 'number' } });
    expect(seen.length).toBe(2);
    expect(seen[1].body.format).toBe('json');
    expect(seen[1].body.options.num_ctx).toBeGreaterThanOrEqual(8192);
    expect(app.getSchemaSpecs().OLLAHASH).toBeTruthy();
  });
});

describe('a truncated reply says so', () => {
  // Live on 2026-09-22 a real generation came back with finish_reason
  // "length" at exactly 4096 total tokens and JSON cut mid-string. The old
  // message was "returned an unusable spec", which blames the model rather
  // than the context window and leaves the user with nothing to change.
  function script(seen, steps) {
    return (url, init) => {
      seen.push({ url, body: JSON.parse(init.body) });
      const step = steps[seen.length - 1];
      return Promise.resolve({
        ok: true, status: 200, headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify(step))
      });
    };
  }

  it('names truncation instead of calling the spec unusable', async () => {
    const seen = [];
    const app = await boot({
      fetch: script(seen, [{ message: { content: '{"title":"Cut off","comp' }, done_reason: 'length' }])
    });
    app.setSessionProvider('ollama');
    app.dom.modelName.value = 'llama3.1';
    app.state.data = { a: 1 };
    app.state.schemaHash = 'TRUNC';
    app.state.url = 'https://a.test/x';   // a reply is used only for the page it was asked for
    await app.callGemini('https://a.test/x', { hash: 'TRUNC', schema: { a: 'number' } });
    const shown = app.dom.interfaceOut.textContent;
    expect(shown).toContain('cut off');
    expect(shown).toContain('before the plan was complete');
  });

  it('does not burn a second identical call on a truncated reply', async () => {
    const seen = [];
    const app = await boot({
      fetch: script(seen, [
        { message: { content: '{"title":"Cut off","comp' }, done_reason: 'length' },
        { message: { content: '{"title":"Second"}' }, done_reason: 'stop' }
      ])
    });
    app.setSessionProvider('ollama');
    app.dom.modelName.value = 'llama3.1';
    app.state.data = { a: 1 };
    app.state.schemaHash = 'TRUNC2';
    app.state.url = 'https://a.test/x';   // a reply is used only for the page it was asked for
    await app.callGemini('https://a.test/x', { hash: 'TRUNC2', schema: { a: 'number' } });
    expect(seen.length, 'a retry would be cut off at the same place').toBe(1);
  });
});

describe("Ollama's error shape is not the others'", () => {
  // Gemini and Groq nest the reason under error.message; Ollama's native API
  // returns `error` as a bare string. Reading only the nested shape turned
  // "model 'qwen3' not found" into a blank "HTTP 404", which is the one
  // message that would have explained the original bug.
  it('surfaces a bare-string error verbatim', async () => {
    const app = await boot({
      fetch: () => Promise.resolve({
        ok: false, status: 404, headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify({ error: "model 'qwen3' not found" }))
      })
    });
    app.setSessionProvider('ollama');
    app.dom.modelName.value = 'qwen3';
    app.state.data = { a: 1 };
    app.state.schemaHash = 'ERRHASH';
    app.state.url = 'https://a.test/x';   // a reply is used only for the page it was asked for
    await app.callGemini('https://a.test/x', { hash: 'ERRHASH', schema: { a: 'number' } });
    const shown = app.dom.interfaceOut.textContent;
    expect(shown).toContain("model 'qwen3' not found");
    expect(shown, 'a bare HTTP code tells the user nothing').not.toContain('HTTP 404');
  });
});

describe('the two spellings of loopback', () => {
  // `localhost` resolves to ::1 before 127.0.0.1 on a default macOS install,
  // and Ollama binds IPv4 only (lsof: `TCP 127.0.0.1:11434 (LISTEN)`), so ::1
  // refuses the connection. curl hides this by falling back to IPv4; browsers
  // do not reliably do the same, which reads as "did not answer" against a
  // server that is plainly running. Observed 2026-09-22.
  it('defaults to the address Ollama actually listens on', async () => {
    const app = await boot();
    expect(app.getProvider('ollama').endpoint()).toContain('127.0.0.1');
  });

  it('retries the other spelling when the connection is refused', async () => {
    const tried = [];
    const app = await boot({
      fetch: (url) => {
        tried.push(String(url));
        if (String(url).includes('localhost')) return Promise.reject(new TypeError('Failed to fetch'));
        return Promise.resolve({
          ok: true, status: 200, headers: { get: () => 'application/json' },
          text: () => Promise.resolve('{"models":[{"name":"llama3.1"}]}'),
          json: () => Promise.resolve({ models: [{ name: 'llama3.1' }] })
        });
      }
    });
    app.setPrefs(Object.assign(app.getPrefs(), { ollamaEndpoint: 'http://localhost:11434' }));
    const list = await app.fetchOllamaModels();
    expect(list).toEqual(['llama3.1']);
    expect(tried.some((u) => u.includes('localhost'))).toBe(true);
    expect(tried.some((u) => u.includes('127.0.0.1'))).toBe(true);
  });

  it('remembers the spelling that worked', async () => {
    const app = await boot({
      fetch: (url) => String(url).includes('localhost')
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve({
            ok: true, status: 200, headers: { get: () => 'application/json' },
            text: () => Promise.resolve('{"models":[]}'),
            json: () => Promise.resolve({ models: [] })
          })
    });
    app.setPrefs(Object.assign(app.getPrefs(), { ollamaEndpoint: 'http://localhost:11434' }));
    await app.fetchOllamaModels();
    expect(app.getPrefs().ollamaEndpoint).toBe('http://127.0.0.1:11434');
  });

  it('does not retry when the server answered with an error', async () => {
    let calls = 0;
    const app = await boot({
      fetch: () => { calls += 1; return Promise.resolve({
        ok: false, status: 500, headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"error":"boom"}'), json: () => Promise.resolve({ error: 'boom' })
      }); }
    });
    await app.fetchOllamaModels().catch(() => {});
    expect(calls, 'a reachable server that errored is not a wrong-spelling problem').toBe(1);
  });
});

describe('a reasoning model answering with thought is not a failure', () => {
  // qwen3.6 answers a one-word ping with message.thinking and an empty
  // message.content. The shared thinking check only understood the OpenAI
  // shape (choices[0].message.reasoning), so the native reply looked like
  // silence: the test failed and — worse — reported "Unreachable" against a
  // server that had just answered 200 twice. Observed 2026-09-22.
  const ok = (body) => () => Promise.resolve({
    ok: true, status: 200, headers: { get: () => 'application/json' },
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body)          // fetchOllamaModels uses .json()
  });

  it('passes when the model thinks but writes no content', async () => {
    const app = await boot({
      fetch: (url) => String(url).includes('/api/tags')
        ? ok({ models: [{ name: 'llama3.1' }] })()
        : ok({ message: { role: 'assistant', content: '', thinking: 'Here is a thinking process...' }, done_reason: 'length' })()
    });
    app.setSessionProvider('ollama');
    app.dom.modelName.value = 'llama3.1';
    app.dom.ollamaTestBtn.click();
    await settled();
    expect(app.dom.ollamaTestStatus.textContent).toContain('OK');
    expect(app.dom.ollamaTestStatus.getAttribute('data-state')).toBe('ready');
  });

  it('still fails when the model returns neither content nor thought', async () => {
    const app = await boot({
      fetch: (url) => String(url).includes('/api/tags')
        ? ok({ models: [{ name: 'llama3.1' }] })()
        : ok({ message: { role: 'assistant', content: '' }, done_reason: 'stop' })()
    });
    app.setSessionProvider('ollama');
    app.dom.modelName.value = 'llama3.1';
    app.dom.ollamaTestBtn.click();
    await settled();
    expect(app.dom.ollamaTestStatus.getAttribute('data-state')).toBe('missing');
  });

  it('never calls a server that answered "Unreachable"', async () => {
    // The word sent the user restarting a healthy process for half an hour.
    const app = await boot({
      fetch: (url) => String(url).includes('/api/tags')
        ? ok({ models: [{ name: 'llama3.1' }] })()
        : ok({ message: { role: 'assistant', content: '' }, done_reason: 'stop' })()
    });
    app.setSessionProvider('ollama');
    app.dom.modelName.value = 'llama3.1';
    app.dom.ollamaTestBtn.click();
    await settled();
    expect(app.dom.ollamaTestStatus.textContent).not.toContain('Unreachable');
  });

  it('still says Unreachable when the connection really fails', async () => {
    const app = await boot({ fetch: () => Promise.reject(new TypeError('Failed to fetch')) });
    app.dom.ollamaTestBtn.click();
    await settled();
    expect(app.dom.ollamaTestStatus.textContent).toContain('Unreachable');
  });
});
