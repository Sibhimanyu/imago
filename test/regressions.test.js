/* One test per critical finding fixed in this branch. Each asserts the
   behaviour that was broken, so a regression fails here rather than in a
   user's browser. */
import { describe, it, expect, vi } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

function quotaError() {
  const e = new Error('quota'); e.name = 'QuotaExceededError'; return e;
}

/* jsdom's Storage is a Proxy that turns `storage.setItem = fn` into a stored
   KEY named "setItem" rather than a method override, so the stub has to go on
   Storage.prototype. */
function stubSetItem(app, impl) {
  return vi.spyOn(app.window.Storage.prototype, 'setItem').mockImplementation(impl);
}

describe('storage quota (writeJSON)', () => {
  it('sheds snapshots and reports, instead of throwing ReferenceError', async () => {
    // writeJSON called setStatusMessage(), which was defined nowhere, so the
    // first quota error threw straight out of a successful request.
    const app = await boot();
    let calls = 0;
    const spy = stubSetItem(app, function (k, v) {
      calls += 1;
      if (calls === 1) throw quotaError();
      return undefined;
    });
    let out;
    expect(() => { out = app.writeJSON('imago.preferences', { a: 1 }); }).not.toThrow();
    expect(out).toBe(true);
    expect(calls).toBe(2);          // it really did retry after shedding
    spy.mockRestore();
  });

  it('returns false rather than throwing when the retry also fails', async () => {
    const app = await boot();
    const spy = stubSetItem(app, () => { throw quotaError(); });
    let out;
    expect(() => { out = app.writeJSON('imago.preferences', { a: 1 }); }).not.toThrow();
    expect(out).toBe(false);
    spy.mockRestore();
  });
});

describe('credentials are never replayed cross-origin', () => {
  it('drops custom headers when the follow target is another host', async () => {
    const seen = [];
    const app = await boot({
      fetch: (url, init) => {
        seen.push({ url, headers: (init && init.headers) || {} });
        return jsonFetch({ ok: 1 })();
      }
    });
    app.state.url = 'https://a.test/one';
    app.state.headersText = 'Authorization: Bearer SECRET';
    app.dom.headersInput.value = 'Authorization: Bearer SECRET';
    app.state.stage = true;

    app.followUrl('https://evil.test/collect');
    await flush();

    const hit = seen.find((s) => String(s.url).includes('evil.test'));
    expect(hit, 'the follow should have been attempted').toBeTruthy();
    expect(JSON.stringify(hit.headers)).not.toContain('SECRET');
  });

  it('keeps headers when the follow target is the same origin', async () => {
    const seen = [];
    const app = await boot({
      fetch: (url, init) => {
        seen.push({ url, headers: (init && init.headers) || {} });
        return jsonFetch({ ok: 1 })();
      }
    });
    app.state.url = 'https://a.test/one';
    app.state.headersText = 'Authorization: Bearer SECRET';
    app.dom.headersInput.value = 'Authorization: Bearer SECRET';
    app.state.stage = true;

    app.followUrl('https://a.test/two');
    await flush();

    const hit = seen.find((s) => String(s.url).includes('a.test/two'));
    expect(hit).toBeTruthy();
    expect(JSON.stringify(hit.headers)).toContain('SECRET');
  });
});

describe('credentials are not persisted to localStorage', () => {
  it('savePrefs keeps header text out of the durable store', async () => {
    const app = await boot();
    app.state.headersText = 'Authorization: Bearer SECRET';
    app.savePrefs();
    const raw = app.window.localStorage.getItem('imago.preferences') || '';
    expect(raw).not.toContain('SECRET');
    expect(app.window.sessionStorage.getItem('imago.lastHeaders')).toContain('SECRET');
  });

  it('migrates a legacy localStorage copy into the session and scrubs it', async () => {
    const app = await boot({
      local: { 'imago.preferences': { onboarded: true, lastHeadersText: 'Authorization: Bearer OLD' } }
    });
    // init() already ran restoreLastView during boot.
    const raw = app.window.localStorage.getItem('imago.preferences') || '';
    expect(raw).not.toContain('OLD');
    expect(app.window.sessionStorage.getItem('imago.lastHeaders')).toContain('OLD');
  });

  it('strips credential headers from a saved request', async () => {
    const app = await boot();
    app.dom.urlInput.value = 'https://a.test/x';
    app.dom.headersInput.value = 'Authorization: Bearer SECRET\nAccept: application/json';
    app.window.__imago.state.headersText = app.dom.headersInput.value;
    app.dom.saveBtn.click();
    const raw = app.window.localStorage.getItem('imago.savedRequests') || '';
    expect(raw).not.toContain('SECRET');
    expect(raw).toContain('application/json');
  });
});

describe('clear all data actually clears', () => {
  it('does not let the next savePrefs write the headers back', async () => {
    const app = await boot();
    app.state.headersText = 'Authorization: Bearer SECRET';
    app.savePrefs();
    expect(app.window.sessionStorage.getItem('imago.lastHeaders')).toContain('SECRET');

    app.clearAllData();
    app.savePrefs();          // the click, tab change or beforeunload that used to resurrect it

    const prefs = app.window.localStorage.getItem('imago.preferences') || '';
    const session = app.window.sessionStorage.getItem('imago.lastHeaders') || '';
    expect(prefs).not.toContain('SECRET');
    expect(session).not.toContain('SECRET');
    expect(app.state.headersText).toBe('');
  });
});

describe('a scalar JSON body does not crash the renderer', () => {
  for (const body of ['null', '42', '"ok"', 'true']) {
    it(`renders a top-level ${body}`, async () => {
      const app = await boot();
      app.state.data = JSON.parse(body);
      app.state.url = 'https://a.test/health';
      expect(() => app.applySpec(null, 'fallback')).not.toThrow();
      expect(app.state.spec).toBeTruthy();
      expect(app.state.spec.title).toBeTruthy();
    });
  }

  it('minimalSpec is itself renderable', async () => {
    const app = await boot();
    app.state.data = undefined;
    expect(() => app.applySpec(null, 'fallback')).not.toThrow();
  });
});

describe('the request pipeline cannot brick itself', () => {
  it('clears inFlight even if the failure handler throws', async () => {
    // Break the failure handler only AFTER the request is under way —
    // performRequest itself touches interfaceOut on the way in.
    let app;
    app = await boot({
      fetch: () => {
        app.dom.interfaceOut = null;    // handleRequestFailure will now throw
        return Promise.reject(new Error('boom'));
      }
    });
    app.dom.urlInput.value = 'https://a.test/x';

    app.performRequest(false);
    await flush(); await flush(); await flush();

    // The old trailing `.then` was skipped when the handler threw, leaving the
    // app permanently in flight with the send button disabled.
    expect(app.state.inFlight).toBe(false);
    expect(app.dom.sendBtn.disabled).toBe(false);
  });
});

describe('navigation state stays consistent', () => {
  it('a refused navigation leaves the URL bar and stack untouched', async () => {
    const app = await boot();
    app.state.url = 'https://a.test/one';
    app.dom.urlInput.value = 'https://a.test/one';
    app.state.stage = true;
    app.state.inFlight = true;          // something already in flight

    const stackBefore = app.state.stack.length;
    app.followUrl('https://a.test/two');

    expect(app.dom.urlInput.value).toBe('https://a.test/one');
    expect(app.state.stack.length).toBe(stackBefore);
    expect(app.state.url).toBe('https://a.test/one');
  });
});

describe('Back does not desync from browser history', () => {
  it('goBack delegates to history when it owns an entry', async () => {
    const app = await boot();
    app.state.stage = true;
    app.state.historyDepth = 1;
    app.state.stack = [{ url: 'https://a.test/one', headersText: '' }];
    const back = vi.spyOn(app.window.history, 'back').mockImplementation(() => {});

    app.goBack();

    expect(back).toHaveBeenCalledTimes(1);
    // The pop belongs to popstate, not to goBack.
    expect(app.state.stack.length).toBe(1);
  });

  it('popstate pops exactly the number of entries history moved', async () => {
    const app = await boot({ fetch: jsonFetch({ a: 1 }) });
    app.state.stage = true;
    app.state.historyDepth = 2;
    app.state.stack = [
      { url: 'https://a.test/one', headersText: '' },
      { url: 'https://a.test/two', headersText: '' }
    ];
    app.stepBack(1);
    expect(app.state.stack.length).toBe(1);
  });

  it('leaving the stage abandons the nav stack', async () => {
    const app = await boot();
    app.state.stage = true;
    app.state.stack = [{ url: 'https://a.test/one', headersText: '' }];
    app.leaveStage();
    expect(app.state.stack).toHaveLength(0);
  });
});

describe('heavy panes are not built for hidden tabs', () => {
  it('marks Raw dirty instead of rendering it while another tab is active', async () => {
    const app = await boot({ fetch: jsonFetch({ a: 1, b: [1, 2, 3] }) });
    app.state.tab = 'interface';
    app.dom.urlInput.value = 'https://a.test/x';

    app.performRequest(false);
    await flush(); await flush(); await flush();

    expect(app.state.rawPaneDirty).toBe(true);
    expect(app.dom.rawOut.innerHTML).toBe('');

    app.setActiveTab('raw');
    expect(app.state.rawPaneDirty).toBe(false);
    expect(app.dom.rawOut.innerHTML.length).toBeGreaterThan(0);
  });
});

describe('snapshot store is read through a cache', () => {
  it('serves repeated reads without re-parsing localStorage', async () => {
    const app = await boot();
    app.setSnapshots({ k: [{ id: 's1', data: { a: 1 } }] });
    const spy = vi.spyOn(app.window.localStorage, 'getItem');
    app.getSnapshots(); app.getSnapshots(); app.getSnapshots();
    const snapReads = spy.mock.calls.filter((c) => c[0] === 'imago.snapshots');
    expect(snapReads.length).toBe(0);
  });

  it('stops serving a store the quota path dropped', async () => {
    const app = await boot();
    app.setSnapshots({ k: [{ id: 's1' }] });
    expect(app.getSnapshots().k).toBeTruthy();
    app.invalidateSnapshotCache();
    app.window.localStorage.removeItem('imago.snapshots');
    expect(app.getSnapshots()).toEqual({});
  });
});

describe('a model call that races a refresh is discarded', () => {
  it('does not cache a spec under a hash the data no longer has', async () => {
    const app = await boot();
    app.state.data = { a: 1 };
    app.state.schemaHash = 'NEWHASH';        // an auto-refresh already moved the shape
    app.setSessionKey('AIzaTESTKEY');

    app.window.fetch = jsonFetch({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        title: 'Designed', components: [{ type: 'jsonBlock', path: '' }]
      }) }] } }]
    });

    // The call was started for OLDHASH, before the refresh landed.
    await app.callGemini('https://a.test/x', { hash: 'OLDHASH', schema: { a: 'number' } });

    const store = app.getSchemaSpecs();
    expect(store.OLDHASH, 'must not cache a plan under a hash the body no longer has')
      .toBeUndefined();
    expect(store.NEWHASH, 'and must not mis-file it under the new hash either')
      .toBeUndefined();
    expect(app.state.generating).toBe(false);
  });

  it('caches normally when the shape did not move', async () => {
    const app = await boot();
    app.state.data = { a: 1 };
    app.state.schemaHash = 'SAMEHASH';
    app.setSessionKey('AIzaTESTKEY');

    app.window.fetch = jsonFetch({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        title: 'Designed', components: [{ type: 'jsonBlock', path: '' }]
      }) }] } }]
    });

    await app.callGemini('https://a.test/x', { hash: 'SAMEHASH', schema: { a: 'number' } });

    expect(app.getSchemaSpecs().SAMEHASH).toBeTruthy();
    expect(app.state.spec.title).toBe('Designed');
    expect(app.state.generating).toBe(false);
  });
});

describe('last-resort spec guard', () => {
  it('minimalSpec survives normalisation and renders', async () => {
    // applySpec falls back to this when even buildFallbackSpec normalises away.
    // Today C4a keeps that unreachable for every known body, so this asserts
    // the guard itself is sound rather than waiting for a shape to prove it.
    const app = await boot();
    const spec = app.minimalSpec();
    expect(app.normalizeSpec(spec)).not.toBeNull();
    app.state.data = { anything: 1 };
    expect(() => app.applySpec(spec, 'fallback')).not.toThrow();
    expect(app.dom.interfaceOut.textContent).toContain('Response');
  });
});

describe('clearing data drops the snapshot cache', () => {
  it('stops serving snapshots from memory after a clear', async () => {
    const app = await boot();
    app.setSnapshots({ 'https://a.test/x': [{ id: 's1', data: { a: 1 } }] });
    expect(Object.keys(app.getSnapshots())).toHaveLength(1);

    app.clearAllData();

    // Without the invalidation the in-memory copy outlived the storage wipe,
    // so the Snapshots pane kept showing data the user had just deleted.
    expect(app.getSnapshots()).toEqual({});
    expect(app.window.localStorage.getItem('imago.snapshots')).toBeNull();
  });
});

describe('a follow that fails leaves no phantom entry', () => {
  it('rolls back the stack push as well as the URL', async () => {
    const app = await boot({ fetch: () => Promise.reject(new Error('CORS')) });
    app.state.url = 'https://a.test/one';
    app.dom.urlInput.value = 'https://a.test/one';
    app.state.stage = true;
    const stackBefore = app.state.stack.length;
    const depthBefore = app.state.historyDepth;

    app.followUrl('https://a.test/two');
    await flush(); await flush(); await flush();

    // Otherwise Back pops an entry for a page that never rendered, and the
    // reader sees nothing happen.
    expect(app.state.stack.length).toBe(stackBefore);
    expect(app.state.historyDepth).toBe(depthBefore);
    expect(app.state.url).toBe('https://a.test/one');
    expect(app.dom.urlInput.value).toBe('https://a.test/one');
  });
});
