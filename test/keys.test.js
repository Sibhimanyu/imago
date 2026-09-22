/* Two key boxes, one per provider, persisted in localStorage; and a no-key
   state that says exactly what is missing instead of failing silently. */
import { describe, it, expect } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

function typeInto(app, input, value) {
  input.value = value;
  input.dispatchEvent(new app.window.Event('input', { bubbles: true }));
}

describe('per-provider key fields', () => {
  it('typing into a field stores that provider key and selects it', async () => {
    const app = await boot();
    typeInto(app, app.dom.groqKey, 'gsk_live123');
    expect(app.window.localStorage.getItem('imago.key.groq')).toBe('gsk_live123');
    expect(app.getSessionProvider()).toBe('groq');
    expect(app.dom.keyStatus.textContent).toBe('Groq ready');
    // The untouched slot stays empty — fields never cross-write.
    expect(app.window.localStorage.getItem('imago.key.gemini')).toBeNull();
    typeInto(app, app.dom.geminiKey, 'AIza_live456');
    expect(app.getSessionProvider()).toBe('gemini');
    expect(app.dom.keyStatus.textContent).toBe('Google Gemini ready');
  });

  it('typing selects explicitly even when the fallback would pick otherwise', async () => {
    // Both slots full: the key-presence fallback would always say gemini, so
    // only an explicit selection can put groq in charge — and it must stick.
    const app = await boot({
      local: { 'imago.key.gemini': 'AIza_live456', 'imago.key.groq': 'gsk_live123' }
    });
    typeInto(app, app.dom.groqKey, 'gsk_live123');
    expect(app.getSessionProvider()).toBe('groq');
    expect(app.getPrefs().provider).toBe('groq');
  });

  it('the pill follows the surviving key, and names a keyless explicit choice', async () => {
    const app = await boot({
      local: { 'imago.key.gemini': 'AIza_live456', 'imago.key.groq': 'gsk_live123' }
    });
    typeInto(app, app.dom.geminiKey, '');
    expect(app.window.localStorage.getItem('imago.key.gemini')).toBeNull();
    expect(app.window.localStorage.getItem('imago.key.groq')).toBe('gsk_live123');
    // Nobody chose explicitly, so the app follows the key that remains.
    expect(app.dom.keyStatus.textContent).toBe('Groq ready');
    // An explicit choice with no key behind it is named, not papered over.
    app.dom.providerSelect.value = 'gemini';
    app.dom.providerSelect.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    expect(app.dom.keyStatus.textContent).toBe('No Google Gemini key');
  });

  it('names the provider whose key is missing when none exist at all', async () => {
    const app = await boot();
    expect(app.dom.keyStatus.textContent).toBe('No keys');
    expect(app.dom.geminiKeyStatus.textContent).toBe('Not set');
    expect(app.dom.groqKeyStatus.textContent).toBe('Not set');
  });

  it('masks stored keys in the status lines instead of echoing them', async () => {
    const app = await boot();
    typeInto(app, app.dom.groqKey, 'gsk_secret-value-1');
    const line = app.dom.groqKeyStatus.textContent;
    expect(line).not.toContain('gsk_secret-value-1');
    expect(line).toContain('e-1');
  });

  it('the key pill opens Settings', async () => {
    const app = await boot();
    app.dom.keyStatus.click();
    expect(app.state.pane).toBe('settings');
  });

  it('a remembered provider survives a reload', async () => {
    const first = await boot();
    typeInto(first, first.dom.groqKey, 'gsk_live123');
    const again = await boot({
      local: {
        'imago.key.groq': 'gsk_live123',
        'imago.preferences': { provider: 'groq' }
      }
    });
    expect(again.getSessionProvider()).toBe('groq');
    expect(again.getActiveKey()).toBe('gsk_live123');
  });

  it('the setup screen collects both keys at once', async () => {
    const app = await boot();
    expect(app.dom.setupGeminiKey).toBeTruthy();
    expect(app.dom.setupGroqKey).toBeTruthy();
    app.dom.setupGeminiKey.value = 'AIza_setup1';
    app.dom.setupGroqKey.value = 'gsk_setup2';
    app.dom.setupContinue.click();
    expect(app.window.localStorage.getItem('imago.key.gemini')).toBe('AIza_setup1');
    expect(app.window.localStorage.getItem('imago.key.groq')).toBe('gsk_setup2');
    // Last field wins the default — the key just typed is the one in use.
    expect(app.getSessionProvider()).toBe('groq');
  });

  it('clear-all-data wipes the keys too', async () => {
    const app = await boot({
      local: { 'imago.key.gemini': 'AIza_live456' }
    });
    app.clearAllData();
    expect(app.window.localStorage.getItem('imago.key.gemini')).toBeNull();
    expect(app.dom.geminiKey.value).toBe('');
    expect(app.dom.keyStatus.textContent).toBe('No keys');
  });
});

describe('no-key messaging', () => {
  async function noKeyApp() {
    const app = await boot({ fetch: jsonFetch({ hello: 'world' }) });
    app.state.data = { hello: 'world' };
    app.state.schema = { hello: 'string' };
    app.state.schemaHash = 'h_test';
    app.state.url = 'https://x.test/api';
    return app;
  }

  it('names the missing key, where it goes, and where a free one lives', async () => {
    const app = await noKeyApp();
    app.resolveSpec('https://x.test/api', { hash: 'h_test', schema: {} }, false);
    await flush();
    // Heuristic output still renders — the alert explains, it does not replace.
    expect(app.state.spec).toBeTruthy();
    const text = app.dom.interfaceOut.textContent;
    expect(text).toContain('No Google Gemini key');
    expect(text).toContain('Settings');
    expect(text).toContain('aistudio.google.com/apikey');
    expect(text).toContain('keep working');
  });

  it('uses whichever provider actually has a key instead of failing', async () => {
    const app = await noKeyApp();
    app.setProviderKey('groq', 'gsk_live123');
    app.setSessionProvider('gemini');   // active slot empty, neighbour full
    app.resolveSpec('https://x.test/api', { hash: 'h_test', schema: {} }, false);
    await flush();
    expect(app.getSessionProvider()).toBe('groq');
    // New shape + key + not user-triggered: asked before spending the call.
    expect(app.state.pendingGenerate).toBe(true);
  });

  it('the Generate button degrades to the same plain message', async () => {
    const app = await noKeyApp();
    app.generateInterfaceNow();
    await flush();
    expect(app.state.spec).toBeTruthy();
    expect(app.dom.interfaceOut.textContent).toContain('No Google Gemini key');
  });
});
