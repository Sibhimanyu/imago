/* ── DOM helpers ───────────────────────────────────────────────────────── */

function qs(id) { return document.getElementById(id); }

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/* ── Path utilities ────────────────────────────────────────────────────────
   One parser for every path notation we might see. Gemini emits dot paths
   (`stats.0.base_stat`), the diff engine emits bracket paths
   (`stats[0].base_stat`); both normalise to the same segment list so
   change-highlighting actually matches.
   ---------------------------------------------------------------------- */

function parsePath(path) {
  if (path === null || path === undefined) return [];
  var str = String(path).trim();
  if (!str) return [];
  var segments = [];
  var buffer = '';
  for (var i = 0; i < str.length; i += 1) {
    var ch = str.charAt(i);
    if (ch === '.') {
      if (buffer) { segments.push(buffer); buffer = ''; }
    } else if (ch === '[') {
      if (buffer) { segments.push(buffer); buffer = ''; }
      var close = str.indexOf(']', i);
      if (close === -1) {
        // Unterminated bracket. Take the remainder as the last segment
        // rather than discarding it — `a[0` should still address a.0.
        var rest = str.slice(i + 1).replace(/^['"]|['"]$/g, '');
        if (rest) segments.push(rest);
        break;
      }
      var inner = str.slice(i + 1, close).replace(/^['"]|['"]$/g, '');
      if (inner) segments.push(inner);
      i = close;
    } else if (ch !== ']') {
      buffer += ch;
    }
  }
  if (buffer) segments.push(buffer);
  return segments;
}

function canonPath(path) { return parsePath(path).join('.'); }

function getByPath(data, path) {
  var segments = parsePath(path);
  var current = data;
  if (!segments.length) return current;
  for (var i = 0; i < segments.length; i += 1) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    // Paths come from the model and from the fetched body, so a segment of
    // `__proto__` / `constructor` / `toString` would otherwise hand the
    // renderer a JavaScript internal instead of data.
    if (!Object.prototype.hasOwnProperty.call(current, segments[i])) return undefined;
    current = current[segments[i]];
  }
  return current;
}

/* ── Formatting ────────────────────────────────────────────────────────── */

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!isFinite(value)) return String(value);
    return Math.abs(value) >= 1000 ? value.toLocaleString() : String(value);
  }
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.length + ' item' + (value.length === 1 ? '' : 's');
  if (isPlainObject(value)) return '{' + Object.keys(value).length + ' fields}';
  return String(value);
}

function isUrl(value) {
  return typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim());
}

function isImageUrl(value) {
  if (!isUrl(value)) return false;
  var withoutQuery = value.split('?')[0];
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(withoutQuery);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatClock(timestamp) {
  if (!timestamp) return '—';
  var d = new Date(timestamp);
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function formatRelative(timestamp) {
  if (!timestamp) return 'never';
  var seconds = Math.round((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return seconds + 's ago';
  var minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  var hours = Math.round(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  return Math.round(hours / 24) + 'd ago';
}

function byteLength(str) {
  if (typeof window.TextEncoder === 'function') {
    return new window.TextEncoder().encode(str).length;
  }
  return str.length;
}

export { qs, el, clear, parsePath, canonPath, getByPath, isPlainObject, formatValue, isUrl, isImageUrl, formatBytes, formatClock, formatRelative, byteLength };
