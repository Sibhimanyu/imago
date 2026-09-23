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
    const btn = app.dom.interfaceOut.querySelector('.keyline-action');
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

/* ── Ship audit: the branches the tests above leave uncovered ─────────────── */

const escape = (app, target) => {
  const t = target || app.window.document;
  t.dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
};

describe('sheets, the other paths', () => {
  it('Endpoints opens as a sheet, the rail close button shuts it, and an unknown pane means the page', async () => {
    const app = await boot();
    const body = app.window.document.body;
    app.setAppPane('saved');
    expect(body.classList.contains('sheet-saved')).toBe(true);
    expect(body.classList.contains('sheet-settings')).toBe(false);
    expect(app.dom.sheetScrim.hidden).toBe(false);
    expect(app.dom.appNav.querySelector('[data-view="saved"]').getAttribute('aria-pressed')).toBe('true');
    expect(app.dom.appNav.querySelector('[data-view="playground"]').getAttribute('aria-pressed')).toBe('false');
    app.dom.railClose.click();
    expect(app.state.pane).toBe('playground');
    expect(body.classList.contains('sheet-saved')).toBe(false);
    app.setAppPane('settings');
    app.setAppPane('nonsense');
    expect(app.state.pane).toBe('playground');
    expect(app.dom.sheetScrim.hidden).toBe(true);
    expect(app.dom.paneSettings.hidden).toBe(true);
  });

  it('an Escape something else already handled closes nothing', async () => {
    const app = await boot();
    app.setAppPane('settings');
    const body = app.window.document.body;
    body.addEventListener('keydown', (e) => e.preventDefault());
    escape(app, body);
    expect(app.state.pane).toBe('settings');
  });

  it('with no sheet and no inspector, Escape steps back along the trail', async () => {
    const app = await boot({ fetch: jsonFetch({ a: 1 }) });
    app.state.stage = true;
    app.state.historyDepth = 0;
    app.state.url = 'https://a.test/next';
    app.state.stack = [{ url: 'https://a.test/prev', headersText: '' }];
    escape(app);
    expect(app.state.stack).toHaveLength(0);
    expect(app.dom.urlInput.value).toBe('https://a.test/prev');
  });
});

describe('inspector toggle', () => {
  it('Inspect closes an open inspector, and opens on Changes when nothing was inspected yet', async () => {
    const app = await boot();
    app.state.data = { a: 1 };
    app.updateMeta();
    app.dom.inspectBtn.click();
    expect(app.state.tab).toBe('changes');
    app.dom.inspectBtn.click();
    expect(app.state.tab).toBe('interface');
    expect(app.window.document.body.classList.contains('inspector-open')).toBe(false);
  });
});

describe('trail after a failed navigation', () => {
  it('rollback puts the URL box, Save and the trail back to the page on screen', async () => {
    const app = await boot();
    app.state.stage = true;
    app.state.stack = [{ url: 'https://a.test/0', headersText: '' }, { url: 'https://a.test/1', headersText: '' }];
    app.rollbackNavigation({ url: 'https://a.test/0', urlInput: '', headersInput: '', headersText: '', stackLength: 0, historyDepth: 0 });
    expect(app.state.stack).toHaveLength(0);
    expect(app.dom.stageBar.hidden).toBe(true);
    expect(app.dom.stageCrumb.textContent).toBe('a.test');
    expect(app.dom.saveBtn.getAttribute('aria-disabled')).toBe('true');

    // Off stage the trail stays hidden whatever is on the stack.
    app.state.stage = false;
    app.state.url = 'https://a.test/x';
    app.state.stack = [{ url: 'https://a.test/0', headersText: '' }];
    app.rollbackNavigation({ url: 'https://a.test/x', urlInput: 'https://a.test/x', headersInput: '', headersText: '', stackLength: 1, historyDepth: 0 });
    expect(app.dom.stageBar.hidden).toBe(true);
    expect(app.dom.stageCrumb.textContent).not.toContain('back');
  });
});

describe('history strip, the other paths', () => {
  it('stays hidden when nothing is on screen, even with stored fetches', async () => {
    const app = await boot();
    app.state.url = 'https://a.test/x';
    app.state.data = { a: 1 };
    const key = app.currentRequestKey();
    app.setSnapshots({ [key]: [{ id: '1', fetchedAt: '2026-09-20T08:00:00Z' }, { id: '2', fetchedAt: '2026-09-20T08:01:00Z' }] });
    app.state.data = null;
    app.renderHistory();
    expect(app.dom.historyStrip.hidden).toBe(true);
  });

  it('counts fetches, names how many changed, and labels each tick', async () => {
    const app = await boot();
    app.state.url = 'https://a.test/x';
    app.state.data = { a: 1 };
    app.setSnapshots({ [app.currentRequestKey()]: [
      { id: '1', fetchedAt: '2026-09-20T08:00:00Z', changed: 0 },
      { id: '2', fetchedAt: '2026-09-20T08:00:30Z', changed: 4 },
      { id: '3', fetchedAt: '2026-09-20T08:01:00Z', changed: 0, data: { a: 1 } }
    ] });
    app.renderHistory();
    const strip = app.dom.historyStrip;
    expect(strip.querySelector('.history-count').textContent).toBe('3 fetches');
    expect(strip.querySelector('.history-hot').textContent).toBe('1 changed something');
    const ticks = strip.querySelectorAll('.history-tick');
    expect(ticks[0].getAttribute('aria-label')).toContain('no change');
    expect(ticks[1].getAttribute('aria-label')).toContain('4 changed');
    expect(ticks[2].getAttribute('aria-label')).toContain('on screen');
    expect(strip.querySelector('.history-foot').textContent).toContain('now');

    // With no changed fetch there is no "changed something" note.
    app.setSnapshots({ [app.currentRequestKey()]: [
      { id: '1', fetchedAt: '2026-09-20T08:00:00Z', changed: 0 },
      { id: '2', fetchedAt: '2026-09-20T08:00:30Z', changed: 0, data: { a: 1 } }
    ] });
    app.renderHistory();
    expect(app.dom.historyStrip.querySelector('.history-hot')).toBeNull();
  });

  it('a fetch that changes the body records its change count and lights a tick', async () => {
    let n = 0;
    const app = await boot({ fetch: (u) => jsonFetch({ a: ++n })(u) });
    app.dom.urlInput.value = 'https://a.test/x';
    app.performRequest(false);
    await flush(); await flush(); await flush();
    app.performRequest(false);
    await flush(); await flush(); await flush();
    const snaps = app.getSnapshotsFor(app.currentRequestKey());
    expect(snaps).toHaveLength(2);
    expect(snaps[snaps.length - 1].changed).toBeGreaterThan(0);
    expect(app.dom.historyStrip.hidden).toBe(false);
    expect(app.dom.historyStrip.querySelectorAll('.history-tick.is-changed')).toHaveLength(1);
  });
});

describe('endpoint rail, the other paths', () => {
  const SAVED = { 'imago.savedRequests': [
    { id: 'r1', name: 'Weather', url: 'https://a.test/w', createdAt: '2026-09-20T08:00:00Z' },
    { id: 'r2', name: 'Other', url: 'https://b.test/o', createdAt: '2026-09-19T08:00:00Z' }
  ] };

  it('matches the row on screen by its id as well as its URL, and dates the rest', async () => {
    const app = await boot({ local: SAVED });
    app.state.data = { a: 1 };
    app.state.url = 'https://elsewhere.test/';
    app.state.activeRequestId = 'r2';
    app.state.changedCount = 0;
    app.state.refreshIntervalMs = 0;
    app.renderSavedList();
    const active = app.dom.savedList.querySelector('.saved-item.is-active');
    expect(active.textContent).toContain('Other');
    expect(active.querySelector('.saved-open').getAttribute('aria-current')).toBe('page');
    // Nothing changed and nothing watched: the active row carries no badge.
    expect(active.querySelector('.saved-status').childNodes).toHaveLength(0);
    const other = [...app.dom.savedList.querySelectorAll('.saved-item')].find((li) => li !== active);
    expect(other.querySelector('.saved-when')).toBeTruthy();
    expect(other.querySelector('.saved-url').textContent).toBe('a.test');

    // Nothing is active while no response is on screen.
    app.state.data = null;
    app.state.url = 'https://a.test/w';
    app.renderSavedList();
    expect(app.dom.savedList.querySelector('.is-active')).toBeNull();
  });

  it('the delete button removes the endpoint', async () => {
    const app = await boot({ local: SAVED });
    app.renderSavedList();
    app.dom.savedList.querySelector('.saved-delete[aria-label="Delete Weather"]').click();
    expect(app.getSavedRequests().map((r) => r.id)).toEqual(['r2']);
    expect(app.dom.savedList.querySelectorAll('.saved-item')).toHaveLength(1);
  });

  it('turning auto-refresh on lights the live dot without another render call', async () => {
    const app = await boot({ local: SAVED });
    app.state.data = { a: 1 };
    app.state.url = 'https://a.test/w';
    app.renderSavedList();
    expect(app.dom.savedList.querySelector('.saved-live')).toBeNull();
    app.dom.refreshToggle.setAttribute('aria-checked', 'false');
    app.dom.refreshToggle.click();
    expect(app.dom.savedList.querySelector('.saved-live')).toBeTruthy();
  });

  it('an example tapped from under a sheet closes the sheet and starts a fresh trail', async () => {
    const app = await boot({ fetch: jsonFetch({ a: 1 }) });
    app.setAppPane('settings');
    app.state.stack = [{ url: 'https://a.test/prev', headersText: '' }];
    app.dom.railExamples.querySelector('.rail-example').click();
    expect(app.state.pane).toBe('playground');
    expect(app.state.stack).toHaveLength(0);
  });
});

describe('New request', () => {
  it('empties the command bar, the trail and the active endpoint', async () => {
    const app = await boot({ local: { 'imago.savedRequests': [
      { id: 'r1', name: 'Weather', url: 'https://a.test/w', createdAt: '2026-09-20T08:00:00Z' }
    ] } });
    app.state.data = { a: 1 };
    app.state.url = 'https://elsewhere.test/';
    app.state.activeRequestId = 'r1';
    app.state.stack = [{ url: 'https://a.test/prev', headersText: '' }];
    app.setUrlInput('https://a.test/w');
    app.renderSavedList();
    expect(app.dom.savedList.querySelector('.is-active')).toBeTruthy();
    app.dom.newRequestBtn.click();
    expect(app.dom.urlInput.value).toBe('');
    expect(app.state.stack).toHaveLength(0);
    expect(app.state.activeRequestId).toBeNull();
    expect(app.dom.saveBtn.getAttribute('aria-disabled')).toBe('true');
    expect(app.dom.savedList.querySelector('.is-active')).toBeNull();
  });
});

describe('first run, the other paths', () => {
  it('a first visit with a URL already typed does not load an example over it', async () => {
    const calls = [];
    const app = await boot({ fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    app.dom.urlInput.value = 'https://mine.test/api';
    app.enterApp();
    await flush();
    expect(calls).toHaveLength(0);
    expect(app.dom.urlInput.value).toBe('https://mine.test/api');

    // Try an example with no switch pressed opens the first example.
    const calls2 = [];
    const app2 = await boot({ fetch: (url) => { calls2.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    app2.dom.landingTry.click();
    await flush();
    expect(calls2).toContain(app2.DEMOS[0].url);
  });

  it('a remembered URL makes Save live on load; none leaves it unavailable', async () => {
    const withUrl = await boot({ local: { 'imago.preferences': { onboarded: true, lastUrl: 'https://a.test/x' } } });
    expect(withUrl.dom.saveBtn.getAttribute('aria-disabled')).toBe('false');
    const without = await boot({ local: { 'imago.preferences': { onboarded: true } } });
    expect(without.dom.saveBtn.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('the basic layout, the other paths', () => {
  it('southern and western coordinates read S and W, and no timezone means no separator', async () => {
    const app = await boot();
    const spec = app.buildFallbackSpec({ latitude: -33.8688, longitude: -151.2093, temp: 20 }, 'https://a.test/w');
    expect(spec.subtitle).toBe('33.87° S, 151.21° W');

    // A hyphenated identifier title reads as words; a unit table with nothing
    // to describe stays on the page.
    const book = app.buildFallbackSpec({ name: 'the-hobbit', price_units: { a: 'USD' } }, 'https://a.test/b');
    expect(book.title).toBe('The hobbit');
    expect(book.components.some((c) => c.path === 'price_units')).toBe(true);
  });

  it('charts at most two series per block, accepts date-only axes, and ignores short ones', async () => {
    const app = await boot();
    const days = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23'];
    const spec = app.buildFallbackSpec({
      daily: { time: days, a_max: [1, 2, 3, 4], b_max: [4, 3, 2, 1], c_max: [5, 5, 5, 5], note: ['x', 'y', 'z', 'w'] },
      short: { time: days.slice(0, 3), v: [1, 2, 3] }
    }, 'https://a.test/d');
    const charts = spec.components.filter((c) => c.type === 'chart').map((c) => c.path);
    expect(charts).toEqual(['daily.a_max', 'daily.b_max']);
    expect(charts.some((p) => p.indexOf('short') === 0)).toBe(false);
  });

  it('bookkeeping goes by the last path segment; Details counts one field in the singular and files tables into its grid', async () => {
    const app = await boot();
    expect(app.isBookkeeping({ type: 'text' })).toBe(false);
    expect(app.isBookkeeping({ type: 'keyValue', path: 'meta.units' })).toBe(true);
    expect(app.isBookkeeping({ type: 'text', path: 'myunits' })).toBe(false);

    app.state.data = { temp: 20, temp_units: { temp: 'C' } };
    app.state.url = 'https://a.test/w';
    app.applySpec(app.normalizeSpec({ title: 'T', layout: 'dashboard', components: [
      { type: 'metric', path: 'temp', label: 'Temp' },
      { type: 'keyValue', path: 'temp_units', label: 'Units' }
    ] }), 'generated');
    const details = app.dom.interfaceOut.querySelector('details.spec-details');
    expect(details.querySelector('.spec-details-hint').textContent).toBe('1 more field · units');
    expect(details.querySelector('.spec-grid').childNodes).toHaveLength(1);
    expect(details.querySelector('.fact-strip')).toBeNull();
  });

  it('Details names at most five fields, and a hero is never tucked away', async () => {
    const app = await boot();
    const data = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, big: { units: 7 } };
    app.state.data = data;
    app.state.url = 'https://a.test/w';
    const quiet = ['a', 'b', 'c', 'd', 'e', 'f'].map((k) => ({ type: 'metric', path: k, label: 'F' + k, emphasis: 'quiet' }));
    app.applySpec(app.normalizeSpec({ title: 'T', layout: 'dashboard', components: [
      { type: 'metric', path: 'big.units', label: 'Hero', emphasis: 'hero' }
    ].concat(quiet) }), 'generated');
    const hint = app.dom.interfaceOut.querySelector('.spec-details-hint').textContent;
    expect(hint).toBe('6 more fields · fa, fb, fc, fd, fe');
    const details = app.dom.interfaceOut.querySelector('details.spec-details');
    expect(details.textContent).not.toContain('Hero');
    expect(app.dom.interfaceOut.textContent).toContain('Hero');
  });
});

describe('failure alerts stay red', () => {
  it('a failed refresh over a rendered page shows a red alert with no action', async () => {
    const app = await boot();
    app.state.data = { a: 1 };
    app.state.url = 'https://a.test/x';
    app.applySpec(app.normalizeSpec(app.buildFallbackSpec({ a: 1 }, app.state.url)), 'fallback');
    app.handleRequestFailure({ title: 'Boom', detail: 'went wrong' }, true);
    const alert = app.dom.interfaceOut.querySelector('.alert');
    expect(alert.textContent).toContain('Auto-refresh failed');
    expect(alert.classList.contains('alert-note')).toBe(false);
    expect(alert.querySelector('.alert-action')).toBeNull();
  });
});

describe('review fixes', () => {
  // The Settings button holds an icon and a label; a click lands on those,
  // not on the button that carries data-view.
  it('a click on the Settings icon opens Settings', async () => {
    const app = await boot();
    const svg = app.dom.appNav.querySelector('[data-view="settings"] svg');
    svg.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true }));
    expect(app.dom.paneSettings.hidden).toBe(false);
  });

  it('the brand answers Enter and Space like the button it claims to be', async () => {
    const app = await boot();
    for (const key of ['Enter', ' ']) {
      app.setAppPane('settings');
      app.dom.brandHome.dispatchEvent(new app.window.KeyboardEvent('keydown', { key, bubbles: true }));
      expect(app.dom.paneSettings.hidden).toBe(true);
    }
  });

  // A reload with an inspector tab saved but no body to restore used to open
  // an inspector with no tab bar to close it and no Inspect button.
  it('a reload with nothing to restore does not reopen the inspector', async () => {
    const app = await boot({ local: { 'imago.preferences': { onboarded: true, activeTab: 'changes', lastUrl: 'https://gone.test/x' } } });
    expect(app.window.document.body.classList.contains('inspector-open')).toBe(false);
    expect(app.state.tab).toBe('interface');
  });

  // HTML-builder pages refresh the history strip too, like spec pages.
  it('an HTML page redraws the history strip', async () => {
    const app = await boot();
    app.state.builder = 'html';
    app.state.url = 'https://a.test/x';
    app.state.data = { a: 1 };
    app.setSnapshots({ [app.currentRequestKey()]: [
      { id: '1', fetchedAt: '2026-09-20T08:00:00Z', changed: 0 },
      { id: '2', fetchedAt: '2026-09-20T08:00:30Z', changed: 1, data: { a: 1 } }
    ] });
    app.dom.historyStrip.hidden = true;
    app.applyHtml('<!doctype html><p>x</p>', 'generated');
    expect(app.dom.historyStrip.hidden).toBe(false);
    expect(app.dom.historyStrip.querySelector('.history-count').textContent).toBe('2 fetches');
  });
});

describe('credentials stay with their endpoint', () => {
  function recorder(seen) {
    return (url, init) => { seen.push({ url: String(url), headers: (init && init.headers) || {} }); return jsonFetch({ a: 1 })(url); };
  }

  // The rail's examples are one tap away from any saved endpoint; they must
  // not carry that endpoint's Authorization to a public demo host.
  it('a rail example is fetched without the last endpoint headers', async () => {
    const seen = [];
    const app = await boot({ fetch: recorder(seen) });
    app.state.headersText = 'Authorization: Bearer SECRET';
    app.dom.headersInput.value = 'Authorization: Bearer SECRET';
    app.dom.railExamples.querySelector('button').click();
    await flush();
    expect(seen.length).toBeGreaterThan(0);
    expect(JSON.stringify(seen[seen.length - 1].headers)).not.toContain('SECRET');
  });

  it('New request clears the headers as well as the URL', async () => {
    const app = await boot();
    app.dom.headersInput.value = 'Authorization: Bearer SECRET';
    app.dom.newRequestBtn.click();
    expect(app.dom.headersInput.value).toBe('');
  });

  it('opening an endpoint mid-request leaves the form alone', async () => {
    const app = await boot({ local: { 'imago.savedRequests': [
      { id: 'b', name: 'B', url: 'https://b.test/x', headers: { 'X-Api-Key': 'k' }, createdAt: '2026-09-20T08:00:00Z' }
    ] } });
    app.setUrlInput('https://a.test/x');
    app.state.inFlight = true;
    app.loadSavedRequest('b');
    expect(app.dom.urlInput.value).toBe('https://a.test/x');
    expect(app.dom.headersInput.value).not.toContain('k');
  });
});

describe('one home per control', () => {
  // Watch, refetch and the raw response each live in the toolbar. The page
  // used to repeat them as buttons, which on a phone meant two rows of
  // controls before any data.
  it('the basic layout offers no Watch, Refresh or Raw JSON buttons', async () => {
    const app = await boot();
    app.state.url = 'https://api.open-meteo.com/v1/forecast?current=temperature_2m';
    app.state.data = WEATHER;
    app.applySpec(app.normalizeSpec(app.buildFallbackSpec(WEATHER, app.state.url)), 'fallback');
    expect(app.state.spec.actions).toEqual([]);
    expect(app.dom.interfaceOut.querySelector('.action-row')).toBeNull();
  });

  it('a model plan cannot bring them back, but its links survive', async () => {
    const app = await boot();
    const spec = app.normalizeSpec({
      title: 'T', layout: 'dashboard', components: [{ type: 'text', path: 'a' }],
      actions: [{ type: 'watch', interval: 10 }, { type: 'refresh' }, { type: 'raw' }, { type: 'follow', path: 'next', label: 'Next page' }]
    });
    expect(spec.actions).toEqual([{ type: 'follow', path: 'next', label: 'Next page' }]);
  });
});
