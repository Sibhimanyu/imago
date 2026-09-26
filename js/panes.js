import { DEMOS, EMPTY_EXAMPLES, MAX_SNAPSHOTS } from './config.js';
import { dom, state } from './state.js';
import { savePrefs } from './storage.js';
import { applyEdits, editPanel, editsFor } from './edits.js';
import { clear, el, formatClock, formatRelative, formatValue, getByPath, isImageUrl, isUrl } from './util.js';
import { lastSegment } from './values.js';
import { RE_KEY_PAGING, buildFallbackSpec, normalizeSpec } from './spec.js';
import { renderSpecBody, scheduleTimelineLayout } from './render.js';
import { toast } from './ui.js';
import { updateMeta } from './chat.js';
import { currentRequestKey, hostOf, loadExample, renderHistory, renderSavedList, setUrlInput } from './endpoints.js';
import { cancelInFlight, generateInterfaceNow, getSnapshotsFor, hasSecretHeader, markDirty, noKeyAlert, parseHeaders, performRequest, sameOrigin, startTimer, syncHeadersChip } from './request.js';
import { restoreFromSnapshot } from './main.js';

/* ── Response pane (syntax highlighted, numbered) ──────────────────────── */

function escapeHtml(text) {
  return String(text).replace(/[&<>]/g, function (ch) {
    return ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : '&gt;';
  });
}

var JSON_TOKEN = /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

function highlightJson(text) {
  return escapeHtml(text).replace(JSON_TOKEN, function (match) {
    var cls = 'tok-num';
    if (match.charAt(0) === '"') {
      cls = /:\s*$/.test(match) ? 'tok-key' : 'tok-str';
    } else if (match === 'true' || match === 'false') {
      cls = 'tok-bool';
    } else if (match === 'null') {
      cls = 'tok-null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

var MAX_CODE_LINES = 1500;

function renderRawPane() {
  state.rawPaneDirty = false;
  if (!state.data) { dom.rawOut.textContent = ''; return; }
  var text;
  try {
    text = JSON.stringify(state.data, null, 2);
  } catch (err) {
    text = state.rawText;
  }

  var lines = text.split('\n');
  var totalLines = lines.length;
  var truncated = totalLines > MAX_CODE_LINES;
  if (truncated) lines = lines.slice(0, MAX_CODE_LINES);

  var out = [];
  for (var i = 0; i < lines.length; i += 1) {
    out.push('<span class="ln">' + (i + 1) + '</span>' + highlightJson(lines[i]));
  }
  if (truncated) {
    out.push('<span class="ln"></span><span class="tok-null">… ' +
             (totalLines - MAX_CODE_LINES) + ' more lines</span>');
  }
  dom.rawOut.innerHTML = out.join('\n');
}

function renderSchemaPane() {
  state.schemaPaneDirty = false;
  if (!state.schema) { dom.schemaOut.textContent = ''; dom.schemaHashChip.textContent = ''; return; }
  dom.schemaHashChip.textContent = state.schemaHash;
  var text = JSON.stringify(state.schema, null, 2);
  var lines = text.split('\n').slice(0, MAX_CODE_LINES);
  var out = [];
  for (var i = 0; i < lines.length; i += 1) {
    out.push('<span class="ln">' + (i + 1) + '</span>' + highlightJson(lines[i]));
  }
  dom.schemaOut.innerHTML = out.join('\n');
}

/* ── Changes + snapshots ───────────────────────────────────────────────── */

function renderChangesPane() {
  var host = dom.changesOut;
  clear(host);

  if (!state.diff) {
    host.appendChild(el('p', 'muted-note', state.data
      ? 'First snapshot captured. Send this request again and Imago will show what moved.'
      : 'No comparison yet.'));
  } else {
    var paths = Object.keys(state.diff);
    if (!paths.length) {
      host.appendChild(el('p', 'muted-note', 'No changes since the previous snapshot.'));
    } else {
      host.appendChild(el('h4', 'sub-head',
        paths.length + ' path' + (paths.length === 1 ? '' : 's') + ' changed'));
      var shown = paths.slice(0, 20);
      for (var i = 0; i < shown.length; i += 1) {
        var entry = state.diff[shown[i]];
        var row = el('div', 'diff-row is-' + entry.type);
        row.appendChild(el('span', 'diff-path', shown[i]));

        var vals = el('span', 'diff-vals');
        if (entry.type === 'changed') {
          vals.appendChild(el('span', 'diff-before', formatValue(entry.before)));
          vals.appendChild(el('span', 'diff-arrow', '→'));
          vals.appendChild(el('span', 'diff-after', formatValue(entry.after)));
        } else if (entry.type === 'added') {
          vals.appendChild(el('span', 'diff-arrow', 'added'));
          vals.appendChild(el('span', 'diff-after', formatValue(entry.after)));
        } else {
          vals.appendChild(el('span', 'diff-arrow', 'removed'));
          vals.appendChild(el('span', 'diff-before', formatValue(entry.before)));
        }
        row.appendChild(vals);
        host.appendChild(row);
      }
      if (paths.length > shown.length) {
        host.appendChild(el('p', 'more-note', '+ ' + (paths.length - shown.length) + ' more changed paths'));
      }
    }
  }
  renderSnapshotsPane();
}

function renderSnapshotsPane() {
  var host = dom.snapshotsOut;
  clear(host);
  var list = getSnapshotsFor(currentRequestKey());
  if (!list.length) {
    host.appendChild(el('p', 'muted-note', 'No snapshots stored for this endpoint yet.'));
    return;
  }
  for (var i = list.length - 1; i >= 0; i -= 1) {
    var snap = list[i];
    var row = el('div', 'snap-row');
    var when = el('span', 'snap-when', formatClock(new Date(snap.fetchedAt).getTime()));
    when.appendChild(el('span', 'snap-meta', '  ' + formatRelative(snap.fetchedAt)));
    row.appendChild(when);
    row.appendChild(el('span', 'snap-meta',
      'HTTP ' + snap.status + ' · ' + snap.schemaHash + (snap.omitted ? ' · body dropped' : ' · body stored')));
    host.appendChild(row);
  }
  host.appendChild(el('p', 'more-note',
    list.length + ' of max ' + MAX_SNAPSHOTS + ' kept. Only the newest keeps its body.'));
}

/* ── Interface pane states ─────────────────────────────────────────────── */

function svgIcon(paths, size) {
  var ns = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size || 22);
  svg.setAttribute('height', size || 22);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  for (var i = 0; i < paths.length; i += 1) {
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', paths[i]);
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '1.6');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(p);
  }
  return svg;
}

// Clears the interface pane and records whether it now shows the empty
// state, so the toolbar can drop its own example picker while the empty
// state offers the same one front and centre.
function resetInterfaceOut(empty) {
  clear(dom.interfaceOut);
  if (dom.panePlayground) dom.panePlayground.classList.toggle('is-empty', !!empty);
}

function showInterfaceEmpty() {
  dom.interfaceHead.hidden = true;
  resetInterfaceOut(true);

  var box = el('div', 'empty');
  // Amigo, the mark stood up: the brand's helper, here where the app is waiting on you.
  var icon = el('div', 'empty-icon is-amigo');
  var ns = 'http://www.w3.org/2000/svg';
  var amigo = document.createElementNS(ns, 'svg');
  amigo.setAttribute('width', '40');
  amigo.setAttribute('height', '40');
  amigo.setAttribute('aria-hidden', 'true');
  var use = document.createElementNS(ns, 'use');
  use.setAttribute('href', '#amigoMark');
  amigo.appendChild(use);
  icon.appendChild(amigo);
  box.appendChild(icon);
  box.appendChild(el('p', 'empty-title', 'Paste an API URL to start'));
  box.appendChild(el('p', 'empty-body',
    'Imago fetches it and turns the response into a page. Any public GET endpoint works.'));
  // Wide screens have the whole example list in the rail beside this; a
  // second picker here was a third copy of the same list. Phones get four.
  box.appendChild(el('p', 'empty-hint', 'Or open an example from the list on the left.'));
  var chips = el('div', 'empty-examples');
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Examples');
  DEMOS.filter(function (d) { return EMPTY_EXAMPLES.indexOf(d.name) !== -1; }).forEach(function (demo) {
    var chip = el('button', 'empty-example', demo.name);
    chip.type = 'button';
    chip.addEventListener('click', function () { loadExample(demo.url); });
    chips.appendChild(chip);
  });
  box.appendChild(chips);
  dom.interfaceOut.appendChild(box);
}

function showInterfaceLoading(message) {
  dom.interfaceHead.hidden = true;
  resetInterfaceOut(false);
  var box = el('div', 'loading');
  box.appendChild(el('div', 'spinner'));
  box.appendChild(el('span', null, message));
  dom.interfaceOut.appendChild(box);
}

function showGeneratePrompt() {
  dom.interfaceHead.hidden = true;
  resetInterfaceOut(false);
  // The prompt is what is on screen now. A plan left behind here was put
  // back over this endpoint's data when a later request failed.
  state.spec = null;
  state.specSource = '';
  state.html = null;

  var box = el('div', 'gen-prompt');
  var spark = el('div', 'gen-spark');
  spark.appendChild(svgIcon(['M12 4.5l1.7 4.3 4.3 1.7-4.3 1.7L12 16.5l-1.7-4.3L6 10.5l4.3-1.7L12 4.5Z', 'M18 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z'], 22));
  box.appendChild(spark);
  box.appendChild(el('p', 'empty-title', 'Ready to generate'));
  box.appendChild(el('p', 'empty-body',
    'Imago will read this response and design an interface that fits it. This shape is new, so it takes one model call — after that it is remembered.'));

  var btn = el('button', 'btn btn-dark btn-lg', 'Generate interface');
  btn.type = 'button';
  btn.id = 'generateBtn';
  btn.style.margin = '22px auto 0';
  btn.addEventListener('click', function () {
    btn.disabled = true;
    if (generateInterfaceNow() === false) btn.disabled = false;
  });
  box.appendChild(btn);
  dom.interfaceOut.appendChild(box);
}

// kind 'note' is for states that are not failures (no key yet): red is
// reserved for something that actually went wrong. body may be a list of
// paragraphs, so a quoted response and the sentence after it stay apart.
function showAlert(title, body, kind, action) {
  var box = el('div', kind === 'note' ? 'alert alert-note' : 'alert');
  var ico = el('span', 'alert-ico');
  ico.appendChild(svgIcon(['M12 8v5', 'M12 16.2v.1', 'M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z'], 17));
  box.appendChild(ico);
  var text = el('div');
  text.appendChild(el('p', 'alert-title', title));
  var paragraphs = Array.isArray(body) ? body : [body];
  for (var i = 0; i < paragraphs.length; i += 1) {
    if (paragraphs[i]) text.appendChild(el('p', 'alert-body', paragraphs[i]));
  }
  box.appendChild(text);
  if (action) {
    var go = el('button', 'btn btn-dark btn-sm alert-action', action.label);
    go.type = 'button';
    go.addEventListener('click', action.run);
    box.appendChild(go);
  }
  dom.interfaceOut.insertBefore(box, dom.interfaceOut.firstChild);
}

// Last resort when even the fallback normalises away. Guarantees applySpec
// always has a title and a renderable component, so a response shape nobody
// anticipated degrades to the raw body instead of a TypeError.
function minimalSpec() {
  return {
    title: 'Response', subtitle: '', layout: 'raw',
    components: [{ type: 'jsonBlock', path: '', label: 'Response' }],
    actions: []
  };
}

/* ── A calm Watch tick ──────────────────────────────────────────────────────
   A tick used to clear the pane and build every component again. Every
   image reloaded (a sprite drew blurred until is-pixel came back), focus
   fell to the body, an expanded table folded shut and the scroll anchor
   went with the nodes. Now a tick builds the page off-screen and, when its
   layout matches the one on screen, swaps only the components whose values
   changed. The rest never leave the document.
   ---------------------------------------------------------------------- */

// The page with every component reduced to its key: two pages with the same
// skeleton differ only inside their components. The source badge is left
// out; it is one node that moves between pages.
function skeletonOf(root) {
  var copy = root.cloneNode(true);
  var badge = copy.querySelector('#cacheBadge');
  if (badge) badge.parentNode.removeChild(badge);
  var parts = copy.querySelectorAll('[data-ck]');
  for (var i = 0; i < parts.length; i += 1) {
    var stub = document.createElement('i');
    stub.setAttribute('data-ck', parts[i].getAttribute('data-ck'));
    parts[i].parentNode.replaceChild(stub, parts[i]);
  }
  return copy.innerHTML;
}

// Which of root's focusable elements has focus, by position, so focus can
// be put back on its twin in a rebuilt tree. Position among focusables, not
// among children: a changed card gains a CHANGED flag that shifts those.
var FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]';

function focusIndex(root) {
  var active = document.activeElement;
  if (!active || active === root || !root.contains(active)) return -1;
  return Array.prototype.indexOf.call(root.querySelectorAll(FOCUSABLE), active);
}

function refocus(root, index) {
  if (index < 0) return;
  var node = root.querySelectorAll(FOCUSABLE)[index];
  if (!node) return;
  node.focus({ preventScroll: true });
}

// A replaced component keeps the images it already has: the new node gets
// the old <img> for the same address, so nothing reloads.
function keepImages(from, into) {
  var old = Array.prototype.slice.call(from.querySelectorAll('img'));
  var fresh = into.querySelectorAll('img');
  for (var i = 0; i < fresh.length; i += 1) {
    for (var j = 0; j < old.length; j += 1) {
      if (old[j].getAttribute('src') === fresh[i].getAttribute('src')) {
        old[j].alt = fresh[i].alt;
        fresh[i].parentNode.replaceChild(old[j], fresh[i]);
        old.splice(j, 1);
        break;
      }
    }
  }
}

// Each component's markup as it was built. Once on screen a node drifts
// from it (an image marks itself is-pixel, a timeline lays itself out), so
// a tick compares against what was built, not what the node has become.
var builtHtml = new WeakMap();

function noteBuilt(root) {
  var parts = root.querySelectorAll('[data-ck]');
  for (var i = 0; i < parts.length; i += 1) builtHtml.set(parts[i], parts[i].outerHTML);
}

// Returns false, touching nothing, when the new page's layout differs from
// the one on screen. A component is kept only when it was built the same
// and its path is not in the diff (is-changed), so the listeners it carries
// were bound to the same values.
function patchInPlace(holder) {
  var out = dom.interfaceOut;
  if (skeletonOf(out) !== skeletonOf(holder)) return false;
  var olds = out.querySelectorAll('[data-ck]');
  var news = holder.querySelectorAll('[data-ck]');
  for (var i = 0; i < olds.length; i += 1) {
    var before = olds[i], after = news[i];
    var changed = after.classList.contains('is-changed');
    var was = builtHtml.get(before);
    if (!changed && was === after.outerHTML) continue;
    if (changed) after.classList.add('is-fresh');
    keepImages(before, after);
    var focused = focusIndex(before);
    before.parentNode.replaceChild(after, before);
    refocus(after, focused);
  }
  return true;
}

// The layout moved, so the whole page changes, but in one step: scroll and
// focus stay put, and the values that changed still get their highlight.
function swapPage(holder) {
  var x = window.scrollX || 0, y = window.scrollY || 0;
  var focused = focusIndex(dom.interfaceOut);
  var changed = holder.querySelectorAll('[data-ck].is-changed');
  for (var i = 0; i < changed.length; i += 1) changed[i].classList.add('is-fresh');
  resetInterfaceOut(false);
  while (holder.firstChild) dom.interfaceOut.appendChild(holder.firstChild);
  refocus(dom.interfaceOut, focused);
  window.scrollTo(x, y);   // where the reader was, however the height moved
}

// opts.calm: a Watch tick. The reader is looking at this page; it updates
// in place instead of being built again from nothing.
function applySpec(spec, source, opts) {
  var calm = !!(opts && opts.calm) && !state.editing && !!dom.interfaceOut.querySelector('.spec-body');
  if (!spec) spec = normalizeSpec(buildFallbackSpec(state.data, state.url));
  if (!spec) spec = minimalSpec();
  state.spec = spec;
  state.specSource = source;
  state.html = null;
  state.pendingGenerate = false;

  dom.interfaceHead.hidden = true;   // the title lives in the lead row instead
  dom.cacheBadge.hidden = false;
  dom.cacheBadge.setAttribute('data-kind', source);
  dom.cacheBadge.textContent = source === 'generated' ? 'Generated'
    : source === 'cache' ? 'From schema cache' : source === 'shared' ? 'Shared layout' : 'Basic layout';

  // The page is built off-screen, then put on screen in one step.
  var holder = document.createElement('div');

  // The page header the plan asked for: title, one line of context, and
  // what the reader can do next. Off stage the source badge sits here; on
  // stage it moves to the stage bar.
  var head = el('header', 'stage-head');
  var headTop = el('div', 'stage-head-top');
  headTop.appendChild(el('h1', 'stage-title', spec.title));
  head.appendChild(headTop);
  if (spec.subtitle) head.appendChild(el('p', 'stage-sub', spec.subtitle));
  var actions = renderActions(spec.actions || [], state.data);
  if (actions) head.appendChild(actions);
  holder.appendChild(head);

  var shown = applyEdits(spec, editsFor(state.schemaHash));
  if (state.editing) holder.appendChild(editPanel());
  holder.appendChild(renderSpecBody(shown, state.data, state.diff));
  // A re-render of the same basic-layout page keeps its no-key line; any
  // other source means a key did its job.
  if (source !== 'fallback') state.noKeyLine = false;
  else if (state.noKeyLine) noKeyAlert(holder);
  noteBuilt(holder);

  if (calm) {
    if (!patchInPlace(holder)) swapPage(holder);
  } else {
    resetInterfaceOut(false);
    while (holder.firstChild) dom.interfaceOut.appendChild(holder.firstChild);
  }
  var liveTop = dom.interfaceOut.querySelector('.stage-head-top');
  if (liveTop && dom.cacheBadge.parentNode !== liveTop) liveTop.appendChild(dom.cacheBadge);


  dom.stageSource.textContent = dom.cacheBadge.textContent;
  dom.stageSource.setAttribute('data-kind', source);
  if (state.stagePref) enterStage();

  renderHistory();
  renderSavedList();
  scheduleTimelineLayout();
  updateMeta();
}

/* ── Stage ─────────────────────────────────────────────────────────────────
   The generated page is the interface. Once a plan renders, the request bar,
   tabs and app navigation step out of the way; a single Back control remains.
   Following a link in the data pushes a new page; Back pops it, and from the
   first page Back returns to the controls.
   ---------------------------------------------------------------------- */

function enterStage() {
  state.stage = true;
  state.stagePref = true;
  syncTrail();
  savePrefs();
}

function leaveStage() {
  state.stage = false;
  state.stagePref = false;
  state.stack = [];
  syncTrail();
  savePrefs();
  window.scrollTo(0, 0);
  if (dom.urlInput) dom.urlInput.focus();
}

// The trail only appears once a link has been followed out of a page:
// with nothing to go back to, a Back button is noise.
function syncTrail() {
  if (!dom.stageBar) return;
  var depth = state.stage ? state.stack.length : 0;
  dom.stageBar.hidden = depth === 0;
  dom.stageCrumb.textContent = hostOf(state.url) + (depth ? ' · ' + depth + ' back' : '');
  dom.stageCrumb.title = state.url || '';
}

// Back has two entry points (the stage button / Escape, and the browser's
// own Back) and they used to pop different stacks: goBack popped state.stack
// while history kept its entries, so after a couple of in-app Backs the
// browser's Back ejected the reader from a page they never navigated away
// from. Now history owns the count and popstate is the ONLY place that pops.
function pushHistory() {
  state.historyDepth += 1;
  try { window.history.pushState({ imagoDepth: state.historyDepth }, ''); }
  catch (err) { /* history unavailable — the in-memory stack still works */ }
}

function goBack() {
  if (!state.stage) return;
  if (state.historyDepth > 0) { window.history.back(); return; }
  stepBack(1);
}

function stepBack(steps) {
  if (!state.stage) return;
  cancelInFlight(true);   // Back leaves a page still loading, as a browser does
  var previous = null;
  for (var i = 0; i < steps && state.stack.length; i += 1) previous = state.stack.pop();
  if (previous) {
    setUrlInput(previous.url);
    if (typeof previous.headersText === 'string') dom.headersInput.value = previous.headersText;
    state.headersText = previous.headersText || '';
    state.headers = parseHeaders(state.headersText);
    state.activeRequestId = null;
    state.stagePref = true;
    markDirty();
    state.dirtySinceSend = false;
    if (!restoreFromSnapshot(previous.url)) performRequest(false);
    else if (state.refreshIntervalMs) startTimer();
    savePrefs();
    return;
  }
  // Nothing on the trail. Loading an example or a new request resets the
  // trail but leaves this app's earlier history entries in place, and the
  // browser's Back used to walk into them and silently leave the page. The
  // page is the one screen now; there is nothing to leave to.
}

function followUrl(url) {
  if (!isUrl(url)) { toast('That field is not a URL.', 'error'); return; }
  // A page still loading is abandoned first, so the trail records the page
  // actually on screen, not the one that never arrived.
  cancelInFlight(true);
  // The follow target comes out of the fetched body at a path the model
  // chose, so it is attacker-influenceable. Custom headers are where the
  // user's `Authorization: Bearer ...` lives — never replay them to an
  // origin other than the one they were typed for.
  var crossOrigin = !sameOrigin(state.url, url);
  var carry = crossOrigin ? '' : state.headersText;
  if (crossOrigin && hasSecretHeader(state.headersText)) {
    toast('Credentials withheld — ' + hostOf(url) + ' is a different host.', 'warn');
  }
  var stackBefore = state.stack.length;
  var depthBefore = state.historyDepth;
  if (state.url) {
    state.stack.push({ url: state.url, headersText: state.headersText });
    if (state.stack.length > 30) state.stack.shift();
    pushHistory();
  }
  if (navigateTo(url, carry) === false) {
    // Refused before any fetch. Undo the push so Back still means what the
    // reader thinks it means.
    while (state.stack.length > stackBefore) state.stack.pop();
    state.historyDepth = depthBefore;
  } else if (state.navRestorePoint) {
    // navigateTo captured its restore point after this push. If the request
    // fails, the push has to go too, or Back lands on a page that never
    // loaded and appears to do nothing.
    state.navRestorePoint.stackLength = stackBefore;
    state.navRestorePoint.historyDepth = depthBefore;
  }
}

function navigateTo(url, headersText) {
  cancelInFlight(true);
  // Remember what is actually on screen. performRequest can refuse (a bad
  // header) or fail, and either way the reader must not be left looking at
  // page A's data under page B's URL and crumb.
  var restorePoint = {
    url: state.url,
    urlInput: dom.urlInput.value,
    headersInput: dom.headersInput.value,
    headersText: state.headersText,
    stackLength: state.stack.length,
    historyDepth: state.historyDepth
  };

  setUrlInput(url);
  if (typeof headersText === 'string') dom.headersInput.value = headersText;
  state.activeRequestId = null;
  state.stagePref = true;
  markDirty();

  if (performRequest(false) === false) {
    rollbackNavigation(restorePoint);
    return false;
  }
  state.navRestorePoint = restorePoint;
  return true;
}

function rollbackNavigation(point) {
  if (!point) return;
  setUrlInput(point.urlInput);
  dom.headersInput.value = point.headersInput;
  syncHeadersChip();
  state.url = point.url;
  state.headersText = point.headersText;
  state.headers = parseHeaders(point.headersText);
  while (state.stack.length > point.stackLength) state.stack.pop();
  state.historyDepth = point.historyDepth;
  syncTrail();
}

var ACTION_ICONS = {
  follow:  ['M3 8h9', 'M8.5 4l4 4-4 4']
};

function actionIcon(type) {
  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '13'); svg.setAttribute('height', '13');
  svg.setAttribute('aria-hidden', 'true');
  var paths = ACTION_ICONS[type] || ACTION_ICONS.follow;
  for (var i = 0; i < paths.length; i += 1) {
    var path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', paths[i]);
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.6');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
  }
  return svg;
}

// The next page of a collection is the one link worth shouting about.
function isPagingAction(action) {
  return /^(next|previous|prev)( page)?$/i.test(action.label || '') ||
         RE_KEY_PAGING.test(lastSegment(action.path || ''));
}

function renderActions(actions, data) {
  if (!actions.length) return null;
  var row = el('div', 'action-row');
  var rendered = 0;

  for (var i = 0; i < actions.length; i += 1) {
    var action = actions[i];
    var btn = el('button', 'action-btn action-' + action.type);
    btn.type = 'button';

    if (action.type === 'follow') {
      var target = getByPath(data, action.path);
      if (!isUrl(target) || isImageUrl(target)) continue;   // the plan guessed wrong; skip quietly
      btn.appendChild(document.createTextNode(action.label));
      btn.appendChild(actionIcon('follow'));
      btn.title = target;
      if (isPagingAction(action)) btn.className += ' is-primary';
      btn.addEventListener('click', (function (href) {
        return function () { followUrl(href); };
      })(target));
    } else {
      continue;
    }

    row.appendChild(btn);
    rendered += 1;
  }
  return rendered ? row : null;
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */

var TABS = ['interface', 'raw', 'schema', 'changes', 'headers'];

function setActiveTab(tab) {
  if (TABS.indexOf(tab) === -1) tab = 'interface';
  state.tab = tab;
  var buttons = dom.tabBar.querySelectorAll('button');
  var i;
  for (i = 0; i < buttons.length; i += 1) {
    var active = buttons[i].getAttribute('data-tab') === tab;
    buttons[i].className = active ? 'is-active' : '';
    buttons[i].setAttribute('aria-selected', active ? 'true' : 'false');
    // Roving tabindex: a tablist is one Tab stop, and the arrow keys move
    // within it. Without this the role promised keyboard behaviour the
    // buttons did not have.
    buttons[i].setAttribute('tabindex', active ? '0' : '-1');
  }
  var panes = document.querySelectorAll('.tab-pane');
  for (i = 0; i < panes.length; i += 1) {
    var name = panes[i].getAttribute('data-pane');
    // The page never leaves the screen: the other panes open beside it.
    panes[i].className = (name === tab || name === 'interface') ? 'tab-pane is-active' : 'tab-pane';
  }
  var open = tab !== 'interface';
  if (open) state.inspectTab = tab;
  document.body.classList.toggle('inspector-open', open);
  if (dom.inspectBtn) dom.inspectBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
  if (tab === 'interface') scheduleTimelineLayout();
  // Build the heavy panes on demand — they are skipped while hidden.
  if (tab === 'raw' && state.rawPaneDirty) renderRawPane();
  if (tab === 'schema' && state.schemaPaneDirty) renderSchemaPane();
  savePrefs();
}

export { escapeHtml, JSON_TOKEN, highlightJson, MAX_CODE_LINES, renderRawPane, renderSchemaPane, renderChangesPane, renderSnapshotsPane, svgIcon, resetInterfaceOut, showInterfaceEmpty, showInterfaceLoading, showGeneratePrompt, showAlert, minimalSpec, applySpec, enterStage, leaveStage, syncTrail, pushHistory, goBack, stepBack, followUrl, navigateTo, rollbackNavigation, ACTION_ICONS, actionIcon, isPagingAction, renderActions, TABS, setActiveTab };
