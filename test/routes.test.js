/* The landing page and the app are separate addresses: the bare URL is the
   landing page, #app is the app. A reload keeps you where you were, and a
   returning visitor lands on the landing page instead of being sent to the app. */
import { describe, it, expect } from 'vitest';
import { boot, jsonFetch, flush, LANDING } from './harness.js';

const RETURNING = { 'imago.preferences': { onboarded: true, lastUrl: 'https://a.test/x' } };

describe('landing and app are separate addresses', () => {
  it('the bare URL is the landing page, even for a returning visitor', async () => {
    const app = await boot({ url: LANDING, local: RETURNING, fetch: jsonFetch({ a: 1 }) });
    expect(app.state.view).toBe('landing');
    expect(app.dom.landingView.hidden).toBe(false);
  });

  it('#app opens the app, so a reload inside it stays there', async () => {
    const app = await boot({ url: 'https://imago.test/#app', local: RETURNING });
    expect(app.state.view).toBe('app');
  });

  it('Open app moves the address to #app; the mark moves it back', async () => {
    const app = await boot({ url: LANDING, fetch: jsonFetch({ a: 1 }) });
    app.dom.landingSkip.click();
    expect(app.window.location.hash).toBe('#app');
    expect(app.state.view).toBe('app');
    app.dom.brandHome.click();
    expect(app.window.location.hash).toBe('');
    expect(app.state.view).toBe('landing');
  });

  it('the browser Back button leaves the app for the landing page, and Forward returns', async () => {
    const app = await boot({ url: LANDING, fetch: jsonFetch({ a: 1 }) });
    app.dom.landingStart.click();
    expect(app.state.view).toBe('app');
    app.window.history.back();
    await new Promise((r) => app.window.addEventListener('popstate', r, { once: true }));
    expect(app.state.view).toBe('landing');
    app.window.history.forward();
    await new Promise((r) => app.window.addEventListener('popstate', r, { once: true }));
    expect(app.state.view).toBe('app');
  });

  it('in-app Back still walks followed pages rather than leaving the app', async () => {
    const app = await boot({ url: 'https://imago.test/#app', fetch: jsonFetch({ next: 'https://a.test/2' }) });
    app.setUrlInput('https://a.test/1');
    app.performRequest(false);
    await flush(); await flush();
    app.followUrl('https://a.test/2');
    await flush(); await flush();
    expect(app.window.location.hash).toBe('#app');
    app.window.history.back();
    await new Promise((r) => app.window.addEventListener('popstate', r, { once: true }));
    expect(app.state.view).toBe('app');
    expect(app.state.url).toBe('https://a.test/1');
  });
});
