import { LARGE_RESPONSE_BYTES, MAX_CACHED_HTML_BYTES, MAX_SNAPSHOTS, MAX_SNAPSHOT_BYTES, MAX_SNAPSHOT_ENDPOINTS, PROVIDER_IDS, TIMEOUTS, getProvider } from './config.js';
import { dom, state } from './state.js';
import { clearKeyRejected, getActiveKey, getProviderKey, getSavedRequests, getSchemaSpecs, getSessionProvider, getSnapshots, keyRejected, markKeyRejected, providerUsable, savePrefs, setSchemaSpecs, setSessionProvider, setSnapshots } from './storage.js';
import { byteLength, el, formatBytes, isPlainObject } from './util.js';
import { dataSignature, diffData, fingerprint, hashString } from './schema.js';
import { applyHtml, compactSample, generateHtml, generateSpec, normalizeHtmlDoc, providerErrorText } from './llm.js';
import { buildFallbackSpec, endpointTitle, fitTitle, normalizeSpec } from './spec.js';
import { setAppPane, setKeyStatus, syncProviderUi, toast } from './ui.js';
import { updateMeta } from './chat.js';
import { applySpec, leaveStage, navigateTo, renderChangesPane, renderRawPane, renderSchemaPane, resetInterfaceOut, rollbackNavigation, showAlert, showGeneratePrompt, showInterfaceEmpty, showInterfaceLoading } from './panes.js';
import { hostOf, renderHistory, renderSavedList, setUrlInput, touchSavedRequest } from './endpoints.js';
import { noteWatchedChange } from './main.js';

/* ── Headers ───────────────────────────────────────────────────────────── */

// Header names whose values are credentials. Matched case-insensitively
// against the whole name, so `x-api-key` matches but `x-api-version` does not.
var SECRET_HEADER = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|apikey|x-auth-token|auth-token|x-access-token|access-token|x-csrf-token|x-session-token|token|secret|x-secret)$/i;

function sameOrigin(a, b) {
  try { return new URL(a).origin === new URL(b).origin; } catch (err) { return false; }
}

// Splits a header map into the part that is safe to persist and the names of
// the credentials that were withheld. Credentials live in the session only.
function redactSecretHeaders(headers) {
  var safe = {}, redacted = [];
  var names = Object.keys(headers || {});
  for (var i = 0; i < names.length; i += 1) {
    if (SECRET_HEADER.test(names[i].trim())) redacted.push(names[i]);
    else safe[names[i]] = headers[names[i]];
  }
  return { safe: safe, redacted: redacted };
}

function hasSecretHeader(text) {
  return redactSecretHeaders(parseHeaders(text)).redacted.length > 0;
}

// Query parameters whose values are credentials (?api_key=, ?appid=, ?key=
// for Google). Matched against the whole name, like SECRET_HEADER.
var SECRET_PARAM = /^(api[_-]?key|apikey|key|app[_-]?id|appid|app[_-]?key|access[_-]?token|auth[_-]?token|id[_-]?token|refresh[_-]?token|token|auth|secret|client[_-]?secret|password|passwd|pwd|sig|signature|session|session[_-]?id|sessionid|jwt|subscription[_-]?key|x[_-]api[_-]key)$/i;

// Splits a URL's credential parameters from the rest. mode 'mask' keeps
// each name with a placeholder value (for a model, which should know the
// parameter exists); 'strip' removes them (for a link someone else opens).
function secureUrl(url, mode) {
  var out = { url: String(url || ''), removed: [] };
  var parsed;
  try { parsed = new URL(out.url); } catch (err) { return out; }
  var names = [];
  parsed.searchParams.forEach(function (value, name) {
    if (SECRET_PARAM.test(name) && names.indexOf(name) === -1) names.push(name);
  });
  if (!names.length) return out;
  for (var i = 0; i < names.length; i += 1) {
    if (mode === 'mask') parsed.searchParams.set(names[i], 'REDACTED');
    else parsed.searchParams.delete(names[i]);
  }
  out.url = parsed.toString();
  out.removed = names;
  return out;
}

function maskUrlSecrets(url) { return secureUrl(url, 'mask').url; }
function stripUrlSecrets(url) { return secureUrl(url, 'strip'); }

// "pokeapi.co/api/v2/pokemon/ditto" is a URL to everyone but new URL().
// A bare host (with a dot, or localhost) gets a scheme; anything else is
// left for the validator to refuse.
function withScheme(text) {
  var t = String(text || '').trim();
  if (!t || /^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return t;
  if (/^localhost(:\d+)?([/?#]|$)/i.test(t) || /^(127\.0\.0\.1|\[::1\])(:\d+)?([/?#]|$)/.test(t)) return 'http://' + t;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(:\d+)?([/?#]|$)/i.test(t)) return 'https://' + t;
  return t;
}

function parseHeaders(text) {
  var headers = {};
  if (!text) return headers;
  var lines = String(text).split('\n');
  for (var i = 0; i < lines.length; i += 1) {
    var line = lines[i].trim();
    if (!line) continue;
    var idx = line.indexOf(':');
    if (idx <= 0) continue;
    var name = line.slice(0, idx).trim();
    var value = line.slice(idx + 1).trim();
    if (name && value) headers[name] = value;
  }
  return headers;
}

/* ── curl import ────────────────────────────────────────────────────────
   API docs and every browser's dev tools ("Copy as cURL") hand out curl
   commands, not URLs. Pasting one fills the URL and the headers. Imago only
   runs GETs, so a command that sends a body or another method is refused
   with a reason instead of being run as something it is not. */

// Headers the browser sets itself and refuses to let a page send.
var BROWSER_OWNED_HEADERS = /^(accept-encoding|connection|content-length|cookie|host|origin|referer|user-agent|keep-alive|te|trailer|transfer-encoding|upgrade|via|dnt|priority|sec-.*|proxy-.*)$/i;
var CURL_NO_ARG = /^(--compressed|-s|--silent|-S|--show-error|-L|--location|-k|--insecure|-i|--include|-v|--verbose|-f|--fail|-g|--globoff|-#|--progress-bar|-N|--no-buffer|--http1\.1|--http2|--http2-prior-knowledge|--tlsv1\.2|--tr-encoding|-Z|--parallel)$/;
var CURL_WITH_ARG = /^(-o|--output|-m|--max-time|--connect-timeout|-w|--write-out|--retry|--retry-delay|-x|--proxy|--cacert|-E|--cert|--key|-e|--referer|-A|--user-agent|-b|--cookie|-c|--cookie-jar|--resolve|-T|--upload-file)$/;

// Split a shell command into words: single quotes are literal, double
// quotes honour backslash escapes, $'…' decodes \n \t \' \\, and a trailing
// backslash (or a Windows ^) continues the line.
function shellWords(text) {
  var src = String(text).replace(/\\\r?\n/g, ' ').replace(/\^\r?\n/g, ' ');
  var words = [], cur = '', has = false, i = 0;
  while (i < src.length) {
    var ch = src[i];
    if (/\s/.test(ch)) { if (has) { words.push(cur); cur = ''; has = false; } i += 1; continue; }
    has = true;
    if (ch === "'") {
      var end = src.indexOf("'", i + 1);
      if (end === -1) end = src.length;
      cur += src.slice(i + 1, end); i = end + 1;
    } else if (ch === '$' && src[i + 1] === "'") {
      i += 2;
      while (i < src.length && src[i] !== "'") {
        if (src[i] === '\\' && i + 1 < src.length) {
          var e = src[i + 1];
          cur += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : e;
          i += 2;
        } else { cur += src[i]; i += 1; }
      }
      i += 1;
    } else if (ch === '"') {
      i += 1;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length && /["\\$`]/.test(src[i + 1])) { cur += src[i + 1]; i += 2; }
        else { cur += src[i]; i += 1; }
      }
      i += 1;
    } else if (ch === '\\' && i + 1 < src.length) {
      cur += src[i + 1]; i += 2;
    } else { cur += ch; i += 1; }
  }
  if (has) words.push(cur);
  return words;
}

function looksLikeCurl(text) {
  return /^\s*curl(\.exe)?\s/i.test(String(text || ''));
}

// → { url, headers, dropped: [names], error } ; error is set when the
// command cannot be run as a GET.
function parseCurl(text) {
  var words = shellWords(text);
  var out = { url: '', headers: {}, dropped: [], error: '' };
  if (!words.length || !/^curl(\.exe)?$/i.test(words[0])) { out.error = 'That is not a curl command.'; return out; }
  var method = '', body = false, get = false, query = [];
  function addHeader(raw) {
    var idx = raw.indexOf(':');
    if (idx <= 0) return;
    var name = raw.slice(0, idx).trim();
    var value = raw.slice(idx + 1).trim();
    if (!name || !value) return;
    if (BROWSER_OWNED_HEADERS.test(name)) { out.dropped.push(name); return; }
    out.headers[name] = value;
  }
  for (var i = 1; i < words.length; i += 1) {
    var w = words[i];
    // curl also takes a short option glued to its value: -XPOST, -H'A: b'.
    var glued = /^-([XHduAbeo])(.+)$/.exec(w);
    if (glued) { w = '-' + glued[1]; words.splice(i + 1, 0, glued[2]); }
    var eq = /^(--[\w-]+)=(.*)$/.exec(w);
    var opt = eq ? eq[1] : w;
    var arg = function () { return eq ? eq[2] : words[++i]; };
    if (opt === '-H' || opt === '--header') addHeader(arg() || '');
    else if (opt === '-X' || opt === '--request') method = String(arg() || '').toUpperCase();
    else if (/^(-d|--data|--data-raw|--data-binary|--data-ascii|--data-urlencode|--json|-F|--form)$/.test(opt)) { query.push(arg() || ''); body = true; }
    else if (opt === '-G' || opt === '--get') get = true;
    else if (opt === '-I' || opt === '--head') method = 'HEAD';
    else if (opt === '-u' || opt === '--user') {
      var cred = arg() || '';
      try { out.headers.Authorization = 'Basic ' + window.btoa(cred); } catch (err) { out.error = 'The -u credentials could not be encoded.'; }
    }
    else if (opt === '--url') out.url = arg() || '';
    else if (opt === '-b' || opt === '--cookie') { arg(); out.dropped.push('Cookie'); }
    else if (opt === '-A' || opt === '--user-agent') { arg(); out.dropped.push('User-Agent'); }
    else if (CURL_WITH_ARG.test(opt)) arg();
    else if (CURL_NO_ARG.test(opt) || /^-/.test(opt)) { /* flags that change nothing a browser can do */ }
    else if (!out.url) out.url = w;
  }
  if (!out.url) { out.error = 'No URL found in that curl command.'; return out; }
  if (get && query.length) {
    out.url += (out.url.indexOf('?') === -1 ? '?' : '&') + query.join('&');
    body = false;
  }
  if (method && method !== 'GET') { out.error = 'That command sends a ' + method + '. Imago only runs GET requests.'; return out; }
  if (body) { out.error = 'That command sends a request body (a POST). Imago only runs GET requests.'; return out; }
  return out;
}

// Fill the command bar from a curl command. Returns true when it did.
function importCurl(text) {
  var parsed = parseCurl(text);
  if (parsed.error) { toast(parsed.error, 'error'); return false; }
  setUrlInput(parsed.url);
  dom.headersInput.value = headersToText(parsed.headers);
  markDirty();
  syncHeadersChip();
  var n = Object.keys(parsed.headers).length;
  var msg = 'Imported from curl' + (n ? ': ' + n + (n === 1 ? ' header' : ' headers') : '') + '.';
  if (parsed.dropped.length) msg += ' Left out ' + parsed.dropped.join(', ') + ' (the browser sets those itself).';
  toast(msg, 'ok');
  return true;
}

// The headers live in Inspect → Headers, out of sight; the chip in the
// command bar says they are there and opens them.
function syncHeadersChip() {
  if (!dom.headersChip) return;
  var n = Object.keys(parseHeaders(dom.headersInput.value)).length;
  dom.headersChip.hidden = n === 0;
  dom.headersChip.textContent = n + (n === 1 ? ' header' : ' headers');
}

function headersToText(headers) {
  if (!headers) return '';
  return Object.keys(headers).map(function (name) {
    return name + ': ' + headers[name];
  }).join('\n');
}

/* ── Snapshots ─────────────────────────────────────────────────────────── */

function getSnapshotsFor(key) {
  if (!key) return [];
  var all = getSnapshots();
  // Stored by an older build or edited by hand: an entry that is not an
  // object would throw in every renderer that reads .id or .changed.
  return Array.isArray(all[key]) ? all[key].filter(isPlainObject) : [];
}

function stripBody(snapshot) {
  if (!snapshot || snapshot.data === null || snapshot.data === undefined) return snapshot;
  return {
    id: snapshot.id, url: snapshot.url, schemaHash: snapshot.schemaHash,
    fetchedAt: snapshot.fetchedAt, status: snapshot.status, changed: snapshot.changed || 0,
    data: null, omitted: true
  };
}

function pushSnapshot(key, snapshot) {
  if (!key) return;
  var all = getSnapshots();
  var list = Array.isArray(all[key]) ? all[key] : [];

  var serialized = '';
  try { serialized = JSON.stringify(snapshot.data); } catch (e) { serialized = ''; }
  if (!serialized || byteLength(serialized) > MAX_SNAPSHOT_BYTES) snapshot = stripBody(snapshot);

  // Only the newest snapshot keeps its body — that is all diffing and reload
  // rehydration need — so a 300 KB endpoint costs one body, not ten.
  for (var i = 0; i < list.length; i += 1) list[i] = stripBody(list[i]);

  list.push(snapshot);
  while (list.length > MAX_SNAPSHOTS) list.shift();
  all[key] = list;
  dropOldEndpoints(all, key);
  setSnapshots(all);
}

// Only the most recently fetched endpoints keep a history. Every endpoint
// ever opened used to keep one body in localStorage for good.
function dropOldEndpoints(all, keep) {
  var keys = Object.keys(all);
  if (keys.length <= MAX_SNAPSHOT_ENDPOINTS) return;
  function newest(k) {
    var list = Array.isArray(all[k]) ? all[k] : [];
    var last = list[list.length - 1];
    var t = last && last.fetchedAt ? Date.parse(last.fetchedAt) : 0;
    return isNaN(t) ? 0 : t;
  }
  keys.sort(function (a, b) { return (b === keep) - (a === keep) || newest(b) - newest(a); });
  for (var i = MAX_SNAPSHOT_ENDPOINTS; i < keys.length; i += 1) delete all[keys[i]];
}

function latestSnapshotWithData(key) {
  var list = getSnapshotsFor(key);
  for (var i = list.length - 1; i >= 0; i -= 1) {
    if (list[i] && !list[i].omitted && list[i].data !== null && list[i].data !== undefined) return list[i];
  }
  return null;
}

/* ── Request flow ──────────────────────────────────────────────────────── */

function markDirty() {
  syncHeadersChip();   // every path that changes the headers box ends here
  state.dirtySinceSend = true;
  if (state.refreshIntervalMs) stopTimer();
}

function wrapError(title, detail) {
  var error = new Error(title);
  error.title = title;
  error.detail = detail;
  return error;
}

// The request in flight: its sequence number, its abort handle and its
// timer. Only one at a time; a new one replaces it.
var activeRequest = null;
var SUPERSEDED = { superseded: true };

// Returns false when the request was refused before any fetch started, so
// navigateTo can roll back the stack push and URL-bar write it already did.
function performRequest(isAuto) {
  // A Watch tick waits its turn; a request the reader asked for does not.
  if (isAuto && state.inFlight) return false;

  var typed = dom.urlInput.value.trim();
  var url = withScheme(typed);
  if (!url) {
    toast('Enter an API URL first.', 'error');
    return false;
  }
  var parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    toast('That URL is not valid.', 'error');
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    toast('Only http and https URLs are supported.', 'error');
    return false;
  }

  var headersText = dom.headersInput.value;
  var problem = headerProblem(parseHeaders(headersText));
  if (problem) {
    toast(problem, 'error');
    return false;
  }

  // The reader asked for something else while a request was still out: that
  // one is dropped, and this one goes. It used to be ignored without a word,
  // and the URL just typed was lost when the slow one finally failed.
  if (state.inFlight) {
    cancelInFlight(false);
    dom.headersInput.value = headersText;
    syncHeadersChip();
  }
  if (url !== typed || dom.urlInput.value !== url) setUrlInput(url);

  // A new request leaves edit mode; its page is a different one.
  if (!isAuto && state.editing) {
    state.editing = false;
    document.body.classList.remove('is-editing');
    if (dom.editBtn) dom.editBtn.setAttribute('aria-pressed', 'false');
  }

  var seq = state.requestSeq + 1;
  state.requestSeq = seq;
  state.inFlight = true;
  state.url = url;
  state.headersText = headersText;
  state.headers = parseHeaders(state.headersText);
  dom.sendBtn.disabled = true;
  dom.inspectorHead.hidden = false;

  if (!isAuto) showInterfaceLoading('Fetching ' + parsed.hostname + '…');
  updateMeta();

  var previousData = state.data;
  var previousUrl = state.dataUrl;
  var requestKey = hashString(url);
  var startedAt = Date.now();
  // Credentials stay in the session, and so does what they unlocked.
  var isPrivate = redactSecretHeaders(state.headers).redacted.length > 0;

  var controller = typeof window.AbortController === 'function' ? new window.AbortController() : null;
  var request = { seq: seq, controller: controller, timedOut: false, timer: null };
  request.timer = window.setTimeout(function () {
    request.timedOut = true;
    if (controller) controller.abort();
  }, TIMEOUTS.request);
  activeRequest = request;
  function current() { return state.requestSeq === seq; }

  // no-store: every fetch goes to the API. With the default, a response sent
  // with a long max-age (PokeAPI's is a day) came back from the browser's
  // cache, so Refresh and Watch could never see it change.
  var options = { method: 'GET', headers: state.headers, mode: 'cors', cache: 'no-store' };
  if (controller) options.signal = controller.signal;
  var timedOut = new Promise(function (resolve, reject) {
    // Settles the chain even where there is no AbortController to do it.
    window.setTimeout(function () { if (request.timedOut) reject(new Error('timeout')); }, TIMEOUTS.request + 10);
  });

  Promise.race([fetch(url, options), timedOut])
    .then(function (response) {
      if (!current()) throw SUPERSEDED;
      return response.text().then(function (text) { return { response: response, text: text }; });
    })
    .then(function (result) {
      if (!current()) throw SUPERSEDED;
      var response = result.response;
      var text = result.text;

      if (!response.ok) {
        var snippet = text.trim().slice(0, 300);
        throw wrapError('HTTP ' + response.status + ' ' + (response.statusText || ''),
          'The endpoint rejected the request.' +
          (snippet ? ' Its response began: \u201c' + snippet + '\u201d' : ' Its response was empty.'));
      }

      if (!text.trim()) {
        throw wrapError('Empty response',
          'The endpoint answered HTTP ' + response.status + ' with no body. Imago draws a page from a JSON body.');
      }

      var data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw wrapError('Response is not JSON',
          'Imago renders JSON APIs. The endpoint returned ' + formatBytes(byteLength(text)) +
          ' starting with: \u201c' + text.trim().slice(0, 120) + '\u201d');
      }

      state.status = response.status;
      state.rawText = text;
      state.byteSize = byteLength(text);
      state.data = data;
      state.dataUrl = url;
      state.dataSig = dataSignature(data);
      state.lastCheckedAt = Date.now();

      var print = fingerprint(data);
      state.schema = print.schema;
      state.schemaHash = print.hash;

      var baseline = previousUrl === url ? previousData : null;
      if (baseline === null || baseline === undefined) {
        var stored = latestSnapshotWithData(requestKey);
        baseline = stored ? stored.data : null;
      }
      if (baseline === null || baseline === undefined) {
        state.diff = null;
        state.changedCount = 0;
      } else {
        state.diff = diffData(baseline, data);
        state.changedCount = Object.keys(state.diff).length;
      }
      if (isAuto && state.changedCount > 0) noteWatchedChange(url);
      if (isAuto) beatLiveDots();

      var snapshot = {
        id: 'snap_' + startedAt.toString(36),
        url: url,
        schemaHash: print.hash,
        fetchedAt: new Date(state.lastCheckedAt).toISOString(),
        status: response.status,
        changed: state.changedCount,
        data: data
      };
      pushSnapshot(requestKey, isPrivate ? stripBody(snapshot) : snapshot);
      renderHistory();

      touchSavedRequest(url);
      // These two panes stringify the whole body and build ~1500 spans. On a
      // 10s auto-refresh that ran every tick for tabs nobody was looking at.
      state.rawPaneDirty = true;
      state.schemaPaneDirty = true;
      if (state.tab === 'raw') renderRawPane();
      if (state.tab === 'schema') renderSchemaPane();
      renderChangesPane();
      updateMeta();

      if (state.byteSize > LARGE_RESPONSE_BYTES) {
        toast('Large response (' + formatBytes(state.byteSize) + ') — only a compact sample goes to ' + getProvider(getSessionProvider()).label + '.');
      }

      return resolveSpec(url, print, false, isAuto);
    })
    .then(function () {
      if (!current()) return;
      state.dirtySinceSend = false;
      state.navRestorePoint = null;   // the navigation committed
      // A pending Generate prompt is waiting on the reader. Ticking behind it
      // re-renders the prompt (re-enabling the button they just pressed) and
      // spends another request per tick, so the timer stops until a page is
      // on screen again.
      if (state.pendingGenerate) stopTimer();
      else if (state.refreshIntervalMs) startTimer();
    })
    .catch(function (err) {
      if (err === SUPERSEDED || !current()) return undefined;
      if (request.timedOut) {
        err = wrapError('Timed out',
          (hostOf(url) || 'The server') + ' did not answer within ' + Math.round(TIMEOUTS.request / 1000) +
          ' seconds. It may be down or very slow. Try again, or open another endpoint.');
      }
      return explainFailure(err, url, state.headers).then(function (why) {
        if (current()) handleRequestFailure(why, isAuto);
      });
    })
    // Both arms, not a trailing .then: if handleRequestFailure itself throws
    // this must still run, or inFlight stays true, the send button stays
    // disabled, and every later request returns at the in-flight guard —
    // the app is silently bricked until reload.
    .then(done, done);

  function done() {
    window.clearTimeout(request.timer);
    if (!current()) return;
    if (activeRequest === request) activeRequest = null;
    finishRequest();
  }
  return true;
}

function finishRequest() {
  state.inFlight = false;
  if (dom.sendBtn) dom.sendBtn.disabled = false;
  updateMeta();
  savePrefs();
}

// Drop the request in flight: abort it, ignore anything it still answers,
// and put the state back on the page that is actually on screen. restore
// redraws that page too, for callers that will not draw one of their own.
function cancelInFlight(restore) {
  if (!state.inFlight) return;
  state.requestSeq += 1;
  var request = activeRequest;
  activeRequest = null;
  if (request) {
    window.clearTimeout(request.timer);
    if (request.controller) { try { request.controller.abort(); } catch (err) { /* already settled */ } }
  }
  state.inFlight = false;
  if (dom.sendBtn) dom.sendBtn.disabled = false;
  if (state.navRestorePoint) {
    rollbackNavigation(state.navRestorePoint);
    state.navRestorePoint = null;
  }
  pointAtScreen();
  if (restore) restoreScreen(false);
  updateMeta();
}

// A direct send (Go, or opening a saved endpoint) has no restore point, but
// it set state.url before fetching. Point the state back at the endpoint
// whose data is still on screen, or the history strip and rail describe
// page B over page A. The URL box keeps what was typed, to fix and resend.
function pointAtScreen() {
  if (state.data && state.dataUrl && state.url !== state.dataUrl) {
    state.url = state.dataUrl;
    var saved = getSavedRequests().filter(function (r) { return r.url === state.dataUrl; })[0];
    state.activeRequestId = saved ? saved.id : null;
  }
}

function removeAlerts() {
  var alerts = dom.interfaceOut.querySelectorAll('.alert');
  for (var i = 0; i < alerts.length; i += 1) alerts[i].parentNode.removeChild(alerts[i]);
}

// Redraw whatever was on screen before a request replaced it with a
// spinner: the generated page, the plan, or the Generate prompt. Returns
// false when there was no page to put back. inPlace: the screen was never
// cleared (a Watch tick), so only stale alerts go; an iframe redrawn every
// failed tick would flash, and a page in HTML mode has no plan to redraw.
function restoreScreen(inPlace) {
  if (!state.data) {
    if (!inPlace) showInterfaceEmpty();
    return false;
  }
  if (inPlace) { removeAlerts(); return true; }
  if (state.html && state.builder === 'html') {
    applyHtml(state.html, state.htmlSource, { url: state.htmlUrl, sig: state.htmlSig });
  } else if (state.spec) {
    applySpec(state.spec, state.specSource);
  } else if (state.pendingGenerate) {
    showGeneratePrompt();
  } else {
    applySpec(null, 'fallback');
  }
  return true;
}

// What the reader will recognise the kept page by.
function screenName() {
  if (state.spec && state.spec.title) return state.spec.title;
  return endpointTitle(state.dataUrl) || hostOf(state.dataUrl) || 'the last page';
}

// A header fetch would throw on, caught before sending. It used to throw a
// TypeError that the failure handler reported as the endpoint being down.
var HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
function headerProblem(headers) {
  var names = Object.keys(headers || {});
  for (var i = 0; i < names.length; i += 1) {
    var name = names[i];
    if (!HEADER_NAME.test(name)) return '"' + name + '" is not a valid header name. Check Inspect → Headers.';
    if (/[\r\n\0]/.test(headers[name])) return 'The ' + name + ' header has a line break in its value.';
    if (BROWSER_OWNED_HEADERS.test(name)) return 'Browsers do not let a page send ' + name + '. Remove it from Inspect → Headers.';
  }
  return '';
}

// "Failed to fetch" is all a browser says, whether you are offline, the
// server is down, or the server refused a web page (CORS). One extra probe
// tells the last two apart: a no-cors GET, with no headers and no cookies,
// succeeds (opaquely) when the server answered at all. Resolves to an error
// with a title and detail the reader can act on.
function explainFailure(err, url, headers) {
  var isNetwork = err && !err.title && err.message && /failed to fetch|networkerror|load failed/i.test(err.message);
  if (!isNetwork) return Promise.resolve(err);
  var host = hostOf(url) || 'the server';
  if (window.navigator && window.navigator.onLine === false) {
    return Promise.resolve(wrapError('You are offline',
      'Connect and try again. Pages you opened before still show from their last snapshot.'));
  }
  var probe = fetch(url, { method: 'GET', mode: 'no-cors', credentials: 'omit', cache: 'no-store' });
  var timeout = new Promise(function (resolve, reject) { window.setTimeout(function () { reject(new Error('timeout')); }, 6000); });
  return Promise.race([probe, timeout]).then(function () {
    var sent = Object.keys(headers || {});
    var detail = host + ' answered, but its response does not include the CORS headers a web page needs to ' +
      'read it. Imago runs entirely in your browser, so it cannot read this API directly.';
    detail += sent.length
      ? ' It may be the headers: sending ' + sent.join(', ') + ' makes the browser ask the API for permission ' +
        'first, and this API refused. If the endpoint works without them, remove them in Inspect → Headers.'
      : ' Look for a public or browser-facing endpoint in its docs, or put a CORS proxy you control in front of it.';
    return wrapError('This API does not allow browser apps', detail);
  }, function () {
    return wrapError('Could not reach ' + host,
      'Check the address. The server may be down, or blocked on this network.');
  });
}

function handleRequestFailure(err, isAuto) {
  var title = err && err.title ? err.title : 'Request failed';
  var detail = err && err.detail ? err.detail : (err && err.message ? err.message : String(err));

  toast(title, 'error');

  // A failed navigation must not leave the URL bar, crumb and request key
  // describing a page that never loaded while page A's data is on screen.
  if (state.navRestorePoint) {
    rollbackNavigation(state.navRestorePoint);
    state.navRestorePoint = null;
  }
  pointAtScreen();

  // The loading state cleared the pane — put the last good page back so a
  // failure never costs you the view you were reading, and say that it is
  // the old page: under a banner for another host it read as the answer.
  if (state.data && restoreScreen(isAuto)) {
    showAlert(isAuto ? 'Auto-refresh failed' : title,
              [detail, 'Below is ' + screenName() + ', the last page that loaded.']);
  } else {
    if (state.stage) leaveStage();
    dom.interfaceHead.hidden = true;
    resetInterfaceOut(false);
    var box = el('div', 'empty');
    box.appendChild(el('p', 'empty-title', title));
    box.appendChild(el('p', 'empty-body', detail));
    dom.interfaceOut.appendChild(box);
  }
}

/* ── Spec resolution: cache → (explicit) model call → fallback ─────────────── */

// The no-key state, said once and quietly: the page rendered fine, it is
// just the basic layout. It used to be a banner, a toast, a badge and a
// top-bar pill all saying the same thing, and on a phone the banner pushed
// the data below the fold. One line under the title, with the way out.
// Called after the fallback renders, since applySpec clears the pane.
function noKeyAlert() {
  state.noKeyLine = true;   // applySpec redraws it on every re-render (edit, Watch, …)
  if (dom.interfaceOut.querySelector('.keyline')) return;
  var id = getSessionProvider();
  var provider = getProvider(id);
  var rejected = keyRejected(id);
  var line = el('p', 'keyline');
  line.appendChild(el('span', null, rejected
    ? provider.label + ' rejected your key, so this is the basic layout.'
    : 'No ' + provider.label + ' key, so this is the basic layout.'));
  var add = el('button', 'keyline-action', rejected ? 'Fix the key' : 'Add a key');
  add.type = 'button';
  add.addEventListener('click', function () { setAppPane('settings'); });
  line.appendChild(add);
  var head = dom.interfaceOut.querySelector('.stage-head');
  if (head) {
    var sub = head.querySelector('.stage-sub');
    head.insertBefore(line, sub ? sub.nextSibling : head.children[1] || null);
    dom.cacheBadge.hidden = true;   // the line says it; the badge would repeat it
  } else {
    dom.interfaceOut.insertBefore(line, dom.interfaceOut.firstChild);
  }
}

// The active provider has no key but another one does: switch to it rather
// than spending a call that can only 401. Returns true when a usable key
// is now active.
function useKeyedProvider() {
  if (providerUsable(getSessionProvider())) return true;
  for (var i = 0; i < PROVIDER_IDS.length; i += 1) {
    if (providerUsable(PROVIDER_IDS[i])) {
      setSessionProvider(PROVIDER_IDS[i]);
      syncProviderUi({ force: true });
      setKeyStatus();
      toast('Switched to ' + getProvider(PROVIDER_IDS[i]).label + ' — it has a key.', 'ok');
      return true;
    }
  }
  return false;
}

// isAuto: a Watch tick brought this body, and the reader is not waiting on
// a prompt — they are watching a page.
function resolveSpec(url, print, userTriggered, isAuto) {
  // A page opened from a share link shows the layout it was shared with,
  // once. It came out of a URL, so it is as untrusted as a model's plan and
  // goes through the same normaliser; it is never written to the cache.
  if (state.sharedSpec && state.sharedSpec.url === url) {
    var shared = normalizeSpec(state.sharedSpec.spec);
    state.sharedSpec = null;
    if (shared) { applySpec(shared, 'shared'); return Promise.resolve(); }
  }
  if (state.builder === 'html') {
    return resolveHtml(url, print, userTriggered, isAuto);
  }
  var cache = getSchemaSpecs();
  var cached = cache[print.hash];

  if (cached && cached.spec) {
    var normalized = normalizeSpec(cached.spec);
    if (normalized) {
      cached.lastUsedAt = new Date().toISOString();
      cache[print.hash] = cached;
      setSchemaSpecs(cache);
      applySpec(fitTitle(normalized, state.data, url, cached.sourceUrl), 'cache');
      return Promise.resolve();
    }
  }

  if (!useKeyedProvider()) {
    applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
    noKeyAlert();
    return Promise.resolve();
  }

  if (!userTriggered) return askToGenerate(url, isAuto);

  return callGemini(url, print);
}

// A brand new shape costs a model call, so ask before spending it. Under
// Watch the page stays live instead: the prompt used to replace the page
// mid-watch while the timer kept fetching behind it.
function askToGenerate(url, isAuto) {
  if (isAuto) {
    applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
    showAlert('The response changed shape',
              'This is the basic layout until you generate one for the new shape.', 'note',
              { label: 'Generate', run: function () { generateInterfaceNow(); } });
    return Promise.resolve();
  }
  state.pendingGenerate = true;
  showGeneratePrompt();
  return Promise.resolve();
}

// One switch, two controls (the playground toggle and the Settings
// select). Every change routes through here so they can never disagree.
function syncBuilderUi() {
  if (dom.builderSelect) dom.builderSelect.value = state.builder;
  var pairs = [[dom.builderPlanBtn, 'spec'], [dom.builderHtmlBtn, 'html']];
  for (var i = 0; i < pairs.length; i += 1) {
    var btn = pairs[i][0], mode = pairs[i][1];
    if (!btn) continue;
    var on = state.builder === mode;
    btn.className = on ? 'seg-btn is-active' : 'seg-btn';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

function setBuilder(mode, silent) {
  state.builder = mode === 'html' ? 'html' : 'spec';
  savePrefs();
  syncBuilderUi();
  if (!silent) {
    toast(state.builder === 'html'
      ? 'Full-HTML builder on — the model writes the whole page, sandboxed.'
      : 'Structured-plan builder on.');
  }
  // Re-resolve what is on screen so the switch is visible immediately:
  // a remembered artefact applies, otherwise the generate prompt.
  if (state.data && state.schemaHash) {
    resolveSpec(state.dataUrl || state.url, { hash: state.schemaHash, schema: state.schema }, false);
  }
}

// HTML-mode twin of the spec cache path above: same honesty rules (cache,
// then key check, then ask before spending), different artefact.
// A page, unlike a plan, has one response's values written into it, so it
// is only ever shown again for the endpoint it was written from. Shown for
// another endpoint of the same shape, it put user 1's values under user 2.
function cachedHtmlFor(entry, url) {
  if (!entry || !entry.html || entry.htmlUrl !== url) return null;
  return normalizeHtmlDoc(entry.html);
}

function resolveHtml(url, print, userTriggered, isAuto) {
  var cache = getSchemaSpecs();
  var cached = cache[print.hash];
  var doc = cachedHtmlFor(cached, url);

  if (doc) {
    cached.lastUsedAt = new Date().toISOString();
    cache[print.hash] = cached;
    setSchemaSpecs(cache);
    // The page keeps the baseline it was written from, so the stale bar can
    // say when fresh data no longer matches it.
    applyHtml(doc, 'cache', { url: cached.htmlUrl, sig: cached.htmlSig || '' });
    return Promise.resolve();
  }

  if (!useKeyedProvider()) {
    applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
    noKeyAlert();
    return Promise.resolve();
  }

  if (!userTriggered) return askToGenerate(url, isAuto);

  return callHtml(url, print);
}

// Returns false when nothing was started. A call already running for
// another page is superseded, not waited on: the reader asked for this one,
// and a Generate button that silently did nothing looked broken.
function generateInterfaceNow() {
  if (!state.data || !state.schemaHash) return false;
  var url = state.dataUrl || state.url;
  // A pressed button with no key behind it would only 401: say so instead.
  if (!useKeyedProvider()) {
    applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
    noKeyAlert();
    return true;
  }
  if (state.builder === 'html') {
    showInterfaceLoading('Writing a full HTML page…');
    callHtml(url, { hash: state.schemaHash, schema: state.schema });
    return true;
  }
  showInterfaceLoading('Designing an interface…');
  callGemini(url, { hash: state.schemaHash, schema: state.schema });
  return true;
}

// Each model call gets a number. A reply is used only if it is still the
// newest call and the page it was asked for is still the one on screen;
// otherwise it is dropped. A late reply for page A used to replace page B.
function startGeneration() {
  state.genSeq += 1;
  state.generating = true;
  return state.genSeq;
}

function generationCurrent(token, url) {
  return token === state.genSeq && state.url === url;
}

function endGeneration(token) {
  if (token !== state.genSeq) return;
  state.generating = false;
  // Watch stopped for the Generate prompt; a page is on screen again.
  if (state.refreshIntervalMs && !state.tickHandle && !state.pendingGenerate &&
      !state.dirtySinceSend && !state.inFlight) startTimer();
}

// A rejected key is marked so the key line, the pill and the no-key note
// stop calling it ready; any other answer proves the key works.
function noteKeyVerdict(providerId, info) {
  var changed = info ? (info.badKey && markKeyRejected(providerId)) : clearKeyRejected(providerId);
  if (!changed) return;
  setKeyStatus();
  syncProviderUi();
}

function callHtml(url, print) {
  var token = startGeneration();
  var providerId = getSessionProvider();
  var provider = getProvider(providerId);
  var model = (dom.modelName.value || '').trim() || provider.defaultModel;
  var apiKey = getActiveKey();

  return generateHtml({
    url: url,
    schema: print.schema,
    sample: compactSample(state.data),
    provider: providerId,
    model: model,
    apiKey: apiKey
  }).then(function (doc) {
    if (!generationCurrent(token, url)) return;
    noteKeyVerdict(providerId, null);
    // Same mid-flight race as the spec path: a refresh landing while the
    // model writes must not file the page under a shape it never saw.
    if (state.schemaHash !== print.hash) {
      throw wrapError('Response changed while the page was being written',
                      'The data was refreshed mid-request. Press Regenerate for the new shape.');
    }

    // A page has the response's values in it. One written from a response
    // that took credentials stays in the session, like the credentials.
    var remember = doc.length <= MAX_CACHED_HTML_BYTES && !hasSecretHeader(state.headersText);
    if (remember) {
      var store = getSchemaSpecs();
      var entry = store[print.hash] || {
        hash: print.hash, schema: print.schema,
        sourceUrl: url, createdAt: new Date().toISOString()
      };
      entry.html = doc;
      entry.htmlUrl = url;
      entry.htmlSig = state.dataSig;
      entry.model = model;
      entry.lastUsedAt = new Date().toISOString();
      store[print.hash] = entry;
      setSchemaSpecs(store);
    } else if (doc.length > MAX_CACHED_HTML_BYTES) {
      toast('Page too large to remember — it will be rewritten next time.', 'warn');
    }

    applyHtml(doc, 'generated');
    toast('Page generated' + (remember ? ' and remembered as ' + print.hash : ''), 'ok');
  }).catch(function (err) {
    if (!generationCurrent(token, url)) return;
    var htmlInfo = providerErrorText(provider, err);
    noteKeyVerdict(providerId, htmlInfo);

    applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
    showAlert(htmlInfo.title, htmlInfo.message);
    toast(htmlInfo.title, 'error');
  }).then(function () { endGeneration(token); },
          function () { endGeneration(token); });
}

function callGemini(url, print) {
  var token = startGeneration();
  var providerId = getSessionProvider();
  var provider = getProvider(providerId);
  var model = (dom.modelName.value || '').trim() || provider.defaultModel;
  var apiKey = getActiveKey();

  return generateSpec({
    url: url,
    schema: print.schema,
    sample: compactSample(state.data),
    provider: providerId,
    model: model,
    apiKey: apiKey
  }).then(function (rawSpec) {
    if (!generationCurrent(token, url)) return;
    noteKeyVerdict(providerId, null);
    // An auto-refresh tick can land while the model is thinking and replace
    // state.data with a differently shaped body. Caching this spec under the
    // stale print.hash, or applying it to the new data, is how a plan for one
    // shape ends up rendering another.
    if (state.schemaHash !== print.hash) {
      throw wrapError('Response changed while the interface was being designed',
                      'The data was refreshed mid-request. Press Generate again for the new shape.');
    }

    var normalized = normalizeSpec(rawSpec);
    if (!normalized) throw wrapError(provider.label + ' returned an unusable spec', 'Falling back to a heuristic interface.');

    var store = getSchemaSpecs();
    store[print.hash] = {
      hash: print.hash, schema: print.schema, spec: normalized, model: model,
      sourceUrl: url, createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString()
    };
    setSchemaSpecs(store);

    applySpec(fitTitle(normalized, state.data, url, url), 'generated');
    toast('Interface generated and remembered as ' + print.hash, 'ok');
  }).catch(function (err) {
    if (!generationCurrent(token, url)) return;
    var info = providerErrorText(provider, err);
    noteKeyVerdict(providerId, info);

    applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
    showAlert(info.title, info.message);
    toast(info.title, 'error');
  }).then(function () { endGeneration(token); },
          function () { endGeneration(token); });
}

/* ── Auto-refresh ──────────────────────────────────────────────────────── */

function startTimer() {
  stopTimer();
  if (!state.refreshIntervalMs) return;
  state.nextRefreshAt = Date.now() + state.refreshIntervalMs;
  dom.livePill.hidden = false;
  state.tickHandle = window.setInterval(tick, 250);
  updateMeta();
}

function stopTimer() {
  if (state.tickHandle) { window.clearInterval(state.tickHandle); state.tickHandle = null; }
  state.nextRefreshAt = 0;
  dom.livePill.hidden = true;
  updateMeta();
}

function tick() {
  updateMeta();
  if (!state.refreshIntervalMs || !state.nextRefreshAt) return;
  if (Date.now() >= state.nextRefreshAt && !state.inFlight) {
    state.nextRefreshAt = Date.now() + state.refreshIntervalMs;
    performRequest(true);
  }
}

// The live dot pulses once per refresh (it used to pulse forever, which is
// noise on a screen left open for hours). Restarting the class replays it.
function beatLiveDots() {
  var dots = document.querySelectorAll('.live-dot');
  for (var i = 0; i < dots.length; i += 1) {
    dots[i].classList.remove('is-beat');
    void dots[i].offsetWidth;
    dots[i].classList.add('is-beat');
  }
}

function syncRefreshUi() {
  var on = state.refreshIntervalMs > 0;
  dom.refreshToggle.setAttribute('aria-checked', on ? 'true' : 'false');
  dom.refreshInterval.disabled = !on;
  if (on) dom.refreshInterval.value = String(state.refreshIntervalMs);
  if (dom.savedList) renderSavedList();   // the rail's live dot follows
}

export { beatLiveDots, SECRET_HEADER, SECRET_PARAM, secureUrl, maskUrlSecrets, stripUrlSecrets, withScheme, dropOldEndpoints, cancelInFlight, pointAtScreen, removeAlerts, restoreScreen, screenName, askToGenerate, cachedHtmlFor, startGeneration, generationCurrent, endGeneration, noteKeyVerdict, sameOrigin, redactSecretHeaders, hasSecretHeader, parseHeaders, BROWSER_OWNED_HEADERS, CURL_NO_ARG, CURL_WITH_ARG, shellWords, looksLikeCurl, parseCurl, importCurl, syncHeadersChip, headersToText, getSnapshotsFor, stripBody, pushSnapshot, latestSnapshotWithData, markDirty, wrapError, performRequest, finishRequest, HEADER_NAME, headerProblem, explainFailure, handleRequestFailure, noKeyAlert, useKeyedProvider, resolveSpec, syncBuilderUi, setBuilder, resolveHtml, generateInterfaceNow, callHtml, callGemini, startTimer, stopTimer, tick, syncRefreshUi };
