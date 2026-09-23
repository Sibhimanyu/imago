/* The one-screen layout: the page never leaves the screen, the inspector and
   Settings open beside or over it, the rail shows what is live and what
   changed, and the basic layout reads like a page instead of a form. */
import { describe, it, expect } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

const WEATHER = {
  latitude: 13.125, longitude: 80.25, generationtime_ms: 0.04, utc_offset_seconds: 0,
  timezone: 'GMT', elevation: 6,
  current_units: { time: 'iso8601', interval: 'seconds', temperature_2m: '°C', relative_humidity_2m: '%' },
  current: { time: '2026-09-20T08:00', interval: 900, temperature_2m: 31.0, relative_humidity_2m: 72 },
  hourly_units: { time: 'iso8601', temperature_2m: '°C' },
  hourly: {
    time: ['2026-09-20T00:00', '2026-09-20T01:00', '2026-09-20T02:00', '2026-09-20T03:00', '2026-09-20T04:00'],
    temperature_2m: [27.1, 26.8, 26.5, 26.3, 26.1]
  }
};

describe('inspector', () => {
  // The five tabs used to swap the page out. The page now stays; the other
  // tabs open beside it, and the Page tab closes the inspector.
  it('opens beside the page and never hides the interface pane', async () => {
    const app = await boot();
    const iface = app.window.document.getElementById('pane-interface');
    app.setActiveTab('changes');
    expect(app.window.document.body.classList.contains('inspector-open')).toBe(true);
    expect(iface.classList.contains('is-active')).toBe(true);
    expect(app.window.document.getElementById('pane-changes').classList.contains('is-active')).toBe(true);
    expect(app.dom.inspectBtn.getAttribute('aria-pressed')).toBe('true');
    app.setActiveTab('interface');
    expect(app.window.document.body.classList.contains('inspector-open')).toBe(false);
    expect(iface.classList.contains('is-active')).toBe(true);
    expect(app.dom.inspectBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('Inspect reopens the last inspector tab', async () => {
    const app = await boot();
    app.state.data = { a: 1 };
    app.updateMeta();
    expect(app.dom.inspectBtn.disabled).toBe(false);
    app.setActiveTab('schema');
    app.setActiveTab('interface');
    app.dom.inspectBtn.click();
    expect(app.state.tab).toBe('schema');
  });

  it('Inspect is unavailable until there is a response', async () => {
    const app = await boot();
    app.state.data = null;
    app.updateMeta();
    expect(app.dom.inspectBtn.disabled).toBe(true);
  });
});

describe('sheets', () => {
  it('Settings opens as a sheet over the page and Escape closes it first', async () => {
    const app = await boot();
    app.setAppPane('settings');
    expect(app.dom.paneSettings.hidden).toBe(false);
    expect(app.dom.sheetScrim.hidden).toBe(false);
    expect(app.dom.panePlayground.hidden).toBe(false);   // the page stays under it
    expect(app.dom.paneSaved.hidden).toBe(false);        // and so does the rail
    app.setActiveTab('changes');
    app.window.document.dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(app.state.pane).toBe('playground');
    expect(app.dom.paneSettings.hidden).toBe(true);
    expect(app.state.tab).toBe('changes');              // one Escape, one layer
    app.window.document.dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(app.state.tab).toBe('interface');
  });

  it('the scrim and the close button both close the sheet', async () => {
    const app = await boot();
    app.setAppPane('settings');
    app.dom.sheetScrim.click();
    expect(app.dom.paneSettings.hidden).toBe(true);
    app.setAppPane('settings');
    app.dom.settingsClose.click();
    expect(app.dom.paneSettings.hidden).toBe(true);
    expect(app.dom.sheetScrim.hidden).toBe(true);
  });

  it('does not reopen a sheet on reload', async () => {
    const app = await boot({ local: { 'imago.preferences': { onboarded: true, activePane: 'settings' } } });
    expect(app.state.pane).toBe('playground');
    expect(app.dom.paneSettings.hidden).toBe(true);
  });
});

describe('trail', () => {
  // With the chrome always on screen, a Back button with nowhere to go back
  // to is noise: it only appears once a link has been followed.
  it('shows Back only when there is a page to go back to', async () => {
    const app = await boot();
    app.state.url = 'https://a.test/x';
    app.state.stack = [];
    app.enterStage();
    expect(app.dom.stageBar.hidden).toBe(true);
    app.state.stack = [{ url: 'https://a.test/prev', headersText: '' }];
    app.enterStage();
    expect(app.dom.stageBar.hidden).toBe(false);
    expect(app.dom.stageCrumb.textContent).toContain('1 back');
    app.leaveStage();
    expect(app.dom.stageBar.hidden).toBe(true);
  });
});

describe('history strip', () => {
  it('keeps each fetch\'s change count when its body is stripped', async () => {
    const app = await boot();
    const stripped = app.stripBody({ id: 's', url: 'u', data: { a: 1 }, changed: 3, fetchedAt: '2026-09-20T08:00:00Z' });
    expect(stripped.data).toBeNull();
    expect(stripped.changed).toBe(3);
  });

  it('draws one tick per fetch and marks the ones that changed something', async () => {
    const app = await boot();
    app.state.url = 'https://a.test/x';
    app.state.data = { a: 1 };
    const key = app.currentRequestKey();
    app.setSnapshots({ [key]: [
      { id: '1', fetchedAt: '2026-09-20T08:00:00Z', changed: 0, data: null, omitted: true },
      { id: '2', fetchedAt: '2026-09-20T08:00:30Z', changed: 2, data: null, omitted: true },
      { id: '3', fetchedAt: '2026-09-20T08:01:00Z', changed: 0, data: { a: 1 } }
    ] });
    app.renderHistory();
    const strip = app.dom.historyStrip;
    expect(strip.hidden).toBe(false);
    expect(strip.querySelectorAll('.history-tick')).toHaveLength(3);
    expect(strip.querySelectorAll('.history-tick.is-changed')).toHaveLength(1);
    expect(strip.querySelector('.history-tick.is-now')).toBeTruthy();
    strip.querySelector('.history-tick.is-changed').click();
    expect(app.state.tab).toBe('changes');
  });

  it('stays hidden with a single fetch', async () => {
    const app = await boot();
    app.state.url = 'https://a.test/x';
    app.state.data = { a: 1 };
    app.setSnapshots({ [app.currentRequestKey()]: [{ id: '1', fetchedAt: '2026-09-20T08:00:00Z', data: { a: 1 } }] });
    app.renderHistory();
    expect(app.dom.historyStrip.hidden).toBe(true);
  });
});

describe('endpoint rail', () => {
  it('marks the endpoint on screen, its change count, and a live dot while watching', async () => {
    const app = await boot({ local: { 'imago.savedRequests': [
      { id: 'r1', name: 'Weather', url: 'https://a.test/w', createdAt: '2026-09-20T08:00:00Z' },
      { id: 'r2', name: 'Other', url: 'https://a.test/o', createdAt: '2026-09-19T08:00:00Z' }
    ] } });
    app.state.data = { a: 1 };
    app.state.url = 'https://a.test/w';
    app.state.changedCount = 3;
    app.state.refreshIntervalMs = 30000;
    app.renderSavedList();
    const items = app.dom.savedList.querySelectorAll('.saved-item');
    expect(items).toHaveLength(2);
    const active = app.dom.savedList.querySelector('.saved-item.is-active');
    expect(active.textContent).toContain('Weather');
    expect(active.querySelector('.saved-changed').textContent).toBe('3');
    expect(active.querySelector('.saved-live')).toBeTruthy();
    expect(items[1].querySelector('.saved-live')).toBeNull();
  });

  it('lists the examples, and one tap loads one', async () => {
    const calls = [];
    const app = await boot({ fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    const buttons = app.dom.railExamples.querySelectorAll('.rail-example');
    expect(buttons.length).toBe(app.DEMOS.length);
    buttons[1].click();
    await flush();
    expect(app.dom.urlInput.value).toBe(app.DEMOS[1].url);
    expect(calls.some((u) => u === app.DEMOS[1].url)).toBe(true);
  });
});

describe('value before the key', () => {
  it('a first visit opens on a rendered example instead of a key form', async () => {
    const calls = [];
    const app = await boot({ fetch: (url) => { calls.push(String(url)); return jsonFetch({ name: 'pikachu' })(url); } });
    app.dom.landingStart.click();
    await flush(); await flush();
    expect(app.state.view).toBe('app');
    expect(calls).toContain(app.DEMOS[0].url);
  });

  it('a returning visit does not load an example over the last page', async () => {
    const calls = [];
    const app = await boot({
      local: { 'imago.preferences': { onboarded: true } },
      fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); }
    });
    app.enterApp();
    await flush();
    expect(calls).toHaveLength(0);
  });

  it('the no-key notice offers to add a key', async () => {
    const app = await boot({ fetch: jsonFetch({ hello: 'world' }) });
    app.state.data = { hello: 'world' };
    app.state.schema = { hello: 'string' };
    app.state.schemaHash = 'h_test';
    app.state.url = 'https://x.test/api';
    app.resolveSpec('https://x.test/api', { hash: 'h_test', schema: {} }, false);
    await flush();
    const btn = app.dom.interfaceOut.querySelector('.alert-action');
    expect(btn.textContent).toBe('Add a key');
    btn.click();
    expect(app.state.pane).toBe('settings');
  });
});

describe('the basic layout reads like a page', () => {
  it('drops unit tables, charts time series, and names the place in the subtitle', async () => {
    const app = await boot();
    const spec = app.buildFallbackSpec(WEATHER, 'https://api.open-meteo.com/v1/forecast');
    const paths = spec.components.map((c) => c.path);
    expect(paths).not.toContain('current_units');
    expect(paths).not.toContain('hourly_units');
    const chart = spec.components.find((c) => c.type === 'chart');
    expect(chart.path).toBe('hourly.temperature_2m');
    expect(chart.label).toBe('Hourly temperature');
    expect(spec.components.some((c) => c.type === 'keyValue' && c.path === 'hourly')).toBe(false);
    expect(spec.subtitle).toBe('13.13° N, 80.25° E · GMT');
    const lat = spec.components.find((c) => c.path === 'latitude');
    expect(lat.emphasis).toBe('quiet');
  });

  it('folds bookkeeping into Details at the foot of the page', async () => {
    const app = await boot();
    app.state.data = WEATHER;
    app.state.url = 'https://api.open-meteo.com/v1/forecast';
    app.applySpec(app.normalizeSpec(app.buildFallbackSpec(WEATHER, app.state.url)), 'fallback');
    const details = app.dom.interfaceOut.querySelector('details.spec-details');
    expect(details).toBeTruthy();
    expect(details.textContent).toContain('Generationtime ms');
    // The values the reader came for stay on the page itself.
    const onPage = [...app.dom.interfaceOut.querySelectorAll('.spec-section')].map((n) => n.textContent).join(' ');
    expect(onPage).toContain('Temperature');
    expect(onPage).not.toContain('Generationtime');
    expect(app.dom.interfaceOut.querySelector('.stage-sub').textContent).toContain('80.25° E');
  });

  it('treats quiet fields and unit tables as bookkeeping', async () => {
    const app = await boot();
    expect(app.isBookkeeping({ type: 'text', path: 'x', emphasis: 'quiet' })).toBe(true);
    expect(app.isBookkeeping({ type: 'keyValue', path: 'current_units' })).toBe(true);
    expect(app.isBookkeeping({ type: 'metric', path: 'current.temperature_2m' })).toBe(false);
  });

  it('labels drop the measuring height and bare identifiers read as names', async () => {
    const app = await boot();
    expect(app.humanize('temperature_2m')).toBe('Temperature');
    expect(app.humanize('wind_speed_10m')).toBe('Wind speed');
    expect(app.humanize('base_stat')).toBe('Base stat');
    expect(app.buildFallbackSpec({ name: 'pikachu', id: 25 }, 'https://a.test/p').title).toBe('Pikachu');
    expect(app.buildFallbackSpec({ name: 'Mr. Mime' }, 'https://a.test/p').title).toBe('Mr. Mime');
  });
});

describe('landing specimen', () => {
  // The old hero was decoration (floating, unrelated cards). The new one is a
  // real response beside the interface it becomes, for three examples.
  it('the switcher swaps both halves and the URL together', async () => {
    const app = await boot();
    const doc = app.window.document;
    const pane = (n) => doc.querySelector(`.spec-pane[data-example="${n}"]`);
    expect(pane('pokemon').hidden).toBe(false);
    expect(pane('weather').hidden).toBe(true);
    doc.querySelector('.specimen-switch [data-example="weather"]').click();
    expect(pane('weather').hidden).toBe(false);
    expect(pane('pokemon').hidden).toBe(true);
    expect(doc.getElementById('specimenUrl').textContent).toContain('open-meteo');
    expect(doc.querySelector('.specimen-switch [data-example="weather"]').getAttribute('aria-selected')).toBe('true');
  });

  it('Try an example opens the app on the example that is showing', async () => {
    const calls = [];
    const app = await boot({ fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    app.window.document.querySelector('.specimen-switch [data-example="library"]').click();
    app.dom.landingTry.click();
    await flush();
    expect(app.state.view).toBe('app');
    expect(calls.some((u) => u.indexOf('openlibrary.org') !== -1)).toBe(true);
    expect(app.getPrefs().onboarded).toBe(true);
  });
});
