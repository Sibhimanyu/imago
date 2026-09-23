import { LARGE_RESPONSE_BYTES, MAX_CACHED_HTML_BYTES, MAX_SNAPSHOTS, MAX_SNAPSHOT_BYTES, PROVIDER_IDS, getProvider, providerNeedsKey } from './config.js';
import { dom, state } from './state.js';
import { getActiveKey, getProviderKey, getSavedRequests, getSchemaSpecs, getSessionProvider, getSnapshots, providerUsable, savePrefs, setSchemaSpecs, setSessionProvider, setSnapshots } from './storage.js';
import { byteLength, el, formatBytes } from './util.js';
import { diffData, fingerprint, hashString } from './schema.js';
import { applyHtml, compactSample, generateHtml, generateSpec, normalizeHtmlDoc, providerErrorText } from './llm.js';
import { buildFallbackSpec, normalizeSpec } from './spec.js';
import { setAppPane, setKeyStatus, syncProviderUi, toast } from './ui.js';
import { updateMeta } from './chat.js';
import { applySpec, leaveStage, navigateTo, renderChangesPane, renderRawPane, renderSchemaPane, resetInterfaceOut, rollbackNavigation, showAlert, showGeneratePrompt, showInterfaceLoading } from './panes.js';
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
  return Array.isArray(all[key]) ? all[key] : [];
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
  setSnapshots(all);
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

// Returns false when the request was refused before any fetch started, so
// navigateTo can roll back the stack push and URL-bar write it already did.
function performRequest(isAuto) {
  if (state.inFlight) return false;

  var url = dom.urlInput.value.trim();
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

  // A new request leaves edit mode; its page is a different one.
  if (!isAuto && state.editing) {
    state.editing = false;
    document.body.classList.remove('is-editing');
    if (dom.editBtn) dom.editBtn.setAttribute('aria-pressed', 'false');
  }

  var problem = headerProblem(parseHeaders(dom.headersInput.value));
  if (problem) {
    toast(problem, 'error');
    return false;
  }

  state.inFlight = true;
  state.url = url;
  state.headersText = dom.headersInput.value;
  state.headers = parseHeaders(state.headersText);
  dom.sendBtn.disabled = true;
  dom.inspectorHead.hidden = false;

  if (!isAuto) showInterfaceLoading('Fetching ' + parsed.hostname + '…');

  var previousData = state.data;
  var previousUrl = state.dataUrl;
  var requestKey = hashString(url);
  var startedAt = Date.now();

  fetch(url, { method: 'GET', headers: state.headers, mode: 'cors' })
    .then(function (response) {
      return response.text().then(function (text) { return { response: response, text: text }; });
    })
    .then(function (result) {
      var response = result.response;
      var text = result.text;

      if (!response.ok) {
        throw wrapError('HTTP ' + response.status + ' ' + (response.statusText || ''),
          'The endpoint rejected the request. Response began: ' + text.slice(0, 300));
      }

      var data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw wrapError('Response is not JSON',
          'Imago renders JSON APIs. The endpoint returned ' + formatBytes(byteLength(text)) +
          ' starting with: ' + text.slice(0, 120));
      }

      state.status = response.status;
      state.rawText = text;
      state.byteSize = byteLength(text);
      state.data = data;
      state.dataUrl = url;
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

      pushSnapshot(requestKey, {
        id: 'snap_' + startedAt.toString(36),
        url: url,
        schemaHash: print.hash,
        fetchedAt: new Date(state.lastCheckedAt).toISOString(),
        status: response.status,
        changed: state.changedCount,
        data: data
      });
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

      return resolveSpec(url, print, false);
    })
    .then(function () {
      state.dirtySinceSend = false;
      state.navRestorePoint = null;   // the navigation committed
      // A pending Generate prompt is waiting on the reader. Ticking behind it
      // re-renders the prompt (re-enabling the button they just pressed) and
      // spends another request per tick.
      if (state.refreshIntervalMs && !state.pendingGenerate) startTimer();
    })
    .catch(function (err) {
      return explainFailure(err, url, state.headers).then(function (why) { handleRequestFailure(why, isAuto); });
    })
    // Both arms, not a trailing .then: if handleRequestFailure itself throws
    // this must still run, or inFlight stays true, the send button stays
    // disabled, and every later request returns at the in-flight guard —
    // the app is silently bricked until reload.
    .then(finishRequest, finishRequest);
}

function finishRequest() {
  state.inFlight = false;
  if (dom.sendBtn) dom.sendBtn.disabled = false;
  updateMeta();
  savePrefs();
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

  // A direct send (Go, or opening a saved endpoint) has no restore point, but
  // it set state.url before fetching. Point the state back at the endpoint
  // whose data is still on screen, or the history strip and rail describe
  // page B over page A. The URL box keeps what was typed, to fix and resend.
  if (state.data && state.dataUrl && state.url !== state.dataUrl) {
    state.url = state.dataUrl;
    var saved = getSavedRequests().filter(function (r) { return r.url === state.dataUrl; })[0];
    state.activeRequestId = saved ? saved.id : null;
  }

  if (state.data && state.spec) {
    // The loading state cleared the pane — put the last good interface back
    // so a failure never costs you the view you were reading.
    applySpec(state.spec, state.specSource);
    showAlert(isAuto ? 'Auto-refresh failed' : title, detail);
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
  var provider = getProvider(getSessionProvider());
  var line = el('p', 'keyline');
  line.appendChild(el('span', null, 'No ' + provider.label + ' key, so this is the basic layout.'));
  var add = el('button', 'keyline-action', 'Add a key');
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
  var active = getSessionProvider();
  // A keyless provider (Ollama) is usable as-is; a keyed one only with its
  // key. Fallback re-homes to a *keyed* provider that has one — never to
  // Ollama uninvited, or every keyless user would bounce into localhost.
  if (providerUsable(active)) return true;
  for (var i = 0; i < PROVIDER_IDS.length; i += 1) {
    if (providerNeedsKey(PROVIDER_IDS[i]) && getProviderKey(PROVIDER_IDS[i])) {
      setSessionProvider(PROVIDER_IDS[i]);
      syncProviderUi({ force: true });
      setKeyStatus();
      toast('Switched to ' + getProvider(PROVIDER_IDS[i]).label + ' — it has a key.', 'ok');
      return true;
    }
  }
  return false;
}

function resolveSpec(url, print, userTriggered) {
  // A page opened from a share link shows the layout it was shared with,
  // once. It came out of a URL, so it is as untrusted as a model's plan and
  // goes through the same normaliser; it is never written to the cache.
  if (state.sharedSpec && state.sharedSpec.url === url) {
    var shared = normalizeSpec(state.sharedSpec.spec);
    state.sharedSpec = null;
    if (shared) { applySpec(shared, 'shared'); return Promise.resolve(); }
  }
  if (state.builder === 'html') {
    return resolveHtml(url, print, userTriggered);
  }
  var cache = getSchemaSpecs();
  var cached = cache[print.hash];

  if (cached && cached.spec) {
    var normalized = normalizeSpec(cached.spec);
    if (normalized) {
      cached.lastUsedAt = new Date().toISOString();
      cache[print.hash] = cached;
      setSchemaSpecs(cache);
      applySpec(normalized, 'cache');
      return Promise.resolve();
    }
  }

  if (!useKeyedProvider()) {
    applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
    noKeyAlert();
    return Promise.resolve();
  }

  if (!userTriggered) {
    // A brand new shape costs a model call, so ask before spending it.
    state.pendingGenerate = true;
    showGeneratePrompt();
    return Promise.resolve();
  }

  return callGemini(url, print);
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
    resolveSpec(state.url, { hash: state.schemaHash, schema: state.schema }, false);
  }
}

// HTML-mode twin of the spec cache path above: same honesty rules (cache,
// then key check, then ask before spending), different artefact.
function resolveHtml(url, print, userTriggered) {
  var cache = getSchemaSpecs();
  var cached = cache[print.hash];

  if (cached && cached.html) {
    var doc = normalizeHtmlDoc(cached.html);
    if (doc) {
      cached.lastUsedAt = new Date().toISOString();
      cache[print.hash] = cached;
      setSchemaSpecs(cache);
      applyHtml(doc, 'cache');
      return Promise.resolve();
    }
  }

  if (!useKeyedProvider()) {
    applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
    noKeyAlert();
    return Promise.resolve();
  }

  if (!userTriggered) {
    state.pendingGenerate = true;
    showGeneratePrompt();
    return Promise.resolve();
  }

  return callHtml(url, print);
}

function generateInterfaceNow() {
  if (!state.data || !state.schemaHash) return;
  if (state.generating) return;       // one model call at a time
  // A pressed button with no key behind it would only 401: say so instead.
  if (!useKeyedProvider()) {
    applySpec(normalizeSpec(buildFallbackSpec(state.data, state.url)), 'fallback');
    noKeyAlert();
    return;
  }
  if (state.builder === 'html') {
    showInterfaceLoading('Writing a full HTML page…');
    callHtml(state.url, { hash: state.schemaHash, schema: state.schema });
    return;
  }
  showInterfaceLoading('Designing an interface…');
  callGemini(state.url, { hash: state.schemaHash, schema: state.schema });
}

function callHtml(url, print) {
  state.generating = true;
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
    // Same mid-flight race as the spec path: a refresh landing while the
    // model writes must not file the page under a shape it never saw.
    if (state.schemaHash !== print.hash) {
      throw wrapError('Response changed while the page was being written',
                      'The data was refreshed mid-request. Press Regenerate for the new shape.');
    }

    var store = getSchemaSpecs();
    var entry = store[print.hash] || {
      hash: print.hash, schema: print.schema,
      sourceUrl: url, createdAt: new Date().toISOString()
    };
    // A page can be several times fatter than a plan. Cache it only while
    // it fits — an oversized doc still renders, it just is not remembered.
    if (doc.length <= MAX_CACHED_HTML_BYTES) {
      entry.html = doc;
      entry.model = model;
      entry.lastUsedAt = new Date().toISOString();
      store[print.hash] = entry;
      setSchemaSpecs(store);
    } else {
      toast('Page too large to remember — it will be rewritten next time.', 'warn');
    }

    applyHtml(doc, 'generated');
    toast('Page generated' + (doc.length <= MAX_CACHED_HTML_BYTES ? ' and remembered as ' + print.hash : ''), 'ok');
  }).catch(function (err) {
    var htmlInfo = providerErrorText(provider, err);

    applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
    showAlert(htmlInfo.title, htmlInfo.message);
    toast(htmlInfo.title, 'error');
  }).then(function () { state.generating = false; },
          function () { state.generating = false; });
}

function callGemini(url, print) {
  state.generating = true;
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

    applySpec(normalized, 'generated');
    toast('Interface generated and remembered as ' + print.hash, 'ok');
  }).catch(function (err) {
    var info = providerErrorText(provider, err);

    applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
    showAlert(info.title, info.message);
    toast(info.title, 'error');
  }).then(function () { state.generating = false; },
          function () { state.generating = false; });
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

function syncRefreshUi() {
  var on = state.refreshIntervalMs > 0;
  dom.refreshToggle.setAttribute('aria-checked', on ? 'true' : 'false');
  dom.refreshInterval.disabled = !on;
  if (on) dom.refreshInterval.value = String(state.refreshIntervalMs);
  if (dom.savedList) renderSavedList();   // the rail's live dot follows
}

export { SECRET_HEADER, sameOrigin, redactSecretHeaders, hasSecretHeader, parseHeaders, BROWSER_OWNED_HEADERS, CURL_NO_ARG, CURL_WITH_ARG, shellWords, looksLikeCurl, parseCurl, importCurl, syncHeadersChip, headersToText, getSnapshotsFor, stripBody, pushSnapshot, latestSnapshotWithData, markDirty, wrapError, performRequest, finishRequest, HEADER_NAME, headerProblem, explainFailure, handleRequestFailure, noKeyAlert, useKeyedProvider, resolveSpec, syncBuilderUi, setBuilder, resolveHtml, generateInterfaceNow, callHtml, callGemini, startTimer, stopTimer, tick, syncRefreshUi };
