import { PROVIDERS, PROVIDER_IDS, detectProvider, fetchOllamaModels, getProvider, ollamaBase, ollamaModels, pickOllamaModel, providerNeedsKey } from './config.js';
import { dom, state } from './state.js';
import { getProviderKey, getSessionProvider, hasAnyKey, providerUsable, savePrefs, setProviderKey, setSessionModel, setSessionProvider } from './storage.js';
import { clear, el, qs } from './util.js';
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
  }, kind === 'error' || action ? 6000 : 3400);
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
function syncProviderUi(opts) {
  var id = getSessionProvider();
  var provider = getProvider(id);
  if (dom.providerSelect) dom.providerSelect.value = id;
  // Only the chosen provider's key, test and server are on screen.
  var blocks = document.querySelectorAll('.provider-block');
  for (var b = 0; b < blocks.length; b += 1) blocks[b].hidden = blocks[b].getAttribute('data-provider') !== id;
  if (dom.ollamaNoteOrigin) {
    try { dom.ollamaNoteOrigin.textContent = window.location.origin; }
    catch (e) { /* ignore */ }
  }
  if (dom.modelHint) dom.modelHint.textContent = provider.modelHint;
  syncChatTarget();

  // Ollama is the one provider whose model list is knowable, so ask.
  // Failure is silent here: the Test button is where errors belong.
  if (id === 'ollama') {
    if (ollamaModels) syncOllamaModelOptions(ollamaModels);
    else fetchOllamaModels().then(syncOllamaModelOptions, function () { /* Test reports it */ });
  } else if (dom.modelOptions) {
    clear(dom.modelOptions);
    if (dom.modelNote) {
      dom.modelNote.innerHTML = 'If this model is unavailable, try <span class="mono" id="modelHint">' +
        provider.modelHint + '</span>.';
      dom.modelHint = qs('modelHint');
    }
  }

  // Only rewrite the model box when it is empty or still holds another
  // provider's default, so a hand-typed model is never clobbered.
  if (dom.modelName) {
    var current = (dom.modelName.value || '').trim();
    var isOtherDefault = false;
    for (var i = 0; i < PROVIDER_IDS.length; i += 1) {
      if (current === PROVIDERS[PROVIDER_IDS[i]].defaultModel) isOtherDefault = true;
    }
    if (!current || (isOtherDefault && current !== provider.defaultModel) || (opts && opts.force)) {
      dom.modelName.value = provider.defaultModel;
      setSessionModel(provider.defaultModel);
    }
  }
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
  syncProviderUi({ force: !!key });
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
    line.textContent = key ? 'Saved ' + maskKey(key) : 'Not set';
    line.setAttribute('data-state', key ? 'ready' : 'missing');
  }
}

function setKeyStatus() {
  var active = getSessionProvider();
  var label = getProvider(active).label;
  var text, ready, title;
  if (providerUsable(active)) {
    text = label + ' ready';
    ready = true;
    title = providerNeedsKey(active)
      ? label + ' key saved — click for Settings'
      : label + ' needs no key — click for Settings';
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

// The Settings testing box: one tiny call per provider, reported inline.
// Keyed providers ping the model (~5 tokens); Ollama lists its tags, which
// also proves the browser can reach the server at all.
// The model Ollama would actually be asked to generate with.
function currentOllamaModel() {
  var typed = '';
  if (getSessionProvider() === 'ollama' && dom.modelName) typed = (dom.modelName.value || '').trim();
  if (typed) return typed;
  return pickOllamaModel(ollamaModels) || PROVIDERS.ollama.defaultModel;
}

// Offer the models that exist, and never leave the box naming one that does
// not. Only touches the box when its value is not installed, so a
// deliberately typed model is left alone.
function syncOllamaModelOptions(list) {
  if (!dom.modelOptions) return;
  clear(dom.modelOptions);
  var models = list || [];
  for (var i = 0; i < models.length; i += 1) {
    var option = document.createElement('option');
    option.value = models[i];
    dom.modelOptions.appendChild(option);
  }
  if (dom.modelNote) {
    dom.modelNote.textContent = models.length
      ? models.length + (models.length === 1 ? ' model' : ' models') + ' installed: ' + models.join(', ')
      : 'No models installed. Run: ollama pull llama3.1';
  }
  if (getSessionProvider() !== 'ollama' || !dom.modelName) return;
  var current = (dom.modelName.value || '').trim();
  if (!models.length || models.indexOf(current) !== -1) return;
  // Replace only our own guess, never a hand-typed model: if the reader
  // chose it, a wrong name is worth an error they can act on rather than a
  // silent substitution they never notice.
  if (current && current !== PROVIDERS.ollama.defaultModel) return;
  var pick = pickOllamaModel(models);
  if (pick) { dom.modelName.value = pick; setSessionModel(pick); }
}

// A CORS rejection and a dead server both surface as a bare TypeError in the
// browser, so say what to do about either, naming this page's real origin.
function ollamaFailureText(err) {
  var message = err && err.message ? err.message : String(err);
  if (/not installed|no models/i.test(message)) return message;
  // A server that answered and then failed on the content is not
  // unreachable, and saying so sends the user off restarting a process that
  // was fine the whole time. Only a connection failure earns that word:
  // fetch rejects with a TypeError, everything else carries a status.
  var connectionFailed = (err instanceof TypeError) ||
                         /failed to fetch|networkerror|load failed|connection refused/i.test(message);
  if (!connectionFailed) return message;
  var origin = 'this page';
  var secure = false;
  try {
    origin = window.location.origin;
    secure = window.location.protocol === 'https:';
  } catch (e) { /* ignore */ }

  // An https page reaching an http server on the same machine is a browser
  // policy call, not something the page can fix. Chrome exempts loopback;
  // Safari does not, so there the only cure is to run Imago over http.
  if (secure) {
    return 'Unreachable — ' + ollamaBase() + ' did not answer. Two things to check: ' +
           'Ollama must allow this page (OLLAMA_ORIGINS=' + origin + ' ollama serve), and ' +
           'some browsers (Safari) refuse an https page talking to a local http server at all. ' +
           'If it still fails in Safari, run Imago from http://localhost instead.';
  }
  return 'Unreachable — ' + ollamaBase() + ' did not answer. Start Ollama, and allow this page with: ' +
         'OLLAMA_ORIGINS=' + origin + ' ollama serve';
}

// Long enough for a big local model to answer a one-word ping, short enough
// that a dead endpoint does not hang the button forever.
var TEST_TIMEOUT_MS = 90000;

export { toastTimer, toast, showView, sheetOpener, railIsSheet, focusables, setAppPane, trapSheetFocus, syncProviderUi, maskKey, storeKeyFromInput, keyInputFor, keyStatusFor, syncKeyInputs, syncKeyStatusLines, setKeyStatus, currentOllamaModel, syncOllamaModelOptions, ollamaFailureText, TEST_TIMEOUT_MS };
