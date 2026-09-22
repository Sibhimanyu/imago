/* The try-it console in Settings. A connection test proves the server is
   reachable; this proves the provider actually answers you, through the same
   llmRequest the interface builder uses. */
import { describe, it, expect, vi } from 'vitest';
import { boot, flush } from './harness.js';

const settled = async () => { for (let i = 0; i < 8; i += 1) await flush(); };

const reply = (body) => () => Promise.resolve({
  ok: true, status: 200, headers: { get: () => 'application/json' },
  text: () => Promise.resolve(JSON.stringify(body)),
  json: () => Promise.resolve(body)
});

const geminiSays = (text) => reply({ candidates: [{ content: { parts: [{ text }] } }] });

function send(app, text) {
  app.dom.chatInput.value = text;
  app.dom.chatForm.dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
}

describe('sending a message', () => {
  it('shows the question and the answer', async () => {
    const app = await boot({ fetch: geminiSays('Paris.') });
    app.setProviderKey('gemini', 'AIzaTEST');
    send(app, 'Capital of France?');
    await settled();
    const log = app.dom.chatLog.textContent;
    expect(log).toContain('Capital of France?');
    expect(log).toContain('Paris.');
  });

  it('names the model and how long it took', async () => {
    const app = await boot({ fetch: geminiSays('ok') });
    app.setProviderKey('gemini', 'AIzaTEST');
    app.dom.modelName.value = 'gemini-2.5-flash-lite';
    send(app, 'hi');
    await settled();
    expect(app.dom.chatLog.textContent).toContain('gemini-2.5-flash-lite');
    expect(app.dom.chatLog.textContent).toMatch(/\d+ ms/);
  });

  it('carries the conversation, not just the last line', async () => {
    let lastBody = null;
    const app = await boot({
      fetch: (url, init) => { lastBody = JSON.parse(init.body); return geminiSays('Yes.')(); }
    });
    app.setProviderKey('gemini', 'AIzaTEST');
    send(app, 'first');
    await settled();
    send(app, 'second');
    await settled();
    const texts = lastBody.contents.map((c) => c.parts[0].text);
    expect(texts).toContain('first');
    expect(texts).toContain('second');
    expect(texts, 'the reply is context too').toContain('Yes.');
  });

  it('refuses to send an empty message', async () => {
    let calls = 0;
    const app = await boot({ fetch: () => { calls += 1; return geminiSays('x')(); } });
    app.setProviderKey('gemini', 'AIzaTEST');
    send(app, '   ');
    await settled();
    expect(calls).toBe(0);
  });

  it('asks for a key instead of calling without one', async () => {
    let calls = 0;
    const app = await boot({ fetch: () => { calls += 1; return geminiSays('x')(); } });
    send(app, 'hello');
    await settled();
    expect(calls).toBe(0);
    expect(app.dom.chatLog.textContent).toContain('key first');
  });
});

describe('a reasoning model that answers with thought', () => {
  // The trap this whole console exists to expose: content empty, the answer
  // in message.thinking. Showing nothing would read as a broken provider.
  it('shows the thinking and says the text was empty', async () => {
    const app = await boot({
      fetch: (url) => String(url).includes('/api/tags')
        ? reply({ models: [{ name: 'llama3.1' }] })()
        : reply({ message: { role: 'assistant', content: '', thinking: 'weighing it up' }, done_reason: 'stop' })()
    });
    app.setSessionProvider('ollama');
    app.dom.modelName.value = 'llama3.1';
    send(app, 'hi');
    await settled();
    const log = app.dom.chatLog.textContent;
    expect(log).toContain('weighing it up');
    expect(log).toContain('thinking only');
  });

  it('is not reported as a failure', async () => {
    const app = await boot({
      fetch: () => reply({ message: { role: 'assistant', content: '', thinking: 'mm' }, done_reason: 'stop' })()
    });
    app.setSessionProvider('ollama');
    app.dom.modelName.value = 'llama3.1';
    send(app, 'hi');
    await settled();
    expect(app.dom.chatLog.querySelectorAll('[data-role="error"]')).toHaveLength(0);
  });
});

describe('when it goes wrong', () => {
  it('reports a rejected key in the log', async () => {
    const app = await boot({
      fetch: () => Promise.resolve({
        ok: false, status: 400, headers: { get: () => 'application/json' },
        text: () => Promise.resolve(JSON.stringify({ error: { message: 'API key not valid.' } }))
      })
    });
    app.setProviderKey('gemini', 'AIzaBOGUS');
    send(app, 'hi');
    await settled();
    expect(app.dom.chatLog.textContent).toContain('rejected the API key');
    expect(app.dom.chatLog.querySelectorAll('[data-role="error"]').length).toBeGreaterThan(0);
  });

  it('a failed turn is not fed back as context', async () => {
    let bodies = [];
    const app = await boot({
      fetch: (url, init) => {
        bodies.push(JSON.parse(init.body));
        return bodies.length === 1
          ? Promise.resolve({ ok: false, status: 500, headers: { get: () => 'application/json' },
                              text: () => Promise.resolve('{"error":{"message":"boom"}}') })
          : geminiSays('recovered')();
      }
    });
    app.setProviderKey('gemini', 'AIzaTEST');
    send(app, 'first');
    await settled();
    send(app, 'second');
    await settled();
    const texts = bodies[1].contents.map((c) => c.parts[0].text);
    expect(texts).toContain('first');
    expect(texts).toContain('second');
    expect(texts.join(' '), 'an error is not conversation').not.toContain('boom');
  });

  it('re-enables sending after a failure', async () => {
    const app = await boot({
      fetch: () => Promise.reject(new TypeError('Failed to fetch'))
    });
    app.setProviderKey('gemini', 'AIzaTEST');
    send(app, 'hi');
    await settled();
    expect(app.dom.chatSendBtn.disabled, 'a failed turn must not lock the console').toBe(false);
  });
});

describe('the console says where the message goes', () => {
  it('names the active provider and model', async () => {
    const app = await boot();
    app.setProviderKey('gemini', 'AIzaTEST');
    app.dom.providerSelect.value = 'gemini';
    app.dom.providerSelect.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    expect(app.dom.chatTarget.textContent).toContain('Google Gemini');
  });

  it('flags a provider with no key', async () => {
    const app = await boot();
    app.dom.providerSelect.value = 'groq';
    app.dom.providerSelect.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    expect(app.dom.chatTarget.getAttribute('data-state')).toBe('missing');
  });

  it('Clear empties the transcript', async () => {
    const app = await boot({ fetch: geminiSays('hi') });
    app.setProviderKey('gemini', 'AIzaTEST');
    send(app, 'hello');
    await settled();
    expect(app.dom.chatLog.textContent).toContain('hello');
    app.dom.chatClearBtn.click();
    expect(app.dom.chatLog.textContent).toContain('Nothing sent yet');
  });
});

describe('a long reasoning trace does not bury the answer', () => {
  const nativeReply = (body) => () => Promise.resolve({
    ok: true, status: 200, headers: { get: () => 'application/json' },
    text: () => Promise.resolve(JSON.stringify(body)), json: () => Promise.resolve(body)
  });

  it('collapses the thinking when there is a real answer', async () => {
    const app = await boot({
      fetch: nativeReply({ message: { content: 'Short answer.', thinking: 'long '.repeat(200) }, done_reason: 'stop' })
    });
    app.setSessionProvider('ollama');
    app.dom.modelName.value = 'llama3.1';
    app.dom.chatInput.value = 'hi';
    app.dom.chatForm.dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    await settled();
    const details = app.dom.chatLog.querySelector('details');
    expect(details, 'thinking should be behind a disclosure').toBeTruthy();
    expect(details.open, 'it must not bury the answer').toBe(false);
    expect(app.dom.chatLog.textContent).toContain('Short answer.');
  });

  it('opens it when thinking is the only thing there is', async () => {
    const app = await boot({
      fetch: nativeReply({ message: { content: '', thinking: 'all I have' }, done_reason: 'stop' })
    });
    app.setSessionProvider('ollama');
    app.dom.modelName.value = 'llama3.1';
    app.dom.chatInput.value = 'hi';
    app.dom.chatForm.dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
    await settled();
    expect(app.dom.chatLog.querySelector('details').open).toBe(true);
  });
});
