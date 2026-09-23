import { STORE } from './config.js';
import { dom, state } from './state.js';
import { readJSON, writeJSON } from './storage.js';
import { el } from './util.js';
import { lastSegment } from './values.js';
import { humanize } from './spec.js';
import { toast } from './ui.js';
import { applySpec } from './panes.js';
import { startTimer, stopTimer, tick } from './request.js';

/* ── Page edits ────────────────────────────────────────────────────────
   A page is whatever the model or the basic layout decided. Edit lets the
   reader hide a field, rename its label, or move it between Headline,
   Normal and Details, saved per response shape (schema hash), so every
   endpoint with that shape gets the same page. Fields are keyed by
   type@path; paths come out of the response, so every map is
   prototype-free. */

var EDIT_WEIGHTS = ['hero', 'normal', 'quiet'];
var MAX_LABEL = 80;

function editKey(component) { return component.type + '@' + (component.path || ''); }

function nullMap(from) {
  var out = Object.create(null);
  if (from && typeof from === 'object' && !Array.isArray(from)) {
    for (var k in from) if (Object.prototype.hasOwnProperty.call(from, k)) out[k] = from[k];
  }
  return out;
}

function editsFor(hash) {
  var all = readJSON(STORE.edits, {});
  var raw = all && typeof all === 'object' && Object.prototype.hasOwnProperty.call(all, hash) ? all[hash] : null;
  return { hidden: nullMap(raw && raw.hidden), labels: nullMap(raw && raw.labels), weight: nullMap(raw && raw.weight) };
}

function saveEdits(hash, edits) {
  if (!hash) return;
  var all = nullMap(readJSON(STORE.edits, {}));
  var empty = !Object.keys(edits.hidden).length && !Object.keys(edits.labels).length && !Object.keys(edits.weight).length;
  if (empty) delete all[hash];
  else all[hash] = { hidden: edits.hidden, labels: edits.labels, weight: edits.weight };
  writeJSON(STORE.edits, all);
}

function hasEdits(edits) {
  return !!(Object.keys(edits.hidden).length || Object.keys(edits.labels).length || Object.keys(edits.weight).length);
}

// → a copy of spec with the edits applied; hidden fields are left out.
function applyEdits(spec, edits) {
  if (!spec || !hasEdits(edits)) return spec;
  var out = {};
  for (var k in spec) if (Object.prototype.hasOwnProperty.call(spec, k)) out[k] = spec[k];
  out.components = [];
  for (var i = 0; i < spec.components.length; i += 1) {
    var c = spec.components[i];
    var key = editKey(c);
    if (edits.hidden[key]) continue;
    var copy = {};
    for (var p in c) if (Object.prototype.hasOwnProperty.call(c, p)) copy[p] = c[p];
    if (typeof edits.labels[key] === 'string' && edits.labels[key].trim()) copy.label = edits.labels[key].trim().slice(0, MAX_LABEL);
    var w = edits.weight[key];
    if (EDIT_WEIGHTS.indexOf(w) !== -1) copy.emphasis = w;
    out.components.push(copy);
  }
  return out;
}

function labelFor(component) {
  return component.label || humanize(lastSegment(component.path || '')) || component.type;
}

function rerenderPage() {
  if (state.spec) applySpec(state.spec, state.specSource);
}

function changeEdit(component, change) {
  var edits = editsFor(state.schemaHash);
  var key = editKey(component);
  if ('hidden' in change) { if (change.hidden) edits.hidden[key] = true; else delete edits.hidden[key]; }
  if ('label' in change) {
    var label = String(change.label || '').trim().slice(0, MAX_LABEL);
    if (label && label !== (component.__baseLabel || '')) edits.labels[key] = label; else delete edits.labels[key];
  }
  if ('weight' in change) {
    if (EDIT_WEIGHTS.indexOf(change.weight) !== -1 && change.weight !== (component.__baseWeight || 'normal')) edits.weight[key] = change.weight;
    else delete edits.weight[key];
  }
  saveEdits(state.schemaHash, edits);
  rerenderPage();
}

// The bar on each field while editing: its label, its weight, and Hide.
function editBar(component) {
  var base = null;
  for (var i = 0; state.spec && i < state.spec.components.length; i += 1) {
    if (editKey(state.spec.components[i]) === editKey(component)) { base = state.spec.components[i]; break; }
  }
  var ref = { type: component.type, path: component.path,
    __baseLabel: base ? labelFor(base) : '', __baseWeight: base && base.emphasis === 'hero' ? 'hero' : base && base.emphasis === 'quiet' ? 'quiet' : 'normal' };
  var bar = el('div', 'edit-bar');
  var name = labelFor(component);
  var input = el('input', 'edit-label');
  input.type = 'text';
  input.value = name;
  input.maxLength = MAX_LABEL;
  input.setAttribute('aria-label', 'Label for ' + name);
  input.setAttribute('data-focus-key', 'label:' + editKey(component));
  input.addEventListener('change', function () { changeEdit(ref, { label: input.value }); });
  input.addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); input.blur(); } });
  bar.appendChild(input);

  var weight = el('select', 'edit-weight');
  weight.setAttribute('aria-label', 'Where ' + name + ' goes');
  [['hero', 'Headline'], ['normal', 'Normal'], ['quiet', 'In Details']].forEach(function (o) {
    var opt = el('option', null, o[1]);
    opt.value = o[0];
    weight.appendChild(opt);
  });
  weight.value = component.emphasis === 'hero' ? 'hero' : component.emphasis === 'quiet' ? 'quiet' : 'normal';
  weight.addEventListener('change', function () { changeEdit(ref, { weight: weight.value }); });
  bar.appendChild(weight);

  var hide = el('button', 'btn btn-ghost btn-xs edit-hide', 'Hide');
  hide.type = 'button';
  hide.setAttribute('aria-label', 'Hide ' + name);
  hide.addEventListener('click', function () {
    changeEdit(ref, { hidden: true });
    if (dom.editBtn) dom.editBtn.focus();   // the field it sat on is gone
  });
  bar.appendChild(hide);
  return bar;
}

// Above the page while editing: what editing does, the hidden fields (each
// can be brought back), Reset and Done.
function editPanel() {
  var edits = editsFor(state.schemaHash);
  var panel = el('div', 'edit-panel');
  panel.appendChild(el('p', 'edit-panel-note', 'Editing this page. Changes apply to every endpoint that returns this shape.'));
  var hiddenKeys = Object.keys(edits.hidden);
  if (hiddenKeys.length) {
    var row = el('div', 'edit-hidden');
    row.appendChild(el('span', 'edit-hidden-label', 'Hidden:'));
    hiddenKeys.forEach(function (key) {
      var comp = null;
      for (var i = 0; state.spec && i < state.spec.components.length; i += 1) {
        if (editKey(state.spec.components[i]) === key) comp = state.spec.components[i];
      }
      var name = comp ? labelFor(comp) : key.split('@')[1] || key;
      var show = el('button', 'edit-show', 'Show ' + name);
      show.type = 'button';
      show.addEventListener('click', function () {
        var now = editsFor(state.schemaHash);
        delete now.hidden[key];
        saveEdits(state.schemaHash, now);
        rerenderPage();
      });
      row.appendChild(show);
    });
    panel.appendChild(row);
  }
  var actions = el('div', 'edit-panel-actions');
  if (hasEdits(edits)) {
    var reset = el('button', 'btn btn-ghost btn-sm edit-reset', 'Reset page');
    reset.type = 'button';
    reset.addEventListener('click', function () {
      saveEdits(state.schemaHash, { hidden: Object.create(null), labels: Object.create(null), weight: Object.create(null) });
      rerenderPage();
      toast('Page reset to its original layout.');
    });
    actions.appendChild(reset);
  }
  var done = el('button', 'btn btn-dark btn-sm edit-done', 'Done');
  done.type = 'button';
  done.addEventListener('click', function () { setEditing(false); });
  actions.appendChild(done);
  panel.appendChild(actions);
  return panel;
}

function setEditing(on) {
  var was = state.editing;
  state.editing = !!on && !!state.spec && state.builder !== 'html';
  // Watch re-renders the page every tick, which would throw away a label
  // mid-typing. Editing pauses it; Done picks it back up.
  if (state.editing && !was) stopTimer();
  if (!state.editing && was && state.refreshIntervalMs && state.data) startTimer();
  if (dom.editBtn) dom.editBtn.setAttribute('aria-pressed', state.editing ? 'true' : 'false');
  document.body.classList.toggle('is-editing', state.editing);
  rerenderPage();
}

export { EDIT_WEIGHTS, MAX_LABEL, editKey, nullMap, editsFor, saveEdits, hasEdits, applyEdits, labelFor, rerenderPage, changeEdit, editBar, editPanel, setEditing };
