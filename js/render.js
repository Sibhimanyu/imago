import { MAX_ROWS } from './config.js';
import { dom, state } from './state.js';
import { editBar } from './edits.js';
import { el, formatValue, getByPath, isPlainObject, isUrl } from './util.js';
import { RE_ISO_DT, RE_KEY_NOISE, describeValue, formatDuration, formatIsoDateTime, formatNumber, inferKind, isCompactKind, lastSegment, rawTitle, renderScalar } from './values.js';
import { hashString, pathTouchedByDiff } from './schema.js';
import { humanize } from './spec.js';
import { tick } from './request.js';

/* ── Renderer ──────────────────────────────────────────────────────────────
   The renderer owns every pixel. The model only supplies a plan; nothing it
   returns is ever interpreted as markup. All text goes through textContent.
   ---------------------------------------------------------------------- */

// How much of the 12-column grid each component type earns.
var COMPONENT_SPAN = {
  table: 12, jsonBlock: 12, chart: 12, timeline: 12,
  keyValue: 6, list: 6, statBars: 6, badges: 6, link: 6, prose: 12,
  image: 4, metric: 4, gauge: 4, text: 4, title: 12
};

// Types that always own a card of their own; everything else can be folded
// into a fact strip when its value turns out to be short.
var BLOCK_TYPES = ['table', 'jsonBlock', 'chart', 'timeline', 'keyValue',
                   'list', 'statBars', 'badges', 'image'];

var HERO_KINDS = ['percent', 'duration', 'durationMs', 'bytes', 'money',
                  'temperature', 'number', 'datetime'];

/* ── Reconciling the plan with the data ────────────────────────────────────
   The model plans against a schema, not against the response, so it will
   occasionally point a "text" at an object or a "chart" at a string. The
   renderer treats the plan as a suggestion and picks the component the value
   can actually support — this is why no card ever reads "{27 fields}".
   ---------------------------------------------------------------------- */

var STRUCTURAL_TYPES = ['table', 'list', 'statBars', 'chart', 'badges',
                        'keyValue', 'timeline', 'jsonBlock'];

// Only components that render a structure may address the whole body.
var ROOT_OK_TYPES = STRUCTURAL_TYPES;

function numbersWithGaps(list) {
  var seen = 0;
  for (var i = 0; i < list.length; i += 1) {
    if (list[i] === null) continue;
    if (typeof list[i] !== 'number' || !isFinite(list[i])) return false;
    seen += 1;
  }
  return seen >= 2;
}

function allNumbers(list) {
  for (var i = 0; i < list.length; i += 1) {
    if (typeof list[i] !== 'number' || !isFinite(list[i])) return false;
  }
  return list.length > 0;
}

function looksLikeDateTimeMap(value) {
  var keys = Object.keys(value);
  var hits = 0;
  for (var i = 0; i < keys.length; i += 1) {
    if (typeof value[keys[i]] === 'string' && RE_ISO_DT.test(value[keys[i]])) hits += 1;
  }
  return keys.length >= 2 && hits === keys.length;
}

function resolveType(component, value) {
  var type = component.type;
  var kind = inferKind(value, component);

  if (type === 'timeline' && (component.items || Array.isArray(value) || isPlainObject(value))) {
    return 'timeline';
  }

  if (kind === 'object') {
    if (!Object.keys(value).length) return 'text';
    if (looksLikeDateTimeMap(value) && Object.keys(value).length >= 3) return 'timeline';
    if (STRUCTURAL_TYPES.indexOf(type) !== -1) return type;
    return 'keyValue';
  }

  if (kind === 'array') {
    if (!value.length) return 'text';
    if (STRUCTURAL_TYPES.indexOf(type) !== -1) return type;
    if (isPlainObject(value[0])) return 'table';
    if (allNumbers(value) && value.length >= 4) return 'chart';
    return 'badges';
  }

  // Scalar from here on: a structural component has nothing to chew on.
  if (STRUCTURAL_TYPES.indexOf(type) !== -1) type = 'text';
  if (kind === 'image') return 'image';
  if (type === 'image') return kind === 'url' ? 'link' : 'text';
  if (kind === 'url' && type !== 'link') return 'link';
  if (kind === 'prose') return 'prose';
  if (kind === 'percent' && (type === 'metric' || type === 'gauge')) return 'gauge';
  if (type === 'gauge') return 'metric';
  return type;
}

/* ── Component rendering ───────────────────────────────────────────────── */

// Returns { node, weight, span } — weight decides whether this earns a card
// ('block'), a hero card ('hero') or a cell in the fact strip ('fact').
function renderComponent(component, data, diffMap) {
  var value = component.path ? getByPath(data, component.path) : data;
  var type = resolveType(component, value);
  var kind = inferKind(value, component);
  var changed = pathTouchedByDiff(component.path, diffMap);

  // Short scalars never get a card of their own.
  var isFact = BLOCK_TYPES.indexOf(type) === -1 && type !== 'prose' &&
               isCompactKind(kind) && component.emphasis !== 'hero';
  var isHero = !isFact && (component.emphasis === 'hero') && isCompactKind(kind);

  if (component.path && value === undefined) {
    if (component.emphasis === 'quiet') return null;
    return {
      weight: 'fact', span: 4,
      node: factCell(component, el('div', 'val val-fact kind-empty', '—'), changed, 'Not in this response')
    };
  }

  if (isFact || isHero) {
    var scalar = renderScalar(value, component, isHero ? 'hero' : 'fact');
    if (isHero) {
      return { weight: 'hero', span: 4, node: cardFor(component, scalar, changed, 'comp-hero') };
    }
    return { weight: 'fact', span: 4, node: factCell(component, scalar, changed, '') };
  }

  var body;
  switch (type) {
    case 'title':    body = renderHeadline(value, component); break;
    case 'prose':
    case 'text':     body = renderScalar(value, component, 'metric'); break;
    case 'metric':   body = renderScalar(value, component, 'metric'); break;
    case 'gauge':    body = renderGauge(value, component); break;
    case 'link':     body = renderScalar(value, component, 'metric'); break;
    case 'image':    body = renderImage(value, component); break;
    case 'badges':   body = renderBadges(value, component); break;
    case 'list':     body = renderList(value, component); break;
    case 'table':    body = renderTable(value, component); break;
    case 'keyValue': body = renderKeyValue(value, component); break;
    case 'timeline': body = renderTimeline(value, component, data); break;
    case 'statBars': body = renderStatBars(value, component); break;
    case 'chart':    body = renderChart(value, component); break;
    case 'jsonBlock':body = renderJsonBlock(value); break;
    default:         body = renderScalar(value, component, 'metric');
  }

  if (!body) {
    // Whatever the plan asked for, the value could not support it — show the
    // value itself rather than an apology.
    body = isPlainObject(value) || Array.isArray(value)
      ? renderJsonBlock(value)
      : renderScalar(value, component, 'metric');
    type = 'jsonBlock';
  }

  var span = COMPONENT_SPAN[type] || 6;
  if (type === 'keyValue' && body.childElementCount > 8) span = 12;
  return { weight: 'block', span: span, node: cardFor(component, body, changed, '') };
}

function cardFor(component, body, changed, extraClass) {
  var box = el('div', 'comp' + (extraClass ? ' ' + extraClass : ''));
  if (component.label) box.appendChild(el('span', 'comp-label', component.label));
  if (changed) {
    box.className += ' is-changed';
    box.appendChild(el('span', 'comp-flag', 'CHANGED'));
  }
  box.appendChild(body);
  return box;
}

function factCell(component, body, changed, note) {
  var cell = el('div', 'fact' + (changed ? ' is-changed' : '') +
                      (component.emphasis === 'quiet' ? ' is-quiet' : ''));
  cell.appendChild(el('span', 'fact-label', component.label || humanize(lastSegment(component.path))));
  cell.appendChild(body);
  if (note) cell.appendChild(el('span', 'fact-note', note));
  return cell;
}

function renderHeadline(value, component) {
  var info = describeValue(value, component);
  return el('div', 'comp-title-value', info.primary);
}

/* ── Layout assembly ───────────────────────────────────────────────────────
   Hierarchy is the whole difference between an interface and a wall of
   boxes: headline numbers first, then a dense fact sheet, then the wide
   structures. Sections from the plan split that arrangement into groups.
   ---------------------------------------------------------------------- */

// Which tier leads depends on the layout the plan chose. A collection page
// opens with its table; a profile opens with its picture; a dashboard opens
// with its numbers.
var STRUCTURE_FIRST = ['table', 'list', 'timeline', 'raw', 'article'];

// Bookkeeping (quiet fields, unit tables, generation times) is kept, but out
// of the reader's way: it folds into a Details section at the foot of the
// page instead of getting the same box as the values they came for.
// data, when given, must show the "units" field is a unit table (an
// object). A plain value named units (sold units, units: 42) is data, and
// used to be tucked into Details even when it was the number the page is for.
function isBookkeeping(component, data) {
  if (component.emphasis === 'quiet') return true;
  var leaf = lastSegment(component.path || '').toLowerCase();
  if (!/(^|_)units$/.test(leaf)) return false;
  return data === undefined || isPlainObject(getByPath(data, component.path));
}

function renderSpecBody(spec, data, diffMap) {
  var frag = document.createDocumentFragment();
  var body = el('div', 'spec-body layout-' + (spec.layout || 'dashboard'));
  frag.appendChild(body);
  var structureFirst = STRUCTURE_FIRST.indexOf(spec.layout) !== -1;
  var profile = spec.layout === 'profile';
  var groups = [{ label: '', items: [] }];

  for (var i = 0; i < spec.components.length; i += 1) {
    var component = spec.components[i];
    if (component.type === 'section') {
      groups.push({ label: component.label || 'Section', items: [] });
    } else {
      groups[groups.length - 1].items.push(component);
    }
  }

  var anyRendered = false;
  var tucked = [];

  for (var g = 0; g < groups.length; g += 1) {
    var group = groups[g];
    if (!group.items.length) continue;

    var heroes = [], facts = [], blocks = [];
    for (var c = 0; c < group.items.length; c += 1) {
      var result = renderComponent(group.items[c], data, diffMap);
      if (!result) continue;
      if (state.editing) result.node.insertBefore(editBar(group.items[c]), result.node.firstChild);
      if (isBookkeeping(group.items[c], data) && result.weight !== 'hero') { tucked.push(result); continue; }
      if (result.weight === 'hero') heroes.push(result);
      else if (result.weight === 'fact') facts.push(result);
      else blocks.push(result);
    }
    if (!heroes.length && !facts.length && !blocks.length) continue;

    var section = el('section', 'spec-section');
    if (group.label) section.appendChild(el('h2', 'spec-section-head', group.label));

    var heroRow = null, strip = null, grid = null;
    var h, f, b;

    if (heroes.length) {
      heroRow = el('div', 'hero-row');
      for (h = 0; h < heroes.length; h += 1) heroRow.appendChild(heroes[h].node);
    }
    if (facts.length) {
      strip = el('div', 'fact-strip');
      for (f = 0; f < facts.length; f += 1) strip.appendChild(facts[f].node);
    }

    // A profile leads with its picture beside the numbers and facts.
    var portrait = null;
    if (profile && g === 0) {
      for (b = 0; b < blocks.length; b += 1) {
        if (blocks[b].node.querySelector('.comp-image')) { portrait = blocks.splice(b, 1)[0]; break; }
      }
    }

    if (blocks.length) {
      // Within structure-first layouts the timeline / table still leads.
      if (structureFirst) {
        blocks.sort(function (x, y) {
          var xs = x.node.querySelector('.timeline, .comp-table, .kind-prose') ? 0 : 1;
          var ys = y.node.querySelector('.timeline, .comp-table, .kind-prose') ? 0 : 1;
          return xs - ys;
        });
      }
      grid = el('div', 'spec-grid');
      for (b = 0; b < blocks.length; b += 1) {
        if (blocks[b].span !== 4) blocks[b].node.className += ' span-' + blocks[b].span;
        grid.appendChild(blocks[b].node);
      }
    }

    if (portrait) {
      var profileGrid = el('div', 'profile-grid');
      profileGrid.appendChild(portrait.node);
      var main = el('div', 'profile-main');
      if (heroRow) main.appendChild(heroRow);
      if (strip) main.appendChild(strip);
      if (!heroRow && !strip && grid) { main.appendChild(grid); grid = null; }
      profileGrid.appendChild(main);
      section.appendChild(profileGrid);
      if (grid) section.appendChild(grid);
    } else if (structureFirst) {
      if (grid) section.appendChild(grid);
      if (heroRow) section.appendChild(heroRow);
      if (strip) section.appendChild(strip);
    } else {
      if (heroRow) section.appendChild(heroRow);
      if (strip) section.appendChild(strip);
      if (grid) section.appendChild(grid);
    }

    body.appendChild(section);
    anyRendered = true;
  }

  if (tucked.length) {
    var details = el('details', 'spec-details');
    if (state.editing) details.open = true;   // tucked fields are editable too
    // The page is rebuilt on every refresh; with Watch on, an opened Details
    // snapped shut every 10-60s. Its state is kept per endpoint.
    var detailsKey = state.url ? hashString(state.url) : '';
    if (state.detailsOpen[detailsKey]) details.open = true;
    details.addEventListener('toggle', function () { state.detailsOpen[detailsKey] = details.open; });
    var summary = el('summary', 'spec-details-summary');
    summary.appendChild(el('span', 'spec-details-title', 'Details'));
    var names = [];
    for (var t = 0; t < tucked.length && names.length < 5; t += 1) {
      var labelNode = tucked[t].node.querySelector('.fact-label, .comp-label');
      if (labelNode && labelNode.textContent) names.push(labelNode.textContent.toLowerCase());
    }
    summary.appendChild(el('span', 'spec-details-hint',
      tucked.length + (tucked.length === 1 ? ' more field' : ' more fields') +
      (names.length ? ' · ' + names.join(', ') : '')));
    details.appendChild(summary);
    var tuckedFacts = el('div', 'fact-strip');
    var tuckedGrid = el('div', 'spec-grid');
    for (t = 0; t < tucked.length; t += 1) {
      if (tucked[t].weight === 'fact') tuckedFacts.appendChild(tucked[t].node);
      else {
        tucked[t].node.className += ' span-6';
        tuckedGrid.appendChild(tucked[t].node);
      }
    }
    if (tuckedFacts.childNodes.length) details.appendChild(tuckedFacts);
    if (tuckedGrid.childNodes.length) details.appendChild(tuckedGrid);
    body.appendChild(details);
    anyRendered = true;
  }

  if (!anyRendered) {
    var fallbackSection = el('section', 'spec-section');
    var fallbackGrid = el('div', 'spec-grid');
    var raw = renderComponent({ type: 'jsonBlock', path: '', label: 'Response' }, data, diffMap);
    raw.node.className += ' span-12';
    fallbackGrid.appendChild(raw.node);
    fallbackSection.appendChild(fallbackGrid);
    body.appendChild(fallbackSection);
  }

  return frag;
}

/* ── Key/value, gauge and timeline ─────────────────────────────────────── */

function flattenScalars(node, prefix, depth, out) {
  var keys = Object.keys(node);
  for (var i = 0; i < keys.length && out.length < 24; i += 1) {
    var key = keys[i];
    var value = node[key];
    var path = prefix ? prefix + '.' + key : key;
    if (isPlainObject(value) && depth < 2 && Object.keys(value).length) {
      flattenScalars(value, path, depth + 1, out);
    } else {
      out.push({ path: path, key: key, label: humanize(path.replace(/\./g, ' ')), value: value });
    }
  }
  return out;
}

function renderKeyValue(value, component) {
  var rows = [];

  if (Array.isArray(component.items) && component.items.length) {
    for (var i = 0; i < component.items.length; i += 1) {
      var item = component.items[i];
      var itemValue = item.path ? getByPath(value, item.path) : value;
      if (itemValue === undefined) continue;
      rows.push({ path: item.path, label: item.label || humanize(lastSegment(item.path)), value: itemValue });
    }
  } else if (isPlainObject(value)) {
    flattenScalars(value, '', 0, rows);
  } else if (Array.isArray(value)) {
    for (var a = 0; a < value.length && a < MAX_ROWS; a += 1) {
      rows.push({ path: String(a), label: '#' + (a + 1), value: value[a] });
    }
  }

  if (!rows.length) return null;

  var wrap = el('div', 'kv');
  for (var r = 0; r < rows.length; r += 1) {
    var row = rows[r];
    var line = el('div', 'kv-row');
    line.appendChild(el('span', 'kv-key', row.label));
    var hint = { path: row.path, label: row.label, unit: component.unit };
    var spark = Array.isArray(row.value) && row.value.length >= 4 && allNumbers(row.value)
      ? renderSparkline(row.value)
      : null;
    line.appendChild(spark || renderScalar(row.value, hint, 'inline'));
    wrap.appendChild(line);
  }
  return wrap;
}

// A series inside a key/value sheet says more as a shape than as "24 items".
function renderSparkline(numbers) {
  var points = numbers.slice(0, 120);
  var min = Math.min.apply(null, points);
  var max = Math.max.apply(null, points);
  if (max === min) max = min + 1;

  var W = 120, H = 22;
  var coords = [];
  for (var i = 0; i < points.length; i += 1) {
    var x = (i / (points.length - 1)) * W;
    var y = H - ((points[i] - min) / (max - min)) * (H - 3) - 1.5;
    coords.push(x.toFixed(1) + ',' + y.toFixed(1));
  }

  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'spark-svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('preserveAspectRatio', 'none');
  var line = document.createElementNS(svgNS, 'polyline');
  line.setAttribute('class', 'spark-line');
  line.setAttribute('points', coords.join(' '));
  svg.appendChild(line);

  var wrap = el('div', 'spark');
  wrap.appendChild(svg);
  wrap.appendChild(el('span', 'spark-range',
    formatNumber(min) + '–' + formatNumber(max) + ' · ' + numbers.length));
  wrap.title = numbers.slice(0, 24).join(', ') + (numbers.length > 24 ? ' …' : '');
  return wrap;
}

function renderGauge(value, component) {
  if (typeof value !== 'number' || !isFinite(value)) return null;
  var info = describeValue(value, component);
  var max = component.max && isFinite(component.max) && component.max > 0
    ? component.max
    : (info.kind === 'percent' ? 100 : Math.max(value, 1));
  var ratio = Math.max(0, Math.min(1, value / max));

  var wrap = el('div', 'gauge');
  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'gauge-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', (component.label || 'Value') + ': ' + info.primary + (info.unit || ''));

  var circumference = 2 * Math.PI * 42;
  var track = document.createElementNS(svgNS, 'circle');
  track.setAttribute('class', 'gauge-track');
  track.setAttribute('cx', '50'); track.setAttribute('cy', '50'); track.setAttribute('r', '42');
  svg.appendChild(track);

  var arc = document.createElementNS(svgNS, 'circle');
  arc.setAttribute('class', 'gauge-arc');
  arc.setAttribute('cx', '50'); arc.setAttribute('cy', '50'); arc.setAttribute('r', '42');
  arc.setAttribute('stroke-dasharray', circumference.toFixed(1));
  arc.setAttribute('stroke-dashoffset', (circumference * (1 - ratio)).toFixed(1));
  svg.appendChild(arc);
  wrap.appendChild(svg);

  var center = el('div', 'gauge-center');
  center.appendChild(el('span', 'gauge-value', info.primary));
  if (info.unit) center.appendChild(el('span', 'gauge-unit', info.unit));
  wrap.appendChild(center);
  return wrap;
}

function timelineEntries(value, component, data) {
  var entries = [];

  function push(label, raw) {
    if (typeof raw !== 'string' || !RE_ISO_DT.test(raw)) return;
    var ms = Date.parse(raw);
    if (isNaN(ms)) return;
    var shown = formatIsoDateTime(raw);
    entries.push({ label: label, ms: ms, time: shown ? shown.primary : raw, raw: raw });
  }

  if (Array.isArray(component.items) && component.items.length) {
    for (var i = 0; i < component.items.length; i += 1) {
      var item = component.items[i];
      push(item.label || humanize(lastSegment(item.path)), getByPath(data, item.path));
    }
  } else if (Array.isArray(value)) {
    for (var a = 0; a < value.length; a += 1) {
      var entry = value[a];
      if (isPlainObject(entry)) {
        var label = component.labelPath ? getByPath(entry, component.labelPath) : ('#' + (a + 1));
        push(formatValue(label), component.valuePath ? getByPath(entry, component.valuePath) : null);
      } else {
        push('#' + (a + 1), entry);
      }
    }
  } else if (isPlainObject(value)) {
    var flat = flattenScalars(value, '', 0, []);
    for (var f = 0; f < flat.length; f += 1) push(flat[f].label, flat[f].value);
  }

  entries.sort(function (x, y) { return x.ms - y.ms; });

  // Two names for the same instant (first light / astronomical twilight
  // begin) are one moment, not two marks on top of each other.
  var merged = [];
  for (var m = 0; m < entries.length; m += 1) {
    var previous = merged[merged.length - 1];
    if (previous && previous.ms === entries[m].ms) {
      if (previous.label.indexOf(entries[m].label) === -1) {
        previous.label += ' · ' + entries[m].label;
      }
    } else {
      merged.push(entries[m]);
    }
  }
  return merged;
}

function renderTimeline(value, component, data) {
  var entries = timelineEntries(value, component, data);
  if (entries.length < 2) return null;
  if (entries.length > 12) {
    // Keep the shape of the sequence: sample evenly, but never lose the ends.
    var sampled = [];
    var step = (entries.length - 1) / 11;
    for (var k = 0; k < 12; k += 1) sampled.push(entries[Math.round(k * step)]);
    entries = sampled;
  }

  var first = entries[0].ms;
  var last = entries[entries.length - 1].ms;
  var range = last - first || 1;

  var wrap = el('div', 'timeline');
  var rail = el('div', 'timeline-rail');
  rail.appendChild(el('div', 'timeline-track'));

  for (var i = 0; i < entries.length; i += 1) {
    var entry = entries[i];
    var pct = 4 + ((entry.ms - first) / range) * 92;  // inset so the ends do not clip
    var mark = el('div', 'timeline-mark');
    mark.style.left = pct.toFixed(2) + '%';
    mark.setAttribute('data-pct', pct.toFixed(3));
    mark.appendChild(el('span', 'timeline-dot'));
    var tag = el('span', 'timeline-tag');
    tag.appendChild(el('span', 'timeline-time', entry.time));
    tag.appendChild(el('span', 'timeline-name', entry.label));
    mark.appendChild(tag);
    mark.title = entry.raw;
    rail.appendChild(mark);
  }

  wrap.appendChild(rail);
  wrap.appendChild(el('p', 'more-note',
    'Spans ' + formatDuration((last - first) / 1000) + ' · ' + entries.length + ' points'));
  return wrap;
}

// Times cluster — dawn happens four times in twenty minutes — so labels are
// packed into lanes above and below the rail only once the real widths are
// known. Runs after insertion, and again whenever the column resizes.
// Widths only exist once the pane is on screen, so the pass is deferred and
// repeated whenever the interface becomes visible again.
function scheduleTimelineLayout() {
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(function () { layoutTimelines(dom.interfaceOut); });
  } else {
    window.setTimeout(function () { layoutTimelines(dom.interfaceOut); }, 0);
  }
}

function layoutTimelines(root) {
  var rails = (root || document).querySelectorAll('.timeline-rail');
  for (var r = 0; r < rails.length; r += 1) {
    var rail = rails[r];
    var width = rail.clientWidth;
    if (!width) continue;

    var marks = rail.querySelectorAll('.timeline-mark');

    // Under ~520px there is no room for lanes: a dawn cluster of four moments
    // lands inside 30px. The sequence reads better as a list there.
    var stacked = width < 520;
    rail.classList.toggle('is-stacked', stacked);
    if (stacked) {
      rail.style.height = '';
      for (var m = 0; m < marks.length; m += 1) {
        marks[m].style.top = '';
        var stackedTag = marks[m].querySelector('.timeline-tag');
        if (stackedTag) { stackedTag.style.top = ''; stackedTag.style.bottom = ''; }
      }
      continue;
    }
    var laneEnds = [];
    var rowStep = 0;
    var i;

    for (i = 0; i < marks.length; i += 1) {
      var mark = marks[i];
      var tag = mark.querySelector('.timeline-tag');
      if (!tag) continue;
      var tagWidth = tag.offsetWidth || 74;
      rowStep = Math.max(rowStep, tag.offsetHeight + 10);

      var center = (parseFloat(mark.getAttribute('data-pct')) / 100) * width;
      var left = center - tagWidth / 2;
      var right = center + tagWidth / 2;

      var lane = 0;
      while (laneEnds[lane] !== undefined && left < laneEnds[lane] + 8) lane += 1;
      laneEnds[lane] = right;

      var below = lane % 2 === 1;
      var row = Math.floor(lane / 2);
      mark.setAttribute('data-lane', String(lane));
      tag.setAttribute('data-row', String(row));
      tag.style.top = 'auto';
      tag.style.bottom = 'auto';
      tag.__row = row;
      tag.__below = below;
    }

    if (!rowStep) rowStep = 40;
    var above = 0, below = 0;
    for (i = 0; i < marks.length; i += 1) {
      var t = marks[i].querySelector('.timeline-tag');
      if (!t) continue;
      var offset = 14 + t.__row * rowStep;
      if (t.__below) { t.style.top = offset + 'px'; below = Math.max(below, t.__row + 1); }
      else { t.style.bottom = offset + 'px'; above = Math.max(above, t.__row + 1); }
    }

    // The rail is only as tall as the lanes in use, and the track sits where
    // those lanes leave it — no dead space under a one-sided timeline.
    var aboveHeight = 14 + above * rowStep;
    var belowHeight = 14 + below * rowStep;
    rail.style.height = (aboveHeight + belowHeight) + 'px';
    var track = rail.querySelector('.timeline-track');
    if (track) { track.style.top = aboveHeight + 'px'; }
    for (i = 0; i < marks.length; i += 1) marks[i].style.top = aboveHeight + 'px';
  }
}

function renderImage(value, component) {
  if (!isUrl(value)) {
    // Not actually an image URL — degrade to text rather than a broken frame.
    return el('div', 'comp-text-value', formatValue(value));
  }
  var wrap = el('div', 'comp-image');
  var img = document.createElement('img');
  img.src = value;
  img.alt = component.alt || component.label || 'Image';
  img.addEventListener('error', function () {
    if (img.parentNode === wrap) {
      wrap.removeChild(img);
      wrap.appendChild(el('p', 'comp-missing', 'Image failed to load.'));
    }
  });
  wrap.appendChild(img);
  return wrap;
}

function renderBadges(value, component) {
  var items = Array.isArray(value) ? value : [value];
  if (!items.length) return null;
  var outer = document.createElement('div');
  var wrap = el('div', 'badge-wrap');
  var shown = items.slice(0, 20);
  for (var i = 0; i < shown.length; i += 1) {
    var entry = shown[i];
    var text = component.itemPath ? getByPath(entry, component.itemPath) : entry;
    if (text === undefined || text === null) text = entry;
    var badge = el('span', 'badge', describeValue(text, { path: component.itemPath || component.path }).primary);
    badge.title = rawTitle(text);
    wrap.appendChild(badge);
  }
  outer.appendChild(wrap);
  if (items.length > shown.length) {
    outer.appendChild(el('p', 'more-note',
      '+ ' + (items.length - shown.length) + ' more of ' + items.length));
  }
  return outer;
}

function renderList(value, component) {
  var items = Array.isArray(value) ? value : (isPlainObject(value) ? Object.keys(value).map(function (k) {
    return humanize(k) + ': ' + describeValue(value[k], { path: k }).primary;
  }) : [value]);
  if (!items.length) return null;

  var wrap = document.createElement('div');
  var ul = el('ul', 'comp-list');
  var shown = items.slice(0, MAX_ROWS);
  for (var i = 0; i < shown.length; i += 1) {
    var entry = shown[i];
    var text = component.itemPath ? getByPath(entry, component.itemPath) : entry;
    if (text === undefined || text === null) text = entry;
    var li = el('li', null, describeValue(text, { path: component.itemPath || component.path }).primary);
    li.title = rawTitle(text);
    ul.appendChild(li);
  }
  wrap.appendChild(ul);
  if (items.length > shown.length) {
    wrap.appendChild(el('p', 'more-note', '+ ' + (items.length - shown.length) + ' more of ' + items.length));
  }
  return wrap;
}

// Key order in a JSON object is an implementation detail. A table should
// lead with what identifies the row, not with whichever internal id the
// serialiser happened to emit first.
function columnScore(key, rows) {
  var lower = String(key).toLowerCase().replace(/\.(name|title|label)$/, '');
  var score = 0;
  if (/\.(name|title|label)$/.test(String(key).toLowerCase())) score += 9;
  if (/^(title|name|label|headline|question|word|summary)$/.test(lower)) score += 12;
  else if (/(title|name|label)/.test(lower)) score += 5;
  if (/(author|artist|creator|owner|publisher|brand|category|type|status|state|country|city|language)/.test(lower)) score += 3;
  if (/(year|count|total|price|amount|rating|score|size|duration|date)/.test(lower)) score += 2;
  if (/(^_|_key$|_i$|^id$|_id$|key$|hash|guid|uuid|slug|cover|thumbnail|internal|seed|ia$|lending|ebook|availability)/.test(lower)) score -= 6;
  if (RE_KEY_NOISE.test(lower)) score -= 4;

  var present = 0, longText = 0;
  var sampled = Math.min(rows.length, 5);
  for (var i = 0; i < sampled; i += 1) {
    var v = rows[i] ? getByPath(rows[i], key) : undefined;
    if (v === undefined || v === null) continue;
    present += 1;
    if (typeof v === 'string' && (v.length > 70 || isUrl(v))) longText += 1;
  }
  if (!present) return -Infinity;
  score += (present / sampled) * 2;
  score -= longText;
  return score;
}

// { name, url } wrappers are everywhere in REST payloads. The name is the
// column a reader wants; the wrapper is not.
function namePathIn(node) {
  if (!isPlainObject(node)) return '';
  var preferred = ['name', 'title', 'label', 'display_name', 'short_name'];
  for (var i = 0; i < preferred.length; i += 1) {
    if (typeof node[preferred[i]] === 'string' && node[preferred[i]]) return preferred[i];
  }
  return '';
}

function chooseColumns(rows) {
  var sample = rows[0];
  var keys = [];
  Object.keys(sample).forEach(function (key) {
    var value = sample[key];
    if (isPlainObject(value)) {
      var nested = namePathIn(value);
      if (nested) keys.push({ path: key + '.' + nested, label: humanize(key) });
      return;
    }
    if (Array.isArray(value) && value.length && typeof value[0] === 'object') return;
    keys.push({ path: key, label: humanize(key) });
  });

  var scored = keys.map(function (entry, index) {
    return { key: entry.path, label: entry.label, index: index, score: columnScore(entry.path, rows) };
  }).filter(function (entry) { return entry.score !== -Infinity; });

  scored.sort(function (a, b) { return b.score - a.score || a.index - b.index; });
  var picked = scored.slice(0, 6);
  // Keep the best column first, then restore the payload's own order.
  var lead = picked[0];
  var rest = picked.slice(1).sort(function (a, b) { return a.index - b.index; });
  return (lead ? [lead] : []).concat(rest).map(function (entry) {
    return { label: entry.label, path: entry.key };
  });
}

function renderTable(value, component) {
  var rows = Array.isArray(value) ? value : (isPlainObject(value) ? [value] : null);
  if (!rows || !rows.length) return null;

  var columns = component.columns;
  if (!columns || !columns.length) {
    // Infer columns from the first object row.
    var sample = rows[0];
    if (!isPlainObject(sample)) {
      return renderList(rows, component);
    }
    columns = chooseColumns(rows);
  }
  if (!columns.length) return renderJsonBlock(rows);

  var wrap = document.createElement('div');
  var scroll = el('div', 'comp-table-scroll');
  var table = el('table', 'comp-table');

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  for (var c = 0; c < columns.length; c += 1) {
    headRow.appendChild(el('th', null, columns[c].label));
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  var shown = rows.slice(0, MAX_ROWS);
  for (var r = 0; r < shown.length; r += 1) {
    var tr = document.createElement('tr');
    for (var k = 0; k < columns.length; k += 1) {
      var cellValue = getByPath(shown[r], columns[k].path);
      var cell = describeValue(cellValue, { path: columns[k].path, label: columns[k].label });
      var td = el('td', null, cellValue === undefined ? '—' : cell.primary);
      td.title = rawTitle(cellValue);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  scroll.appendChild(table);
  wrap.appendChild(scroll);

  if (rows.length > shown.length) {
    wrap.appendChild(el('p', 'more-note', 'Showing ' + shown.length + ' of ' + rows.length + ' rows'));
  }
  return wrap;
}

function renderStatBars(value, component) {
  var rows = Array.isArray(value) ? value : (isPlainObject(value) ? Object.keys(value).map(function (k) {
    return { __name: k, __value: value[k] };
  }) : null);
  if (!rows || !rows.length) return null;

  // Work out a sensible ceiling so bars are comparable.
  var numbers = [];
  var i;
  for (i = 0; i < rows.length; i += 1) {
    var n = component.valuePath ? getByPath(rows[i], component.valuePath) : rows[i].__value;
    if (typeof n === 'number' && isFinite(n)) numbers.push(n);
  }
  if (!numbers.length) return renderList(rows, component);

  var max = component.max;
  if (!max || !isFinite(max)) {
    max = Math.max.apply(null, numbers);
    if (max <= 0) max = 1;
  }

  var wrap = document.createElement('div');
  var shown = rows.slice(0, MAX_ROWS);
  for (i = 0; i < shown.length; i += 1) {
    var row = shown[i];
    var name = component.labelPath ? getByPath(row, component.labelPath) : row.__name;
    var raw = component.valuePath ? getByPath(row, component.valuePath) : row.__value;
    if (typeof raw !== 'number' || !isFinite(raw)) continue;

    var bar = el('div', 'statbar');
    bar.appendChild(el('span', 'statbar-name', humanize(formatValue(name === undefined ? i + 1 : name))));

    var track = el('div', 'statbar-track');
    var fill = el('div', 'statbar-fill');
    var pct = Math.max(0, Math.min(100, (raw / max) * 100));
    fill.style.width = pct.toFixed(1) + '%';
    track.appendChild(fill);
    bar.appendChild(track);

    bar.appendChild(el('span', 'statbar-val',
      describeValue(raw, { path: component.valuePath || component.path, unit: component.unit }).primary));
    wrap.appendChild(bar);
  }
  return wrap.childNodes.length ? wrap : null;
}

// Line chart. Hand-rolled SVG — a charting library would be a dependency and
// this only ever needs one series.
function renderChart(value, component) {
  var numbers = [];
  var i;

  if (Array.isArray(value)) {
    for (i = 0; i < value.length; i += 1) {
      var entry = value[i];
      var n = component.valuePath ? getByPath(entry, component.valuePath) : entry;
      if (typeof n === 'number' && isFinite(n)) numbers.push(n);
    }
  } else if (isPlainObject(value)) {
    var keys = Object.keys(value);
    for (i = 0; i < keys.length; i += 1) {
      if (typeof value[keys[i]] === 'number' && isFinite(value[keys[i]])) numbers.push(value[keys[i]]);
    }
  }

  if (numbers.length < 2) return null;

  // Too many points render as noise at this width; sample evenly instead.
  var MAX_POINTS = 48;
  if (numbers.length > MAX_POINTS) {
    var sampled = [];
    var step = numbers.length / MAX_POINTS;
    for (i = 0; i < MAX_POINTS; i += 1) sampled.push(numbers[Math.floor(i * step)]);
    numbers = sampled;
  }

  var min = Math.min.apply(null, numbers);
  var max = Math.max.apply(null, numbers);
  if (max === min) { max = min + 1; }
  var pad = (max - min) * 0.12;
  min -= pad; max += pad;

  // The SVG stretches to the card's width (preserveAspectRatio none), which
  // also stretched any text inside it. The value labels are HTML beside it.
  var W = 600, H = 130, padL = 0, padR = 8, padT = 10, padB = 20;
  var innerW = W - padL - padR;
  var innerH = H - padT - padB;

  function px(index) { return padL + (index / (numbers.length - 1)) * innerW; }
  function py(val) { return padT + (1 - (val - min) / (max - min)) * innerH; }

  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'chart-svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', (component.label || 'Series') + ' chart');

  var defs = document.createElementNS(svgNS, 'defs');
  defs.innerHTML =
    '<linearGradient id="imagoChartFill" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="var(--ink)" stop-opacity="0.12"/>' +
    '<stop offset="100%" stop-color="var(--ink)" stop-opacity="0"/></linearGradient>';
  svg.appendChild(defs);

  // three horizontal guides, labelled with their value
  var axis = el('div', 'chart-axis');
  axis.setAttribute('aria-hidden', 'true');
  for (i = 0; i < 3; i += 1) {
    var frac = i / 2;
    var val = max - frac * (max - min);
    var y = padT + frac * innerH;
    var line = document.createElementNS(svgNS, 'line');
    line.setAttribute('class', 'chart-grid');
    line.setAttribute('x1', padL); line.setAttribute('x2', W - padR);
    line.setAttribute('y1', y.toFixed(1)); line.setAttribute('y2', y.toFixed(1));
    svg.appendChild(line);

    var tick = el('span', 'chart-tick', String(Math.round(val * 10) / 10));
    tick.style.top = (y / H * 100).toFixed(2) + '%';
    axis.appendChild(tick);
  }

  var points = [];
  for (i = 0; i < numbers.length; i += 1) {
    points.push(px(i).toFixed(1) + ',' + py(numbers[i]).toFixed(1));
  }

  var area = document.createElementNS(svgNS, 'polygon');
  area.setAttribute('class', 'chart-area');
  area.setAttribute('points',
    padL + ',' + (H - padB) + ' ' + points.join(' ') + ' ' + (W - padR) + ',' + (H - padB));
  svg.appendChild(area);

  var poly = document.createElementNS(svgNS, 'polyline');
  poly.setAttribute('class', 'chart-line');
  poly.setAttribute('vector-effect', 'non-scaling-stroke');
  poly.setAttribute('points', points.join(' '));
  svg.appendChild(poly);

  // Dots only when sparse enough to read.
  if (numbers.length <= 24) {
    for (i = 0; i < numbers.length; i += 1) {
      // A zero-length round-capped stroke with a non-scaling stroke stays a
      // circle when the SVG stretches; a <circle> became an oval.
      var dot = document.createElementNS(svgNS, 'line');
      dot.setAttribute('class', 'chart-dot');
      dot.setAttribute('x1', px(i).toFixed(1)); dot.setAttribute('x2', px(i).toFixed(1));
      dot.setAttribute('y1', py(numbers[i]).toFixed(1)); dot.setAttribute('y2', py(numbers[i]).toFixed(1));
      dot.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(dot);
    }
  }

  var wrap = el('div', 'chart-wrap');
  var plot = el('div', 'chart-plot');
  plot.appendChild(axis);
  plot.appendChild(svg);
  wrap.appendChild(plot);
  wrap.appendChild(el('p', 'more-note',
    numbers.length + ' points · low ' + (Math.round(min * 10) / 10) + ' · high ' + (Math.round(max * 10) / 10)));
  return wrap;
}

function renderJsonBlock(value) {
  var wrap = el('div', 'comp-json');
  var text;
  try {
    text = JSON.stringify(value, null, 2);
  } catch (err) {
    text = String(value);
  }
  if (text === undefined) text = 'undefined';
  if (text.length > 20000) text = text.slice(0, 20000) + '\n…truncated…';
  wrap.appendChild(el('pre', null, text));
  return wrap;
}

export { COMPONENT_SPAN, BLOCK_TYPES, HERO_KINDS, STRUCTURAL_TYPES, ROOT_OK_TYPES, numbersWithGaps, allNumbers, looksLikeDateTimeMap, resolveType, renderComponent, cardFor, factCell, renderHeadline, STRUCTURE_FIRST, isBookkeeping, renderSpecBody, flattenScalars, renderKeyValue, renderSparkline, renderGauge, timelineEntries, renderTimeline, scheduleTimelineLayout, layoutTimelines, renderImage, renderBadges, renderList, columnScore, namePathIn, chooseColumns, renderTable, renderStatBars, renderChart, renderJsonBlock };
