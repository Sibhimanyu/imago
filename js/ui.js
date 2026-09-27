import { PROVIDER_IDS, detectProvider, getProvider } from './config.js';
import { dom, state } from './state.js';
import { getProviderKey, getSessionProvider, hasAnyKey, keyRejected, providerUsable, savePrefs, setProviderKey, getModel, setSessionProvider } from './storage.js';
import { el } from './util.js';
import { scheduleTimelineLayout } from './render.js';
import { syncChatTarget } from './chat.js';
import { renderSavedList, renderStorageSummary } from './endpoints.js';
import { noKeyAlert } from './request.js';

/* ── Toast ─────────────────────────────────────────────────────────────── */

var toastTimer = null;

// action: { label, run } adds one button (Undo). A toast with an action
// stays up longer, since the reader has to decide.
function toast(message, kind, action) {
  if (!dom.toast || !message) return;
  dom.toast.textContent = message;
  if (action) {
    var act = el('button', 'toast-action', action.label);
    act.type = 'button';
    act.addEventListener('click', function () {
      action.run();
      dom.toast.className = 'toast';
      dom.toast.hidden = true;
    });
    dom.toast.appendChild(act);
  }
  if (kind) dom.toast.setAttribute('data-kind', kind);
  else dom.toast.removeAttribute('data-kind');
  dom.toast.hidden = false;
  // force reflow so the transition runs on repeat calls
  void dom.toast.offsetWidth;
  dom.toast.className = 'toast is-up';
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(function () {
    dom.toast.className = 'toast';
    window.setTimeout(function () { dom.toast.hidden = true; }, 240);
  }, kind === 'error' || kind === 'warn' || action ? 6000 : 3400);
}

/* ── View routing ──────────────────────────────────────────────────────── */

function showView(name) {
  state.view = name;
  dom.landingView.hidden = name !== 'landing';
  dom.appView.hidden = name !== 'app';
  if (name === 'app') scheduleTimelineLayout();
  window.scrollTo(0, 0);
}

// One screen, so a "pane" is no longer a page swap. The page is always on
// screen; the endpoints rail is always there on a wide screen (and slides up
// as a sheet on a phone when pane is 'saved'); Settings opens as a sheet.
// A sheet is a dialog: opening one moves focus into it and remembers what
// had focus, Tab stays inside Settings while it is open, and closing hands
// focus back. Before, focus stayed behind the scrim and fell to <body>.
var sheetOpener = null;

function railIsSheet() {
  return !!(window.matchMedia && window.matchMedia('(max-width: 860px)').matches);
}

function focusables(root) {
  return [].slice.call(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter(function (n) { return !n.disabled && !n.closest('[hidden]'); });
}

function setAppPane(pane) {
  if (['playground', 'saved', 'settings'].indexOf(pane) === -1) pane = 'playground';
  var from = state.pane;
  var opensSheet = pane === 'settings' || (pane === 'saved' && railIsSheet());
  if (opensSheet && from !== pane && !sheetOpener) sheetOpener = document.activeElement;
  state.pane = pane;
  dom.panePlayground.hidden = false;
  dom.paneSaved.hidden = false;
  dom.paneSettings.hidden = pane !== 'settings';
  if (dom.sheetScrim) dom.sheetScrim.hidden = pane === 'playground';
  document.body.classList.toggle('sheet-settings', pane === 'settings');
  document.body.classList.toggle('sheet-saved', pane === 'saved');

  var buttons = dom.appNav.querySelectorAll('button');
  for (var i = 0; i < buttons.length; i += 1) {
    var active = buttons[i].getAttribute('data-view') === pane;
    buttons[i].classList.toggle('is-active', active);
    buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
  }
  if (pane === 'saved') renderSavedList();
  if (pane === 'settings') renderStorageSummary();
  savePrefs();

  if (opensSheet && from !== pane) {
    var target = pane === 'settings' ? dom.settingsClose : dom.railClose;
    if (target && target.focus) target.focus();
  } else if (!opensSheet && sheetOpener) {
    var back = sheetOpener;
    sheetOpener = null;
    if (back && back.focus && document.body.contains(back)) back.focus();
  }
}

// Tab and Shift+Tab wrap inside the open Settings sheet.
function trapSheetFocus(event) {
  if (event.key !== 'Tab' || state.pane !== 'settings' || !dom.paneSettings) return;
  var items = focusables(dom.paneSettings);
  if (!items.length) return;
  var first = items[0], last = items[items.length - 1];
  var inside = dom.paneSettings.contains(document.activeElement);
  if (event.shiftKey && (document.activeElement === first || !inside)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !inside)) { event.preventDefault(); first.focus(); }
}

/* ── Meta row / key pill ───────────────────────────────────────────────── */

// Keeps the provider select, hints and model default in step. Called on
// boot, when the provider changes, and when a key is pasted.
// The Model dropdown lists the provider's models and shows the one saved for
// it. A saved name the list no longer has (typed in an older build, or a
// model since dropped from the list) stays selectable rather than being
// silently swapped for another.
function syncModelSelect(id) {
  if (!dom.modelName) return;
  var provider = getProvider(id);
  var chosen = getModel(id);
  var names = provider.models.slice();
  if (names.indexOf(chosen) === -1) names.push(chosen);
  while (dom.modelName.firstChild) dom.modelName.removeChild(dom.modelName.firstChild);
  for (var i = 0; i < names.length; i += 1) {
    var opt = document.createElement('option');
    opt.value = names[i];
    opt.textContent = names[i] + (names[i] === provider.defaultModel ? ' (default)' : '');
    dom.modelName.appendChild(opt);
  }
  dom.modelName.value = chosen;
}

function syncProviderUi() {
  var id = getSessionProvider();
  if (dom.providerSelect) dom.providerSelect.value = id;
  // Only the chosen provider's key and test are on screen.
  var blocks = document.querySelectorAll('.provider-block');
  for (var b = 0; b < blocks.length; b += 1) blocks[b].hidden = blocks[b].getAttribute('data-provider') !== id;
  syncModelSelect(id);
  syncChatTarget();
}

function maskKey(key) {
  var k = String(key || '');
  return k.length <= 8 ? '••••' : '…' + k.slice(-4);
}

// One input owns one provider slot. Typing into it also selects that
// provider — the field you touched is the key you mean.
function storeKeyFromInput(input, id) {
  var key = input.value.trim();
  // A key pasted under the wrong provider is filed under the one its prefix
  // names, and that provider is shown. The field it was typed into keeps
  // whatever it held before.
  var owner = detectProvider(key);
  if (owner && owner !== id) id = owner;
  setProviderKey(id, key);
  if (key) setSessionProvider(id);
  syncProviderUi();
  syncKeyInputs();
  setKeyStatus();
  if (key) toast(getProvider(id).label + ' key saved on this device.', 'ok');
}

// DOM id convention for the per-provider key boxes: <id>Key / <id>KeyStatus,
// so a fourth provider is markup plus a PROVIDERS entry, nothing else.
function keyInputFor(id) { return dom[id + 'Key']; }
function keyStatusFor(id) { return dom[id + 'KeyStatus']; }

function syncKeyInputs() {
  for (var i = 0; i < PROVIDER_IDS.length; i += 1) {
    var input = keyInputFor(PROVIDER_IDS[i]);
    if (input) input.value = getProviderKey(PROVIDER_IDS[i]);
  }
  syncKeyStatusLines();
}

function syncKeyStatusLines() {
  for (var i = 0; i < PROVIDER_IDS.length; i += 1) {
    var id = PROVIDER_IDS[i];
    var line = keyStatusFor(id);
    if (!line) continue;
    var key = getProviderKey(id);
    var refused = keyRejected(id);
    line.textContent = !key ? 'Not set' : refused ? 'Rejected ' + maskKey(key) + ' — check it' : 'Saved ' + maskKey(key);
    line.setAttribute('data-state', key && !refused ? 'ready' : 'missing');
  }
}

function setKeyStatus() {
  var active = getSessionProvider();
  var label = getProvider(active).label;
  var text, ready, title;
  if (providerUsable(active)) {
    text = label + ' ready';
    ready = true;
    title = label + ' key saved — click for Settings';
  } else if (keyRejected(active)) {
    text = label + ' key rejected';
    ready = false;
    title = label + ' refused this key — click to fix it in Settings';
  } else if (hasAnyKey()) {
    text = 'No ' + label + ' key';
    ready = false;
    title = 'Click to add a key in Settings';
  } else {
    text = 'No keys';
    ready = false;
    title = 'Click to add a key in Settings';
  }
  dom.keyStatus.textContent = text;
  dom.keyStatus.setAttribute('data-state', ready ? 'ready' : 'missing');
  // Missing is said on the page itself (noKeyAlert); a pill repeating it on
  // every screen was noise. The pill only confirms a ready provider.
  dom.keyStatus.hidden = !ready;
  dom.keyStatus.title = title;
  syncKeyStatusLines();
}

// Long enough for a slow model to answer a one-word ping, short enough that
// a dead endpoint does not hang the button forever.
var TEST_TIMEOUT_MS = 90000;

export { toastTimer, toast, showView, sheetOpener, railIsSheet, focusables, setAppPane, trapSheetFocus, syncProviderUi, maskKey, storeKeyFromInput, keyInputFor, keyStatusFor, syncKeyInputs, syncKeyStatusLines, setKeyStatus, TEST_TIMEOUT_MS };
