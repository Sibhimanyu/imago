import { canonPath, isPlainObject } from './util.js';

/* ── Schema fingerprinting ─────────────────────────────────────────────── */

function deriveSchema(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    if (!value.length) return { type: 'array', items: 'unknown' };
    var merged = null;
    var inspect = Math.min(3, value.length);
    for (var i = 0; i < inspect; i += 1) {
      var itemSchema = deriveSchema(value[i]);
      merged = merged === null ? itemSchema : mergeSchemas(merged, itemSchema);
    }
    return { type: 'array', items: merged };
  }
  if (isPlainObject(value)) {
    var keys = Object.keys(value).sort();
    var out = {};
    for (var k = 0; k < keys.length; k += 1) {
      out[keys[k]] = deriveSchema(value[keys[k]]);
    }
    return out;
  }
  return typeof value; // string | number | boolean
}

function mergeSchemas(a, b) {
  if (a === b) return a;
  if (typeof a === 'string' || typeof b === 'string') return a; // first wins
  if (isPlainObject(a) && isPlainObject(b)) {
    if (a.type === 'array' && b.type === 'array') {
      return {
        type: 'array',
        items: a.items === 'unknown' ? b.items
             : b.items === 'unknown' ? a.items
             : mergeSchemas(a.items, b.items)
      };
    }
    var keys = Object.keys(a).concat(Object.keys(b)).sort();
    var out = {};
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (Object.prototype.hasOwnProperty.call(out, key)) continue;
      if (Object.prototype.hasOwnProperty.call(a, key) &&
          Object.prototype.hasOwnProperty.call(b, key)) {
        out[key] = mergeSchemas(a[key], b[key]);
      } else {
        out[key] = Object.prototype.hasOwnProperty.call(a, key) ? a[key] : b[key];
      }
    }
    return out;
  }
  return a;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  var keys = Object.keys(value).sort();
  var parts = [];
  for (var i = 0; i < keys.length; i += 1) {
    parts.push(JSON.stringify(keys[i]) + ':' + stableStringify(value[keys[i]]));
  }
  return '{' + parts.join(',') + '}';
}

function hashString(input) {
  var hash = 5381;
  for (var i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return 'sch_' + (hash >>> 0).toString(36);
}

function fingerprint(data) {
  var schema = deriveSchema(data);
  return { schema: schema, hash: hashString(stableStringify(schema)) };
}

/* ── Snapshot diffing ──────────────────────────────────────────────────── */

// Distinct object identities, so an empty container never compares equal to
// a body that literally contains the string "[]" or "{}".
var EMPTY_ARRAY = { empty: 'array' };
var EMPTY_OBJECT = { empty: 'object' };

function flatten(value, prefix, out) {
  out = out || {};
  prefix = prefix || '';
  if (Array.isArray(value)) {
    if (!value.length) { out[prefix || '$'] = EMPTY_ARRAY; return out; }
    for (var i = 0; i < value.length; i += 1) {
      flatten(value[i], prefix + '[' + i + ']', out);
    }
    return out;
  }
  if (isPlainObject(value)) {
    var keys = Object.keys(value);
    if (!keys.length) { out[prefix || '$'] = EMPTY_OBJECT; return out; }
    for (var k = 0; k < keys.length; k += 1) {
      flatten(value[keys[k]], prefix ? prefix + '.' + keys[k] : keys[k], out);
    }
    return out;
  }
  out[prefix || '$'] = value;
  return out;
}

// flatten's sentinels exist only so an empty container never compares equal
// to the string "[]". They must never reach the Changes pane.
function flatValue(v) {
  if (v === EMPTY_ARRAY) return '[]';
  if (v === EMPTY_OBJECT) return '{}';
  return v;
}

function diffData(before, after) {
  var prev = flatten(before);
  var next = flatten(after);
  var result = {};
  var path;

  for (path in next) {
    if (!Object.prototype.hasOwnProperty.call(next, path)) continue;
    if (!Object.prototype.hasOwnProperty.call(prev, path)) {
      result[canonPath(path)] = { type: 'added', before: undefined, after: flatValue(next[path]) };
    } else if (prev[path] !== next[path]) {
      result[canonPath(path)] = { type: 'changed', before: flatValue(prev[path]), after: flatValue(next[path]) };
    }
  }
  for (path in prev) {
    if (!Object.prototype.hasOwnProperty.call(prev, path)) continue;
    if (!Object.prototype.hasOwnProperty.call(next, path)) {
      result[canonPath(path)] = { type: 'removed', before: flatValue(prev[path]), after: undefined };
    }
  }
  return result;
}

// A component is "changed" if its own path changed, or anything beneath it did.
function pathTouchedByDiff(path, diffMap) {
  if (!diffMap || !path) return false;
  var target = canonPath(path);
  if (!target) return false;
  if (Object.prototype.hasOwnProperty.call(diffMap, target)) return true;
  var prefix = target + '.';
  for (var key in diffMap) {
    if (Object.prototype.hasOwnProperty.call(diffMap, key) && key.indexOf(prefix) === 0) {
      return true;
    }
  }
  return false;
}

export { deriveSchema, mergeSchemas, stableStringify, hashString, fingerprint, EMPTY_ARRAY, EMPTY_OBJECT, flatten, flatValue, diffData, pathTouchedByDiff };
