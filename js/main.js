/* ============================================================================
   Imago — APIs become interfaces
   Browser-only API playground. No framework, no bundler, no backend.
   This is the entry module (index.html loads it with type="module"); the
   rest of js/ is imported from here. See the module table in README.md.
   ========================================================================== */

import { DEFAULT_PROVIDER, DEMOS, EMPTY_EXAMPLES, PROVIDER_IDS, SESSION, STORE, detectProvider, fetchOllamaModels, getProvider, ollamaAltBase, ollamaBase } from './config.js';
import { dom, state } from './state.js';
import { getActiveKey, getPrefs, getProviderKey, getSavedRequests, getSchemaSpecs, getSessionHeaders, getSessionModel, getSessionProvider, getSnapshots, hasAnyKey, invalidateSnapshotCache, readJSON, savePrefs, setPrefs, setProviderKey, setSessionHeaders, setSessionModel, setSessionProvider, setSnapshots, writeJSON } from './storage.js';
import { applyEdits, editsFor, hasEdits, setEditing } from './edits.js';
import { byteLength, canonPath, formatBytes, formatValue, getByPath, isImageUrl, isPlainObject, isUrl, parsePath, qs } from './util.js';
import { lastSegment } from './values.js';
import { deriveSchema, diffData, fingerprint, flatten, hashString, mergeSchemas, stableStringify } from './schema.js';
import { applyHtml, buildHtmlPrompt, normalizeHtmlDoc, providerErrorText } from './llm.js';
import { buildFallbackSpec, deriveActions, endpointTitle, humanize, normalizeActions, normalizeSpec } from './spec.js';
import { isBookkeeping, renderComponent, scheduleTimelineLayout } from './render.js';
import { keyInputFor, setAppPane, setKeyStatus, showView, storeKeyFromInput, syncKeyInputs, syncProviderUi, toast, trapSheetFocus } from './ui.js';
import { chatBusy, chatTarget, chatTurns, clearChat, sendChat, syncChatTarget, testProvider, updateMeta } from './chat.js';
import { applySpec, enterStage, escapeHtml, followUrl, goBack, highlightJson, leaveStage, minimalSpec, navigateTo, pushHistory, renderChangesPane, renderRawPane, renderSchemaPane, rollbackNavigation, setActiveTab, showGeneratePrompt, showInterfaceEmpty, stepBack } from './panes.js';
import { clearAllData, currentRequestKey, hostOf, loadExample, loadSavedRequest, renderHistory, renderRailExamples, renderSavedList, saveCurrentRequest, setUrlInput, syncSaveBtn } from './endpoints.js';
import { callGemini, explainFailure, finishRequest, generateInterfaceNow, getSnapshotsFor, handleRequestFailure, hasSecretHeader, headerProblem, headersToText, importCurl, latestSnapshotWithData, looksLikeCurl, markDirty, noKeyAlert, parseCurl, parseHeaders, performRequest, pushSnapshot, redactSecretHeaders, resolveSpec, sameOrigin, setBuilder, shellWords, startTimer, stopTimer, stripBody, syncBuilderUi, syncHeadersChip, syncRefreshUi, useKeyedProvider } from './request.js';

/* ── Events ────────────────────────────────────────────────────────────── */

function wireEvents() {
  var relayoutHandle = null;
  window.addEventListener('resize', function () {
    if (relayoutHandle) window.clearTimeout(relayoutHandle);
    relayoutHandle = window.setTimeout(scheduleTimelineLayout, 140);
  });

  // No key gate in front of the product: straight to a rendered page.
  dom.landingStart.addEventListener('click', function () { enterApp(); });
  dom.landingSkip.addEventListener('click', function () { enterApp(); });
  wireSpecimen();
  dom.landingAbout.addEventListener('click', function () {
    toast('Imago turns an API response into an interface, remembers the shape, and watches it change.');
  });

  dom.appNav.addEventListener('click', function (event) {
    // The Settings button wraps an icon and a label; a click lands on those.
    var btn = event.target && event.target.closest && event.target.closest('[data-view]');
    if (btn) setAppPane(btn.getAttribute('data-view'));
  });
  dom.brandHome.addEventListener('click', function () { setAppPane('playground'); });
  dom.brandHome.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setAppPane('playground'); }
  });
  if (dom.settingsClose) dom.settingsClose.addEventListener('click', function () { setAppPane('playground'); });
  if (dom.sheetScrim) dom.sheetScrim.addEventListener('click', function () { setAppPane('playground'); });
  if (dom.railClose) dom.railClose.addEventListener('click', function () { setAppPane('playground'); });
  if (dom.inspectBtn) {
    dom.inspectBtn.addEventListener('click', function () {
      setActiveTab(state.tab === 'interface' ? (state.inspectTab || 'changes') : 'interface');
    });
  }
  renderRailExamples();
  // The pill is the fastest route to the keys: one click opens Settings.
  dom.keyStatus.addEventListener('click', function () { setAppPane('settings'); });
  dom.keyStatus.style.cursor = 'pointer';

  dom.reqForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (looksLikeCurl(dom.urlInput.value) && !importCurl(dom.urlInput.value)) return;
    state.stack = [];          // a typed URL starts a new trail
    state.stagePref = true;
    performRequest(false);
  });
  // Pasting a curl command runs it, the way pasting a URL and pressing
  // Enter would. The box is a single line, so a multi-line command would
  // otherwise arrive with its newlines stripped.
  dom.urlInput.addEventListener('paste', function (event) {
    var text = event.clipboardData && event.clipboardData.getData('text');
    if (!looksLikeCurl(text)) return;
    event.preventDefault();
    if (!importCurl(text)) return;
    state.stack = [];
    state.stagePref = true;
    performRequest(false);
  });
  if (dom.headersChip) dom.headersChip.addEventListener('click', function () { setActiveTab('headers'); });

  dom.stageBack.addEventListener('click', goBack);
  window.addEventListener('popstate', function (event) {
    var depth = (event.state && event.state.imagoDepth) || 0;
    if (depth >= state.historyDepth) return;   // forward, or not one of ours
    var steps = state.historyDepth - depth;
    state.historyDepth = depth;
    if (state.stage) stepBack(steps);
  });
  document.addEventListener('keydown', function (event) {
    trapSheetFocus(event);
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    // Innermost first: a sheet, then the inspector, then the trail.
    if (state.pane !== 'playground') { setAppPane('playground'); return; }
    if (state.tab !== 'interface') {
      var fromInspector = dom.inspector && dom.inspector.contains(document.activeElement);
      setActiveTab('interface');
      if (fromInspector && dom.inspectBtn && !dom.inspectBtn.disabled) dom.inspectBtn.focus();
      return;
    }
    // Only when there is a trail to walk back. At depth 0 this used to
    // leave the page silently and pop the phone keyboard into the URL box.
    if (state.stage && state.stack.length) goBack();
  });
  if (dom.modelName) {
    dom.modelName.addEventListener('input', function () {
      setSessionModel(dom.modelName.value.trim());
      syncChatTarget();
    });
  }

  dom.urlInput.addEventListener('input', function () {
    state.activeRequestId = null;
    syncSaveBtn();
    markDirty();
  });

  dom.saveBtn.addEventListener('click', saveCurrentRequest);
  if (dom.shareBtn) dom.shareBtn.addEventListener('click', shareCurrentPage);
  if (dom.editBtn) dom.editBtn.addEventListener('click', function () { setEditing(!state.editing); });
  // A new request starts from an empty command bar.
  dom.newRequestBtn.addEventListener('click', function () {
    setAppPane('playground');
    state.stack = [];
    state.activeRequestId = null;
    setUrlInput('');
    dom.headersInput.value = '';   // the next host must not inherit these
    markDirty();
    renderSavedList();
    dom.urlInput.focus();
  });

  dom.headersInput.addEventListener('input', markDirty);

  dom.refreshToggle.addEventListener('click', function () {
    var on = dom.refreshToggle.getAttribute('aria-checked') === 'true';
    state.refreshIntervalMs = on ? 0 : Number(dom.refreshInterval.value);
    syncRefreshUi();
    if (!on) offerNotifications();
    if (state.refreshIntervalMs && state.data && !state.dirtySinceSend) startTimer();
    else stopTimer();
    savePrefs();
  });
  dom.refreshInterval.addEventListener('change', function () {
    if (state.refreshIntervalMs) {
      state.refreshIntervalMs = Number(dom.refreshInterval.value);
      startTimer();
      savePrefs();
    }
  });

  // Closing hands focus back to the button that opened the inspector, or it
  // would fall to <body> from a pane that just disappeared.
  dom.inspectorClose.addEventListener('click', function () {
    setActiveTab('interface');
    if (dom.inspectBtn && !dom.inspectBtn.disabled) dom.inspectBtn.focus();
  });

  dom.tabBar.addEventListener('click', function (event) {
    var tab = event.target && event.target.getAttribute && event.target.getAttribute('data-tab');
    if (tab) setActiveTab(tab);
  });

  // The WAI-ARIA tablist keyboard contract: Left/Right move between tabs,
  // Home/End jump to the ends. Focus follows selection, which is the right
  // pattern here because switching a pane is cheap and has no side effects.
  dom.tabBar.addEventListener('keydown', function (event) {
    var keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (keys.indexOf(event.key) === -1) return;
    var buttons = [].slice.call(dom.tabBar.querySelectorAll('button'));
    if (!buttons.length) return;
    var current = buttons.indexOf(document.activeElement);
    if (current === -1) return;
    var next;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else if (event.key === 'ArrowRight') next = (current + 1) % buttons.length;
    else next = (current - 1 + buttons.length) % buttons.length;
    event.preventDefault();
    var tabName = buttons[next].getAttribute('data-tab');
    if (tabName) setActiveTab(tabName);
    buttons[next].focus();
  });

  dom.copyRaw.addEventListener('click', function () {
    var text = state.rawText || '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast('Response copied.', 'ok'); },
        function () { toast('Could not copy.', 'error'); });
    } else {
      toast('Clipboard unavailable in this browser.', 'error');
    }
  });

  dom.providerSelect.addEventListener('change', function () {
    setSessionProvider(dom.providerSelect.value);
    syncProviderUi({ force: true });
    setKeyStatus();
    toast('Provider set to ' + getProvider(dom.providerSelect.value).label + '.');
  });
  if (dom.ollamaEndpoint) {
    dom.ollamaEndpoint.addEventListener('input', function () {
      var prefs = getPrefs();
      prefs.ollamaEndpoint = dom.ollamaEndpoint.value.trim();
      setPrefs(prefs);
    });
  }

  for (var wi = 0; wi < PROVIDER_IDS.length; wi += 1) {
    (function (id) {
      var input = keyInputFor(id);
      if (input) input.addEventListener('input', function () { storeKeyFromInput(input, id); });
      var testBtn = dom[id + 'TestBtn'];
      if (testBtn) testBtn.addEventListener('click', function () { testProvider(id); });
    })(PROVIDER_IDS[wi]);
  }
  dom.modelName.addEventListener('input', function () {
    setSessionModel(dom.modelName.value.trim());
  });
  if (dom.builderSelect) {
    dom.builderSelect.addEventListener('change', function () {
      setBuilder(dom.builderSelect.value);
    });
  }
  var segBtns = [[dom.builderPlanBtn, 'spec'], [dom.builderHtmlBtn, 'html']];
  for (var bi = 0; bi < segBtns.length; bi += 1) {
    (function (btn, mode) {
      if (btn) btn.addEventListener('click', function () { setBuilder(mode); });
    })(segBtns[bi][0], segBtns[bi][1]);
  }
  dom.clearKeyBtn.addEventListener('click', function () {
    for (var ci = 0; ci < PROVIDER_IDS.length; ci += 1) {
      setProviderKey(PROVIDER_IDS[ci], '');
    }
    syncKeyInputs();
    syncProviderUi();
    setKeyStatus();
    toast('All keys cleared.');
  });

  if (dom.chatForm) {
    dom.chatForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var text = dom.chatInput ? dom.chatInput.value : '';
      if (!text.trim() || chatBusy) return;
      if (dom.chatInput) dom.chatInput.value = '';
      sendChat(text);
    });
  }
  if (dom.chatClearBtn) dom.chatClearBtn.addEventListener('click', clearChat);

  dom.clearStorageBtn.addEventListener('click', function () {
    if (!window.confirm('Clear all saved requests, cached interfaces, snapshots and API keys?')) return;
    clearAllData();
    toast('All saved data cleared.', 'ok');
  });

  // keep "x ago" honest while idle
  window.setInterval(function () { if (!state.tickHandle && state.data) updateMeta(); }, 10000);
  window.addEventListener('beforeunload', savePrefs);
}

// The landing hero: one response and the interface it became, for three
// examples. The switcher swaps both halves; Try an example opens the app on
// whichever one is showing.
function wireSpecimen() {
  var root = document.querySelector('.specimen');
  if (!root) return;
  var tabs = root.querySelectorAll('.specimen-switch button');
  var url = DEMOS[0].url;
  function show(name) {
    for (var i = 0; i < tabs.length; i += 1) {
      var on = tabs[i].getAttribute('data-example') === name;
      tabs[i].classList.toggle('is-active', on);
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) {
        var shown = qs('specimenUrl');
        if (shown) shown.textContent = tabs[i].getAttribute('data-url');
      }
    }
    var panes = root.querySelectorAll('.spec-pane');
    for (var j = 0; j < panes.length; j += 1) {
      var match = panes[j].getAttribute('data-example') === name;
      panes[j].hidden = !match;
      panes[j].classList.toggle('is-active', match);
    }
    var demo = { pokemon: 'pokeapi.co', weather: 'open-meteo', library: 'openlibrary' }[name];
    for (var d = 0; d < DEMOS.length; d += 1) {
      if (DEMOS[d].url.indexOf(demo) !== -1) { url = DEMOS[d].url; break; }
    }
  }
  for (var t = 0; t < tabs.length; t += 1) {
    (function (tab) {
      tab.addEventListener('click', function () { show(tab.getAttribute('data-example')); });
    })(tabs[t]);
  }
  if (dom.landingTry) {
    dom.landingTry.addEventListener('click', function () {
      enterApp();
      loadExample(url);
    });
  }
}

/* ── Bootstrap ─────────────────────────────────────────────────────────── */

function cacheDom() {
  var ids = ['landingView', 'appView', 'landingStart', 'landingSkip', 'landingAbout', 'landingTry',
              'appNav', 'brandHome', 'keyStatus',
              'panePlayground', 'paneSaved', 'paneSettings', 'reqForm', 'urlInput', 'sendBtn', 'saveBtn',
              'refreshToggle', 'refreshInterval', 'livePill', 'liveCount', 'runMeta', 'stLastChecked',
             'stSize', 'stChanged', 'changedChip', 'nextChip', 'stNextRefresh', 'tabBar',
             'interfaceCard', 'interfaceHead', 'interfaceTitle', 'cacheBadge', 'interfaceOut',
             'inspectorHead', 'inspectorClose', 'headersChip', 'shareBtn', 'editBtn', 'rawOut', 'copyRaw', 'schemaOut', 'schemaHashChip', 'changesOut', 'snapshotsOut',
              'headersInput', 'savedList', 'savedEmpty', 'newRequestBtn', 'geminiKey', 'groqKey',
              'geminiKeyStatus', 'groqKeyStatus', 'modelName',
              'clearKeyBtn', 'clearStorageBtn', 'storageSummary', 'toast', 'builderSelect',
              'builderPlanBtn', 'builderHtmlBtn',
              'geminiTestBtn', 'geminiTestStatus', 'groqTestBtn', 'groqTestStatus',
              'ollamaTestBtn', 'ollamaTestStatus', 'modelOptions', 'modelNote',
             'chatLog', 'chatForm', 'chatInput', 'chatSendBtn', 'chatTarget', 'chatClearBtn',
              'providerSelect', 'modelHint', 'ollamaEndpoint',
              'ollamaServerGroup', 'ollamaNoteOrigin',
             'stageBar', 'stageBack', 'stageCrumb', 'stageLive', 'stageLiveCount', 'stageSource',
             'inspectBtn', 'inspector', 'historyStrip', 'railExamples', 'railClose',
             'settingsClose', 'sheetScrim'];
  for (var i = 0; i < ids.length; i += 1) dom[ids[i]] = qs(ids[i]);
}

// Get started means "I have an endpoint": the page opens ready to paste
// one. Try an example is the other door, and it loads the example shown.
// Get started used to load an example too, so the two buttons did the same.
// No key is ever asked for here; it is offered when it would buy something.
function enterApp() {
  var prefs = getPrefs();
  prefs.onboarded = true;
  setPrefs(prefs);
  showView('app');
  if (!state.data && dom.urlInput) dom.urlInput.focus();
}

// One-time move from the old single session key: file it under the provider
// its prefix names, then drop the session copies so they stop shadowing.
function migrateLegacyKeys() {
  var moved = false;
  try {
    var slots = [window.sessionStorage.getItem('imago.apiKey'),
                 window.sessionStorage.getItem('imago.geminiKey')];
    for (var i = 0; i < slots.length; i += 1) {
      var legacy = slots[i];
      if (!legacy) continue;
      var id = detectProvider(legacy) || DEFAULT_PROVIDER;
      if (!getProviderKey(id)) setProviderKey(id, legacy);
      moved = true;
    }
    window.sessionStorage.removeItem('imago.apiKey');
    window.sessionStorage.removeItem('imago.geminiKey');
  } catch (e) { /* ignore */ }
  return moved;
}

function restoreSession() {
  if (migrateLegacyKeys()) toast('Your saved key was moved to the new per-provider store.', 'ok');
  // The OpenCode provider was removed; drop its slot if one was ever stored.
  try { window.localStorage.removeItem('imago.key.opencode'); } catch (e) { /* ignore */ }
  syncKeyInputs();
  if (dom.ollamaEndpoint) {
    try { dom.ollamaEndpoint.value = String(getPrefs().ollamaEndpoint || ''); }
    catch (e) { /* ignore */ }
  }
  dom.modelName.value = getSessionModel() || getProvider(getSessionProvider()).defaultModel;
  setSessionModel(dom.modelName.value);
  syncProviderUi();
  setKeyStatus();
}

function restoreLastView() {
  var prefs = getPrefs();

  state.builder = prefs.builder === 'html' ? 'html' : 'spec';
  syncBuilderUi();

  if (prefs.lastUrl) setUrlInput(prefs.lastUrl);
  syncSaveBtn();
  // Older builds persisted headers to localStorage. Migrate them into the
  // session once, then scrub the durable copy so the credentials stop
  // surviving a browser restart.
  if (prefs.lastHeadersText) {
    setSessionHeaders(prefs.lastHeadersText);
    delete prefs.lastHeadersText;
    setPrefs(prefs);
  }
  var sessionHeaders = getSessionHeaders();
  if (sessionHeaders) dom.headersInput.value = sessionHeaders;
  syncHeadersChip();
  state.headersText = sessionHeaders;
  state.activeRequestId = prefs.activeRequestId || null;
  state.url = prefs.lastUrl || '';
  state.refreshIntervalMs = Number(prefs.refreshIntervalMs) || 0;
  state.stagePref = prefs.stage !== false;
  syncRefreshUi();

  setAppPane('playground');   // sheets do not reopen on reload
  setActiveTab(prefs.activeTab || 'interface');
  renderSavedList();

  if (!restoreFromSnapshot(state.url)) {
    // No body to show: an inspector reopened now would have no tab bar to
    // close it with, and would cover the canvas on a phone.
    setActiveTab('interface');
    dom.inspectorHead.hidden = true;
    showInterfaceEmpty();
    updateMeta();
  }
}

// Rebuild a page from its newest stored snapshot without spending a request.
// Used on reload, and by Back — a browser does not refetch history either.
function restoreFromSnapshot(url) {
  var snapshot = latestSnapshotWithData(url ? hashString(url) : '');
  if (!snapshot) return false;

  state.url = url;
  state.data = snapshot.data;
  state.dataUrl = url;
  state.status = snapshot.status;
  state.lastCheckedAt = new Date(snapshot.fetchedAt).getTime();
  state.diff = null;
  state.changedCount = 0;
  try {
    state.rawText = JSON.stringify(snapshot.data);
    state.byteSize = byteLength(state.rawText);
  } catch (err) { state.rawText = ''; state.byteSize = 0; }

  var print = fingerprint(snapshot.data);
  state.schema = print.schema;
  state.schemaHash = print.hash;

  dom.inspectorHead.hidden = false;
  renderRawPane();
  renderSchemaPane();
  renderChangesPane();

  if (state.builder === 'html') {
    var htmlEntry = getSchemaSpecs()[print.hash];
    var cachedDoc = htmlEntry && htmlEntry.html ? normalizeHtmlDoc(htmlEntry.html) : null;
    if (cachedDoc) applyHtml(cachedDoc, 'cache');
    else if (useKeyedProvider()) {
      state.pendingGenerate = true;
      showGeneratePrompt();
    } else {
      applySpec(normalizeSpec(buildFallbackSpec(snapshot.data, url)), 'fallback');
      noKeyAlert();
    }
    updateMeta();
    return true;
  }

  var entry = getSchemaSpecs()[print.hash];
  var normalized = entry && entry.spec ? normalizeSpec(entry.spec) : null;
  if (normalized) applySpec(normalized, 'cache');
  else applySpec(normalizeSpec(buildFallbackSpec(snapshot.data, url)), 'fallback');

  updateMeta();
  return true;
}

/* ── Watch alerts ─────────────────────────────────────────────────────
   Watch used to be useful only while you were looking at the tab. When a
   watched fetch changes something while the tab is in the background, the
   tab title carries the count ("(3) Forecast — Imago"), and, if you allowed
   it, a notification says what changed. Nothing asks for permission until
   you turn Watch on, and then only once, as an offer in a toast. */

var baseTitle = '';

function describeChange(diff) {
  var paths = Object.keys(diff || {});
  if (!paths.length) return '';
  var e = diff[paths[0]];
  var name = humanize(lastSegment(paths[0]));
  var text = e.type === 'changed' ? name + ': ' + formatValue(e.before) + ' → ' + formatValue(e.after)
    : e.type === 'added' ? name + ' appeared' : name + ' was removed';
  if (paths.length > 1) text += ' (and ' + (paths.length - 1) + ' more)';
  return text;
}

function noteWatchedChange(url) {
  if (!document.hidden) return;
  var name = (state.spec && state.spec.title) || hostOf(url) || 'Imago';
  state.unseenChanges += state.changedCount;
  document.title = '(' + state.unseenChanges + ') ' + name + ' — Imago';
  if (window.Notification && window.Notification.permission === 'granted') {
    try {
      var n = new window.Notification(name + ' changed', {
        body: describeChange(state.diff),
        tag: 'imago-' + hashString(url),   // one notification per endpoint, replaced each time
        icon: 'favicon.svg'
      });
      n.onclick = function () { window.focus(); n.close(); };
    } catch (err) { /* some browsers only allow notifications from a service worker */ }
  }
}

function clearUnseen() {
  if (document.hidden) return;
  state.unseenChanges = 0;
  if (baseTitle) document.title = baseTitle;
}

// Offered once, when Watch is turned on: a toast, never a bare prompt.
function offerNotifications() {
  if (!window.Notification || window.Notification.permission !== 'default') return;
  var prefs = getPrefs();
  if (prefs.notifyAsked) return;
  prefs.notifyAsked = true;
  setPrefs(prefs);
  toast('Watching. Want a notification when it changes while you are in another tab?', null, {
    label: 'Notify me',
    run: function () {
      var answer = window.Notification.requestPermission();
      if (answer && answer.then) answer.then(function (result) {
        toast(result === 'granted' ? 'You will be notified when it changes.' : 'No notifications. The tab title still shows changes.', result === 'granted' ? 'ok' : null);
      });
    }
  });
}

/* ── Share links ──────────────────────────────────────────────────────
   A link that reopens this page for someone else: the endpoint and the
   layout, and nothing else. No headers, no keys, no response body (the
   recipient fetches fresh data). The layout is left out when it is the
   basic one, which the recipient's browser rebuilds from the data anyway. */

var SHARE_PREFIX = '#share=';
var MAX_SHARE_CHARS = 8000;   // past this some chat apps cut the link

function toBase64Url(text) {
  return window.btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  var b64 = String(text).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return decodeURIComponent(escape(window.atob(b64)));
}

// → { link, withLayout }
function buildShareLink() {
  var payload = { v: 1, u: state.url };
  // What is on screen, edits included: a basic layout you edited is worth
  // sending; an untouched one the recipient rebuilds on their own.
  var edits = editsFor(state.schemaHash);
  var layout = state.spec ? applyEdits(state.spec, edits) : null;
  var withLayout = !!layout && (state.specSource !== 'fallback' || hasEdits(edits));
  if (withLayout) payload.s = layout;
  var base = window.location.origin + window.location.pathname;
  var link = base + SHARE_PREFIX + toBase64Url(JSON.stringify(payload));
  if (link.length > MAX_SHARE_CHARS && withLayout) {
    withLayout = false;
    link = base + SHARE_PREFIX + toBase64Url(JSON.stringify({ v: 1, u: state.url }));
  }
  return { link: link, withLayout: withLayout };
}

// → { url, spec|null } or null for no link; { error } for a damaged one.
function readShareLink(hash) {
  if (!hash || hash.indexOf(SHARE_PREFIX) !== 0) return null;
  try {
    var payload = JSON.parse(fromBase64Url(hash.slice(SHARE_PREFIX.length)));
    var url = payload && typeof payload.u === 'string' ? payload.u : '';
    var parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme');
    return { url: url, spec: isPlainObject(payload.s) ? payload.s : null };
  } catch (err) {
    return { error: 'That share link is damaged, so it could not be opened.' };
  }
}

function shareCurrentPage() {
  if (!state.data || !state.url) return;
  var built = buildShareLink();
  var notes = [];
  if (!built.withLayout && state.specSource !== 'fallback') notes.push('The layout was too big to fit, so the link has only the endpoint.');
  if (Object.keys(state.headers || {}).length) notes.push('It leaves out this endpoint\'s headers, so it may not load for others.');
  var done = function () { toast(['Link copied.'].concat(notes).join(' '), notes.length ? null : 'ok'); };
  var failed = function () { toast('Could not copy the link. Allow clipboard access and try again.', 'error'); };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(built.link).then(done, failed);
    else failed();
  } catch (err) { failed(); }
  return built.link;
}

// Opening a share link: straight into the app, fetch with no headers, show
// the shared layout once. The link comes out of the address bar so a reload
// is an ordinary visit and the link is not kept in history.
function openShareLink() {
  var shared = readShareLink(window.location.hash);
  if (!shared) return false;
  try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (err) { /* ignore */ }
  var prefs = getPrefs();
  prefs.onboarded = true;
  setPrefs(prefs);
  showView('app');
  if (shared.error) { toast(shared.error, 'error'); return true; }
  state.sharedSpec = shared.spec ? { url: shared.url, spec: shared.spec } : null;
  state.stack = [];
  toast('Opened a page shared from ' + (hostOf(shared.url) || 'a link') + '.');
  navigateTo(shared.url, '');
  return true;
}

function init() {
  cacheDom();
  baseTitle = document.title;
  document.addEventListener('visibilitychange', clearUnseen);
  window.addEventListener('focus', clearUnseen);
  wireEvents();
  restoreSession();
  restoreLastView();
  if (openShareLink()) return;

  var prefs = getPrefs();
  if (prefs.onboarded) showView('app');
  else showView('landing');
}

/* ── Test seam ─────────────────────────────────────────────────────────
   The suite boots the app through the page (a fresh jsdom and fresh module
   state per test) rather than importing modules, so this is its way in: the
   pure helpers plus the state/dom objects the tests assert against are hung
   off one object here.

   This grants no capability an attacker did not already have. Everything
   reachable through it — including getActiveKey — reads browser storage on
   the same origin, which any script running in this page can read directly.
   It is a convenience for tests, not a trust boundary. See TESTING.md.
   ────────────────────────────────────────────────────────────────────── */
window.__imago = {
  state: state, dom: dom, STORE: STORE, SESSION: SESSION,
  // pure helpers
  parsePath: parsePath, canonPath: canonPath, getByPath: getByPath,
  isUrl: isUrl, isImageUrl: isImageUrl, formatValue: formatValue,
  formatBytes: formatBytes, byteLength: byteLength, humanize: humanize,
  deriveSchema: deriveSchema, mergeSchemas: mergeSchemas,
  stableStringify: stableStringify, hashString: hashString,
  fingerprint: fingerprint, flatten: flatten, diffData: diffData,
  normalizeSpec: normalizeSpec, normalizeActions: normalizeActions,
  buildFallbackSpec: buildFallbackSpec, deriveActions: deriveActions,
  escapeHtml: escapeHtml, highlightJson: highlightJson,
  parseHeaders: parseHeaders, headersToText: headersToText,
  endpointTitle: endpointTitle, hostOf: hostOf,
  sameOrigin: sameOrigin, redactSecretHeaders: redactSecretHeaders,
  // storage
  readJSON: readJSON, writeJSON: writeJSON,
  getPrefs: getPrefs, setPrefs: setPrefs, savePrefs: savePrefs,
  getSnapshots: getSnapshots, setSnapshots: setSnapshots,
  invalidateSnapshotCache: invalidateSnapshotCache,
  fetchOllamaModels: fetchOllamaModels, ollamaBase: ollamaBase, ollamaAltBase: ollamaAltBase,
  sendChat: sendChat, clearChat: clearChat, chatTarget: chatTarget,
  chatTurns: function () { return chatTurns; },
  getSessionHeaders: getSessionHeaders, setSessionHeaders: setSessionHeaders,
  hasSecretHeader: hasSecretHeader, minimalSpec: minimalSpec,
  rollbackNavigation: rollbackNavigation, finishRequest: finishRequest,
  pushSnapshot: pushSnapshot, getSnapshotsFor: getSnapshotsFor,
  getSchemaSpecs: getSchemaSpecs, getSavedRequests: getSavedRequests,
  getActiveKey: getActiveKey, getProviderKey: getProviderKey,
  setProviderKey: setProviderKey, hasAnyKey: hasAnyKey,
  getSessionProvider: getSessionProvider, setSessionProvider: setSessionProvider,
  getProvider: getProvider,
  // examples
  DEMOS: DEMOS, EMPTY_EXAMPLES: EMPTY_EXAMPLES, loadExample: loadExample, renderComponent: renderComponent,
  parseCurl: parseCurl, shellWords: shellWords, startTimer: startTimer, stopTimer: stopTimer, applyEdits: applyEdits, editsFor: editsFor, setEditing: setEditing, describeChange: describeChange, buildShareLink: buildShareLink, readShareLink: readShareLink, shareCurrentPage: shareCurrentPage, headerProblem: headerProblem, explainFailure: explainFailure, looksLikeCurl: looksLikeCurl, importCurl: importCurl,
  // full-html builder
  normalizeHtmlDoc: normalizeHtmlDoc, buildHtmlPrompt: buildHtmlPrompt,
  applyHtml: applyHtml, setBuilder: setBuilder,
  testProvider: testProvider, providerErrorText: providerErrorText,
  // behaviour
  applySpec: applySpec, performRequest: performRequest,
  goBack: goBack, stepBack: stepBack, pushHistory: pushHistory,
  followUrl: followUrl, navigateTo: navigateTo,
  handleRequestFailure: handleRequestFailure,
  renderRawPane: renderRawPane, renderSchemaPane: renderSchemaPane,
  setActiveTab: setActiveTab, enterStage: enterStage, leaveStage: leaveStage,
  updateMeta: updateMeta,
  restoreFromSnapshot: restoreFromSnapshot, currentRequestKey: currentRequestKey,
  clearAllData: clearAllData,
  callGemini: callGemini, generateInterfaceNow: generateInterfaceNow,
  resolveSpec: resolveSpec, getSchemaSpecs: getSchemaSpecs, showInterfaceEmpty: showInterfaceEmpty, setUrlInput: setUrlInput,
  loadSavedRequest: loadSavedRequest,
  setAppPane: setAppPane, renderHistory: renderHistory, renderSavedList: renderSavedList,
  enterApp: enterApp, isBookkeeping: isBookkeeping, stripBody: stripBody,
  init: init
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { wireEvents, wireSpecimen, cacheDom, enterApp, migrateLegacyKeys, restoreSession, restoreLastView, restoreFromSnapshot, baseTitle, describeChange, noteWatchedChange, clearUnseen, offerNotifications, SHARE_PREFIX, MAX_SHARE_CHARS, toBase64Url, fromBase64Url, buildShareLink, readShareLink, shareCurrentPage, openShareLink, init };
