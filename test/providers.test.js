/* Hosted providers only. Ollama was removed in 0.16.0.0: a model-designed
   page now always means a hosted provider and its key, and with no key the
   page is the rule-based basic layout. A reader who had Ollama saved must
   land on a working provider, not on a dead id or a local model name. */
import { describe, it, expect } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

const PREFS = 'imago.preferences';
const GEMINI_DEFAULT = 'gemini-2.5-flash-lite';
const GROQ_DEFAULT = 'openai/gpt-oss-20b';

describe('the providers on offer', () => {
  it('Settings offers Gemini and Groq, and nothing local', async () => {
    const app = await boot();
    const options = [...app.dom.providerSelect.options].map((o) => o.value);
    expect(options).toEqual(['gemini', 'groq']);
    const blocks = [...app.window.document.querySelectorAll('.provider-block')].map((b) => b.getAttribute('data-provider'));
    expect(blocks).toEqual(['gemini', 'groq']);
    expect(app.window.document.getElementById('paneSettings').textContent).not.toMatch(/ollama/i);
  });

  it('an id that is no longer a provider reads as the default', async () => {
    const app = await boot();
    expect(app.getProvider('ollama').id).toBe('gemini');
  });

  it('a removed provider cannot be selected', async () => {
    const app = await boot();
    app.setSessionProvider('ollama');
    expect(app.getSessionProvider()).toBe('gemini');
    expect(app.getPrefs().provider).toBeUndefined();
  });
});

describe('every provider needs a key', () => {
  it('no key anywhere: the basic layout and the no-key line, provider untouched', async () => {
    const app = await boot({ fetch: jsonFetch({ hello: 'world' }) });
    app.state.data = { hello: 'world' };
    app.state.schema = { hello: 'string' };
    app.state.schemaHash = 'h_nokey';
    app.state.url = 'https://x.test/api';
    app.resolveSpec('https://x.test/api', { hash: 'h_nokey', schema: {} }, false);
    await flush();
    expect(app.getSessionProvider()).toBe('gemini');
    expect(app.state.spec).toBeTruthy();
    expect(app.dom.interfaceOut.textContent).toContain('No Google Gemini key');
  });

  it('the active provider without a key re-homes to the one that has a key', async () => {
    const app = await boot({ local: { 'imago.key.groq': 'gsk_live' } });
    app.setSessionProvider('gemini');
    app.state.data = { a: 1 };
    app.state.schemaHash = 'h_rehome';
    app.state.url = 'https://x.test/api';
    app.resolveSpec('https://x.test/api', { hash: 'h_rehome', schema: {} }, false);
    await flush();
    expect(app.getSessionProvider()).toBe('groq');
    expect(app.state.pendingGenerate, 'a usable key means asking to generate, not the basic layout').toBe(true);
  });

  it('a ready pill says the key is saved', async () => {
    const app = await boot({ local: { 'imago.key.groq': 'gsk_live123' } });
    expect(app.dom.keyStatus.textContent).toBe('Groq ready');
    expect(app.dom.keyStatus.title).toBe('Groq key saved — click for Settings');
  });

  it('a rejected key is not usable, even though it is stored', async () => {
    const app = await boot({
      fetch: jsonFetch({ error: { message: 'Invalid API Key' } }, { ok: false, status: 401 }),
      local: { 'imago.key.groq': 'gsk_bad' }
    });
    app.dom.groqTestBtn.click();
    for (let i = 0; i < 4; i += 1) await flush();
    expect(app.dom.keyStatus.textContent).toBe('Groq key rejected');
    expect(app.dom.chatTarget.getAttribute('data-state')).toBe('missing');
  });
});

describe('a saved Ollama choice migrates cleanly', () => {
  // Before 0.16.0.0 a reader could pick Ollama, and the choice, its model and
  // its server address were saved. Left alone, the model box would keep
  // naming a local model that Gemini does not have, and the first Generate
  // would fail with "model not found".
  it('falls back to the default provider and its model, and says so', async () => {
    const app = await boot({
      local: { [PREFS]: { provider: 'ollama', ollamaEndpoint: 'http://127.0.0.1:11434', lastUrl: 'https://x.test/a' } },
      session: { 'imago.provider': 'ollama', 'imago.modelName': 'llama3.1' }
    });
    expect(app.getSessionProvider()).toBe('gemini');
    expect(app.dom.providerSelect.value).toBe('gemini');
    expect(app.dom.modelName.value).toBe(GEMINI_DEFAULT);
    expect(app.window.sessionStorage.getItem('imago.modelName')).toBe(GEMINI_DEFAULT);
    const prefs = app.getPrefs();
    expect('ollamaEndpoint' in prefs).toBe(false);
    expect(prefs.provider).toBeUndefined();
    expect(prefs.lastUrl, 'unrelated preferences survive').toBe('https://x.test/a');
    expect(app.dom.toast.textContent).toContain('Ollama is no longer supported');
    expect(app.dom.toast.textContent).toContain('Google Gemini');
  });

  it('lands on the provider that has a key, when one does', async () => {
    const app = await boot({
      local: { [PREFS]: { provider: 'ollama' }, 'imago.key.groq': 'gsk_live123' },
      session: { 'imago.modelName': 'qwen3' }
    });
    expect(app.getSessionProvider()).toBe('groq');
    expect(app.dom.modelName.value).toBe(GROQ_DEFAULT);
    expect(app.dom.keyStatus.textContent).toBe('Groq ready');
    expect(app.dom.toast.textContent).toContain('Groq');
  });

  it('a session-only Ollama choice migrates too', async () => {
    const app = await boot({ session: { 'imago.provider': 'ollama', 'imago.modelName': 'llama3.1' } });
    expect(app.window.sessionStorage.getItem('imago.provider')).toBeNull();
    expect(app.getSessionProvider()).toBe('gemini');
    expect(app.dom.modelName.value).toBe(GEMINI_DEFAULT);
  });

  it('a leftover server address is dropped without touching the chosen provider', async () => {
    const app = await boot({
      local: { [PREFS]: { provider: 'groq', ollamaEndpoint: 'http://lanbox:11434' } },
      session: { 'imago.modelName': 'openai/gpt-oss-120b' }
    });
    expect('ollamaEndpoint' in app.getPrefs()).toBe(false);
    expect(app.getSessionProvider()).toBe('groq');
    expect(app.dom.modelName.value, 'a hand-picked model is kept').toBe('openai/gpt-oss-120b');
    expect(app.dom.toast.textContent).not.toContain('Ollama');
  });

  it('does nothing, and writes nothing, when Ollama was never saved', async () => {
    const app = await boot({ local: { [PREFS]: { provider: 'groq' } } });
    // Storage is a Proxy in jsdom: stub the prototype, not the instance.
    const writes = [];
    const real = app.window.Storage.prototype.setItem;
    app.window.Storage.prototype.setItem = function (k, v) { writes.push(k); return real.call(this, k, v); };
    try {
      expect(app.migrateRemovedOllama()).toBe(false);
    } finally { app.window.Storage.prototype.setItem = real; }
    expect(writes).toEqual([]);
    expect(app.getPrefs().provider).toBe('groq');
  });
});
