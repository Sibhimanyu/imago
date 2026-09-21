/* ============================================================================
   Imago — APIs become interfaces
   Browser-only API playground. No framework, no bundler, no backend.
   ========================================================================== */

(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────────────────── */

  var STORE = {
    requests: 'imago.savedRequests',
    specs: 'imago.schemaSpecs',
    snaps: 'imago.snapshots',
    prefs: 'imago.preferences'
  };

  var SESSION = {
    key: 'imago.geminiKey',
    model: 'imago.modelName'
  };

  var DEFAULT_MODEL = 'gemini-2.5-flash-lite';
  var GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

  var MAX_SNAPSHOTS = 10;
  var MAX_SNAPSHOT_BYTES = 1024 * 1024;  // refuse to store bodies fatter than this
  var LARGE_RESPONSE_BYTES = 500 * 1024; // warn + trim sample above this
  var SAMPLE_CHAR_LIMIT = 10000;
  var MAX_COMPONENTS = 12;
  var MAX_ROWS = 10;

  var DEMOS = [
    { name: 'Pokémon',    chip: 'Pokémon',    url: 'https://pokeapi.co/api/v2/pokemon/pikachu' },
    { name: 'Weather',    chip: 'Weather',    url: 'https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1' },
    { name: 'Dictionary', chip: 'Dictionary', url: 'https://api.dictionaryapi.dev/api/v2/entries/en/imago' },
    { name: 'Books',      chip: 'Books',      url: 'https://openlibrary.org/search.json?title=the+hobbit&limit=5' },
    { name: 'Sunset',     chip: 'Sunset',     url: 'https://api.sunrise-sunset.org/json?lat=13.0827&lng=80.2707&formatted=0' },
    { name: 'Charizard',  chip: 'Charizard',  url: 'https://pokeapi.co/api/v2/pokemon/charizard' }
  ];

  var COMPONENT_TYPES = ['title', 'text', 'metric', 'image', 'badges', 'list',
                         'table', 'statBars', 'chart', 'link', 'jsonBlock', 'section'];
  var LAYOUTS = ['profile', 'dashboard', 'table', 'list', 'article', 'timeline', 'raw'];

  var IMAGO_UI_SPEC_JSON_SCHEMA = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      subtitle: { type: 'string' },
      layout: { type: 'string', enum: LAYOUTS },
      components: {
        type: 'array',
        maxItems: MAX_COMPONENTS,
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: COMPONENT_TYPES },
            path: { type: 'string' },
            label: { type: 'string' },
            unit: { type: 'string' },
            alt: { type: 'string' },
            itemPath: { type: 'string' },
            labelPath: { type: 'string' },
            valuePath: { type: 'string' },
            max: { type: 'number' },
            columns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  path: { type: 'string' }
                },
                required: ['label', 'path']
              }
            }
          },
          required: ['type', 'label']
        }
      }
    },
    required: ['title', 'layout', 'components']
  };

  /* ── State ─────────────────────────────────────────────────────────────── */

  var state = {
    url: '',
    headers: {},
    headersText: '',
    data: null,
    dataUrl: '',
    rawText: '',
    byteSize: 0,
    status: 0,
    schema: null,
    schemaHash: '',
    spec: null,
    specSource: '',        // 'generated' | 'cache' | 'fallback'
    diff: null,
    changedCount: 0,
    lastCheckedAt: 0,
    activeRequestId: null,
    refreshIntervalMs: 0,
    nextRefreshAt: 0,
    tickHandle: null,
    inFlight: false,
    dirtySinceSend: true,
    tab: 'interface',
    view: 'landing',
    pane: 'playground',
    pendingGenerate: false,
    warnedNoKey: false
  };

  var dom = {};

  /* ── Storage helpers ───────────────────────────────────────────────────── */

  function readJSON(storeKey, fallback) {
    try {
      var raw = window.localStorage.getItem(storeKey);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(storeKey, value) {
    try {
      window.localStorage.setItem(storeKey, JSON.stringify(value));
      return true;
    } catch (err) {
      // Most likely QuotaExceededError. Shed snapshots first — they are the
      // bulkiest and the most disposable thing we keep.
      try {
        window.localStorage.removeItem(STORE.snaps);
        window.localStorage.setItem(storeKey, JSON.stringify(value));
        setStatusMessage('Storage was full — older snapshots were dropped.', 'warn');
        return true;
      } catch (err2) {
        setStatusMessage('Browser storage is full. Nothing was saved.', 'error');
        return false;
      }
    }
  }

  function getSavedRequests() {
    var list = readJSON(STORE.requests, []);
    return Array.isArray(list) ? list : [];
  }
  function setSavedRequests(list) { return writeJSON(STORE.requests, list); }

  function getSchemaSpecs() {
    var map = readJSON(STORE.specs, {});
    return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
  }
  function setSchemaSpecs(map) { return writeJSON(STORE.specs, map); }

  function getSnapshots() {
    var map = readJSON(STORE.snaps, {});
    return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
  }
  function setSnapshots(map) { return writeJSON(STORE.snaps, map); }

  function getPrefs() {
    var p = readJSON(STORE.prefs, {});
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
  }
  function setPrefs(p) { return writeJSON(STORE.prefs, p); }

  function savePrefs() {
    // Merge, never replace: `onboarded` lives here too and must survive.
    var prefs = getPrefs();
    prefs.activeRequestId = state.activeRequestId;
    prefs.refreshIntervalMs = state.refreshIntervalMs;
    prefs.activeTab = state.tab;
    prefs.activePane = state.pane;
    prefs.lastUrl = state.url;
    prefs.lastHeadersText = state.headersText;
    setPrefs(prefs);
  }

  function getSessionKey() {
    try { return window.sessionStorage.getItem(SESSION.key) || ''; } catch (e) { return ''; }
  }
  function setSessionKey(value) {
    try {
      if (value) window.sessionStorage.setItem(SESSION.key, value);
      else window.sessionStorage.removeItem(SESSION.key);
    } catch (e) { /* session storage unavailable — key simply stays in the input */ }
  }
  function getSessionModel() {
    try { return window.sessionStorage.getItem(SESSION.model) || ''; } catch (e) { return ''; }
  }
  function setSessionModel(value) {
    try {
      if (value) window.sessionStorage.setItem(SESSION.model, value);
      else window.sessionStorage.removeItem(SESSION.model);
    } catch (e) { /* ignore */ }
  }

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
        if (close === -1) break;
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

  function flatten(value, prefix, out) {
    out = out || {};
    prefix = prefix || '';
    if (Array.isArray(value)) {
      if (!value.length) { out[prefix || '$'] = '[]'; return out; }
      for (var i = 0; i < value.length; i += 1) {
        flatten(value[i], prefix + '[' + i + ']', out);
      }
      return out;
    }
    if (isPlainObject(value)) {
      var keys = Object.keys(value);
      if (!keys.length) { out[prefix || '$'] = '{}'; return out; }
      for (var k = 0; k < keys.length; k += 1) {
        flatten(value[keys[k]], prefix ? prefix + '.' + keys[k] : keys[k], out);
      }
      return out;
    }
    out[prefix || '$'] = value;
    return out;
  }

  function diffData(before, after) {
    var prev = flatten(before);
    var next = flatten(after);
    var result = {};
    var path;

    for (path in next) {
      if (!Object.prototype.hasOwnProperty.call(next, path)) continue;
      if (!Object.prototype.hasOwnProperty.call(prev, path)) {
        result[canonPath(path)] = { type: 'added', before: undefined, after: next[path] };
      } else if (prev[path] !== next[path]) {
        result[canonPath(path)] = { type: 'changed', before: prev[path], after: next[path] };
      }
    }
    for (path in prev) {
      if (!Object.prototype.hasOwnProperty.call(prev, path)) continue;
      if (!Object.prototype.hasOwnProperty.call(next, path)) {
        result[canonPath(path)] = { type: 'removed', before: prev[path], after: undefined };
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

  /* ── Gemini: UI spec generation ────────────────────────────────────────── */

  function compactSample(data) {
    // Trim big arrays before serialising so the prompt stays small.
    function trim(value, depth) {
      if (depth > 6) return null;
      if (Array.isArray(value)) {
        return value.slice(0, 3).map(function (item) { return trim(item, depth + 1); });
      }
      if (isPlainObject(value)) {
        var out = {};
        var keys = Object.keys(value);
        for (var i = 0; i < keys.length; i += 1) {
          out[keys[i]] = trim(value[keys[i]], depth + 1);
        }
        return out;
      }
      if (typeof value === 'string' && value.length > 160) return value.slice(0, 160) + '…';
      return value;
    }
    var text = JSON.stringify(trim(data, 0), null, 1) || '';
    if (text.length > SAMPLE_CHAR_LIMIT) text = text.slice(0, SAMPLE_CHAR_LIMIT) + '\n…truncated…';
    return text;
  }

  function buildImagoPrompt(options) {
    var schemaJson = JSON.stringify(options.schema, null, 1) || '';
    if (schemaJson.length > SAMPLE_CHAR_LIMIT) {
      schemaJson = schemaJson.slice(0, SAMPLE_CHAR_LIMIT) + '\n…truncated…';
    }
    return [
      'You are Imago, a JSON-to-interface planner.',
      '',
      'You receive a JSON response schema and a small sample.',
      'Return ONLY a JSON object matching the provided UI spec schema.',
      'Do not return HTML, CSS, JavaScript, Markdown, comments, or explanation.',
      '',
      'Choose components from the allowed component list only:',
      COMPONENT_TYPES.join(', ') + '.',
      'Prefer fields that would be meaningful to a human inspecting this API response.',
      'Use exact dot paths into the JSON. For arrays, use paths that point to the array',
      'and configure item fields when needed.',
      'Do not invent fields.',
      'If the response is an array, design around the array items.',
      'If an image URL exists, include it.',
      'If numeric stats exist, use statBars or metrics.',
      'If an array of numbers varies over time or position, use a chart.',
      'If URL strings exist, use link components.',
      'Keep the UI under ' + MAX_COMPONENTS + ' components.',
      '',
      'API URL:',
      options.url,
      '',
      'Schema:',
      schemaJson,
      '',
      'Sample:',
      options.sample
    ].join('\n');
  }

  function extractGeminiText(payload) {
    if (!payload || !payload.candidates || !payload.candidates.length) return '';
    var candidate = payload.candidates[0];
    if (!candidate.content || !candidate.content.parts) return '';
    var chunks = [];
    for (var i = 0; i < candidate.content.parts.length; i += 1) {
      var part = candidate.content.parts[i];
      if (part && typeof part.text === 'string') chunks.push(part.text);
    }
    return chunks.join('');
  }

  function parseModelJson(text) {
    if (!text) throw new Error('Gemini returned an empty response.');
    var trimmed = String(text).trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    try {
      return JSON.parse(trimmed);
    } catch (err) {
      // Last resort: grab the outermost brace pair.
      var start = trimmed.indexOf('{');
      var end = trimmed.lastIndexOf('}');
      if (start !== -1 && end > start) {
        return JSON.parse(trimmed.slice(start, end + 1));
      }
      throw new Error('Gemini did not return valid JSON.');
    }
  }

  function geminiRequest(model, apiKey, body) {
    var endpoint = GEMINI_BASE + encodeURIComponent(model) + ':generateContent';
    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(body)
    }).then(function (response) {
      return response.text().then(function (text) {
        var payload = null;
        try { payload = JSON.parse(text); } catch (e) { /* non-JSON error body */ }
        if (!response.ok) {
          var message = payload && payload.error && payload.error.message
            ? payload.error.message
            : 'HTTP ' + response.status;
          var error = new Error(message);
          error.status = response.status;
          throw error;
        }
        return payload;
      });
    });
  }

  function generateSpec(options) {
    var prompt = buildImagoPrompt(options);

    // Primary: Gemini structured output. responseMimeType + responseSchema are
    // the parameter names the generateContent REST API actually accepts.
    var structuredBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: IMAGO_UI_SPEC_JSON_SCHEMA
      }
    };

    return geminiRequest(options.model, options.apiKey, structuredBody)
      .then(function (payload) {
        return parseModelJson(extractGeminiText(payload));
      })
      .catch(function (err) {
        // Auth and rate-limit failures will not be fixed by retrying, so
        // surface them rather than burning a second call.
        if (err && (err.status === 401 || err.status === 403 || err.status === 429)) throw err;
        // Otherwise the model family may reject responseSchema — retry in
        // plain JSON mode with the contract inlined in the prompt.
        var plainBody = {
          contents: [{
            parts: [{
              text: prompt +
                '\n\nReturn only valid JSON matching this schema:\n' +
                JSON.stringify(IMAGO_UI_SPEC_JSON_SCHEMA)
            }]
          }],
          generationConfig: { responseMimeType: 'application/json' }
        };
        return geminiRequest(options.model, options.apiKey, plainBody)
          .then(function (payload) {
            return parseModelJson(extractGeminiText(payload));
          });
      });
  }

  /* ── Spec validation / normalisation ───────────────────────────────────── */

  function normalizeSpec(spec) {
    if (!isPlainObject(spec)) return null;

    var out = {
      title: typeof spec.title === 'string' && spec.title.trim() ? spec.title.trim() : 'Response',
      subtitle: typeof spec.subtitle === 'string' ? spec.subtitle.trim() : '',
      layout: LAYOUTS.indexOf(spec.layout) !== -1 ? spec.layout : 'dashboard',
      components: []
    };

    var raw = Array.isArray(spec.components) ? spec.components : [];
    for (var i = 0; i < raw.length && out.components.length < MAX_COMPONENTS; i += 1) {
      var candidate = raw[i];
      if (!isPlainObject(candidate)) continue;
      if (COMPONENT_TYPES.indexOf(candidate.type) === -1) continue;

      var component = {
        type: candidate.type,
        path: typeof candidate.path === 'string' ? candidate.path : '',
        label: typeof candidate.label === 'string' ? candidate.label : ''
      };
      if (typeof candidate.unit === 'string') component.unit = candidate.unit;
      if (typeof candidate.alt === 'string') component.alt = candidate.alt;
      if (typeof candidate.itemPath === 'string') component.itemPath = candidate.itemPath;
      if (typeof candidate.labelPath === 'string') component.labelPath = candidate.labelPath;
      if (typeof candidate.valuePath === 'string') component.valuePath = candidate.valuePath;
      if (typeof candidate.max === 'number' && isFinite(candidate.max) && candidate.max > 0) {
        component.max = candidate.max;
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
      out.components.push(component);
    }

    return out.components.length ? out : null;
  }

  /* ── Fallback spec (no key, Gemini failure, or invalid spec) ───────────── */

  function buildFallbackSpec(data, url) {
    var root = data;
    var prefix = '';
    if (Array.isArray(data)) {
      if (isPlainObject(data[0])) { root = data[0]; prefix = '[0].'; }
    }

    var components = [];
    var title = 'Response';

    if (isPlainObject(root)) {
      var keys = Object.keys(root);
      var titleKey = null;
      var titleCandidates = ['name', 'title', 'id'];
      for (var t = 0; t < titleCandidates.length; t += 1) {
        if (typeof root[titleCandidates[t]] === 'string' || typeof root[titleCandidates[t]] === 'number') {
          titleKey = titleCandidates[t];
          break;
        }
      }
      if (!titleKey) {
        for (var s = 0; s < keys.length; s += 1) {
          if (typeof root[keys[s]] === 'string') { titleKey = keys[s]; break; }
        }
      }
      if (titleKey) title = String(root[titleKey]);

      // First image anywhere shallow in the object.
      var imagePath = findFirstImagePath(root, prefix, 0);
      if (imagePath) {
        components.push({ type: 'image', path: imagePath, label: 'Image', alt: title });
      }

      var added = 0;
      for (var i = 0; i < keys.length && added < 6; i += 1) {
        var key = keys[i];
        if (key === titleKey) continue;
        var value = root[key];
        if (value === null || typeof value === 'object') continue;
        components.push({
          type: typeof value === 'number' ? 'metric' : (isUrl(value) ? 'link' : 'text'),
          path: prefix + key,
          label: humanize(key)
        });
        added += 1;
      }
    }

    if (!components.length) {
      components.push({ type: 'jsonBlock', path: '', label: 'Response' });
    }

    return {
      title: title,
      subtitle: url || '',
      layout: 'dashboard',
      components: components.slice(0, MAX_COMPONENTS)
    };
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

  function humanize(key) {
    // Sentence case, so snake_case and camelCase labels read the same way.
    // All-caps words are left alone so acronyms survive (URL, ID, HP).
    var words = String(key)
      .replace(/[_\-.]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .split(/\s+/)
      .filter(Boolean)
      .map(function (word) {
        return /^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase();
      });
    if (!words.length) return '';
    words[0] = words[0].replace(/^./, function (c) { return c.toUpperCase(); });
    return words.join(' ');
  }

  /* ── Renderer ──────────────────────────────────────────────────────────────
     The renderer owns every pixel. The model only supplies a plan; nothing it
     returns is ever interpreted as markup. All text goes through textContent.
     ---------------------------------------------------------------------- */

  // How much of the 12-column grid each component type earns.
  var COMPONENT_SPAN = {
    table: 12, jsonBlock: 12, chart: 12,
    list: 6, statBars: 6,
    image: 4, metric: 4, text: 4, title: 4, badges: 4, link: 4
  };

  // Stat bars read better as a ranked spectrum than as one flat accent colour.
  var STAT_COLORS = ['#ef6b6b', '#f5a623', '#f5ce47', '#5b9bd5', '#6aa9e0', '#4fa96a'];

  function renderSpec(spec, data, diffMap) {
    var host = dom.interfaceOut;
    clear(host);

    var head = el('div', 'spec-head');
    head.appendChild(el('h3', 'spec-title', spec.title));
    if (spec.subtitle) head.appendChild(el('p', 'spec-subtitle', spec.subtitle));
    head.appendChild(el('span', 'spec-layout', 'layout: ' + spec.layout));
    host.appendChild(head);

    var grid = el('div', 'spec-grid layout-' + spec.layout);
    var rendered = 0;

    for (var i = 0; i < spec.components.length; i += 1) {
      var node = renderComponent(spec.components[i], data, diffMap);
      if (node) { grid.appendChild(node); rendered += 1; }
    }

    if (!rendered) {
      grid.appendChild(renderComponent(
        { type: 'jsonBlock', path: '', label: 'Response' }, data, diffMap
      ));
    }

    host.appendChild(grid);
  }

  function renderComponent(component, data, diffMap) {
    var value = component.path ? getByPath(data, component.path) : data;

    if (component.type === 'section') {
      return el('h4', 'comp-section-heading', component.label || 'Section');
    }

    var span = COMPONENT_SPAN[component.type] || 4;
    var box = el('div', 'comp' + (span !== 4 ? ' span-' + span : ''));

    if (component.label) box.appendChild(el('span', 'comp-label', component.label));

    if (pathTouchedByDiff(component.path, diffMap)) {
      box.className += ' is-changed';
      box.appendChild(el('span', 'comp-flag', 'CHANGED'));
    }

    var missing = (value === undefined) ||
                  (value === null && component.type !== 'text' && component.type !== 'title');

    if (missing && component.type !== 'jsonBlock') {
      box.appendChild(el('p', 'comp-missing', 'No data at "' + component.path + '"'));
      return box;
    }

    var body;
    switch (component.type) {
      case 'title':    body = renderTitle(value); break;
      case 'text':     body = renderText(value); break;
      case 'metric':   body = renderMetric(value, component); break;
      case 'image':    body = renderImage(value, component); break;
      case 'badges':   body = renderBadges(value, component); break;
      case 'list':     body = renderList(value, component); break;
      case 'table':    body = renderTable(value, component); break;
      case 'statBars': body = renderStatBars(value, component); break;
      case 'chart':    body = renderChart(value, component); break;
      case 'link':     body = renderLink(value, component); break;
      case 'jsonBlock':body = renderJsonBlock(value); break;
      default:         return null;
    }

    if (!body) {
      box.appendChild(el('p', 'comp-missing', 'Nothing to show here.'));
      return box;
    }
    box.appendChild(body);
    return box;
  }

  function renderTitle(value) {
    return el('div', 'comp-title-value', formatValue(value));
  }

  function renderText(value) {
    if (isPlainObject(value) || Array.isArray(value)) return renderJsonBlock(value);
    return el('div', 'comp-text-value', formatValue(value));
  }

  function renderMetric(value, component) {
    var wrap = el('div', 'comp-metric');
    var line = el('div', 'comp-metric-value', formatValue(value));
    if (component.unit) {
      line.appendChild(el('span', 'comp-metric-unit', component.unit));
    }
    wrap.appendChild(line);
    return wrap;
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
    var wrap = el('div', 'badge-wrap');
    var shown = items.slice(0, 20);
    for (var i = 0; i < shown.length; i += 1) {
      var entry = shown[i];
      var text = component.itemPath ? getByPath(entry, component.itemPath) : entry;
      if (text === undefined || text === null) text = entry;
      wrap.appendChild(el('span', 'badge', formatValue(text)));
    }
    return wrap;
  }

  function renderList(value, component) {
    var items = Array.isArray(value) ? value : (isPlainObject(value) ? Object.keys(value).map(function (k) {
      return k + ': ' + formatValue(value[k]);
    }) : [value]);
    if (!items.length) return null;

    var wrap = document.createElement('div');
    var ul = el('ul', 'comp-list');
    var shown = items.slice(0, MAX_ROWS);
    for (var i = 0; i < shown.length; i += 1) {
      var entry = shown[i];
      var text = component.itemPath ? getByPath(entry, component.itemPath) : entry;
      if (text === undefined || text === null) text = entry;
      ul.appendChild(el('li', null, formatValue(text)));
    }
    wrap.appendChild(ul);
    if (items.length > shown.length) {
      wrap.appendChild(el('p', 'more-note', '+ ' + (items.length - shown.length) + ' more of ' + items.length));
    }
    return wrap;
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
      columns = Object.keys(sample).filter(function (key) {
        return sample[key] === null || typeof sample[key] !== 'object';
      }).slice(0, 6).map(function (key) {
        return { label: humanize(key), path: key };
      });
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
        var td = el('td', null, cellValue === undefined ? '—' : formatValue(cellValue));
        td.title = cellValue === undefined ? '' : formatValue(cellValue);
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
      fill.style.background = STAT_COLORS[i % STAT_COLORS.length];
      track.appendChild(fill);
      bar.appendChild(track);

      bar.appendChild(el('span', 'statbar-val', formatValue(raw)));
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

    var W = 600, H = 130, padL = 34, padR = 8, padT = 10, padB = 20;
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
      '<stop offset="0%" stop-color="#4fa96a" stop-opacity="0.18"/>' +
      '<stop offset="100%" stop-color="#4fa96a" stop-opacity="0"/></linearGradient>';
    svg.appendChild(defs);

    // three horizontal guides, labelled with their value
    for (i = 0; i < 3; i += 1) {
      var frac = i / 2;
      var val = max - frac * (max - min);
      var y = padT + frac * innerH;
      var line = document.createElementNS(svgNS, 'line');
      line.setAttribute('class', 'chart-grid');
      line.setAttribute('x1', padL); line.setAttribute('x2', W - padR);
      line.setAttribute('y1', y.toFixed(1)); line.setAttribute('y2', y.toFixed(1));
      svg.appendChild(line);

      var text = document.createElementNS(svgNS, 'text');
      text.setAttribute('class', 'chart-axis');
      text.setAttribute('x', padL - 7);
      text.setAttribute('y', (y + 3).toFixed(1));
      text.setAttribute('text-anchor', 'end');
      text.textContent = Math.round(val * 10) / 10;
      svg.appendChild(text);
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
    poly.setAttribute('points', points.join(' '));
    svg.appendChild(poly);

    // Dots only when sparse enough to read.
    if (numbers.length <= 24) {
      for (i = 0; i < numbers.length; i += 1) {
        var dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('class', 'chart-dot');
        dot.setAttribute('cx', px(i).toFixed(1));
        dot.setAttribute('cy', py(numbers[i]).toFixed(1));
        dot.setAttribute('r', '2.5');
        svg.appendChild(dot);
      }
    }

    var wrap = el('div', 'chart-wrap');
    wrap.appendChild(svg);
    wrap.appendChild(el('p', 'more-note',
      numbers.length + ' points · low ' + (Math.round(min * 10) / 10) + ' · high ' + (Math.round(max * 10) / 10)));
    return wrap;
  }

  function renderLink(value, component) {
    var href = formatValue(value);
    if (!isUrl(href)) return el('div', 'comp-text-value', href);
    var wrap = el('div', 'comp-link');
    var a = el('a', null, href);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    wrap.appendChild(a);
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


  /* ── Toast ─────────────────────────────────────────────────────────────── */

  var toastTimer = null;

  function toast(message, kind) {
    if (!dom.toast || !message) return;
    dom.toast.textContent = message;
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
    }, kind === 'error' ? 6000 : 3400);
  }

  /* ── View routing ──────────────────────────────────────────────────────── */

  function showView(name) {
    state.view = name;
    dom.landingView.hidden = name !== 'landing';
    dom.setupView.hidden = name !== 'setup';
    dom.appView.hidden = name !== 'app';
    window.scrollTo(0, 0);
  }

  function setAppPane(pane) {
    state.pane = pane;
    dom.panePlayground.hidden = pane !== 'playground';
    dom.paneSaved.hidden = pane !== 'saved';
    dom.paneSettings.hidden = pane !== 'settings';

    var buttons = dom.appNav.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i += 1) {
      var active = buttons[i].getAttribute('data-view') === pane;
      buttons[i].className = active ? 'is-active' : '';
      buttons[i].setAttribute('aria-selected', active ? 'true' : 'false');
    }
    if (pane === 'saved') renderSavedList();
    if (pane === 'settings') renderStorageSummary();
    savePrefs();
  }

  /* ── Meta row / key pill ───────────────────────────────────────────────── */

  function setKeyStatus() {
    var hasKey = !!getSessionKey();
    dom.keyStatus.textContent = hasKey ? 'Key ready' : 'No key';
    dom.keyStatus.setAttribute('data-state', hasKey ? 'ready' : 'missing');
  }

  function updateMeta() {
    if (!state.data) { dom.runMeta.hidden = true; return; }
    dom.runMeta.hidden = false;

    dom.stLastChecked.textContent = state.lastCheckedAt ? formatRelative(state.lastCheckedAt) : '—';
    dom.stSize.textContent = state.byteSize ? formatBytes(state.byteSize) : '—';
    dom.stCache.textContent = state.schemaHash || '—';

    if (state.diff) {
      dom.stChanged.textContent = String(state.changedCount);
      dom.changedChip.className = state.changedCount > 0 ? 'meta-chip is-hot' : 'meta-chip';
    } else {
      dom.stChanged.textContent = '—';
      dom.changedChip.className = 'meta-chip';
    }

    if (state.refreshIntervalMs && state.nextRefreshAt) {
      var remaining = Math.max(0, Math.ceil((state.nextRefreshAt - Date.now()) / 1000));
      dom.nextChip.hidden = false;
      dom.stNextRefresh.textContent = remaining + 's';
      dom.liveCount.textContent = '· ' + remaining + 's';
    } else {
      dom.nextChip.hidden = true;
      dom.liveCount.textContent = '';
    }
  }

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
    if (!state.data) { dom.rawOut.textContent = ''; return; }
    var text;
    try {
      text = JSON.stringify(state.data, null, 2);
    } catch (err) {
      text = state.rawText;
    }

    var lines = text.split('\n');
    var truncated = lines.length > MAX_CODE_LINES;
    if (truncated) lines = lines.slice(0, MAX_CODE_LINES);

    var out = [];
    for (var i = 0; i < lines.length; i += 1) {
      out.push('<span class="ln">' + (i + 1) + '</span>' + highlightJson(lines[i]));
    }
    if (truncated) {
      out.push('<span class="ln"></span><span class="tok-null">… ' +
               (text.split('\n').length - MAX_CODE_LINES) + ' more lines</span>');
    }
    dom.rawOut.innerHTML = out.join('\n');
  }

  function renderSchemaPane() {
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

  function showInterfaceEmpty() {
    dom.interfaceHead.hidden = true;
    clear(dom.interfaceOut);

    var box = el('div', 'empty');
    var icon = el('div', 'empty-icon');
    icon.appendChild(svgIcon(['M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z', 'M4 10h16M9 10v9'], 22));
    box.appendChild(icon);
    box.appendChild(el('p', 'empty-title', 'Explore any API'));
    box.appendChild(el('p', 'empty-body',
      'Enter an API endpoint and Imago will turn the response into a readable interface.'));
    box.appendChild(el('p', 'chip-row-label', 'Try an example'));

    var chips = el('div', 'chip-row');
    for (var i = 0; i < DEMOS.length; i += 1) {
      (function (demo) {
        var chip = el('button', 'chip', demo.chip);
        chip.type = 'button';
        chip.setAttribute('data-url', demo.url);
        chip.addEventListener('click', function () {
          dom.urlInput.value = demo.url;
          markDirty();
          performRequest(false);
        });
        chips.appendChild(chip);
      })(DEMOS[i]);
    }
    box.appendChild(chips);
    dom.interfaceOut.appendChild(box);
  }

  function showInterfaceLoading(message) {
    dom.interfaceHead.hidden = true;
    clear(dom.interfaceOut);
    var box = el('div', 'loading');
    box.appendChild(el('div', 'spinner'));
    box.appendChild(el('span', null, message));
    dom.interfaceOut.appendChild(box);
  }

  function showGeneratePrompt() {
    dom.interfaceHead.hidden = true;
    clear(dom.interfaceOut);

    var box = el('div', 'gen-prompt');
    var spark = el('div', 'gen-spark');
    spark.appendChild(svgIcon(['M12 4.5l1.7 4.3 4.3 1.7-4.3 1.7L12 16.5l-1.7-4.3L6 10.5l4.3-1.7L12 4.5Z', 'M18 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z'], 22));
    box.appendChild(spark);
    box.appendChild(el('p', 'empty-title', 'Ready to generate'));
    box.appendChild(el('p', 'empty-body',
      'Imago will read this response and design an interface that fits it. This shape is new, so it takes one Gemini call — after that it is remembered.'));

    var btn = el('button', 'btn btn-dark btn-lg', 'Generate interface');
    btn.type = 'button';
    btn.id = 'generateBtn';
    btn.style.margin = '22px auto 0';
    btn.addEventListener('click', function () {
      btn.disabled = true;
      generateInterfaceNow();
    });
    box.appendChild(btn);
    dom.interfaceOut.appendChild(box);
  }

  function showAlert(title, body) {
    var box = el('div', 'alert');
    var ico = el('span', 'alert-ico');
    ico.appendChild(svgIcon(['M12 8v5', 'M12 16.2v.1', 'M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z'], 17));
    box.appendChild(ico);
    var text = el('div');
    text.appendChild(el('p', 'alert-title', title));
    text.appendChild(el('p', 'alert-body', body));
    box.appendChild(text);
    dom.interfaceOut.insertBefore(box, dom.interfaceOut.firstChild);
  }

  function applySpec(spec, source) {
    if (!spec) spec = normalizeSpec(buildFallbackSpec(state.data, state.url));
    state.spec = spec;
    state.specSource = source;
    state.pendingGenerate = false;

    dom.interfaceHead.hidden = true;   // the title lives in the lead row instead
    dom.cacheBadge.hidden = false;
    dom.cacheBadge.setAttribute('data-kind', source);
    dom.cacheBadge.textContent = source === 'generated' ? 'Generated'
      : source === 'cache' ? 'From schema cache' : 'Fallback';

    clear(dom.interfaceOut);

    var lead = el('div', 'spec-lead');
    var leadText = el('div');
    leadText.appendChild(el('h3', 'spec-title', spec.title));
    if (spec.subtitle) leadText.appendChild(el('p', 'spec-sub', spec.subtitle));
    lead.appendChild(leadText);
    lead.appendChild(dom.cacheBadge);   // moves the badge node into the lead
    dom.interfaceOut.appendChild(lead);

    var grid = el('div', 'spec-grid');
    var rendered = 0;
    for (var i = 0; i < spec.components.length; i += 1) {
      var node = renderComponent(spec.components[i], state.data, state.diff);
      if (node) { grid.appendChild(node); rendered += 1; }
    }
    if (!rendered) {
      grid.appendChild(renderComponent({ type: 'jsonBlock', path: '', label: 'Response' }, state.data, state.diff));
    }
    dom.interfaceOut.appendChild(grid);
    updateMeta();
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
    }
    var panes = document.querySelectorAll('.tab-pane');
    for (i = 0; i < panes.length; i += 1) {
      panes[i].className = panes[i].getAttribute('data-pane') === tab ? 'tab-pane is-active' : 'tab-pane';
    }
    savePrefs();
  }

  /* ── Saved requests ────────────────────────────────────────────────────── */

  var AVATAR_COLORS = [
    ['#fdf3cd', '#8a6d12'], ['#e8f0fa', '#3f6fb5'], ['#e4f4e8', '#2f7a48'],
    ['#f4eaf8', '#7b4b9c'], ['#fbeaea', '#b5443f'], ['#eceaf6', '#54509c']
  ];

  function currentRequestKey() {
    return state.url ? hashString(state.url) : '';
  }

  function deriveName(url) {
    try {
      var parsed = new URL(url);
      var segments = parsed.pathname.split('/').filter(Boolean);
      var tail = segments.length ? segments[segments.length - 1] : parsed.hostname;
      tail = decodeURIComponent(tail).replace(/\.(json|xml)$/i, '');
      return (tail || parsed.hostname).slice(0, 44);
    } catch (err) {
      return url.slice(0, 44);
    }
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
  }

  function renderSavedList() {
    var list = getSavedRequests();
    clear(dom.savedList);
    dom.savedEmpty.hidden = list.length > 0;

    list.sort(function (a, b) {
      return new Date(b.lastUsedAt || b.createdAt) - new Date(a.lastUsedAt || a.createdAt);
    });

    for (var i = 0; i < list.length; i += 1) {
      (function (item) {
        var li = el('li', 'saved-item');

        var palette = AVATAR_COLORS[Math.abs(hashCode(hostOf(item.url))) % AVATAR_COLORS.length];
        var avatar = el('span', 'saved-avatar', (item.name || '?').charAt(0).toUpperCase());
        avatar.style.background = palette[0];
        avatar.style.color = palette[1];
        li.appendChild(avatar);

        var main = el('div', 'saved-main');
        main.appendChild(el('span', 'saved-name', item.name));
        main.appendChild(el('span', 'saved-url', item.url));
        li.appendChild(main);

        var when = el('div', 'saved-when', 'Last used');
        when.appendChild(el('b', null, formatRelative(item.lastUsedAt || item.createdAt)));
        li.appendChild(when);

        var actions = el('div', 'saved-actions');

        var run = el('button', 'icon-btn');
        run.type = 'button';
        run.title = 'Run this request';
        run.setAttribute('aria-label', 'Run ' + item.name);
        run.appendChild(svgIcon(['M8 5.5v13l10-6.5-10-6.5Z'], 15));
        run.addEventListener('click', function () { loadSavedRequest(item.id); });
        actions.appendChild(run);

        var del = el('button', 'icon-btn danger');
        del.type = 'button';
        del.title = 'Delete';
        del.setAttribute('aria-label', 'Delete ' + item.name);
        del.appendChild(svgIcon(['M4 6.5h16', 'M9.5 6.5V4.8h5v1.7', 'M6.5 6.5 7.4 20h9.2l.9-13.5'], 15));
        del.addEventListener('click', function () { deleteSavedRequest(item.id); });
        actions.appendChild(del);

        li.appendChild(actions);
        dom.savedList.appendChild(li);
      })(list[i]);
    }
  }

  function hashCode(text) {
    var hash = 0;
    for (var i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
    return hash;
  }

  function saveCurrentRequest() {
    var url = dom.urlInput.value.trim();
    if (!url) { toast('Enter a URL before saving.', 'error'); return; }

    var list = getSavedRequests();
    var headers = parseHeaders(dom.headersInput.value);
    var now = new Date().toISOString();

    var existing = null;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].url === url) { existing = list[i]; break; }
    }

    if (existing) {
      existing.headers = headers;
      existing.lastUsedAt = now;
      state.activeRequestId = existing.id;
      toast('Already saved — updated.', 'ok');
    } else {
      var record = {
        id: 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        name: deriveName(url),
        url: url,
        headers: headers,
        createdAt: now,
        lastUsedAt: now
      };
      list.push(record);
      state.activeRequestId = record.id;
      toast('Saved "' + record.name + '"', 'ok');
    }

    setSavedRequests(list);
    renderSavedList();
    savePrefs();
  }

  function loadSavedRequest(id) {
    var list = getSavedRequests();
    var found = null;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) { found = list[i]; break; }
    }
    if (!found) return;

    state.activeRequestId = found.id;
    dom.urlInput.value = found.url;
    dom.headersInput.value = headersToText(found.headers);

    found.lastUsedAt = new Date().toISOString();
    setSavedRequests(list);

    setAppPane('playground');
    markDirty();
    performRequest(false);
  }

  function deleteSavedRequest(id) {
    var list = getSavedRequests().filter(function (item) { return item.id !== id; });
    setSavedRequests(list);
    if (state.activeRequestId === id) state.activeRequestId = null;
    renderSavedList();
    savePrefs();
    toast('Request deleted.');
  }

  function touchSavedRequest(url) {
    var list = getSavedRequests();
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].url === url) {
        list[i].lastUsedAt = new Date().toISOString();
        state.activeRequestId = list[i].id;
        setSavedRequests(list);
        return;
      }
    }
  }

  function renderStorageSummary() {
    var requests = getSavedRequests().length;
    var specs = Object.keys(getSchemaSpecs()).length;
    var snapMap = getSnapshots();
    var snaps = 0;
    for (var key in snapMap) {
      if (Object.prototype.hasOwnProperty.call(snapMap, key)) snaps += snapMap[key].length;
    }
    var bytes = 0;
    try {
      bytes = byteLength(JSON.stringify(snapMap) +
                         window.localStorage.getItem(STORE.specs) +
                         window.localStorage.getItem(STORE.requests));
    } catch (e) { bytes = 0; }

    dom.storageSummary.textContent =
      requests + ' saved request' + (requests === 1 ? '' : 's') + ' · ' +
      specs + ' cached interface' + (specs === 1 ? '' : 's') + ' · ' +
      snaps + ' snapshot' + (snaps === 1 ? '' : 's') + ' · about ' + formatBytes(bytes);
  }

  /* ── Headers ───────────────────────────────────────────────────────────── */

  function parseHeaders(text) {
    var headers = {};
    if (!text) return headers;
    var lines = String(text).split('\n');
    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i].trim();
      if (!line) continue;
      var idx = line.indexOf(':');
      if (idx <= 0) continue;
      var name = line.slice(0, idx).trim();
      var value = line.slice(idx + 1).trim();
      if (name && value) headers[name] = value;
    }
    return headers;
  }

  function headersToText(headers) {
    if (!headers) return '';
    return Object.keys(headers).map(function (name) {
      return name + ': ' + headers[name];
    }).join('\n');
  }

  /* ── Snapshots ─────────────────────────────────────────────────────────── */

  function getSnapshotsFor(key) {
    if (!key) return [];
    var all = getSnapshots();
    return Array.isArray(all[key]) ? all[key] : [];
  }

  function stripBody(snapshot) {
    if (!snapshot || snapshot.data === null || snapshot.data === undefined) return snapshot;
    return {
      id: snapshot.id, url: snapshot.url, schemaHash: snapshot.schemaHash,
      fetchedAt: snapshot.fetchedAt, status: snapshot.status, data: null, omitted: true
    };
  }

  function pushSnapshot(key, snapshot) {
    if (!key) return;
    var all = getSnapshots();
    var list = Array.isArray(all[key]) ? all[key] : [];

    var serialized = '';
    try { serialized = JSON.stringify(snapshot.data); } catch (e) { serialized = ''; }
    if (!serialized || byteLength(serialized) > MAX_SNAPSHOT_BYTES) snapshot = stripBody(snapshot);

    // Only the newest snapshot keeps its body — that is all diffing and reload
    // rehydration need — so a 300 KB endpoint costs one body, not ten.
    for (var i = 0; i < list.length; i += 1) list[i] = stripBody(list[i]);

    list.push(snapshot);
    while (list.length > MAX_SNAPSHOTS) list.shift();
    all[key] = list;
    setSnapshots(all);
  }

  function latestSnapshotWithData(key) {
    var list = getSnapshotsFor(key);
    for (var i = list.length - 1; i >= 0; i -= 1) {
      if (list[i] && !list[i].omitted && list[i].data !== null && list[i].data !== undefined) return list[i];
    }
    return null;
  }

  /* ── Request flow ──────────────────────────────────────────────────────── */

  function markDirty() {
    state.dirtySinceSend = true;
    if (state.refreshIntervalMs) stopTimer();
  }

  function wrapError(title, detail) {
    var error = new Error(title);
    error.title = title;
    error.detail = detail;
    return error;
  }

  function performRequest(isAuto) {
    if (state.inFlight) return;

    var url = dom.urlInput.value.trim();
    if (!url) {
      toast('Enter an API URL first.', 'error');
      return;
    }
    var parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      toast('That URL is not valid.', 'error');
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      toast('Only http and https URLs are supported.', 'error');
      return;
    }

    state.inFlight = true;
    state.url = url;
    state.headersText = dom.headersInput.value;
    state.headers = parseHeaders(state.headersText);
    dom.sendBtn.disabled = true;
    dom.tabBar.hidden = false;

    if (!isAuto) showInterfaceLoading('Fetching ' + parsed.hostname + '…');

    var previousData = state.data;
    var previousUrl = state.dataUrl;
    var requestKey = hashString(url);
    var startedAt = Date.now();

    fetch(url, { method: 'GET', headers: state.headers, mode: 'cors' })
      .then(function (response) {
        return response.text().then(function (text) { return { response: response, text: text }; });
      })
      .then(function (result) {
        var response = result.response;
        var text = result.text;

        if (!response.ok) {
          throw wrapError('HTTP ' + response.status + ' ' + (response.statusText || ''),
            'The endpoint rejected the request. Response began: ' + text.slice(0, 300));
        }

        var data;
        try {
          data = JSON.parse(text);
        } catch (err) {
          throw wrapError('Response is not JSON',
            'Imago renders JSON APIs. The endpoint returned ' + formatBytes(byteLength(text)) +
            ' starting with: ' + text.slice(0, 120));
        }

        state.status = response.status;
        state.rawText = text;
        state.byteSize = byteLength(text);
        state.data = data;
        state.dataUrl = url;
        state.lastCheckedAt = Date.now();

        var print = fingerprint(data);
        state.schema = print.schema;
        state.schemaHash = print.hash;

        var baseline = previousUrl === url ? previousData : null;
        if (baseline === null || baseline === undefined) {
          var stored = latestSnapshotWithData(requestKey);
          baseline = stored ? stored.data : null;
        }
        if (baseline === null || baseline === undefined) {
          state.diff = null;
          state.changedCount = 0;
        } else {
          state.diff = diffData(baseline, data);
          state.changedCount = Object.keys(state.diff).length;
        }

        pushSnapshot(requestKey, {
          id: 'snap_' + startedAt.toString(36),
          url: url,
          schemaHash: print.hash,
          fetchedAt: new Date(state.lastCheckedAt).toISOString(),
          status: response.status,
          data: data
        });

        touchSavedRequest(url);
        renderRawPane();
        renderSchemaPane();
        renderChangesPane();
        updateMeta();

        if (state.byteSize > LARGE_RESPONSE_BYTES) {
          toast('Large response (' + formatBytes(state.byteSize) + ') — only a compact sample goes to Gemini.');
        }

        return resolveSpec(url, print, false);
      })
      .then(function () {
        state.dirtySinceSend = false;
        if (state.refreshIntervalMs) startTimer();
      })
      .catch(function (err) { handleRequestFailure(err, isAuto); })
      .then(function () {
        state.inFlight = false;
        dom.sendBtn.disabled = false;
        updateMeta();
        savePrefs();
      });
  }

  function handleRequestFailure(err, isAuto) {
    var title = err && err.title ? err.title : 'Request failed';
    var detail = err && err.detail ? err.detail : (err && err.message ? err.message : String(err));

    if (err && !err.title && err.message && /failed to fetch|networkerror|load failed/i.test(err.message)) {
      title = 'Network or CORS failure';
      detail = 'The browser could not reach this endpoint. It may be offline, or it may not send ' +
               'CORS headers that allow browser access. Try one of the examples to confirm Imago itself is working.';
    }

    toast(title, 'error');

    if (state.data && state.spec) {
      // The loading state cleared the pane — put the last good interface back
      // so a failure never costs you the view you were reading.
      applySpec(state.spec, state.specSource);
      showAlert(isAuto ? 'Auto-refresh failed' : title, detail);
    } else {
      dom.interfaceHead.hidden = true;
      clear(dom.interfaceOut);
      var box = el('div', 'empty');
      box.appendChild(el('p', 'empty-title', title));
      box.appendChild(el('p', 'empty-body', detail));
      dom.interfaceOut.appendChild(box);
    }
  }

  /* ── Spec resolution: cache → (explicit) Gemini → fallback ─────────────── */

  function resolveSpec(url, print, userTriggered) {
    var cache = getSchemaSpecs();
    var cached = cache[print.hash];

    if (cached && cached.spec) {
      var normalized = normalizeSpec(cached.spec);
      if (normalized) {
        cached.lastUsedAt = new Date().toISOString();
        cache[print.hash] = cached;
        setSchemaSpecs(cache);
        applySpec(normalized, 'cache');
        return Promise.resolve();
      }
    }

    if (!getSessionKey()) {
      applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
      if (!state.warnedNoKey) {
        state.warnedNoKey = true;
        toast('No Gemini key — showing a heuristic fallback. Add a key in Settings.');
      }
      return Promise.resolve();
    }

    if (!userTriggered) {
      // A brand new shape costs a Gemini call, so ask before spending it.
      state.pendingGenerate = true;
      showGeneratePrompt();
      return Promise.resolve();
    }

    return callGemini(url, print);
  }

  function generateInterfaceNow() {
    if (!state.data || !state.schemaHash) return;
    showInterfaceLoading('Designing an interface…');
    callGemini(state.url, { hash: state.schemaHash, schema: state.schema });
  }

  function callGemini(url, print) {
    var model = (dom.modelName.value || '').trim() || DEFAULT_MODEL;
    var apiKey = getSessionKey();

    return generateSpec({
      url: url,
      schema: print.schema,
      sample: compactSample(state.data),
      model: model,
      apiKey: apiKey
    }).then(function (rawSpec) {
      var normalized = normalizeSpec(rawSpec);
      if (!normalized) throw wrapError('Gemini returned an unusable spec', 'Falling back to a heuristic interface.');

      var store = getSchemaSpecs();
      store[print.hash] = {
        hash: print.hash, schema: print.schema, spec: normalized, model: model,
        sourceUrl: url, createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString()
      };
      setSchemaSpecs(store);

      applySpec(normalized, 'generated');
      toast('Interface generated and remembered as ' + print.hash, 'ok');
    }).catch(function (err) {
      var message = err && err.message ? err.message : String(err);
      var title = 'Gemini request failed';
      if (err && err.status === 401) title = 'Gemini rejected the API key';
      else if (err && err.status === 403) title = 'Gemini access forbidden';
      else if (err && err.status === 429) title = 'Gemini rate limit reached';
      else if (err && err.status === 404) {
        title = 'Model not found';
        message += ' — try setting the model to gemini-3.5-flash in Settings.';
      }

      applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
      showAlert(title, message);
      toast(title, 'error');
    });
  }

  /* ── Auto-refresh ──────────────────────────────────────────────────────── */

  function startTimer() {
    stopTimer();
    if (!state.refreshIntervalMs) return;
    state.nextRefreshAt = Date.now() + state.refreshIntervalMs;
    dom.livePill.hidden = false;
    state.tickHandle = window.setInterval(tick, 250);
    updateMeta();
  }

  function stopTimer() {
    if (state.tickHandle) { window.clearInterval(state.tickHandle); state.tickHandle = null; }
    state.nextRefreshAt = 0;
    dom.livePill.hidden = true;
    updateMeta();
  }

  function tick() {
    updateMeta();
    if (!state.refreshIntervalMs || !state.nextRefreshAt) return;
    if (Date.now() >= state.nextRefreshAt && !state.inFlight) {
      state.nextRefreshAt = Date.now() + state.refreshIntervalMs;
      performRequest(true);
    }
  }

  function syncRefreshUi() {
    var on = state.refreshIntervalMs > 0;
    dom.refreshToggle.setAttribute('aria-checked', on ? 'true' : 'false');
    dom.refreshInterval.disabled = !on;
    if (on) dom.refreshInterval.value = String(state.refreshIntervalMs);
  }

  /* ── Events ────────────────────────────────────────────────────────────── */

  function wireEvents() {
    dom.landingStart.addEventListener('click', function () {
      showView(getSessionKey() ? 'app' : 'setup');
    });
    dom.landingSkip.addEventListener('click', function () { enterApp(); });
    dom.landingAbout.addEventListener('click', function () {
      toast('Imago turns an API response into an interface, remembers the shape, and watches it change.');
    });

    dom.setupContinue.addEventListener('click', function () {
      var key = dom.setupKey.value.trim();
      if (key) {
        setSessionKey(key);
        dom.geminiKey.value = key;
        setKeyStatus();
        toast('Key saved for this session.', 'ok');
      }
      enterApp();
    });
    dom.setupLater.addEventListener('click', function () { enterApp(); });
    dom.setupKey.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); dom.setupContinue.click(); }
    });

    dom.appNav.addEventListener('click', function (event) {
      var view = event.target && event.target.getAttribute && event.target.getAttribute('data-view');
      if (view) setAppPane(view);
    });
    dom.brandHome.addEventListener('click', function () { setAppPane('playground'); });

    dom.reqForm.addEventListener('submit', function (event) {
      event.preventDefault();
      performRequest(false);
    });
    dom.urlInput.addEventListener('input', function () {
      state.activeRequestId = null;
      markDirty();
    });

    dom.saveBtn.addEventListener('click', saveCurrentRequest);
    dom.newRequestBtn.addEventListener('click', function () {
      setAppPane('playground');
      dom.urlInput.value = '';
      dom.urlInput.focus();
    });

    dom.headersInput.addEventListener('input', markDirty);

    dom.refreshToggle.addEventListener('click', function () {
      var on = dom.refreshToggle.getAttribute('aria-checked') === 'true';
      state.refreshIntervalMs = on ? 0 : Number(dom.refreshInterval.value);
      syncRefreshUi();
      if (state.refreshIntervalMs && state.data && !state.dirtySinceSend) startTimer();
      else stopTimer();
      savePrefs();
    });
    dom.refreshInterval.addEventListener('change', function () {
      if (state.refreshIntervalMs) {
        state.refreshIntervalMs = Number(dom.refreshInterval.value);
        startTimer();
        savePrefs();
      }
    });

    dom.tabBar.addEventListener('click', function (event) {
      var tab = event.target && event.target.getAttribute && event.target.getAttribute('data-tab');
      if (tab) setActiveTab(tab);
    });

    dom.copyRaw.addEventListener('click', function () {
      var text = state.rawText || '';
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(
          function () { toast('Response copied.', 'ok'); },
          function () { toast('Could not copy.', 'error'); });
      } else {
        toast('Clipboard unavailable in this browser.', 'error');
      }
    });

    dom.geminiKey.addEventListener('input', function () {
      setSessionKey(dom.geminiKey.value.trim());
      setKeyStatus();
    });
    dom.modelName.addEventListener('input', function () {
      setSessionModel(dom.modelName.value.trim());
    });
    dom.clearKeyBtn.addEventListener('click', function () {
      dom.geminiKey.value = '';
      setSessionKey('');
      setKeyStatus();
      toast('Key cleared for this session.');
    });

    dom.clearStorageBtn.addEventListener('click', function () {
      if (!window.confirm('Clear all saved requests, cached interfaces and snapshots?')) return;
      try {
        window.localStorage.removeItem(STORE.requests);
        window.localStorage.removeItem(STORE.specs);
        window.localStorage.removeItem(STORE.snaps);
        window.localStorage.removeItem(STORE.prefs);
      } catch (err) { /* ignore */ }
      state.activeRequestId = null;
      state.diff = null;
      state.changedCount = 0;
      renderSavedList();
      renderChangesPane();
      renderStorageSummary();
      updateMeta();
      toast('All saved data cleared.', 'ok');
    });

    // keep "x ago" honest while idle
    window.setInterval(function () { if (!state.tickHandle && state.data) updateMeta(); }, 10000);
    window.addEventListener('beforeunload', savePrefs);
  }

  /* ── Bootstrap ─────────────────────────────────────────────────────────── */

  function cacheDom() {
    var ids = ['landingView', 'setupView', 'appView', 'landingStart', 'landingSkip', 'landingAbout',
               'setupKey', 'setupContinue', 'setupLater', 'appNav', 'brandHome', 'keyStatus', 'avatar',
               'panePlayground', 'paneSaved', 'paneSettings', 'reqForm', 'urlInput', 'sendBtn', 'saveBtn',
               'refreshToggle', 'refreshInterval', 'livePill', 'liveCount', 'runMeta', 'stLastChecked',
               'stSize', 'stCache', 'stChanged', 'changedChip', 'nextChip', 'stNextRefresh', 'tabBar',
               'interfaceCard', 'interfaceHead', 'interfaceTitle', 'cacheBadge', 'interfaceOut',
               'rawOut', 'copyRaw', 'schemaOut', 'schemaHashChip', 'changesOut', 'snapshotsOut',
               'headersInput', 'savedList', 'savedEmpty', 'newRequestBtn', 'geminiKey', 'modelName',
               'clearKeyBtn', 'clearStorageBtn', 'storageSummary', 'toast'];
    for (var i = 0; i < ids.length; i += 1) dom[ids[i]] = qs(ids[i]);
  }

  function enterApp() {
    var prefs = getPrefs();
    prefs.onboarded = true;
    setPrefs(prefs);
    showView('app');
  }

  function restoreSession() {
    var key = getSessionKey();
    if (key) dom.geminiKey.value = key;
    dom.modelName.value = getSessionModel() || DEFAULT_MODEL;
    setSessionModel(dom.modelName.value);
    setKeyStatus();
  }

  function restoreLastView() {
    var prefs = getPrefs();

    if (prefs.lastUrl) dom.urlInput.value = prefs.lastUrl;
    if (prefs.lastHeadersText) dom.headersInput.value = prefs.lastHeadersText;
    state.activeRequestId = prefs.activeRequestId || null;
    state.url = prefs.lastUrl || '';
    state.refreshIntervalMs = Number(prefs.refreshIntervalMs) || 0;
    syncRefreshUi();

    setAppPane(['playground', 'saved', 'settings'].indexOf(prefs.activePane) !== -1 ? prefs.activePane : 'playground');
    setActiveTab(prefs.activeTab || 'interface');
    renderSavedList();

    var snapshot = latestSnapshotWithData(currentRequestKey());
    if (!snapshot) {
      dom.tabBar.hidden = true;
      showInterfaceEmpty();
      updateMeta();
      return;
    }

    // Rehydrate from the newest stored snapshot so a reload lands the user back
    // where they were without spending a request.
    state.data = snapshot.data;
    state.dataUrl = state.url;
    state.status = snapshot.status;
    state.lastCheckedAt = new Date(snapshot.fetchedAt).getTime();
    try {
      state.rawText = JSON.stringify(snapshot.data);
      state.byteSize = byteLength(state.rawText);
    } catch (err) { state.rawText = ''; state.byteSize = 0; }

    var print = fingerprint(snapshot.data);
    state.schema = print.schema;
    state.schemaHash = print.hash;

    dom.tabBar.hidden = false;
    renderRawPane();
    renderSchemaPane();
    renderChangesPane();

    var entry = getSchemaSpecs()[print.hash];
    var normalized = entry && entry.spec ? normalizeSpec(entry.spec) : null;
    if (normalized) applySpec(normalized, 'cache');
    else applySpec(normalizeSpec(buildFallbackSpec(snapshot.data, state.url)), 'fallback');

    updateMeta();
  }

  function init() {
    cacheDom();
    wireEvents();
    restoreSession();
    restoreLastView();

    var prefs = getPrefs();
    if (prefs.onboarded) showView('app');
    else showView('landing');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
