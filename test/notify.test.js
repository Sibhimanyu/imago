/* Watch alerts: a watched endpoint that changes while you are in another tab
   says so, in the tab title always and in a notification if you allowed it.
   Permission is only ever offered, once, when Watch is turned on. */
import { describe, it, expect } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

const URL_ = 'https://api.test/rates';

function hide(app, hidden) {
  Object.defineProperty(app.window.document, 'hidden', { configurable: true, get: () => hidden });
  app.window.document.dispatchEvent(new app.window.Event('visibilitychange'));
}

function fakeNotification(app, permission) {
  const shown = [];
  const asked = [];
  function N(title, opts) { this.title = title; this.opts = opts; this.close = () => {}; shown.push(this); }
  N.permission = permission;
  N.requestPermission = () => { asked.push(1); N.permission = 'granted'; return Promise.resolve('granted'); };
  app.window.Notification = N;
  return { shown, asked, N };
}

// A page on screen, then one auto-refresh that returns `next`.
async function watchedTick(app, next) {
  app.setUrlInput(URL_);
  app.state.url = URL_;
  app.state.dataUrl = URL_;
  app.state.data = { rate: 1.1, name: 'EUR' };
  app.state.spec = { title: 'Rates', components: [], actions: [] };
  app.state.refreshIntervalMs = 30000;
  app.window.fetch = jsonFetch(next);
  app.performRequest(true);
  await flush(); await flush();
}

describe('describing a change', () => {
  it('names the first change in words and counts the rest', async () => {
    const app = await boot();
    expect(app.describeChange({ 'current.temperature_2m': { type: 'changed', before: 30.1, after: 30.4 } }))
      .toBe('Temperature: 30.1 → 30.4');
    expect(app.describeChange({ a: { type: 'added', after: 1 }, b: { type: 'removed', before: 2 } }))
      .toBe('A appeared (and 1 more)');
    expect(app.describeChange({ b: { type: 'removed', before: 2 } })).toBe('B was removed');
    expect(app.describeChange({})).toBe('');
  });
});

describe('a change while the tab is hidden', () => {
  it('puts the count in the tab title and clears it when you come back', async () => {
    const app = await boot();
    const title = app.window.document.title;
    hide(app, true);
    await watchedTick(app, { rate: 1.2, name: 'EUR' });
    expect(app.window.document.title).toBe('(1) Rates — Imago');
    hide(app, false);
    expect(app.window.document.title).toBe(title);
    expect(app.state.unseenChanges).toBe(0);
  });

  it('notifies with what changed when notifications are allowed', async () => {
    const app = await boot();
    const { shown } = fakeNotification(app, 'granted');
    hide(app, true);
    await watchedTick(app, { rate: 1.2, name: 'EUR' });
    expect(shown).toHaveLength(1);
    expect(shown[0].title).toBe('Rates changed');
    expect(shown[0].opts.body).toBe('Rate: 1.1 → 1.2');
  });

  it('stays quiet when nothing changed, when you are looking, or when notifications are not allowed', async () => {
    const quiet = await boot();
    const q = fakeNotification(quiet, 'granted');
    hide(quiet, true);
    await watchedTick(quiet, { rate: 1.1, name: 'EUR' });                 // same data
    expect(q.shown).toHaveLength(0);
    expect(quiet.window.document.title).not.toMatch(/^\(/);

    const looking = await boot();
    const l = fakeNotification(looking, 'granted');
    hide(looking, false);
    await watchedTick(looking, { rate: 1.2, name: 'EUR' });
    expect(l.shown).toHaveLength(0);
    expect(looking.window.document.title).not.toMatch(/^\(/);

    const denied = await boot();
    const d = fakeNotification(denied, 'denied');
    hide(denied, true);
    await watchedTick(denied, { rate: 1.2, name: 'EUR' });
    expect(d.shown).toHaveLength(0);
    expect(denied.window.document.title).toBe('(1) Rates — Imago');     // the title still says it
  });

  it('a fetch you started yourself does not count as a watched change', async () => {
    const app = await boot();
    hide(app, true);
    app.setUrlInput(URL_);
    app.state.url = URL_; app.state.dataUrl = URL_;
    app.state.data = { rate: 1.1 };
    app.window.fetch = jsonFetch({ rate: 1.2 });
    app.performRequest(false);
    await flush(); await flush();
    expect(app.window.document.title).not.toMatch(/^\(/);
  });
});

describe('asking for permission', () => {
  it('turning Watch on offers notifications once, as a toast; nothing prompts on its own', async () => {
    const app = await boot();
    const { asked } = fakeNotification(app, 'default');
    app.state.data = { a: 1 };
    app.dom.refreshToggle.click();                                        // Watch on
    expect(asked).toHaveLength(0);                                        // no bare prompt
    const offer = app.dom.toast.querySelector('.toast-action');
    expect(offer.textContent).toBe('Notify me');
    offer.click();
    expect(asked).toHaveLength(1);
    await flush();
    expect(app.dom.toast.textContent).toContain('You will be notified');

    app.dom.refreshToggle.click();                                        // off
    app.dom.refreshToggle.click();                                        // on again
    expect(app.dom.toast.querySelector('.toast-action')).toBeNull();      // asked once, ever
  });

  it('an ignored offer is not repeated, even though permission is still undecided', async () => {
    const app = await boot();
    fakeNotification(app, 'default');
    app.dom.refreshToggle.click();                                        // on: offered
    expect(app.dom.toast.querySelector('.toast-action')).not.toBeNull();
    app.dom.toast.textContent = '';
    app.dom.refreshToggle.click();                                        // off
    app.dom.refreshToggle.click();                                        // on: not again
    expect(app.dom.toast.querySelector('.toast-action')).toBeNull();
    expect(app.getPrefs().notifyAsked).toBe(true);
  });

  it('no offer when the browser has no notifications or the answer is already known', async () => {
    const app = await boot();
    fakeNotification(app, 'denied');
    app.dom.refreshToggle.click();
    expect(app.dom.toast.querySelector('.toast-action')).toBeNull();
  });
});
