import { DEMOS, KEYS, PROVIDER_IDS, STORE } from './config.js';
import { dom, state } from './state.js';
import { getSavedRequests, getSchemaSpecs, getSnapshots, invalidateSnapshotCache, savePrefs, setPrefs, setSavedRequests, setSessionHeaders } from './storage.js';
import { byteLength, clear, el, formatBytes, formatClock, formatRelative } from './util.js';
import { hashString } from './schema.js';
import { setAppPane, setKeyStatus, syncKeyInputs, toast } from './ui.js';
import { updateMeta } from './chat.js';
import { navigateTo, renderChangesPane, setActiveTab, svgIcon } from './panes.js';
import { getSnapshotsFor, headersToText, markDirty, parseHeaders, performRequest, redactSecretHeaders, tick } from './request.js';

/* ── Saved requests ────────────────────────────────────────────────────── */

// Saved-list avatars carry a letter, not a colour: the semantic set is
// reserved for changed / live / failed, and purple is banned outright.

function currentRequestKey() {
  return state.url ? hashString(state.url) : '';
}

function deriveName(url) {
  try {
    var parsed = new URL(url);
    var segments = parsed.pathname.split('/').filter(Boolean);
    var tail = segments.length ? segments[segments.length - 1] : parsed.hostname;
    tail = decodeURIComponent(tail).replace(/\.(json|xml)$/i, '');
    return (tail || parsed.hostname).slice(0, 44);
  } catch (err) {
    return url.slice(0, 44);
  }
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
}

// The rail and the history strip are rebuilt on every render, and with Watch
// on that is every 10-60s. Rebuilding under a keyboard user's focus dropped
// it to <body>. Controls carry data-focus-key; focus returns to the same key.
function keepFocus(container, rebuild) {
  var active = document.activeElement;
  var key = active && container && container.contains(active) ? active.getAttribute('data-focus-key') : null;
  rebuild();
  if (!key) return;
  var nodes = container.querySelectorAll('[data-focus-key]');
  for (var i = 0; i < nodes.length; i += 1) {
    if (nodes[i].getAttribute('data-focus-key') === key) { nodes[i].focus(); return; }
  }
}

function renderSavedList() {
  keepFocus(dom.savedList, buildSavedList);
}

function buildSavedList() {
  var list = getSavedRequests();
  clear(dom.savedList);
  dom.savedEmpty.hidden = list.length > 0;

  list.sort(function (a, b) {
    return new Date(b.lastUsedAt || b.createdAt) - new Date(a.lastUsedAt || a.createdAt);
  });

  for (var i = 0; i < list.length; i += 1) {
    (function (item) {
      var onScreen = !!state.data && (item.id === state.activeRequestId || item.url === state.url);
      var li = el('li', 'saved-item' + (onScreen ? ' is-active' : ''));

      var open = el('button', 'saved-open');
      open.type = 'button';
      open.title = item.url;
      open.setAttribute('aria-label', 'Open ' + item.name);
      open.setAttribute('data-focus-key', 'open:' + item.id);
      if (onScreen) open.setAttribute('aria-current', 'page');
      open.addEventListener('click', function () { loadSavedRequest(item.id); });

      open.appendChild(el('span', 'saved-avatar', (item.name || '?').charAt(0).toUpperCase()));
      var main = el('span', 'saved-main');
      main.appendChild(el('span', 'saved-name', item.name));
      main.appendChild(el('span', 'saved-url', hostOf(item.url) || item.url));
      open.appendChild(main);

      var status = el('span', 'saved-status');
      if (onScreen && state.changedCount > 0) {
        status.appendChild(el('span', 'saved-changed', String(state.changedCount)));
      }
      if (onScreen && state.refreshIntervalMs) {
        var live = el('span', 'saved-live');
        live.title = 'Watching';
        status.appendChild(live);
      } else if (!onScreen) {
        status.appendChild(el('span', 'saved-when', formatRelative(item.lastUsedAt || item.createdAt)));
      }
      open.appendChild(status);
      li.appendChild(open);

      var del = el('button', 'icon-btn saved-delete danger');
      del.type = 'button';
      del.title = 'Delete';
      del.setAttribute('aria-label', 'Delete ' + item.name);
      del.setAttribute('data-focus-key', 'delete:' + item.id);
      del.appendChild(svgIcon(['M4 6.5h16', 'M9.5 6.5V4.8h5v1.7', 'M6.5 6.5 7.4 20h9.2l.9-13.5'], 14));
      del.addEventListener('click', function () { deleteSavedRequest(item.id); });
      li.appendChild(del);

      dom.savedList.appendChild(li);
    })(list[i]);
  }
}

/* ── History strip ──────────────────────────────────────────────────────
   Time made visible: one tick per stored fetch of this endpoint, yellow
   where that fetch changed something. Only the newest snapshot keeps its
   body, so a tick opens the Changes inspector rather than an old page.
   ---------------------------------------------------------------------- */

function renderHistory() {
  if (dom.historyStrip) keepFocus(dom.historyStrip, buildHistory);
}

function buildHistory() {
  var strip = dom.historyStrip;
  var list = state.data ? getSnapshotsFor(currentRequestKey()) : [];
  clear(strip);
  if (list.length < 2) { strip.hidden = true; return; }
  strip.hidden = false;

  var changedFetches = 0;
  for (var c = 0; c < list.length; c += 1) if (list[c] && list[c].changed > 0) changedFetches += 1;

  var head = el('div', 'history-head');
  head.appendChild(el('span', 'history-title', 'History'));
  head.appendChild(el('span', 'history-count', list.length + ' fetches'));
  if (changedFetches) {
    var hot = el('span', 'history-hot', changedFetches + ' changed something');
    head.appendChild(hot);
  }
  strip.appendChild(head);

  var track = el('div', 'history-track');
  track.setAttribute('role', 'list');
  for (var i = 0; i < list.length; i += 1) {
    (function (snap, isLast) {
      // The list item wraps the button: role=listitem on the button itself
      // replaced its button role, so it was not announced as clickable.
      var item = el('span', 'history-item');
      item.setAttribute('role', 'listitem');
      var tick = el('button', 'history-tick' + (snap.changed > 0 ? ' is-changed' : '') + (isLast ? ' is-now' : ''));
      tick.type = 'button';
      tick.setAttribute('data-focus-key', 'tick:' + (snap.id || snap.fetchedAt));
      var when = snap.fetchedAt ? formatClock(new Date(snap.fetchedAt).getTime()) : '';
      var label = when + (snap.changed > 0 ? ' · ' + snap.changed + ' changed' : ' · no change') + (isLast ? ' · on screen' : '');
      tick.title = label;
      tick.setAttribute('aria-label', label);
      tick.addEventListener('click', function () { setActiveTab('changes'); });
      item.appendChild(tick);
      track.appendChild(item);
    })(list[i], i === list.length - 1);
  }
  strip.appendChild(track);

  var foot = el('div', 'history-foot');
  var first = list[0] && list[0].fetchedAt ? formatClock(new Date(list[0].fetchedAt).getTime()) : '';
  foot.appendChild(el('span', null, first));
  foot.appendChild(el('span', null, 'now'));
  strip.appendChild(foot);
}

// The rail's examples: one tap loads a demo, the same as the picker.
function renderRailExamples() {
  if (!dom.railExamples) return;
  clear(dom.railExamples);
  for (var i = 0; i < DEMOS.length; i += 1) {
    (function (demo) {
      var li = el('li');
      var b = el('button', 'rail-example');
      b.type = 'button';
      b.appendChild(el('span', 'rail-example-name', demo.name));
      b.appendChild(el('span', 'rail-example-host', hostOf(demo.url)));
      b.addEventListener('click', function () { loadExample(demo.url); });
      li.appendChild(b);
      dom.railExamples.appendChild(li);
    })(DEMOS[i]);
  }
}

function loadExample(url) {
  state.stack = [];
  if (state.pane !== 'playground') setAppPane('playground');
  navigateTo(url, '');   // public demo host: the last endpoint's headers stay behind
}

// Every write to the URL box goes through here so Save reads as unavailable
// while there is nothing to save (it used to look live and answer with an
// error toast). aria-disabled, not disabled: the click handler still checks
// the real value, so a stale flag can never block a legitimate save.
function setUrlInput(value) {
  dom.urlInput.value = value;
  syncSaveBtn();
}
function syncSaveBtn() {
  if (!dom.saveBtn || !dom.urlInput) return;
  dom.saveBtn.setAttribute('aria-disabled', dom.urlInput.value.trim() ? 'false' : 'true');
}

function saveCurrentRequest() {
  var url = dom.urlInput.value.trim();
  if (!url) { toast('Enter a URL before saving.', 'error'); return; }

  var list = getSavedRequests();
  // Saved requests live in localStorage, which outlives the tab. Strip the
  // credential headers the same way prefs does; the user re-enters them.
  var split = redactSecretHeaders(parseHeaders(dom.headersInput.value));
  var headers = split.safe;
  var now = new Date().toISOString();

  var existing = null;
  for (var i = 0; i < list.length; i += 1) {
    if (list[i].url === url) { existing = list[i]; break; }
  }

  if (existing) {
    existing.headers = headers;
    existing.lastUsedAt = now;
    state.activeRequestId = existing.id;
    toast('Already saved — updated.', 'ok');
  } else {
    var record = {
      id: 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      name: deriveName(url),
      url: url,
      headers: headers,
      createdAt: now,
      lastUsedAt: now
    };
    list.push(record);
    state.activeRequestId = record.id;
    toast('Saved "' + record.name + '"', 'ok');
  }

  setSavedRequests(list);
  renderSavedList();
  savePrefs();
  if (split.redacted.length) {
    toast(split.redacted.join(', ') + ' not saved — credentials stay in this session.', 'warn');
  }
}

function loadSavedRequest(id) {
  var list = getSavedRequests();
  var found = null;
  for (var i = 0; i < list.length; i += 1) {
    if (list[i].id === id) { found = list[i]; break; }
  }
  if (!found) return;
  // A click mid-request would put B's URL and headers over page A.
  if (state.inFlight) return;

  state.activeRequestId = found.id;
  setUrlInput(found.url);
  dom.headersInput.value = headersToText(found.headers);

  found.lastUsedAt = new Date().toISOString();
  setSavedRequests(list);

  setAppPane('playground');
  markDirty();
  performRequest(false);
}

// One tap deletes (the button sits beside every row), so it can be undone.
function deleteSavedRequest(id) {
  var before = getSavedRequests();
  var index = -1;
  for (var i = 0; i < before.length; i += 1) if (before[i].id === id) index = i;
  if (index === -1) return;
  var removed = before[index];
  var wasActive = state.activeRequestId === id;
  setSavedRequests(before.filter(function (item) { return item.id !== id; }));
  if (wasActive) state.activeRequestId = null;
  renderSavedList();
  savePrefs();
  toast('Deleted ' + removed.name + '.', null, { label: 'Undo', run: function () {
    var now = getSavedRequests();
    now.splice(Math.min(index, now.length), 0, removed);
    setSavedRequests(now);
    if (wasActive) state.activeRequestId = id;
    renderSavedList();
    savePrefs();
  } });
}

function touchSavedRequest(url) {
  var list = getSavedRequests();
  for (var i = 0; i < list.length; i += 1) {
    if (list[i].url === url) {
      list[i].lastUsedAt = new Date().toISOString();
      state.activeRequestId = list[i].id;
      setSavedRequests(list);
      return;
    }
  }
}

// The destructive action users reach for to remove their credentials. It has
// to clear the in-memory state too: savePrefs() runs on the next pane change,
// tab change or `beforeunload`, and would otherwise write the header text
// straight back out of state.
function clearAllData() {
  try {
    window.localStorage.removeItem(STORE.requests);
    window.localStorage.removeItem(STORE.specs);
    window.localStorage.removeItem(STORE.snaps);
    window.localStorage.removeItem(STORE.prefs);
    window.localStorage.removeItem(STORE.edits);
    for (var ki = 0; ki < PROVIDER_IDS.length; ki += 1) {
      window.localStorage.removeItem(KEYS[PROVIDER_IDS[ki]]);
    }
  } catch (err) { /* ignore */ }
  invalidateSnapshotCache();
  setSessionHeaders('');
  syncKeyInputs();
  setKeyStatus();

  state.activeRequestId = null;
  state.diff = null;
  state.changedCount = 0;
  state.headersText = '';
  state.headers = {};
  state.url = '';
  state.stack = [];
  if (dom.headersInput) dom.headersInput.value = '';
  if (dom.urlInput) setUrlInput('');

  // Write a clean prefs object now rather than waiting for the next
  // savePrefs to serialise whatever is still in memory.
  setPrefs({ onboarded: true });

  renderSavedList();
  renderChangesPane();
  renderStorageSummary();
  updateMeta();
}

function renderStorageSummary() {
  var requests = getSavedRequests().length;
  var specs = Object.keys(getSchemaSpecs()).length;
  var snapMap = getSnapshots();
  var snaps = 0;
  for (var key in snapMap) {
    if (Object.prototype.hasOwnProperty.call(snapMap, key)) snaps += snapMap[key].length;
  }
  var bytes = 0;
  try {
    bytes = byteLength(JSON.stringify(snapMap) +
                       window.localStorage.getItem(STORE.specs) +
                       window.localStorage.getItem(STORE.requests));
  } catch (e) { bytes = 0; }

  dom.storageSummary.textContent =
    requests + ' saved request' + (requests === 1 ? '' : 's') + ' · ' +
    specs + ' cached interface' + (specs === 1 ? '' : 's') + ' · ' +
    snaps + ' snapshot' + (snaps === 1 ? '' : 's') + ' · about ' + formatBytes(bytes);
}

export { currentRequestKey, deriveName, hostOf, keepFocus, renderSavedList, buildSavedList, renderHistory, buildHistory, renderRailExamples, loadExample, setUrlInput, syncSaveBtn, saveCurrentRequest, loadSavedRequest, deleteSavedRequest, touchSavedRequest, clearAllData, renderStorageSummary };
