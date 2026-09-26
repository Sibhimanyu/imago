import { getProvider } from './config.js';
import { dom, state } from './state.js';
import { clearKeyRejected, getProviderKey, getSessionProvider, markKeyRejected, providerUsable } from './storage.js';
import { clear, el, formatBytes, formatRelative } from './util.js';
import { fingerprint } from './schema.js';
import { llmRequest, providerErrorText } from './llm.js';
import { TEST_TIMEOUT_MS, setKeyStatus } from './ui.js';

/* ── Try-it console ──────────────────────────────────────────────────────
   A real conversation against the configured provider, through the same
   llmRequest the interface builder uses. A connection test proves reachability;
   this proves the thing you are about to rely on actually answers you.
   ---------------------------------------------------------------------- */

var chatTurns = [];        // [{ role: 'user' | 'assistant', text }]
var chatBusy = false;

// Which provider and model a message would go to right now.
function chatTarget() {
  var id = getSessionProvider();
  var provider = getProvider(id);
  var model = provider.defaultModel;
  if (dom.modelName) {
    var typed = (dom.modelName.value || '').trim();
    if (typed) model = typed;
  }
  return { id: id, provider: provider, model: model };
}

function syncChatTarget() {
  if (!dom.chatTarget) return;
  var t = chatTarget();
  var ready = providerUsable(t.id);
  dom.chatTarget.textContent = t.provider.label + ' · ' + t.model;
  dom.chatTarget.setAttribute('data-state', ready ? 'ready' : 'missing');
  if (dom.chatSendBtn) dom.chatSendBtn.disabled = chatBusy;
}

function renderChatLog() {
  if (!dom.chatLog) return;
  clear(dom.chatLog);
  if (!chatTurns.length) {
    dom.chatLog.appendChild(el('p', 'muted-note', 'Nothing sent yet.'));
    return;
  }
  for (var i = 0; i < chatTurns.length; i += 1) {
    var turn = chatTurns[i];
    var wrap = el('div', 'chat-turn');
    wrap.setAttribute('data-role', turn.role === 'user' ? 'you' : (turn.error ? 'error' : 'reply'));
    wrap.appendChild(el('p', 'chat-role',
      turn.role === 'user' ? 'You' : (turn.error ? 'Failed' : (turn.label || 'Reply'))));
    if (turn.text) wrap.appendChild(el('p', 'chat-text', turn.text));
    // A reasoning model can answer with thought and no text. Hiding that
    // makes a working model look silent, which is the whole trap.
    if (turn.thinking) {
      if (!turn.text) wrap.appendChild(el('p', 'chat-text', '(no text — it answered with thinking only)'));
      // Collapsed: a reasoning trace is often longer than the answer and
      // would bury it, but hiding it outright is what made a working model
      // look silent in the first place.
      var details = el('details', 'chat-thinking-wrap');
      details.appendChild(el('summary', 'chat-thinking-toggle', 'Thinking'));
      details.appendChild(el('p', 'chat-thinking', turn.thinking));
      if (!turn.text) details.open = true;
      wrap.appendChild(details);
    }
    dom.chatLog.appendChild(wrap);
  }
  dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
}

function pushChatTurn(turn) {
  chatTurns.push(turn);
  renderChatLog();
}

// The thinking trace, whatever the provider calls it.
function chatThinkingOf(payload) {
  try {
    var msg = payload && payload.choices && payload.choices[0] && payload.choices[0].message;
    if (!msg) return '';
    if (typeof msg.reasoning_content === 'string') return msg.reasoning_content;
    return typeof msg.reasoning === 'string' ? msg.reasoning : '';
  } catch (e) { return ''; }
}

function sendChat(text) {
  var message = String(text || '').trim();
  if (!message || chatBusy) return Promise.resolve();
  var t = chatTarget();
  if (!getProviderKey(t.id)) {
    pushChatTurn({ role: 'assistant', error: true, text: 'Add a ' + t.provider.label + ' key first.' });
    return Promise.resolve();
  }

  pushChatTurn({ role: 'user', text: message });
  chatBusy = true;
  syncChatTarget();
  var started = Date.now();
  var pending = { role: 'assistant', label: 'Thinking…', text: '' };
  pushChatTurn(pending);
  var ticker = window.setInterval(function () {
    pending.label = 'Thinking… ' + Math.round((Date.now() - started) / 1000) + 's';
    renderChatLog();
  }, 1000);

  function settle(patch) {
    window.clearInterval(ticker);
    chatBusy = false;
    chatTurns[chatTurns.length - 1] = patch;
    renderChatLog();
    syncChatTarget();
  }

  // Only the turns that actually carry text; a failed turn is not context.
  var history = chatTurns.filter(function (turn) { return turn.text && !turn.error && turn !== pending; })
    .map(function (turn) { return { role: turn.role, text: turn.text }; });

  return llmRequest(t.provider, t.model, getProviderKey(t.id), t.provider.chatBody(t.model, history))
    .then(function (payload) {
      var reply = t.provider.extract(payload);
      var thinking = chatThinkingOf(payload);
      if (!reply && !thinking) throw emptyReplyError(payload);
      settle({
        role: 'assistant',
        label: t.model + ' · ' + (Date.now() - started) + ' ms',
        text: reply,
        thinking: thinking
      });
    })
    .catch(function (err) {
      var info = providerErrorText(t.provider, err);
      settle({
        role: 'assistant', error: true,
        text: info.title + (info.message ? ' — ' + info.message : '')
      });
    });
}

function clearChat() {
  chatTurns = [];
  renderChatLog();
  syncChatTarget();
}

function testProvider(id) {
  var provider = getProvider(id);
  var btn = dom[id + 'TestBtn'];
  var line = dom[id + 'TestStatus'];
  if (!btn || !line) return Promise.resolve();
  if (!getProviderKey(id)) {
    line.textContent = 'Add a ' + provider.label + ' key first.';
    line.setAttribute('data-state', 'missing');
    return Promise.resolve();
  }
  btn.disabled = true;
  line.textContent = 'Testing…';
  line.setAttribute('data-state', 'missing');
  var started = Date.now();
  var done = false;

  // A large reasoning model can take tens of seconds over a one-word ping.
  // With only a static "Testing…" that is indistinguishable from a hang, so
  // count up, and give up rather than spin forever.
  var ticker = window.setInterval(function () {
    if (done) return;
    line.textContent = 'Testing… ' + Math.round((Date.now() - started) / 1000) + 's';
  }, 1000);

  function finish(ok, text, badKey) {
    if (done) return;
    done = true;
    window.clearInterval(ticker);
    btn.disabled = false;
    // A key the provider refused stops reading as ready everywhere, and a
    // key that answered clears that mark.
    if ((ok && clearKeyRejected(id)) || (badKey && markKeyRejected(id))) {
      setKeyStatus();
      syncChatTarget();
    }
    line.textContent = text;
    line.setAttribute('data-state', ok ? 'ready' : 'missing');
  }
  window.setTimeout(function () {
    finish(false, 'Timed out after ' + Math.round(TEST_TIMEOUT_MS / 1000) + 's. A large model can be slower — try a smaller one.');
  }, TEST_TIMEOUT_MS);
  function elapsed() { return (Date.now() - started) + ' ms'; }

  // Test the model the user would actually generate with: the box value
  // when this provider is active, otherwise its default.
  var model = provider.defaultModel;
  if (getSessionProvider() === id && dom.modelName) {
    var typed = dom.modelName.value.trim();
    if (typed) model = typed;
  }
  return llmRequest(provider, model, getProviderKey(id), provider.testBody(model))
    .then(function (payload) {
      // Reasoning models sometimes answer with thinking and no final text.
      // For a connectivity ping, thinking still proves the key and the
      // model work — only true silence is a failure.
      if (!provider.extract(payload) && !providerThinking(payload)) {
        throw emptyReplyError(payload);
      }
      finish(true, 'OK · ' + model + ' · ' + elapsed());
    })
    .catch(function (err) {
      var info = providerErrorText(provider, err);
      finish(false, info.title + (info.message ? ' — ' + info.message : ''), info.badKey);
    });
}

// Any thinking trace on the first choice, whatever the provider names it.
function providerThinking(payload) {
  try {
    var msg = payload && payload.choices && payload.choices[0] &&
              payload.choices[0].message;
    if (!msg) return '';
    if (typeof msg.reasoning_content === 'string' && msg.reasoning_content) {
      return msg.reasoning_content;
    }
    return typeof msg.reasoning === 'string' ? msg.reasoning : '';
  } catch (e) { return ''; }
}

// "Empty reply" alone sends the user nowhere. The finish reason almost
// always names the cause: `length` means the budget cut the answer off,
// `stop` with no text means the model itself stayed silent.
function emptyReplyError(payload) {
  var reason = '';
  try {
    var choice = payload && payload.choices && payload.choices[0];
    if (choice && choice.finish_reason) reason = ' (finish_reason ' + choice.finish_reason + ')';
  } catch (e) { /* ignore */ }
  return new Error('Empty reply' + reason + '.');
}

function updateMeta() {
  if (dom.inspectBtn) dom.inspectBtn.disabled = !state.data;
  if (dom.shareBtn) dom.shareBtn.disabled = !state.data;
  if (dom.editBtn) dom.editBtn.disabled = !state.data || !state.spec || state.builder === 'html';
  // While another endpoint loads, "Checked 44s ago · 353.8 KB" describes the
  // page that is leaving, not the one on its way.
  var leaving = state.inFlight && state.url !== state.dataUrl;
  if (!state.data || leaving) { dom.runMeta.hidden = true; return; }
  dom.runMeta.hidden = false;

  dom.stLastChecked.textContent = state.lastCheckedAt ? formatRelative(state.lastCheckedAt) : '—';
  dom.stSize.textContent = state.byteSize ? formatBytes(state.byteSize) : '—';
  // Plain words only. The schema fingerprint lives in Inspect → Schema, and
  // "Changed —" (no previous fetch yet) said nothing; the count shows only
  // when something actually changed.
  var changed = state.diff ? state.changedCount : 0;
  dom.changedChip.hidden = !(changed > 0);
  dom.stChanged.textContent = String(changed);
  dom.changedChip.className = changed > 0 ? 'meta-chip is-hot' : 'meta-chip';

  if (state.refreshIntervalMs && state.nextRefreshAt) {
    var remaining = Math.max(0, Math.ceil((state.nextRefreshAt - Date.now()) / 1000));
    dom.nextChip.hidden = false;
    dom.stNextRefresh.textContent = remaining + 's';
    dom.liveCount.textContent = '· ' + remaining + 's';
    dom.stageLive.hidden = false;
    dom.stageLiveCount.textContent = '· ' + remaining + 's';
  } else {
    dom.nextChip.hidden = true;
    dom.liveCount.textContent = '';
    dom.stageLive.hidden = true;
    dom.stageLiveCount.textContent = '';
  }

  // A generated page is a snapshot: flag it the moment fresh data lands.
  var staleBar = dom.interfaceOut.querySelector('.html-stale');
  if (staleBar) {
    staleBar.hidden = !(state.builder === 'html' && state.htmlSig && state.data &&
      (state.dataUrl !== state.htmlUrl || state.dataSig !== state.htmlSig));
  }
}

export { chatTurns, chatBusy, chatTarget, syncChatTarget, renderChatLog, pushChatTurn, chatThinkingOf, sendChat, clearChat, testProvider, providerThinking, emptyReplyError, updateMeta };
