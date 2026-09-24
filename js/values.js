import { el, formatBytes, isImageUrl, isPlainObject, isUrl, parsePath } from './util.js';

/* ── Value semantics ───────────────────────────────────────────────────────
   A generative UI that prints "2026-09-20T08:03:52+02:00" or "44,036" has
   only moved the JSON around. Before anything is rendered, every scalar is
   classified from the value *and* its key, then formatted for a human. The
   untouched value always survives as the element's title attribute.
   ---------------------------------------------------------------------- */

var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

var RE_ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
var RE_ISO_DT = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;
var RE_CLOCK = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?[Mm]\.?)?$/;
var RE_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

var RE_KEY_PERCENT = /(percent|percentage|pct|illumination|humidity|probability|saturation|lightness|battery|progress|score_pct)/;
var RE_KEY_SECONDS = /(^|_)(seconds|secs?|duration|length|elapsed|uptime|runtime|ttl|expires_in)(_|$)/;
var RE_KEY_MILLIS = /(^|_)(ms|millis|milliseconds|latency|duration_ms|response_time)(_|$)/;
var RE_KEY_BYTES = /(^|_)(bytes|size|filesize|content_length|length_bytes)(_|$)/;
var RE_KEY_LAT = /(^|_)(lat|latitude)(_|$)/;
var RE_KEY_LNG = /(^|_)(lng|lon|long|longitude)(_|$)/;
// Transport and bookkeeping fields. Still shown, never as the headline.
var RE_KEY_YEAR = /(^|_)(year|yr|founded|published_year)(_|$)/;
var RE_KEY_NOISE = /(generation_?time|utc_offset|timezone_abbreviation|interval|elevation|^id$|_id$|etag|checksum|revision|version|request|cursor|offset|page|limit|status_code|copyright|licen[cs]e|attribution)/;
var RE_KEY_ANGLE = /(azimuth|altitude|bearing|heading|declination|elevation_angle)/;
var RE_KEY_TIME = /(^|_)(at|time|timestamp|date|epoch|created|updated|modified|published|expires)(_|$)/;
var RE_KEY_TEMP = /(^|_)(temp|temperature|feels_like|dew_point)/;
var RE_KEY_MONEY = /(^|_)(price|cost|amount|total|balance|revenue|salary|fee)(_|$)/;

function lastSegment(path) {
  var segments = parsePath(path);
  return segments.length ? String(segments[segments.length - 1]) : '';
}

// The key carries most of the meaning; the model's label is a weaker hint.
function keyHint(component) {
  var key = component && component.path ? lastSegment(component.path) : '';
  if (!key && component && component.label) key = component.label;
  return String(key).toLowerCase().replace(/[\s-]+/g, '_');
}

function offsetLabel(offset) {
  if (!offset) return '';
  if (offset === 'Z') return 'UTC';
  return 'UTC' + offset.replace(/(\d{2}):?(\d{2})/, function (m, h, mi) {
    return mi === '00' ? h.replace(/^0/, '') : h.replace(/^0/, '') + ':' + mi;
  });
}

function weekdayOf(y, m, d) {
  return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

// Formatted from the string's own parts, never through the local timezone:
// a sunrise at 08:03+02:00 must not drift to 11:33 because the reader is in
// another country.
function formatIsoDateTime(value) {
  var m = RE_ISO_DT.exec(String(value).trim());
  if (!m) return null;
  var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  var offset = offsetLabel(m[7]);
  return {
    primary: m[4] + ':' + m[5],
    secondary: weekdayOf(y, mo, d) + ' ' + d + ' ' + MONTHS[mo - 1] + ' ' + y +
               (offset ? ' · ' + offset : ''),
    sortable: true
  };
}

function formatIsoDate(value) {
  var m = RE_ISO_DATE.exec(String(value).trim());
  if (!m) return null;
  var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  return { primary: d + ' ' + MONTHS[mo - 1] + ' ' + y, secondary: weekdayOf(y, mo, d) };
}

function formatDuration(totalSeconds) {
  var s = Math.abs(Math.round(totalSeconds));
  var days = Math.floor(s / 86400);
  var hours = Math.floor((s % 86400) / 3600);
  var minutes = Math.floor((s % 3600) / 60);
  var seconds = s % 60;
  var parts = [];
  if (days) parts.push(days + 'd');
  if (hours) parts.push(hours + 'h');
  if (minutes && parts.length < 2) parts.push(minutes + 'm');
  if (!parts.length) parts.push(seconds + 's');
  return (totalSeconds < 0 ? '−' : '') + parts.join(' ');
}

function formatNumber(value) {
  if (!isFinite(value)) return String(value);
  if (Math.abs(value) >= 1000) return value.toLocaleString();
  if (Math.abs(value) < 1 && value !== 0) return String(Math.round(value * 10000) / 10000);
  return String(Math.round(value * 100) / 100);
}

function inferKind(value, component) {
  if (value === undefined) return 'empty';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (isPlainObject(value)) return 'object';
  if (typeof value === 'boolean') return 'boolean';

  var key = keyHint(component);
  var unit = component && component.unit ? String(component.unit).trim() : '';

  if (typeof value === 'number') {
    if (!isFinite(value)) return 'number';
    if (unit === '%' || (RE_KEY_PERCENT.test(key) && value >= 0 && value <= 100)) return 'percent';
    if (RE_KEY_BYTES.test(key)) return 'bytes';
    if (RE_KEY_LAT.test(key) || RE_KEY_LNG.test(key) || RE_KEY_ANGLE.test(key)) return 'coordinate';
    if (RE_KEY_TIME.test(key)) {
      if (value > 1e11) return 'epochMs';
      if (value > 1e8) return 'epoch';
    }
    if (RE_KEY_YEAR.test(key) && value >= 1000 && value <= 3000 && value % 1 === 0) return 'year';
    if (RE_KEY_MILLIS.test(key)) return 'durationMs';
    if (RE_KEY_SECONDS.test(key)) return 'duration';
    if (RE_KEY_TEMP.test(key)) return 'temperature';
    if (RE_KEY_MONEY.test(key)) return 'money';
    return 'number';
  }

  if (typeof value === 'string') {
    var text = value.trim();
    if (!text) return 'empty';
    if (isImageUrl(text)) return 'image';
    if (isUrl(text)) return 'url';
    if (RE_HEX.test(text)) return 'color';
    if (RE_EMAIL.test(text)) return 'email';
    if (RE_ISO_DT.test(text)) return 'datetime';
    if (RE_ISO_DATE.test(text)) return 'date';
    if (RE_CLOCK.test(text)) return 'clock';
    if (text.length > 140 || text.indexOf('\n') !== -1) return 'prose';
    return 'string';
  }

  return 'string';
}

// One place decides what a value looks like. Everything on screen — cards,
// fact strips, timelines, table cells — reads from this.
function describeValue(value, component) {
  var kind = inferKind(value, component);
  var unit = component && component.unit ? String(component.unit).trim() : '';
  var out = { kind: kind, primary: '', secondary: '', unit: '', ratio: null, href: '', raw: value };

  switch (kind) {
    case 'empty':   out.primary = '—'; break;
    case 'null':    out.primary = '—'; out.secondary = 'null'; break;
    case 'boolean': out.primary = value ? 'Yes' : 'No'; break;

    case 'datetime': {
      var dt = formatIsoDateTime(value);
      if (dt) { out.primary = dt.primary; out.secondary = dt.secondary; }
      else { out.primary = String(value); }
      break;
    }
    case 'date': {
      var dd = formatIsoDate(value);
      if (dd) { out.primary = dd.primary; out.secondary = dd.secondary; }
      else { out.primary = String(value); }
      break;
    }
    case 'epoch':
    case 'epochMs': {
      var ms = kind === 'epoch' ? value * 1000 : value;
      var iso = new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
      var ed = formatIsoDateTime(iso);
      out.primary = ed ? ed.primary : String(value);
      out.secondary = ed ? ed.secondary : '';
      break;
    }
    case 'clock':   out.primary = String(value).trim(); break;
    case 'year':    out.primary = String(value); break;

    case 'duration':
      out.primary = formatDuration(value);
      out.secondary = formatNumber(value) + ' seconds';
      break;
    case 'durationMs':
      out.primary = value < 1000 ? formatNumber(value) + ' ms' : formatDuration(value / 1000);
      if (value >= 1000) out.secondary = formatNumber(value) + ' ms';
      break;

    case 'percent':
      out.primary = formatNumber(value);
      out.unit = '%';
      out.ratio = Math.max(0, Math.min(1, value / 100));
      break;

    case 'bytes':   out.primary = formatBytes(value); out.secondary = formatNumber(value) + ' bytes'; break;
    case 'coordinate': out.primary = formatNumber(value) + '°'; break;
    case 'temperature': out.primary = formatNumber(value); out.unit = unit; break;
    case 'money':   out.primary = formatNumber(value); out.unit = unit; break;
    case 'number':  out.primary = formatNumber(value); out.unit = unit; break;

    case 'image':
    case 'url':     out.primary = String(value); out.href = String(value); break;
    case 'email':   out.primary = String(value); out.href = 'mailto:' + String(value); break;
    case 'color':   out.primary = String(value).toUpperCase(); break;
    case 'prose':   out.primary = String(value); break;
    case 'array': {
      var scalars = [];
      for (var a = 0; a < value.length && a < 4; a += 1) {
        if (value[a] === null || typeof value[a] === 'object') { scalars = null; break; }
        scalars.push(describeValue(value[a], { path: component && component.path }).primary);
      }
      if (scalars && scalars.length) {
        var shown = scalars.slice(0, 3);
        out.primary = shown.join(', ');
        if (value.length > shown.length) out.primary += ' +' + (value.length - shown.length);
        if (value.length > 1) out.secondary = value.length + ' items';
      } else {
        out.primary = value.length + (value.length === 1 ? ' item' : ' items');
      }
      break;
    }
    case 'object':  out.primary = Object.keys(value).length + ' fields'; break;
    default:        out.primary = String(value); if (unit) out.unit = unit;
  }

  if (!out.unit && unit && ['datetime', 'date', 'duration', 'bytes', 'percent'].indexOf(kind) === -1) {
    out.unit = unit;
  }
  return out;
}

function rawTitle(value) {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch (err) { return String(value); }
}

// size: 'hero' | 'metric' | 'fact' | 'inline'
function renderScalar(value, component, size) {
  var info = describeValue(value, component);
  var wrap = el('div', 'val val-' + size + ' kind-' + info.kind);
  var main = el('div', 'val-main');

  if (info.kind === 'color') {
    var swatch = el('span', 'val-swatch');
    swatch.style.background = String(value);
    main.appendChild(swatch);
  }

  if (info.href) {
    var a = el('a', 'val-link', info.primary);
    a.href = info.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    main.appendChild(a);
  } else {
    main.appendChild(el('span', 'val-text', info.primary));
  }
  if (info.unit) main.appendChild(el('span', 'val-unit', info.unit));
  wrap.appendChild(main);

  if (info.ratio !== null) {
    var meter = el('div', 'val-meter');
    var fill = el('div', 'val-meter-fill');
    fill.style.width = (info.ratio * 100).toFixed(1) + '%';
    meter.appendChild(fill);
    wrap.appendChild(meter);
  }

  // In a dense key/value sheet the date under every time is noise; the raw
  // value is still one hover away.
  var datelike = ['datetime', 'date', 'epoch', 'epochMs'].indexOf(info.kind) !== -1;
  if (info.secondary && !(size === 'inline' && datelike)) {
    wrap.appendChild(el('div', 'val-sub', info.secondary));
  }

  var title = rawTitle(value);
  if (title && title !== info.primary) wrap.title = title;
  return wrap;
}

// Short values sit in a dense fact strip; anything tall or wide earns a card.
function isCompactKind(kind) {
  return ['boolean', 'datetime', 'date', 'clock', 'duration', 'durationMs', 'percent',
          'bytes', 'coordinate', 'temperature', 'money', 'number', 'string', 'color',
          'email', 'epoch', 'epochMs', 'empty', 'null'].indexOf(kind) !== -1;
}

export { MONTHS, DAYS, RE_ISO_DATE, RE_ISO_DT, RE_CLOCK, RE_HEX, RE_EMAIL, RE_KEY_PERCENT, RE_KEY_SECONDS, RE_KEY_MILLIS, RE_KEY_BYTES, RE_KEY_LAT, RE_KEY_LNG, RE_KEY_YEAR, RE_KEY_NOISE, RE_KEY_ANGLE, RE_KEY_TIME, RE_KEY_TEMP, RE_KEY_MONEY, lastSegment, keyHint, offsetLabel, weekdayOf, formatIsoDateTime, formatIsoDate, formatDuration, formatNumber, inferKind, describeValue, rawTitle, renderScalar, isCompactKind };
