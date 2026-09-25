import { ACTION_TYPES, COMPONENT_TYPES, EMPHASIS, LAYOUTS, MAX_ACTIONS, MAX_COMPONENTS } from './config.js';
import { canonPath, getByPath, isImageUrl, isPlainObject, isUrl } from './util.js';
import { RE_ISO_DATE, RE_ISO_DT, RE_KEY_NOISE, inferKind, lastSegment } from './values.js';
import { HERO_KINDS, ROOT_OK_TYPES, allNumbers, namePathIn, numbersWithGaps } from './render.js';
import { deriveName } from './endpoints.js';

/* ── Spec validation / normalisation ───────────────────────────────────── */

function normalizeSpec(spec) {
  if (!isPlainObject(spec)) return null;

  var out = {
    title: typeof spec.title === 'string' && spec.title.trim() ? spec.title.trim() : 'Response',
    subtitle: typeof spec.subtitle === 'string' ? spec.subtitle.trim() : '',
    layout: LAYOUTS.indexOf(spec.layout) !== -1 ? spec.layout : 'dashboard',
    actions: normalizeActions(spec.actions),
    components: []
  };

  if (typeof spec.titlePath === 'string' && spec.titlePath.trim()) out.titlePath = spec.titlePath.trim();

  var raw = Array.isArray(spec.components) ? spec.components : [];
  var seenPaths = {};

  for (var i = 0; i < raw.length && out.components.length < MAX_COMPONENTS; i += 1) {
    var candidate = raw[i];
    if (!isPlainObject(candidate)) continue;
    if (COMPONENT_TYPES.indexOf(candidate.type) === -1) continue;

    var component = {
      type: candidate.type,
      path: typeof candidate.path === 'string' ? candidate.path.trim() : '',
      label: typeof candidate.label === 'string' ? candidate.label.trim() : ''
    };
    if (typeof candidate.unit === 'string') component.unit = candidate.unit;
    if (typeof candidate.alt === 'string') component.alt = candidate.alt;
    if (typeof candidate.itemPath === 'string') component.itemPath = candidate.itemPath;
    if (typeof candidate.labelPath === 'string') component.labelPath = candidate.labelPath;
    if (typeof candidate.valuePath === 'string') component.valuePath = candidate.valuePath;
    if (EMPHASIS.indexOf(candidate.emphasis) !== -1) component.emphasis = candidate.emphasis;
    if (typeof candidate.max === 'number' && isFinite(candidate.max) && candidate.max > 0) {
      component.max = candidate.max;
    }
    if (Array.isArray(candidate.items)) {
      component.items = candidate.items.filter(function (item) {
        return isPlainObject(item) && typeof item.path === 'string' && item.path;
      }).map(function (item) {
        return { label: typeof item.label === 'string' ? item.label : humanize(item.path), path: item.path };
      }).slice(0, 12);
      if (!component.items.length) delete component.items;
    }
    if (Array.isArray(candidate.columns)) {
      component.columns = candidate.columns.filter(function (col) {
        return isPlainObject(col) && typeof col.path === 'string';
      }).map(function (col) {
        return { label: typeof col.label === 'string' ? col.label : col.path, path: col.path };
      }).slice(0, 8);
    }
    if (component.type === 'table' && (!component.columns || !component.columns.length)) {
      component.columns = null; // renderer will infer columns from the data
    }

    if (component.type === 'section') {
      if (!component.label) continue;
      out.components.push(component);
      continue;
    }

    // A component with no path resolves to the entire response body, which
    // is how a card ends up reading "{27 fields}". Only an explicit raw
    // block is allowed to address the root.
    if (!component.path && !component.items && ROOT_OK_TYPES.indexOf(component.type) === -1) continue;

    var key = component.type + '@' + canonPath(component.path);
    if (seenPaths[key]) continue;
    seenPaths[key] = true;

    out.components.push(component);
  }

  out.components = pruneContainers(out.components);
  out.components = assignEmphasis(out.components);

  var meaningful = out.components.filter(function (component) {
    return component.type !== 'section';
  });
  return meaningful.length ? out : null;
}

function normalizeActions(raw) {
  if (!Array.isArray(raw)) return [];
  var out = [];
  var seen = Object.create(null);   // keys come from the response body
  for (var i = 0; i < raw.length && out.length < MAX_ACTIONS; i += 1) {
    var candidate = raw[i];
    if (!isPlainObject(candidate) || ACTION_TYPES.indexOf(candidate.type) === -1) continue;
    var action = {
      type: candidate.type,
      label: typeof candidate.label === 'string' ? candidate.label.trim() : ''
    };
    if (candidate.type === 'follow') {
      if (typeof candidate.path !== 'string' || !candidate.path.trim()) continue;
      action.path = candidate.path.trim();
    }
    if (!action.label) action.label = action.type === 'follow' ? humanize(lastSegment(action.path)) : humanize(action.type);
    var key = action.type + '@' + (action.path || '');
    if (seen[key]) continue;
    seen[key] = true;
    out.push(action);
  }
  return out;
}

// If the plan points a plain value component at an object that other
// components already address field by field, the container card is pure
// duplication — drop it and keep the detail.
function pruneContainers(components) {
  var scalarish = ['text', 'metric', 'title', 'gauge', 'link'];
  return components.filter(function (component) {
    if (component.type === 'section' || !component.path) return true;
    if (scalarish.indexOf(component.type) === -1) return true;
    var prefix = canonPath(component.path) + '.';
    for (var i = 0; i < components.length; i += 1) {
      var other = components[i];
      if (other === component || !other.path) continue;
      if (canonPath(other.path).indexOf(prefix) === 0) return false;
    }
    return true;
  });
}

// Someone has to decide what the headline is. If the plan does not say, the
// first couple of measured values lead.
function assignEmphasis(components) {
  var heroes = 0;
  var i;
  for (i = 0; i < components.length; i += 1) {
    if (components[i].emphasis !== 'hero') continue;
    heroes += 1;
    if (heroes > 3) components[i].emphasis = 'normal';
  }
  if (heroes) return components;

  // An explicit emphasis anywhere means the plan already ranked itself.
  for (i = 0; i < components.length; i += 1) {
    if (components[i].emphasis) return components;
  }

  var promoted = 0;
  for (i = 0; i < components.length && promoted < 2; i += 1) {
    var candidate = components[i];
    if (candidate.type !== 'metric' && candidate.type !== 'gauge') continue;
    if (RE_KEY_NOISE.test(canonPath(candidate.path).toLowerCase())) continue;
    candidate.emphasis = 'hero';
    promoted += 1;
  }
  return components;
}

/* ── Fallback spec (no key, provider failure, or invalid spec) ───────────── */

// With more structures than fit on a page, show the ones that say something
// about the thing itself before the bulk. Bulk is judged by the data's shape
// (a list too long to read, an object that is only links) and by words any API
// uses for plumbing, never by the vocabulary of a particular API.
var RE_KEY_INTERESTING = /(stat|type|score|rating|metric|summary|current|result|price|category|tag)/;
var RE_KEY_BULK = /(past|deprecated|legacy|index|indices|image|icon|internal|meta|raw|log|debug|_url|href)/;
var BULK_ROWS = 30;
var BLOCK_INTEREST = { statBars: 6, chart: 5, timeline: 5, badges: 3, table: 2, keyValue: 2, list: 1 };

function rankBlocks(blocks) {
  return blocks.map(function (block, index) {
    var key = String(block.path || '').toLowerCase();
    var score = BLOCK_INTEREST[block.type] || 1;
    if (RE_KEY_INTERESTING.test(key)) score += 4;
    if (RE_KEY_BULK.test(key)) score -= 5;
    if (RE_KEY_NOISE.test(key)) score -= 3;
    // Too long to read, or only links: plumbing, not content. It folds into
    // Details at the foot of the page rather than vanishing.
    if (block.__rows > BULK_ROWS || block.__links) { score -= 5; block.emphasis = 'quiet'; }
    if (block.__main) score += 20;
    return { block: block, index: index, score: score };
  }).sort(function (a, b) {
    return b.score - a.score || a.index - b.index;
  }).map(function (entry) {
    delete entry.block.__rows;
    delete entry.block.__links;
    delete entry.block.__main;
    return entry.block;
  });
}

// An array of { name, value } objects is a ranking, and a ranking reads as
// bars. Anything more ambiguous stays a table.
var RE_STAT_VALUE = /^(value|count|amount|score|total|power|rating|points|votes|weight|percent|percentage)$/;

// A short array of { name, slot } objects is a set of labels. A table of one
// row and two columns is not worth the chrome.
function labelOnlyArray(rows) {
  if (!rows.length || rows.length > 8) return '';
  var RE_TRIVIAL = /^(slot|index|order|position|rank|is_[a-z_]+|url|href)$/;
  var namePath = '';
  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    if (!isPlainObject(row)) return '';
    var own = namePathIn(row);
    var path = own;
    if (!path) {
      var wrapper = Object.keys(row).filter(function (key) {
        return isPlainObject(row[key]) && namePathIn(row[key]);
      })[0];
      if (!wrapper) return '';
      path = wrapper + '.' + namePathIn(row[wrapper]);
    }
    if (namePath && namePath !== path) return '';
    namePath = path;

    var extras = Object.keys(row).filter(function (key) {
      if (path.indexOf(key) === 0) return false;
      return !RE_TRIVIAL.test(key.toLowerCase());
    });
    if (extras.length) return '';
  }
  return namePath;
}

// An object whose filled values are all URLs, or objects of URLs, is a
// bundle of links (image variants, API cross-references), whatever its name.
function onlyLinks(obj) {
  return linkCount(obj, 0) > 0;
}

// How many URLs an object holds, or -1 as soon as it holds anything else.
// Empty values (and objects of nothing but empty values) are neutral.
function linkCount(obj, depth) {
  var seen = 0;
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i += 1) {
    var v = obj[keys[i]];
    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'string' && isUrl(v)) { seen += 1; continue; }
    if (!isPlainObject(v) || depth >= 8) return -1;
    var inner = linkCount(v, depth + 1);
    if (inner < 0) return -1;
    seen += inner;
  }
  return seen;
}

function statBarsShape(rows) {
  if (rows.length < 2 || rows.length > 12) return null;
  var sample = rows[0];
  var numeric = Object.keys(sample).filter(function (key) {
    return typeof sample[key] === 'number' && isFinite(sample[key]);
  });
  if (!numeric.length) return null;

  var valueKey = null;
  for (var i = 0; i < numeric.length; i += 1) {
    if (RE_STAT_VALUE.test(numeric[i].toLowerCase())) { valueKey = numeric[i]; break; }
  }
  // A slot, index or rank is a position, not a quantity worth drawing.
  var RE_POSITION = /^(slot|index|order|position|rank|level|page|number|no|id|game_index)$/;
  var quantities = numeric.filter(function (key) { return !RE_POSITION.test(key.toLowerCase()); });
  if (!valueKey && quantities.length === 1) valueKey = quantities[0];
  // Several quantities and no name that says which: draw the one that moves
  // most across the rows. A column that is the same (or nearly) everywhere
  // is not what the rows are being compared on. Only for small rows (a name
  // and a few numbers); a record of many fields is a table, not a ranking.
  if (!valueKey && quantities.length > 1 && Object.keys(sample).length <= 4) {
    var best = 0;
    for (var q = 0; q < quantities.length; q += 1) {
      var lo = Infinity, hi = -Infinity;
      for (var rr = 0; rr < rows.length; rr += 1) {
        var x = rows[rr] ? rows[rr][quantities[q]] : NaN;
        if (typeof x === 'number' && isFinite(x)) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
      }
      if (hi - lo > best) { best = hi - lo; valueKey = quantities[q]; }
    }
  }
  if (!valueKey) return null;

  var labelPath = namePathIn(sample);
  if (!labelPath) {
    var wrapper = Object.keys(sample).filter(function (key) {
      return isPlainObject(sample[key]) && namePathIn(sample[key]);
    })[0];
    if (!wrapper) return null;
    labelPath = wrapper + '.' + namePathIn(sample[wrapper]);
  }

  var max = 0;
  for (var r = 0; r < rows.length; r += 1) {
    var n = rows[r] ? rows[r][valueKey] : 0;
    if (typeof n === 'number' && isFinite(n)) max = Math.max(max, n);
  }
  return { labelPath: labelPath, valuePath: valueKey, max: max > 0 ? max : 1 };
}

// "…/v2?lat=…" is not a title. Prefer the last segment that says something,
// and fall back to the service's own name.
// raw: return the last path segment as written, for identifiers whose case
// and hyphens are the point (a GitHub login, a package name).
var RE_CODE_IDENTITY = /^(login|full_name|node_id|version|versions|dist-tags|repository|package|package_name|slug|sha)$/;

function endpointTitle(url, raw) {
  if (!url) return '';
  var noise = /^(v\d+|api|json|data|index|latest|current|query|search|get)$/i;
  try {
    var parsed = new URL(url);
    var segments = parsed.pathname.split('/').filter(Boolean)
      .map(function (part) { return decodeURIComponent(part).replace(/\.(json|xml)$/i, ''); })
      .filter(function (part) { return part && !noise.test(part); });
    if (segments.length) return raw ? segments[segments.length - 1] : humanize(segments[segments.length - 1]);
    var host = parsed.hostname.replace(/^(www|api)\./, '').split('.');
    return humanize(host[0]);
  } catch (err) {
    return deriveName(url);
  }
}

// An object of parallel arrays keyed by time (Open-Meteo's hourly/daily,
// most metrics APIs): the numeric arrays are series, and a series is a chart,
// not a key/value sheet with a sparkline per row.
function seriesKeys(node) {
  if (!isPlainObject(node)) return null;
  var keys = Object.keys(node);
  var timeLen = -1;
  for (var i = 0; i < keys.length; i += 1) {
    var arr = node[keys[i]];
    if (Array.isArray(arr) && arr.length >= 4 && typeof arr[0] === 'string' &&
        (RE_ISO_DT.test(arr[0]) || RE_ISO_DATE.test(arr[0]))) { timeLen = arr.length; break; }
  }
  if (timeLen < 0) return null;
  // Nulls are gaps (Open-Meteo pads unfinished hours with them); a series
  // with a gap used to be dropped from the page entirely.
  var numeric = keys.filter(function (k) {
    return Array.isArray(node[k]) && node[k].length === timeLen && numbersWithGaps(node[k]);
  });
  return numeric.length ? numeric : null;
}

function formatCoord(value, pos, neg) {
  return Math.abs(value).toFixed(2) + '° ' + (value >= 0 ? pos : neg);
}

// Title: a human-readable name if the payload has one, else the endpoint.
function titleKeyOf(data) {
  if (!isPlainObject(data)) return null;
  var candidates = ['name', 'title', 'label', 'id'];
  for (var i = 0; i < candidates.length; i += 1) {
    var value = data[candidates[i]];
    if (typeof value === 'string' && value.trim()) return candidates[i];
  }
  return null;
}

// A response about a code identifier (a GitHub login or repo, a package)
// names it in a form where case and hyphens matter: "left-pad" is not
// "Left pad", and a login is not a proper noun. Those are shown as written.
function isCodeIdentity(data) {
  return isPlainObject(data) && Object.keys(data).some(function (k) { return RE_CODE_IDENTITY.test(k); });
}

// Otherwise a bare identifier ("pikachu", "the-hobbit") is a name, so it
// reads as one.
function nameAsTitle(text, codeIdentity) {
  var title = String(text).trim();
  if (!codeIdentity && /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(title)) {
    title = title.charAt(0).toUpperCase() + title.slice(1).replace(/-/g, ' ');
  }
  return title;
}

function fallbackTitle(data, url) {
  if (Array.isArray(data)) return data.length + (data.length === 1 ? ' item' : ' items');
  if (!isPlainObject(data)) return 'Response';
  var key = titleKeyOf(data);
  var code = isCodeIdentity(data);
  return nameAsTitle(key ? data[key] : (endpointTitle(url, code) || 'Response'), code);
}

// A layout is remembered by the shape of a response, but its title and
// subtitle were written about one response: the plan for /pokemon/pikachu
// is titled "Pikachu". Any other response of that shape gets its own name,
// read from the field the plan said names it, or worked out from the data.
function fitTitle(spec, data, url, sourceUrl) {
  if (!spec) return spec;
  var out = Object.assign({}, spec);
  var foreign = !sourceUrl || sourceUrl !== url;
  var named = spec.titlePath ? getByPath(data, spec.titlePath) : undefined;
  if ((typeof named === 'string' && named.trim()) || (typeof named === 'number' && isFinite(named))) {
    out.title = nameAsTitle(named, isCodeIdentity(data));
  } else if (foreign) {
    out.title = fallbackTitle(data, url);
  }
  if (foreign) out.subtitle = '';
  return out;
}

// The collection a response exists to return: its one list of records,
// when nothing else in it is structured ({ numFound, start, docs: [...] },
// { count, next, results: [...] }). Judged by shape, never by key name.
function mainCollectionKey(data) {
  if (!isPlainObject(data)) return '';
  var keys = Object.keys(data);
  var found = '';
  for (var i = 0; i < keys.length; i += 1) {
    var v = data[keys[i]];
    if (Array.isArray(v) && v.length && isPlainObject(v[0])) {
      if (found) return '';
      found = keys[i];
    } else if ((Array.isArray(v) && v.length) || (isPlainObject(v) && Object.keys(v).length)) {
      return '';
    }
  }
  return found;
}

// numFound and num_found holding the same number are one fact said twice.
function dropEchoes(facts, data) {
  var seen = Object.create(null);
  return facts.filter(function (fact) {
    var name = String(lastSegment(fact.path)).toLowerCase().replace(/[_\-\s]/g, '');
    var value;
    try { value = JSON.stringify(getByPath(data, fact.path)); } catch (err) { value = ''; }
    var sig = name + '=' + value;
    if (seen[sig]) return false;
    seen[sig] = true;
    return true;
  });
}

function buildFallbackSpec(data, url) {
  var components = [];
  var title = 'Response';
  var subtitle = '';

  if (Array.isArray(data)) {
    title = data.length + (data.length === 1 ? ' item' : ' items');
    components.push(isPlainObject(data[0])
      ? { type: 'table', path: '', label: 'Items' }
      : { type: 'badges', path: '', label: 'Items' });
    return { title: title, subtitle: subtitle, layout: 'table', components: components,
             actions: deriveActions(data, url) };
  }

  if (!isPlainObject(data)) {
    // `text` is not a ROOT_OK type, so a pathless one is stripped by
    // normalizeSpec and the whole spec comes back null. jsonBlock is
    // structural, so it may address the body root. A bare `null`, `42` or
    // `"ok"` from a /health endpoint takes this path.
    return {
      title: 'Response', subtitle: subtitle, layout: 'raw',
      components: [{ type: 'jsonBlock', path: '', label: 'Value' }],
      actions: deriveActions(data, url)
    };
  }

  var keys = Object.keys(data);
  var i;

  var titleKey = titleKeyOf(data);
  title = fallbackTitle(data, url);

  // A located response says where it is in its subtitle; the raw
  // coordinates then belong with the bookkeeping, not in the fact sheet.
  var located = typeof data.latitude === 'number' && typeof data.longitude === 'number';
  if (located) {
    subtitle = formatCoord(data.latitude, 'N', 'S') + ', ' + formatCoord(data.longitude, 'E', 'W') +
      (typeof data.timezone === 'string' && data.timezone ? ' · ' + data.timezone : '');
  }
  // Probed with keys from the response body, so no prototype to collide with.
  var LOCATION_KEYS = Object.assign(Object.create(null), { latitude: true, longitude: true, timezone: true });

  var imagePath = findFirstImagePath(data, '', 0);
  if (imagePath) components.push({ type: 'image', path: imagePath, label: 'Image', alt: title });

  // Moments in time read as a sequence, not as sixteen separate strings.
  var moments = [];
  for (i = 0; i < keys.length; i += 1) {
    if (typeof data[keys[i]] === 'string' && RE_ISO_DT.test(data[keys[i]])) {
      moments.push({ label: humanize(keys[i]), path: keys[i] });
    }
  }
  var momentKeys = Object.create(null);   // keys come from the response body
  if (moments.length >= 3) {
    components.push({ type: 'timeline', path: '', label: 'Sequence', items: moments });
    for (i = 0; i < moments.length; i += 1) momentKeys[moments[i].path] = true;
  }

  var facts = [];
  var blocks = [];
  var mainKey = mainCollectionKey(data);

  // Many APIs bury the answer one level down under "current" or "results".
  // Those fields belong on the surface, not inside a card.
  var HOISTABLE = /^(current|now|latest|today|main|summary|result|results|data|attributes|properties)$/;
  var hoisted = '';
  for (i = 0; i < keys.length; i += 1) {
    var child = data[keys[i]];
    if (!HOISTABLE.test(keys[i]) || !isPlainObject(child)) continue;
    var childKeys = Object.keys(child).filter(function (k) {
      return child[k] !== null && typeof child[k] !== 'object';
    });
    if (childKeys.length < 2) continue;
    hoisted = keys[i];
    // Open-Meteo and friends ship the units in a parallel object; a number
    // without its unit is only half an answer.
    var units = isPlainObject(data[hoisted + '_units']) ? data[hoisted + '_units']
              : (isPlainObject(data.units) ? data.units : null);
    for (var c = 0; c < childKeys.length && c < 8; c += 1) {
      var childPath = hoisted + '.' + childKeys[c];
      var childValue = child[childKeys[c]];
      var childKind = inferKind(childValue, { path: childPath });
      var fact = {
        __noise: RE_KEY_NOISE.test(childKeys[c].toLowerCase()),
        __kind: childKind,
        type: HERO_KINDS.indexOf(childKind) !== -1 && childKind !== 'datetime' ? 'metric' : 'text',
        path: childPath,
        label: humanize(childKeys[c])
      };
      var unit = units ? units[childKeys[c]] : null;
      if (typeof unit === 'string' && unit && unit.length <= 8 && !/^iso/i.test(unit)) {
        fact.unit = unit;
      }
      facts.push(fact);
    }
    break;
  }

  for (i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    if (key === titleKey || momentKeys[key] || key === hoisted) continue;
    var v = data[key];
    var label = humanize(key);

    if (v === null || v === undefined) continue;

    // Unit tables are consumed by the values they describe (hoisted facts
    // pick theirs up above), so they never render as a card of their own.
    if (/_units$/.test(key) && isPlainObject(data[key.replace(/_units$/, '')])) continue;

    var series = seriesKeys(v);
    if (series) {
      // Two charts lead; the rest go to Details rather than vanishing.
      for (var si = 0; si < series.length; si += 1) {
        var chart = { type: 'chart', path: key + '.' + series[si],
                      label: label + ' ' + humanize(series[si]).toLowerCase() };
        if (si >= 2) chart.emphasis = 'quiet';
        blocks.push(chart);
      }
      continue;
    }

    if (Array.isArray(v)) {
      if (!v.length) continue;
      if (isPlainObject(v[0])) {
        var bars = statBarsShape(v);
        var namesOnly = bars ? '' : labelOnlyArray(v);
        if (bars) {
          blocks.push({ type: 'statBars', path: key, label: label,
                        labelPath: bars.labelPath, valuePath: bars.valuePath, max: bars.max });
        } else if (namesOnly) {
          blocks.push({ type: 'badges', path: key, label: label, itemPath: namesOnly });
        } else if (key === mainKey) {
          // The list the response exists to return is the page, however
          // long: a search's hundred results do not fold into Details.
          blocks.push({ type: 'table', path: key, label: label, __main: true });
        } else {
          blocks.push({ type: 'table', path: key, label: label, __rows: v.length });
        }
      }
      else if (allNumbers(v) && v.length >= 4) blocks.push({ type: 'chart', path: key, label: label });
      else blocks.push({ type: 'badges', path: key, label: label, __rows: v.length });
      continue;
    }

    if (isPlainObject(v)) {
      if (!Object.keys(v).length) continue;
      blocks.push({ type: 'keyValue', path: key, label: label, __links: onlyLinks(v) });
      continue;
    }

    if (imagePath && canonPath(imagePath) === key) continue;

    var kind = inferKind(v, { path: key });
    facts.push({
      __noise: RE_KEY_NOISE.test(key.toLowerCase()) || (located && LOCATION_KEYS[key] === true),
      type: kind === 'number' || kind === 'percent' || kind === 'duration' ||
            kind === 'bytes' || kind === 'money' || kind === 'temperature' ? 'metric' : 'text',
      path: key,
      label: label,
      __kind: kind
    });
  }

  facts = dropEchoes(facts, data);

  // Two headline values, chosen by how much they say, not by key order.
  function heroRank(fact) {
    if (fact.__noise) return 99;
    var index = HERO_KINDS.indexOf(fact.__kind);
    return index === -1 ? 99 : index;
  }
  var ranked = facts.slice().sort(function (a, b) {
    return heroRank(a) - heroRank(b);
  });
  var promoted = 0;
  for (i = 0; i < ranked.length && promoted < 2; i += 1) {
    if (heroRank(ranked[i]) === 99) break;
    ranked[i].emphasis = 'hero';
    promoted += 1;
  }
  // Bookkeeping fields sink to the end of the sheet.
  facts.sort(function (a, b) { return (a.__noise ? 1 : 0) - (b.__noise ? 1 : 0); });
  for (i = 0; i < facts.length; i += 1) {
    if (facts[i].__noise && facts[i].emphasis !== 'hero') facts[i].emphasis = 'quiet';
    delete facts[i].__kind;
    delete facts[i].__noise;
  }

  var actions = deriveActions(data, url);
  var covered = Object.create(null);   // keys come from the response body
  for (i = 0; i < actions.length; i += 1) {
    if (actions[i].type === 'follow') covered[canonPath(actions[i].path)] = true;
  }
  facts = facts.filter(function (fact) { return !covered[canonPath(fact.path)]; });

  components = components.concat(facts.slice(0, 12)).concat(rankBlocks(blocks).slice(0, 8));

  if (!components.length) components.push({ type: 'jsonBlock', path: '', label: 'Response' });

  var layout = 'dashboard';
  if (imagePath && facts.length) layout = 'profile';
  else if (mainKey) layout = 'table';
  else if (moments.length >= 3 && facts.length < 4) layout = 'timeline';
  else if (!facts.length && blocks.length && blocks[0].type === 'table') layout = 'table';

  return {
    title: title,
    subtitle: subtitle,
    layout: layout,
    components: components.slice(0, MAX_COMPONENTS),
    actions: actions
  };
}

// Where can the reader go from here? Any URL in the body is a door; the
// paging keys are the front door.
var RE_KEY_PAGING = /^(next|next_page|next_url|nextpage|previous|prev|prev_page|previous_url|self|first|last)$/;

function deriveActions(data, url) {
  var actions = [];
  var seen = Object.create(null);   // keys come from the response body

  function follow(path, label) {
    if (actions.length >= MAX_ACTIONS || seen[path]) return;
    seen[path] = true;
    actions.push({ type: 'follow', path: path, label: label });
  }

  function scan(node, prefix, depth) {
    if (!isPlainObject(node) || depth > 1) return;
    var keys = Object.keys(node);
    // Paging first: those are the links a reader reaches for.
    keys.sort(function (a, b) {
      return (RE_KEY_PAGING.test(b) ? 1 : 0) - (RE_KEY_PAGING.test(a) ? 1 : 0);
    });
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      var value = node[key];
      var path = prefix ? prefix + '.' + key : key;
      if (typeof value === 'string' && isUrl(value) && !isImageUrl(value) && value !== url) {
        if (/\.(ogg|mp3|wav|mp4|webm|pdf|zip)$/i.test(value.split('?')[0])) continue;
        var label = RE_KEY_PAGING.test(key)
          ? (/^(next|next_page|next_url|nextpage)$/.test(key) ? 'Next page'
            : /^(previous|prev|prev_page|previous_url)$/.test(key) ? 'Previous page'
            : humanize(key))
          : humanize((prefix ? lastSegment(prefix) : key).replace(/_?(url|href|link|uri)$/i, '') || key);
        follow(path, label);
      } else if (isPlainObject(value)) {
        scan(value, path, depth + 1);
      }
    }
  }
  scan(data, '', 0);
  return actions;
}

// Key order is not preference order: PokeAPI lists front_shiny before
// front_default, so score candidate keys instead of taking the first match.
function imageKeyScore(key) {
  var k = String(key).toLowerCase();
  var score = 0;
  if (/(^|_)default$/.test(k)) score += 4;
  if (/^(image|img|photo|picture|thumbnail|thumb|avatar|logo|icon|cover|artwork)(_?(url|src))?$/.test(k)) score += 4;
  if (/image|photo|picture|avatar|logo|cover|artwork/.test(k)) score += 2;
  if (/front|main|primary|large|original|full/.test(k)) score += 1;
  if (/back|shiny|female|male|mini|tiny|gray|grey|transparent|placeholder/.test(k)) score -= 3;
  return score;
}

function findFirstImagePath(node, prefix, depth) {
  if (depth > 3 || !isPlainObject(node)) return '';
  var keys = Object.keys(node);
  var i;

  var bestKey = null;
  var bestScore = -Infinity;
  for (i = 0; i < keys.length; i += 1) {
    if (!isImageUrl(node[keys[i]])) continue;
    var score = imageKeyScore(keys[i]);
    if (score > bestScore) { bestScore = score; bestKey = keys[i]; }
  }
  if (bestKey !== null) return prefix + bestKey;

  for (i = 0; i < keys.length; i += 1) {
    if (isPlainObject(node[keys[i]])) {
      var found = findFirstImagePath(node[keys[i]], prefix + keys[i] + '.', depth + 1);
      if (found) return found;
    }
  }
  return '';
}

// API keys are written for parsers. These are the ones worth spelling out.
// Prototype-free: the keys probed against this table are response field
// names, so a field called `constructor` or `toString` would otherwise
// resolve to an Object.prototype member, come back truthy, and be used as
// the label. That lost the whole field from the rendered interface.
var LABEL_WORDS = Object.assign(Object.create(null), {
  tzid: 'timezone', tz: 'timezone', lat: 'latitude', lng: 'longitude',
  lon: 'longitude', utc: 'UTC', url: 'URL', uri: 'URI', id: 'ID', ids: 'IDs',
  api: 'API', ip: 'IP', uuid: 'UUID', sku: 'SKU', iso: 'ISO', html: 'HTML',
  json: 'JSON', px: 'px', pct: 'percent', qty: 'quantity', num: 'number',
  avg: 'average', min: 'minimum', max: 'maximum', desc: 'description'
});



function humanize(key) {
  // Sentence case, so snake_case and camelCase labels read the same way.
  // All-caps words are left alone so acronyms survive (URL, ID, HP).
  var words = String(key)
    .replace(/[_\-.]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean)
    .map(function (word) {
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;   // acronyms survive
      var lower = word.toLowerCase();
      return LABEL_WORDS[lower] || lower;
    });
  if (!words.length) return '';
  words[0] = words[0].replace(/^./, function (c) { return c.toUpperCase(); });
  return words.join(' ');
}

export { mainCollectionKey, dropEchoes, RE_CODE_IDENTITY, titleKeyOf, isCodeIdentity, nameAsTitle, fallbackTitle, fitTitle, normalizeSpec, normalizeActions, pruneContainers, assignEmphasis, RE_KEY_INTERESTING, RE_KEY_BULK, BLOCK_INTEREST, rankBlocks, RE_STAT_VALUE, labelOnlyArray, statBarsShape, endpointTitle, seriesKeys, formatCoord, buildFallbackSpec, RE_KEY_PAGING, deriveActions, imageKeyScore, findFirstImagePath, LABEL_WORDS, humanize, onlyLinks, BULK_ROWS };
