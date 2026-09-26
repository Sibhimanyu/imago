/* The Settings testing box: one tiny call per provider, reported inline.
   A red test here must mean generating would fail too — never a dead button
   or a message that blames the wrong thing. */
import { describe, it, expect, vi } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

async function settled(app, clicks = 4) {
  for (let i = 0; i < clicks; i += 1) await flush();
}

describe('connection tests', () => {
  it('a good Gemini key reports OK with the tested model', async () => {
    const app = await boot({
      fetch: jsonFetch({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
      local: { 'imago.key.gemini': 'AIza_live' }
    });
    app.dom.modelName.value = 'gemini-2.5-flash-lite';
    app.dom.geminiTestBtn.click();
    await settled(app);
    expect(app.dom.geminiTestStatus.textContent).toContain('OK');
    expect(app.dom.geminiTestStatus.textContent).toContain('gemini-2.5-flash-lite');
    expect(app.dom.geminiTestStatus.getAttribute('data-state')).toBe('ready');
    expect(app.dom.geminiTestBtn.disabled).toBe(false);
  });

  it('a rejected Groq key says the key was rejected, not the network', async () => {
    const app = await boot({
      fetch: jsonFetch({ error: { message: 'Invalid API Key' } }, { ok: false, status: 401 }),
      local: { 'imago.key.groq': 'gsk_bad' }
    });
    app.dom.groqTestBtn.click();
    await settled(app);
    expect(app.dom.groqTestStatus.textContent).toContain('rejected the API key');
    expect(app.dom.groqTestStatus.getAttribute('data-state')).toBe('missing');
    expect(app.dom.groqTestBtn.disabled).toBe(false);
  });

  it('a missing key never spends a request', async () => {
    let calls = 0;
    const app = await boot({ fetch: () => { calls += 1; return jsonFetch({})(); } });
    app.dom.groqTestBtn.click();
    await settled(app);
    expect(calls).toBe(0);
    expect(app.dom.groqTestStatus.textContent).toContain('Add a Groq key first');
  });

  it('thinking without final text still proves the key works', async () => {
    // gpt-oss-style reasoning models can answer a tiny ping with thinking
    // and no content. For a connectivity check that is a pass, not a failure.
    const app = await boot({
      fetch: jsonFetch({ choices: [{ message: { content: '', reasoning_content: 'thinking…' }, finish_reason: 'stop' }] }),
      local: { 'imago.key.groq': 'gsk_live' }
    });
    app.dom.groqTestBtn.click();
    await settled(app);
    expect(app.dom.groqTestStatus.textContent).toContain('OK');
    expect(app.dom.groqTestStatus.getAttribute('data-state')).toBe('ready');
  });

  it('true silence names the finish reason instead of shrugging', async () => {
    const app = await boot({
      fetch: jsonFetch({ choices: [{ message: { content: '' }, finish_reason: 'length' }] }),
      local: { 'imago.key.groq': 'gsk_live' }
    });
    app.dom.groqTestBtn.click();
    await settled(app);
    expect(app.dom.groqTestStatus.textContent).toContain('Empty reply (finish_reason length)');
    expect(app.dom.groqTestStatus.getAttribute('data-state')).toBe('missing');
  });

  // Settings listed every provider's key with a "Test / Not tested" pair
  // each. Now only the chosen provider's block shows, and an untested
  // status says nothing rather than "Not tested".
  it('shows only the chosen provider, and an untested status is blank', async () => {
    const app = await boot();
    const blocks = () => [...app.window.document.querySelectorAll('.provider-block')].filter((b) => !b.hidden).map((b) => b.getAttribute('data-provider'));
    expect(blocks()).toEqual(['gemini']);
    for (const id of ['gemini', 'groq']) {
      expect(app.dom[id + 'TestBtn']).toBeTruthy();
      expect(app.dom[id + 'TestStatus'].textContent).toBe('');
    }
    app.dom.providerSelect.value = 'groq';
    app.dom.providerSelect.dispatchEvent(new app.window.Event('change'));
    expect(blocks()).toEqual(['groq']);
  });

  it('a key pasted under the wrong provider is filed under its own and shown', async () => {
    const app = await boot();
    app.dom.geminiKey.value = 'gsk_live123';
    app.dom.geminiKey.dispatchEvent(new app.window.Event('input'));
    expect(app.window.localStorage.getItem('imago.key.groq')).toBe('gsk_live123');
    expect(app.window.localStorage.getItem('imago.key.gemini')).toBeNull();
    expect(app.getSessionProvider()).toBe('groq');
    expect(app.dom.geminiKey.value).toBe('');
    const shown = [...app.window.document.querySelectorAll('.provider-block')].filter((b) => !b.hidden);
    expect(shown.map((b) => b.getAttribute('data-provider'))).toEqual(['groq']);
  });
});

describe('a test that takes a long time still reads as progress', () => {
  // A large model answered a one-word ping in 35s. A static "Testing…" for
  // that long is indistinguishable from a hang, and a dead endpoint used to
  // leave the button disabled forever.
  // Found by /qa on 2026-09-22.
  it('counts seconds up while waiting', async () => {
    vi.useFakeTimers();
    try {
      const app = await boot({ fetch: () => new Promise(() => {}), local: { 'imago.key.groq': 'gsk_live' } });   // never settles
      app.dom.groqTestBtn.click();
      expect(app.dom.groqTestStatus.textContent).toContain('Testing');
      await vi.advanceTimersByTimeAsync(3000);
      expect(app.dom.groqTestStatus.textContent).toMatch(/Testing… \d+s/);
      expect(app.dom.groqTestBtn.disabled).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it('gives up instead of hanging, and re-enables the button', async () => {
    vi.useFakeTimers();
    try {
      const app = await boot({ fetch: () => new Promise(() => {}), local: { 'imago.key.groq': 'gsk_live' } });
      app.dom.groqTestBtn.click();
      await vi.advanceTimersByTimeAsync(95000);
      expect(app.dom.groqTestStatus.textContent).toContain('Timed out');
      expect(app.dom.groqTestStatus.getAttribute('data-state')).toBe('missing');
      expect(app.dom.groqTestBtn.disabled, 'a timed-out test must be retryable').toBe(false);
    } finally { vi.useRealTimers(); }
  });

  it('a result that arrives after the timeout does not overwrite it', async () => {
    vi.useFakeTimers();
    try {
      let settle;
      const app = await boot({ fetch: () => new Promise((r) => { settle = r; }), local: { 'imago.key.groq': 'gsk_live' } });
      app.dom.groqTestBtn.click();
      await vi.advanceTimersByTimeAsync(95000);
      expect(app.dom.groqTestStatus.textContent).toContain('Timed out');
      settle({ ok: true, status: 200, headers: { get: () => 'application/json' },
               text: () => Promise.resolve('{"choices":[{"message":{"content":"ok"}}]}') });
      await vi.advanceTimersByTimeAsync(100);
      expect(app.dom.groqTestStatus.textContent).toContain('Timed out');
    } finally { vi.useRealTimers(); }
  });
});

describe('a rejected key says so, whatever status the provider uses', () => {
  // Gemini answers an invalid key with HTTP 400, so a status-only mapping
  // reported "request failed" for the most common mistake a user makes.
  // Confirmed against the live API on 2026-09-22.
  it('reads Gemini 400 "API key not valid" as a rejected key', async () => {
    const app = await boot({
      fetch: jsonFetch({ error: { message: 'API key not valid. Please pass a valid API key.' } }, { ok: false, status: 400 })
    });
    app.dom.geminiKey.value = 'AIzaBOGUS';
    app.dom.geminiKey.dispatchEvent(new app.window.Event('input', { bubbles: true }));
    app.dom.geminiTestBtn.click();
    await settled(app);
    expect(app.dom.geminiTestStatus.textContent).toContain('rejected the API key');
  });

  it('still reads a genuine 401 as a rejected key', async () => {
    const app = await boot({
      fetch: jsonFetch({ error: { message: 'Invalid API Key' } }, { ok: false, status: 401 })
    });
    app.dom.groqKey.value = 'gsk_BOGUS';
    app.dom.groqKey.dispatchEvent(new app.window.Event('input', { bubbles: true }));
    app.dom.groqTestBtn.click();
    await settled(app);
    expect(app.dom.groqTestStatus.textContent).toContain('rejected the API key');
  });

  it('does not call an unrelated failure a key problem', async () => {
    const app = await boot({
      fetch: jsonFetch({ error: { message: 'upstream timeout' } }, { ok: false, status: 500 })
    });
    app.dom.groqKey.value = 'gsk_BOGUS';
    app.dom.groqKey.dispatchEvent(new app.window.Event('input', { bubbles: true }));
    app.dom.groqTestBtn.click();
    await settled(app);
    expect(app.dom.groqTestStatus.textContent).not.toContain('rejected the API key');
  });
});
