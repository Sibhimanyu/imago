import { DEFAULT_PROVIDER, KEYS, PROVIDERS, PROVIDER_IDS, SESSION, STORE, providerNeedsKey } from './config.js';
import { state } from './state.js';
import { toast } from './ui.js';
import { latestSnapshotWithData, pushSnapshot, tick } from './request.js';

/* ── Storage helpers ───────────────────────────────────────────────────── */

function readJSON(storeKey, fallback) {
  try {
    var raw = window.localStorage.getItem(storeKey);
    if (!raw) return fallback;
    var parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (err) {
    return fallback;
  }
}

function writeJSON(storeKey, value) {
  try {
    window.localStorage.setItem(storeKey, JSON.stringify(value));
    return true;
  } catch (err) {
    // Most likely QuotaExceededError. Shed snapshots first — they are the
    // bulkiest and the most disposable thing we keep.
    try {
      window.localStorage.removeItem(STORE.snaps);
      snapshotCache = null;   // the store we just dropped must not be served from cache
      window.localStorage.setItem(storeKey, JSON.stringify(value));
      toast('Storage was full — older snapshots were dropped.', 'warn');
      return true;
    } catch (err2) {
      toast('Browser storage is full. Nothing was saved.', 'error');
      return false;
    }
  }
}

function getSavedRequests() {
  var list = readJSON(STORE.requests, []);
  return Array.isArray(list) ? list : [];
}
function setSavedRequests(list) { return writeJSON(STORE.requests, list); }

function getSchemaSpecs() {
  var map = readJSON(STORE.specs, {});
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}
function setSchemaSpecs(map) { return writeJSON(STORE.specs, map); }

// The snapshot store is the bulkiest thing we keep and it was being fully
// parsed and re-serialised several times per request (pushSnapshot, then
// latestSnapshotWithData, then the Snapshots pane). localStorage is
// synchronous, so on a 10s auto-refresh that blocked the main thread every
// tick. Read through an in-memory cache; write through it.
var snapshotCache = null;

function getSnapshots() {
  if (snapshotCache) return snapshotCache;
  var map = readJSON(STORE.snaps, {});
  snapshotCache = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
  return snapshotCache;
}
function setSnapshots(map) {
  snapshotCache = map;
  var ok = writeJSON(STORE.snaps, map);
  // writeJSON drops the whole snapshot store to recover from a quota error,
  // so the cache must not keep serving what is no longer on disk.
  if (!ok) snapshotCache = null;
  return ok;
}

function invalidateSnapshotCache() { snapshotCache = null; }

function getPrefs() {
  var p = readJSON(STORE.prefs, {});
  return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
}
function setPrefs(p) { return writeJSON(STORE.prefs, p); }

function savePrefs() {
  // Merge, never replace: `onboarded` lives here too and must survive.
  var prefs = getPrefs();
  prefs.activeRequestId = state.activeRequestId;
  prefs.refreshIntervalMs = state.refreshIntervalMs;
  prefs.activeTab = state.tab;
  prefs.lastUrl = state.url;
  prefs.builder = state.builder;
  // Request headers are where users put `Authorization: Bearer ...`. They get
  // the same treatment as the API key: session storage, gone when the tab is.
  delete prefs.lastHeadersText;
  prefs.stage = state.stagePref;
  setPrefs(prefs);
  setSessionHeaders(state.headersText);
}

function getSessionHeaders() {
  try { return window.sessionStorage.getItem(SESSION.headers) || ''; }
  catch (err) { return ''; }
}

function setSessionHeaders(value) {
  try {
    if (value) window.sessionStorage.setItem(SESSION.headers, value);
    else window.sessionStorage.removeItem(SESSION.headers);
  } catch (err) { /* private mode — headers simply do not persist */ }
}

function getProviderKey(id) {
  if (!PROVIDERS[id]) return '';
  try { return window.localStorage.getItem(KEYS[id]) || ''; }
  catch (e) { return ''; }
}

function setProviderKey(id, value) {
  if (!PROVIDERS[id]) return;
  try {
    if (value) window.localStorage.setItem(KEYS[id], value);
    else window.localStorage.removeItem(KEYS[id]);
  } catch (e) { /* private mode — key simply does not persist */ }
}

// The key that will actually be sent: the active provider's slot.
function getActiveKey() {
  return getProviderKey(getSessionProvider());
}

function hasAnyKey() {
  for (var i = 0; i < PROVIDER_IDS.length; i += 1) {
    if (providerNeedsKey(PROVIDER_IDS[i]) && getProviderKey(PROVIDER_IDS[i])) return true;
  }
  return false;
}

// A provider is usable when it holds a key, or when it never needed one.
function providerUsable(id) {
  return !providerNeedsKey(id) || !!getProviderKey(id);
}

function getSessionProvider() {
  try {
    var p = window.sessionStorage.getItem(SESSION.provider);
    if (p && PROVIDERS[p]) return p;
  } catch (e) { /* ignore */ }
  var prefs = getPrefs();
  if (prefs.provider && PROVIDERS[prefs.provider]) return prefs.provider;
  // No explicit choice: prefer the provider that actually has a key.
  for (var i = 0; i < PROVIDER_IDS.length; i += 1) {
    if (getProviderKey(PROVIDER_IDS[i])) return PROVIDER_IDS[i];
  }
  return DEFAULT_PROVIDER;
}

function setSessionProvider(id) {
  if (!PROVIDERS[id]) return;
  try { window.sessionStorage.setItem(SESSION.provider, id); } catch (e) { /* ignore */ }
  var prefs = getPrefs();
  prefs.provider = id;
  setPrefs(prefs);
}
function getSessionModel() {
  try { return window.sessionStorage.getItem(SESSION.model) || ''; } catch (e) { return ''; }
}
function setSessionModel(value) {
  try {
    if (value) window.sessionStorage.setItem(SESSION.model, value);
    else window.sessionStorage.removeItem(SESSION.model);
  } catch (e) { /* ignore */ }
}

export { readJSON, writeJSON, getSavedRequests, setSavedRequests, getSchemaSpecs, setSchemaSpecs, snapshotCache, getSnapshots, setSnapshots, invalidateSnapshotCache, getPrefs, setPrefs, savePrefs, getSessionHeaders, setSessionHeaders, getProviderKey, setProviderKey, getActiveKey, hasAnyKey, providerUsable, getSessionProvider, setSessionProvider, getSessionModel, setSessionModel };
