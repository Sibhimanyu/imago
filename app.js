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
    headers: 'imago.lastHeaders',   // request headers: session-only, like before
    model: 'imago.modelName',
    provider: 'imago.provider'
  };

  // Model keys live in localStorage, one slot per provider, so they survive a
  // browser restart. Deliberate tradeoff: anyone with this browser profile can
  // read them, and any script on this origin already could. Request headers
  // stay session-only — they are per-endpoint secrets, not app credentials.
  var KEYS = {
    gemini: 'imago.key.gemini',
    groq: 'imago.key.groq'
  };

  /* ── Providers ──────────────────────────────────────────────────────────────
     Imago only ever asks a model for a small JSON plan, so any provider that
     can be pinned to JSON works. Each entry owns its endpoint, auth header,
     request body and response shape; nothing else in the app knows the
     difference. Model ids churn, so every default is editable in Settings and
     carries a fallback hint rather than being hard-coded as the only option.
     ---------------------------------------------------------------------- */

  var PROVIDERS = {
    gemini: {
      id: 'gemini',
      label: 'Google Gemini',
      keyPrefix: 'AIza',
      keyHint: 'aistudio.google.com/apikey',
      defaultModel: 'gemini-2.5-flash-lite',
      modelHint: 'gemini-3.5-flash',
      endpoint: function (model) {
        return 'https://generativelanguage.googleapis.com/v1beta/models/' +
               encodeURIComponent(model) + ':generateContent';
      },
      headers: function (apiKey) {
        return { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };
      },
      body: function (model, prompt, schema) {
        return {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: schema }
        };
      },
      // Used when the model family rejects responseSchema.
      plainBody: function (model, prompt, schema) {
        return {
          contents: [{ parts: [{ text: prompt + '\n\nReturn only valid JSON matching this schema:\n' +
                                       JSON.stringify(schema) }] }],
          generationConfig: { responseMimeType: 'application/json' }
        };
      },
      // Free-text mode for the full-HTML builder: no responseSchema, plain
      // text MIME so the model writes markup instead of JSON.
      htmlBody: function (model, prompt) {
        return {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'text/plain' }
        };
      },
      // Multi-turn for the try-it console. Gemini calls the assistant "model"
      // and carries history in contents[].
      chatBody: function (model, turns) {
        return {
          contents: turns.map(function (t) {
            return { role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.text }] };
          }),
          generationConfig: { maxOutputTokens: 1024 }
        };
      },
      // Minimal ping for the connection-tests card: costs ~5 tokens.
      testBody: function (model) {
        return {
          contents: [{ parts: [{ text: 'Reply with exactly: ok' }] }],
          generationConfig: { maxOutputTokens: 64 }
        };
      },
      extract: function (payload) {
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
    },

    groq: {
      id: 'groq',
      label: 'Groq',
      keyPrefix: 'gsk_',
      keyHint: 'console.groq.com/keys',
      // Groq deprecated llama-3.3-70b-versatile and llama-3.1-8b-instant for
      // free and developer tiers on 2026-06-17. gpt-oss-20b is the documented
      // migration target and honours json_schema; the 120b has reported cases
      // of ignoring it, so it is the hint rather than the default.
      defaultModel: 'openai/gpt-oss-20b',
      modelHint: 'openai/gpt-oss-120b',
      endpoint: function () { return 'https://api.groq.com/openai/v1/chat/completions'; },
      headers: function (apiKey) {
        return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey };
      },
      body: function (model, prompt, schema) {
        return {
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          // strict:false on purpose. Strict mode demands additionalProperties
          // false and every property in required; the UI spec has optional
          // fields per component type, so strict would reject the schema.
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'imago_ui_spec', schema: schema, strict: false }
          }
        };
      },
      plainBody: function (model, prompt, schema) {
        return {
          model: model,
          messages: [{ role: 'user', content: prompt +
            '\n\nReturn only valid JSON matching this schema:\n' + JSON.stringify(schema) }],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        };
      },
      // Free-text mode for the full-HTML builder: no response_format, so the
      // model writes markup instead of JSON. Warmer than the spec path — a
      // plan wants determinism, a page wants some design sense.
      htmlBody: function (model, prompt) {
        return {
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        };
      },
      chatBody: function (model, turns) {
        return {
          model: model,
          messages: turns.map(function (t) { return { role: t.role, content: t.text }; }),
          max_tokens: 1024
        };
      },
      // Minimal ping for the connection-tests card: costs a few tokens.
      testBody: function (model) {
        return {
          model: model,
          messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
          max_tokens: 64,
          temperature: 0
        };
      },
      extract: function (payload) {
        if (!payload || !payload.choices || !payload.choices.length) return '';
        var msg = payload.choices[0].message;
        return msg && typeof msg.content === 'string' ? msg.content : '';
      }
    },

    // Ollama: your own machine as a provider. Keyless, and the endpoint is
    // the user's server, so it comes from prefs (default: stock local install).
    // Two wire details matter here. First, no Authorization header, ever:
    // Ollama's CORS preflight only allows Origin/Content-Length/Content-Type,
    // so an auth header fails before the request starts. Second, the same
    // OpenAI shapes as Groq — /v1/chat/completions honours response_format
    // locally, and the plain-JSON retry covers the models that ignore it.
    ollama: {
      id: 'ollama',
      label: 'Ollama',
      keyPrefix: '',
      keyHint: '',
      needsKey: false,
      // A fallback only: whenever the server answers, the real installed list
      // replaces this. Kept in step with modelHint so the UI never advertises
      // one name and defaults to another.
      defaultModel: 'llama3.1',
      modelHint: 'llama3.1',
      // Ollama's native API rather than its OpenAI-compatible one. The compat
      // endpoint gives no way to set the context window, so generation ran
      // into the model's 4096-token default and the spec came back truncated
      // mid-string ("returned an unusable spec"). /api/chat takes `options`.
      endpoint: function () { return ollamaBase() + '/api/chat'; },
      headers: function () {
        return { 'Content-Type': 'application/json' };
      },
      body: function (model, prompt, schema) {
        return {
          model: model,
          stream: false,
          format: schema,          // native structured output: no fences, no prose
          options: OLLAMA_OPTIONS,
          messages: [{ role: 'user', content: prompt }]
        };
      },
      plainBody: function (model, prompt, schema) {
        return {
          model: model,
          stream: false,
          format: 'json',
          options: OLLAMA_OPTIONS,
          messages: [{ role: 'user', content: prompt +
            '\n\nReturn only valid JSON matching this schema:\n' + JSON.stringify(schema) }]
        };
      },
      htmlBody: function (model, prompt) {
        return {
          model: model,
          stream: false,
          options: { num_ctx: OLLAMA_OPTIONS.num_ctx, num_predict: OLLAMA_OPTIONS.num_predict, temperature: 0.7 },
          messages: [{ role: 'user', content: prompt }]
        };
      },
      chatBody: function (model, turns) {
        return {
          model: model,
          stream: false,
          options: { num_ctx: OLLAMA_OPTIONS.num_ctx, num_predict: 1024, temperature: 0.7 },
          messages: turns.map(function (t) { return { role: t.role, content: t.text }; })
        };
      },
      testBody: function (model) {
        return {
          model: model,
          stream: false,
          options: { num_ctx: 2048, num_predict: 64, temperature: 0 },
          messages: [{ role: 'user', content: 'Reply with exactly: ok' }]
        };
      },
      extract: function (payload) {
        var msg = payload && payload.message;
        return msg && typeof msg.content === 'string' ? msg.content : '';
      },
      // Native replies say why they stopped. Truncation has a specific cure,
      // so it must not be reported as the model being incapable.
      truncated: function (payload) { return !!payload && payload.done_reason === 'length'; },
      // Reasoning models put their thinking here.
      thinking: function (payload) {
        var msg = payload && payload.message;
        return !!(msg && typeof msg.thinking === 'string' && msg.thinking.trim());
      }
    }
  };

  // Imago's prompt is ~1.7k tokens and a full spec runs to a few thousand
  // more. Ollama defaults to a 4096 context, which truncated the JSON exactly
  // at the limit, so ask for room. num_predict is capped separately so a
  // runaway model still stops.
  var OLLAMA_OPTIONS = { num_ctx: 16384, num_predict: 8192, temperature: 0.2 };

  var PROVIDER_IDS = ['gemini', 'groq', 'ollama'];
  var DEFAULT_PROVIDER = 'gemini';

  function getProvider(id) { return PROVIDERS[id] || PROVIDERS[DEFAULT_PROVIDER]; }

  // Only Ollama opts out; every other provider needs a key unless it says so.
  function providerNeedsKey(id) { return getProvider(id).needsKey !== false; }

  // What Ollama actually has pulled. The old default was a guess ('qwen3'),
  // and a guess that is wrong turns a green connection test into a failed
  // generation — the test has to predict the thing it is testing.
  var ollamaModels = null;        // null = never fetched, [] = fetched, none installed

  function fetchOllamaModels() {
    return ollamaFetch(ollamaBase() + '/api/tags', { method: 'GET', mode: 'cors' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (payload) {
        var list = (payload && Array.isArray(payload.models) ? payload.models : [])
          .map(function (m) { return m && typeof m.name === 'string' ? m.name : ''; })
          .filter(Boolean);
        ollamaModels = list;
        return list;
      });
  }

  // Embedding models cannot answer a chat request, so they are never a
  // sensible default even when they are the only thing installed.
  function isChatModel(name) { return !/embed/i.test(name); }

  function pickOllamaModel(list) {
    var chat = (list || []).filter(isChatModel);
    return chat.length ? chat[0] : '';
  }

  // 127.0.0.1, not localhost. `localhost` resolves to ::1 before 127.0.0.1 on
  // a default macOS install, and Ollama listens on IPv4 only
  // (`TCP 127.0.0.1:11434 (LISTEN)`), so ::1 refuses the connection. curl
  // hides this by falling back to IPv4; browsers do not reliably do the same,
  // which shows up as "did not answer" against a server that is plainly up.
  var OLLAMA_DEFAULT_BASE = 'http://127.0.0.1:11434';

  function ollamaBase() {
    var base = '';
    try { base = String(getPrefs().ollamaEndpoint || ''); } catch (e) { /* ignore */ }
    base = base.trim().replace(/\/+$/, '');
    return base || OLLAMA_DEFAULT_BASE;
  }

  // The other spelling of the same machine. Used only as a retry, so a wrong
  // guess about which loopback form works costs one extra request, not a
  // failed session.
  function ollamaAltBase(base) {
    if (/\/\/localhost(:|\/|$)/i.test(base)) return base.replace(/\/\/localhost/i, '//127.0.0.1');
    if (/\/\/127\.0\.0\.1(:|\/|$)/.test(base)) return base.replace('//127.0.0.1', '//localhost');
    return '';
  }

  // Fetch an absolute Ollama URL, and if the connection itself fails, retry
  // the other loopback spelling before giving up. Used by every Ollama call
  // — the model list and the generation request both go through here.
  function ollamaFetch(url, init) {
    return fetch(url, init).catch(function (err) {
      var base = ollamaBase();
      var alt = ollamaAltBase(base);
      if (!alt || url.indexOf(base) !== 0) throw err;
      return fetch(alt + url.slice(base.length), init).then(function (response) {
        // The alternate spelling works: remember it so every later call and
        // the Settings field agree with reality.
        try {
          var prefs = getPrefs();
          prefs.ollamaEndpoint = alt;
          setPrefs(prefs);
          if (dom.ollamaEndpoint) dom.ollamaEndpoint.value = alt;
        } catch (e) { /* ignore */ }
        return response;
      });
    });
  }

  // Key prefixes are distinctive enough to pick the provider for the user.
  function detectProvider(key) {
    var k = String(key || '').trim();
    for (var i = 0; i < PROVIDER_IDS.length; i += 1) {
      var p = PROVIDERS[PROVIDER_IDS[i]];
      if (p.keyPrefix && k.indexOf(p.keyPrefix) === 0) return p.id;
    }
    return '';
  }

  var DEFAULT_MODEL = PROVIDERS[DEFAULT_PROVIDER].defaultModel;

  var MAX_SNAPSHOTS = 10;
  var MAX_SNAPSHOT_BYTES = 1024 * 1024;  // refuse to store bodies fatter than this
  var LARGE_RESPONSE_BYTES = 500 * 1024; // warn + trim sample above this
  var SAMPLE_CHAR_LIMIT = 10000;
  var MAX_COMPONENTS = 20;
  var MAX_ROWS = 10;
  // Full-HTML builder caps. A generated page is rendered, never executed, but
  // an unbounded doc would still wedge the frame and evict every snapshot
  // from localStorage, so oversized docs render without being cached.
  var MAX_HTML_BYTES = 256 * 1024;
  var MAX_CACHED_HTML_BYTES = 100 * 1024;

  // One-click examples for the picker. Every entry must be a keyless GET
  // that answers from a browser (CORS-open). Key-gated APIs (TMDB, USDA,
  // Unsplash, TinyURL, LibreTranslate) are deliberately excluded — a dead
  // example is worse than no example.
  var DEMOS = [
    { name: 'Pokémon',    chip: 'Pokémon',    url: 'https://pokeapi.co/api/v2/pokemon/pikachu' },
    { name: 'Weather',    chip: 'Weather',    url: 'https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1' },
    { name: 'Dictionary', chip: 'Dictionary', url: 'https://api.dictionaryapi.dev/api/v2/entries/en/hello' },
    { name: 'Currency',   chip: 'Currency',   url: 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,INR' },
    { name: 'Trivia',     chip: 'Trivia',     url: 'https://opentdb.com/api.php?amount=5' },
    { name: 'Library',    chip: 'Library',    url: 'https://openlibrary.org/search.json?title=the+hobbit&limit=5' },
    { name: 'Thirukkural', chip: 'Thirukkural', url: 'https://tamil-kural-api.vercel.app/api/kural/1' },
    { name: 'Wikipedia',  chip: 'Wikipedia',  url: 'https://en.wikipedia.org/api/rest_v1/page/summary/Chennai' },
    { name: 'Sunrise & Sunset', chip: 'Sunset', url: 'https://api.sunrise-sunset.org/json?lat=13.0827&lng=80.2707&formatted=0' },
    { name: 'Charizard',  chip: 'Charizard',  url: 'https://pokeapi.co/api/v2/pokemon/charizard' }
  ];

  // Fill a <select> with the DEMOS list behind a placeholder option. Shared
  // by the empty-state picker and the persistent one beside the request bar,
  // so the two can never drift apart.
  function fillExampleSelect(select) {
    if (!select) return select;
    clear(select);
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Try an example…';
    select.appendChild(placeholder);
    for (var i = 0; i < DEMOS.length; i += 1) {
      var option = document.createElement('option');
      option.value = DEMOS[i].url;
      option.textContent = DEMOS[i].name;
      select.appendChild(option);
    }
    select.value = '';
    return select;
  }

  // A picker selection behaves exactly like tapping a demo: drop any pushed
  // pages and fetch the chosen endpoint. The picker resets to its
  // placeholder so the same example can be picked twice in a row.
  function pickExample(select) {
    if (!select || !select.value) return false;
    state.stack = [];
    // Examples are public hosts: never carry the last endpoint's headers there.
    navigateTo(select.value, '');
    select.value = '';
    return true;
  }

  var COMPONENT_TYPES = ['title', 'text', 'metric', 'image', 'badges', 'list',
                         'table', 'statBars', 'chart', 'link', 'jsonBlock', 'section',
                         'keyValue', 'gauge', 'timeline'];
  var LAYOUTS = ['profile', 'dashboard', 'table', 'list', 'article', 'timeline', 'raw'];
  var EMPHASIS = ['hero', 'normal', 'quiet'];
  // What a generated page can let the reader *do*. `follow` opens a URL found
  // in the response as the next generative page; the rest drive Imago itself.
  // Only links live on the page. Watch, refetch and the raw response each have
  // one home in the toolbar (Watch, Go, Inspect); the page used to repeat all
  // three as buttons, so a phone showed two rows of controls before any data.
  var ACTION_TYPES = ['follow'];
  var MAX_ACTIONS = 6;

  var IMAGO_UI_SPEC_JSON_SCHEMA = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      subtitle: { type: 'string' },
      layout: { type: 'string', enum: LAYOUTS },
      actions: {
        type: 'array',
        maxItems: MAX_ACTIONS,
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ACTION_TYPES },
            label: { type: 'string' },
            path: { type: 'string' },
            interval: { type: 'number' }
          },
          required: ['type', 'label']
        }
      },
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
            emphasis: { type: 'string', enum: EMPHASIS },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  path: { type: 'string' }
                },
                required: ['label', 'path']
              }
            },
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
    builder: 'spec',   // 'spec' | 'html' — structured plan vs full-page HTML
    html: null,
    htmlSource: '',    // 'generated' | 'cache'
    htmlBytes: -1,     // byteSize of the data the current page was built from
    htmlUrl: '',
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
    stage: false,          // the generated page owns the screen
    stagePref: true,       // false once the reader pressed Back to the controls
    stack: [],             // urls behind the current page, for Back
    historyDepth: 0,       // history entries this app pushed; popstate owns the pop
    navRestorePoint: null, // what was on screen before an in-flight navigation
    generating: false,     // a model call is in flight
    rawPaneDirty: true,    // body changed since the Raw pane was last built
    schemaPaneDirty: true,
    hasData: false,        // a fetch succeeded — distinct from `data` being falsy
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
        snapshotCache = null;   // the store we just dropped must not be served from cache
        window.localStorage.setItem(storeKey, JSON.stringify(value));
        toast('Storage was full — older snapshots were dropped.', 'warn');
        return true;
      } catch (err2) {
        toast('Browser storage is full. Nothing was saved.', 'error');
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

  // The snapshot store is the bulkiest thing we keep and it was being fully
  // parsed and re-serialised several times per request (pushSnapshot, then
  // latestSnapshotWithData, then the Snapshots pane). localStorage is
  // synchronous, so on a 10s auto-refresh that blocked the main thread every
  // tick. Read through an in-memory cache; write through it.
  var snapshotCache = null;

  function getSnapshots() {
    if (snapshotCache) return snapshotCache;
    var map = readJSON(STORE.snaps, {});
    snapshotCache = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
    return snapshotCache;
  }
  function setSnapshots(map) {
    snapshotCache = map;
    var ok = writeJSON(STORE.snaps, map);
    // writeJSON drops the whole snapshot store to recover from a quota error,
    // so the cache must not keep serving what is no longer on disk.
    if (!ok) snapshotCache = null;
    return ok;
  }

  function invalidateSnapshotCache() { snapshotCache = null; }

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
    prefs.builder = state.builder;
    // Request headers are where users put `Authorization: Bearer ...`. They get
    // the same treatment as the API key: session storage, gone when the tab is.
    delete prefs.lastHeadersText;
    prefs.stage = state.stagePref;
    setPrefs(prefs);
    setSessionHeaders(state.headersText);
  }

  function getSessionHeaders() {
    try { return window.sessionStorage.getItem(SESSION.headers) || ''; }
    catch (err) { return ''; }
  }

  function setSessionHeaders(value) {
    try {
      if (value) window.sessionStorage.setItem(SESSION.headers, value);
      else window.sessionStorage.removeItem(SESSION.headers);
    } catch (err) { /* private mode — headers simply do not persist */ }
  }

  function getProviderKey(id) {
    if (!PROVIDERS[id]) return '';
    try { return window.localStorage.getItem(KEYS[id]) || ''; }
    catch (e) { return ''; }
  }

  function setProviderKey(id, value) {
    if (!PROVIDERS[id]) return;
    try {
      if (value) window.localStorage.setItem(KEYS[id], value);
      else window.localStorage.removeItem(KEYS[id]);
    } catch (e) { /* private mode — key simply does not persist */ }
  }

  // The key that will actually be sent: the active provider's slot.
  function getActiveKey() {
    return getProviderKey(getSessionProvider());
  }

  function hasAnyKey() {
    for (var i = 0; i < PROVIDER_IDS.length; i += 1) {
      if (providerNeedsKey(PROVIDER_IDS[i]) && getProviderKey(PROVIDER_IDS[i])) return true;
    }
    return false;
  }

  // A provider is usable when it holds a key, or when it never needed one.
  function providerUsable(id) {
    return !providerNeedsKey(id) || !!getProviderKey(id);
  }

  function getSessionProvider() {
    try {
      var p = window.sessionStorage.getItem(SESSION.provider);
      if (p && PROVIDERS[p]) return p;
    } catch (e) { /* ignore */ }
    var prefs = getPrefs();
    if (prefs.provider && PROVIDERS[prefs.provider]) return prefs.provider;
    // No explicit choice: prefer the provider that actually has a key.
    for (var i = 0; i < PROVIDER_IDS.length; i += 1) {
      if (getProviderKey(PROVIDER_IDS[i])) return PROVIDER_IDS[i];
    }
    return DEFAULT_PROVIDER;
  }

  function setSessionProvider(id) {
    if (!PROVIDERS[id]) return;
    try { window.sessionStorage.setItem(SESSION.provider, id); } catch (e) { /* ignore */ }
    var prefs = getPrefs();
    prefs.provider = id;
    setPrefs(prefs);
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
  var RE_KEY_SECONDS = /(^|_)(seconds|secs?|duration|day_length|length|elapsed|uptime|runtime|ttl|expires_in)(_|$)/;
  var RE_KEY_MILLIS = /(^|_)(ms|millis|milliseconds|latency|duration_ms|response_time)(_|$)/;
  var RE_KEY_BYTES = /(^|_)(bytes|size|filesize|content_length|length_bytes)(_|$)/;
  var RE_KEY_LAT = /(^|_)(lat|latitude)(_|$)/;
  var RE_KEY_LNG = /(^|_)(lng|lon|long|longitude)(_|$)/;
  // Transport and bookkeeping fields. Still shown, never as the headline.
  var RE_KEY_YEAR = /(^|_)(year|yr|founded|published_year)(_|$)/;
  var RE_KEY_NOISE = /(generationtime|utc_offset|timezone_abbreviation|interval|elevation|^id$|_id$|etag|checksum|revision|version|request|cursor|offset|page|limit|status_code|copyright|licen[cs]e|attribution)/;
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

  /* ── Model providers: UI spec generation ────────────────────────────────────────── */

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
      'You are Imago. You turn a JSON response into a plan for an interface a',
      'person would actually want to read. Return ONLY a JSON object matching',
      'the UI spec schema. No HTML, CSS, JavaScript, Markdown or commentary.',
      '',
      'Allowed component types:',
      COMPONENT_TYPES.join(', ') + '.',
      '',
      'Rules that matter most:',
      '1. Every path must exist in the schema, written as exact dot notation',
      '   (e.g. "results.sunrise"). Never invent a field.',
      '2. title, text, metric, gauge, link and image may only point at a single',
      '   value. Never point one at an object or an array — use keyValue, table,',
      '   badges, list, chart or timeline for those.',
      '3. Never leave path empty on a value component. An empty path means the',
      '   whole response body and renders as meaningless field counts.',
      '4. Do not show the same field twice, and do not add a container card for',
      '   an object whose fields you already list individually.',
      '5. Use "section" components to group the page into two or three labelled',
      '   areas when the data has distinct parts.',
      '6. Use "keyValue" (optionally with items: [{label, path}]) for a cluster',
      '   of related small fields instead of one card per field.',
      '7. Use "timeline" with items: [{label, path}] when three or more fields',
      '   are timestamps of the same day or sequence.',
      '8. Use "gauge" for a 0-100 value such as a percentage, with max set.',
      '9. Use "chart" for numeric series, "statBars" for named numeric scores,',
      '   "table" for arrays of objects, "badges" for short arrays of strings.',
      '10. Mark the one or two fields a reader came for with emphasis: "hero".',
      '    Mark background detail with emphasis: "quiet". Everything else',
      '    defaults to normal.',
      '11. Set "unit" when a number has one (%, °C, km, ms). Do not restate the',
      '    unit inside the label.',
      '12. Order components by importance. The first components are the answer.',
      '13. Timestamps, durations and byte counts are formatted for you — pass',
      '    the raw field and let the renderer handle it.',
      '',
      'The plan is the whole page, not a panel. Choose layout deliberately:',
      '"profile" for one entity with an image, "dashboard" for measurements,',
      '"table" or "list" for collections, "article" for long text, "timeline"',
      'when the story is a sequence of moments, "raw" only when nothing else fits.',
      '',
      'actions are what the reader can do next (up to ' + MAX_ACTIONS + '):',
      '- { type: "follow", path, label } for every field whose value is a URL to',
      '  a related resource or the next/previous page. path must point at the',
      '  URL string itself. Label it by what it leads to ("Species", "Next page").',
      'Only follow actions: watching, refetching and the raw response are',
      'already in the toolbar. No links worth following means an empty list.',
      '',
      'title should name the thing the response is about, in human words.',
      'subtitle is one short line of context, not the URL.',
      'Keep the plan under ' + MAX_COMPONENTS + ' components.',
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

  function parseModelJson(text) {
    if (!text) throw new Error('The model returned an empty response.');
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
      throw new Error('The model did not return valid JSON.');
    }
  }

  function llmRequest(provider, model, apiKey, body) {
    var send = provider.id === 'ollama' ? ollamaFetch : fetch;
    return send(provider.endpoint(model), {
      method: 'POST',
      headers: provider.headers(apiKey),
      body: JSON.stringify(body)
    }).then(function (response) {
      return response.text().then(function (text) {
        var payload = null;
        try { payload = JSON.parse(text); } catch (e) { /* non-JSON error body */ }
        if (!response.ok) {
          // Gemini and Groq both nest the human-readable reason under `error`.
          // Gemini and Groq nest the reason under error.message; Ollama's
          // native API returns error as a bare string.
          var message = 'HTTP ' + response.status;
          if (payload && payload.error && payload.error.message) message = payload.error.message;
          else if (payload && typeof payload.error === 'string' && payload.error) message = payload.error;
          var error = new Error(message);
          error.status = response.status;
          throw error;
        }
        return payload;
      });
    });
  }

  // One place that turns a provider failure into words, shared by the
  // generation paths and the connection-tests card so all three agree.
  function providerErrorText(provider, err) {
    var message = err && err.message ? err.message : String(err);
    var title = provider.label + ' request failed';
    // Gemini answers a bad key with 400, not 401, so status alone would report
    // the vaguer "request failed" for the single most common mistake.
    var saysBadKey = /api[ _-]?key not valid|invalid api key|api key is invalid/i.test(message);
    if ((err && err.status === 401) || saysBadKey) title = provider.label + ' rejected the API key';
    else if (err && err.status === 403) title = provider.label + ' access forbidden';
    else if (err && err.status === 429) title = provider.label + ' rate limit reached';
    else if (err && err.status === 404) {
      title = 'Model not found';
      message += ' — try setting the model to ' + provider.modelHint + ' in Settings.';
    }
    return { title: title, message: message };
  }

  function generateSpec(options) {
    var prompt = buildImagoPrompt(options);
    var provider = getProvider(options.provider);
    var model = options.model;
    var apiKey = options.apiKey;

    function ask(bodyFn) {
      return llmRequest(provider, model, apiKey, bodyFn(model, prompt, IMAGO_UI_SPEC_JSON_SCHEMA))
        .then(function (payload) {
          // A spec cut off mid-string parses as garbage, and "the model
          // returned an unusable spec" sends the reader after the wrong
          // problem. Truncation has its own cure, so name it.
          if (provider.truncated && provider.truncated(payload)) {
            var err = new Error('The reply was cut off before the plan was complete. ' +
                                'This model wrote more than the request allows — try a smaller ' +
                                'response body, or a model that answers more concisely.');
            err.truncated = true;
            throw err;
          }
          return parseModelJson(provider.extract(payload));
        });
    }

    // Primary: ask the provider to pin the response to the UI spec schema.
    return ask(provider.body).catch(function (err) {
      // Auth and rate-limit failures will not be fixed by retrying, so surface
      // them rather than burning a second call.
      if (err && (err.status === 401 || err.status === 403 || err.status === 429)) throw err;
      // A second identical call would be cut off at the same place.
      if (err && err.truncated) throw err;
      // Otherwise the model family may reject the schema parameter, or return
      // prose despite it. Retry in plain JSON mode with the contract inlined.
      return ask(provider.plainBody);
    });
  }

  /* ── Full-HTML builder ───────────────────────────────────────────────────
     The alternative to the JSON plan: the model writes the entire page and
     Imago shows it verbatim. Verbatim does not mean trusted. The doc renders
     in an opaque-origin sandboxed frame with scripts, forms and navigation
     stripped (applyHtml), and the page CSP is inherited by srcdoc frames, so
     inline scripts would not run even if the model wrote some. The model
     controls markup and styling only — never behaviour, never the app.
     ---------------------------------------------------------------------- */

  function buildHtmlPrompt(options) {
    var schemaJson = JSON.stringify(options.schema, null, 1) || '';
    if (schemaJson.length > SAMPLE_CHAR_LIMIT) {
      schemaJson = schemaJson.slice(0, SAMPLE_CHAR_LIMIT) + '\n…truncated…';
    }
    return [
      'You are Imago, a product designer who codes. Turn this JSON API response',
      'into ONE complete, self-contained HTML page that looks like a real,',
      'designed app screen, not a document. Return ONLY the HTML: no Markdown',
      'fences, no commentary.',
      '',
      'Design brief (these are yours to decide):',
      '- Read the data first and pick the interface it deserves: a product',
      '  grid, a profile card, a dashboard of stat tiles, a feed, a timeline,',
      '  a comparison table, a detail page with a hero. Mix them if the data has',
      '  several parts.',
      '- Commit to a visual direction: a colour palette, a type scale, how',
      '  corners, borders, shadows and backgrounds feel. Use CSS grid and flexbox,',
      '  gradients, badges, pills, avatars, progress bars and meters wherever',
      '  they fit the data.',
      '- Give the most important values visual weight (big numbers, prominent',
      '  titles, images) and push secondary fields back (muted, small, grouped).',
      '  Format values as people expect them: dates, prices, counts, booleans as',
      '  status chips, and never raw key: value lists unless the data really is one.',
      '- Do not produce a long vertical column of headings and paragraphs. If',
      '  the result would read like a Markdown file, redesign it.',
      '',
      'Hard rules:',
      '1. A single document. All styling inline in one <style> block; no',
      '   external stylesheets, fonts or scripts. Do not include <script> —',
      '   scripts are disabled where this page runs, so anything behavioural',
      '   must be plain HTML and CSS.',
      '2. Write the real values from the sample into the markup. This page is',
      '   a snapshot of this exact response, not a template — no {{placeholders}}.',
      '3. Show images only with https URLs already present in the data. Never',
      '   invent image URLs.',
      '4. Every link uses target="_blank" rel="noopener". No <form> elements.',
      '5. Fonts come from local stacks only (system-ui, Georgia, ui-monospace…),',
      '   since web fonts cannot load. Use the full width sensibly and keep it',
      '   usable from 360px up to wide screens. One <h1> naming the thing the',
      '   response is about.',
      '',
      'API URL:',
      options.url,
      '',
      'Schema:',
      schemaJson,
      '',
      'Sample (this exact data is what the page must show):',
      options.sample
    ].join('\n');
  }

  function generateHtml(options) {
    var prompt = buildHtmlPrompt(options);
    var provider = getProvider(options.provider);
    return llmRequest(provider, options.model, options.apiKey,
        provider.htmlBody(options.model, prompt))
      .then(function (payload) { return normalizeHtmlDoc(provider.extract(payload)); })
      .then(function (doc) {
        if (!doc) throw new Error('The model did not return a usable HTML document.');
        return doc;
      });
  }

  // Fences off, then a shape check: it must read as markup and fit the frame.
  // Deliberately permissive about tags — the sandbox, not this regex, is the
  // trust boundary — but strict about emptiness and size.
  function normalizeHtmlDoc(text) {
    if (!text) return null;
    var doc = String(text).trim()
      .replace(/^```(?:html)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    if (!doc || doc.length > MAX_HTML_BYTES) return null;
    if (!/<\s*(html|body|main|section|article|div|table|h1)\b/i.test(doc)) return null;
    return doc;
  }

  function applyHtml(html, source) {
    state.html = html;
    state.htmlSource = source;
    state.htmlBytes = state.byteSize;
    state.htmlUrl = state.url;
    state.spec = null;
    state.specSource = '';
    state.pendingGenerate = false;

    dom.interfaceHead.hidden = true;
    dom.cacheBadge.hidden = false;
    dom.cacheBadge.setAttribute('data-kind', source);
    dom.cacheBadge.textContent = source === 'generated' ? 'Generated'
      : source === 'cache' ? 'From schema cache' : 'Basic layout';

    resetInterfaceOut(false);

    var head = el('header', 'stage-head');
    var headTop = el('div', 'stage-head-top');
    headTop.appendChild(el('h1', 'stage-title', endpointTitle(state.url) || 'Response'));
    headTop.appendChild(dom.cacheBadge);
    head.appendChild(headTop);
    head.appendChild(el('p', 'stage-sub',
      'A full page written by the model. Sandboxed: scripts disabled, links open in new tabs.'));

    // Generated HTML is a snapshot of one response. Fresh data does not
    // re-render into it, so say so and offer the way out.
    var stale = el('div', 'html-stale');
    stale.hidden = true;
    stale.appendChild(el('span', null, 'The data changed since this page was generated.'));
    var regen = el('button', 'btn btn-ghost btn-xs', 'Regenerate');
    regen.type = 'button';
    regen.addEventListener('click', function () { generateInterfaceNow(); });
    stale.appendChild(regen);
    head.appendChild(stale);
    dom.interfaceOut.appendChild(head);

    var frame = document.createElement('iframe');
    frame.className = 'html-frame';
    frame.title = 'Generated interface (sandboxed)';
    // Opaque origin, scripts/forms/navigation stripped. allow-popups so the
    // model's target=_blank links open; each carries rel=noopener, and a
    // sandboxed opener is capability-less anyway. Never add allow-scripts
    // with allow-same-origin — the frame could drop its own sandbox.
    frame.setAttribute('sandbox', 'allow-popups');
    frame.srcdoc = html;
    dom.interfaceOut.appendChild(frame);

    dom.stageSource.textContent = dom.cacheBadge.textContent;
    dom.stageSource.setAttribute('data-kind', source);
    if (state.stagePref) enterStage();

    updateMeta();
    renderHistory();
    renderSavedList();
  }

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
  // about the thing itself — stats and types before internal move tables.
  var RE_KEY_INTERESTING = /(stat|type|score|rating|metric|summary|current|result|price|category|tag|genre|ingredient)/;
  var RE_KEY_BULK = /(past|deprecated|legacy|index|indices|moves|forms|encounter|sprite|image|icon|internal|meta|raw|log|debug|_url|href)/;
  var BLOCK_INTEREST = { statBars: 6, chart: 5, timeline: 5, badges: 3, table: 2, keyValue: 2, list: 1 };

  function rankBlocks(blocks) {
    return blocks.map(function (block, index) {
      var key = String(block.path || '').toLowerCase();
      var score = BLOCK_INTEREST[block.type] || 1;
      if (RE_KEY_INTERESTING.test(key)) score += 4;
      if (RE_KEY_BULK.test(key)) score -= 5;
      if (RE_KEY_NOISE.test(key)) score -= 3;
      return { block: block, index: index, score: score };
    }).sort(function (a, b) {
      return b.score - a.score || a.index - b.index;
    }).map(function (entry) { return entry.block; });
  }

  // An array of { name, value } objects is a ranking, and a ranking reads as
  // bars. Anything more ambiguous stays a table.
  var RE_STAT_VALUE = /^(base_stat|value|count|amount|score|total|power|rating|points|votes|weight|percent|percentage)$/;

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
    if (!valueKey && numeric.length === 1 && !RE_POSITION.test(numeric[0].toLowerCase())) {
      valueKey = numeric[0];
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
  function endpointTitle(url) {
    if (!url) return '';
    var noise = /^(v\d+|api|json|data|index|latest|current|query|search|get)$/i;
    try {
      var parsed = new URL(url);
      var segments = parsed.pathname.split('/').filter(Boolean)
        .map(function (part) { return decodeURIComponent(part).replace(/\.(json|xml)$/i, ''); })
        .filter(function (part) { return part && !noise.test(part); });
      if (segments.length) return humanize(segments[segments.length - 1]);
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
    var numeric = keys.filter(function (k) {
      return Array.isArray(node[k]) && node[k].length === timeLen && allNumbers(node[k]);
    });
    return numeric.length ? numeric : null;
  }

  function formatCoord(value, pos, neg) {
    return Math.abs(value).toFixed(2) + '° ' + (value >= 0 ? pos : neg);
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

    // Title: a human-readable name if the payload has one, else the endpoint.
    var titleKey = null;
    var titleCandidates = ['name', 'title', 'label', 'id'];
    for (i = 0; i < titleCandidates.length; i += 1) {
      var value = data[titleCandidates[i]];
      if (typeof value === 'string' && value.trim()) { titleKey = titleCandidates[i]; break; }
    }
    title = titleKey ? String(data[titleKey]) : endpointTitle(url) || 'Response';
    // A bare identifier ("pikachu", "the-hobbit") is a name, so it reads as one.
    if (/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(title)) {
      title = title.charAt(0).toUpperCase() + title.slice(1).replace(/-/g, ' ');
    }

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
        for (var si = 0; si < series.length && si < 2; si += 1) {
          blocks.push({ type: 'chart', path: key + '.' + series[si],
                        label: label + ' ' + humanize(series[si]).toLowerCase() });
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
          } else {
            blocks.push({ type: 'table', path: key, label: label });
          }
        }
        else if (allNumbers(v) && v.length >= 4) blocks.push({ type: 'chart', path: key, label: label });
        else blocks.push({ type: 'badges', path: key, label: label });
        continue;
      }

      if (isPlainObject(v)) {
        if (!Object.keys(v).length) continue;
        blocks.push({ type: 'keyValue', path: key, label: label });
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
    // Weather APIs suffix the measuring height (temperature_2m,
    // wind_speed_10m); that is instrument detail, not the reader's label.
    var base = String(key).replace(/_\d+m$/, '');
    var words = (base || String(key))
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
  function isBookkeeping(component) {
    if (component.emphasis === 'quiet') return true;
    var leaf = lastSegment(component.path || '').toLowerCase();
    return /(^|_)units$/.test(leaf);
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
        if (isBookkeeping(group.items[c]) && result.weight !== 'hero') { tucked.push(result); continue; }
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
      '<stop offset="0%" stop-color="var(--ink)" stop-opacity="0.12"/>' +
      '<stop offset="100%" stop-color="var(--ink)" stop-opacity="0"/></linearGradient>';
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
    if (name === 'app') scheduleTimelineLayout();
    window.scrollTo(0, 0);
  }

  // One screen, so a "pane" is no longer a page swap. The page is always on
  // screen; the endpoints rail is always there on a wide screen (and slides up
  // as a sheet on a phone when pane is 'saved'); Settings opens as a sheet.
  function setAppPane(pane) {
    if (['playground', 'saved', 'settings'].indexOf(pane) === -1) pane = 'playground';
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
  }

  /* ── Meta row / key pill ───────────────────────────────────────────────── */

  // Keeps the provider select, hints and model default in step. Called on
  // boot, when the provider changes, and when a key is pasted.
  function syncProviderUi(opts) {
    var id = getSessionProvider();
    var provider = getProvider(id);
    if (dom.providerSelect) dom.providerSelect.value = id;
    // The server address is Ollama-only clutter for everyone else.
    if (dom.ollamaServerGroup) dom.ollamaServerGroup.hidden = id !== 'ollama';
    if (dom.ollamaNoteOrigin) {
      try { dom.ollamaNoteOrigin.textContent = window.location.origin; }
      catch (e) { /* ignore */ }
    }
    if (dom.providerHint) {
      if (providerNeedsKey(id)) {
        dom.providerHint.innerHTML = 'Get a free key at <span class="mono">' + provider.keyHint +
          '</span>. Typing into its field below selects it.';
      } else {
        dom.providerHint.innerHTML = 'Runs on your machine — no key needed. ' +
          'Set the server address below; type a pulled model name into Model.';
      }
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
    var ready = !providerNeedsKey(t.id) || !!getProviderKey(t.id);
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
  function chatThinkingOf(provider, payload) {
    try {
      if (typeof provider.thinking === 'function' && provider.thinking(payload)) {
        return (payload.message && payload.message.thinking) || '';
      }
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
    if (providerNeedsKey(t.id) && !getProviderKey(t.id)) {
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
        var thinking = chatThinkingOf(t.provider, payload);
        if (!reply && !thinking) throw emptyReplyError(payload);
        settle({
          role: 'assistant',
          label: t.model + ' · ' + (Date.now() - started) + ' ms',
          text: reply,
          thinking: thinking
        });
      })
      .catch(function (err) {
        var info = t.id === 'ollama'
          ? { title: ollamaFailureText(err), message: '' }
          : providerErrorText(t.provider, err);
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
    if (providerNeedsKey(id) && !getProviderKey(id)) {
      line.textContent = 'Add a ' + provider.label + ' key first.';
      line.setAttribute('data-state', 'missing');
      return Promise.resolve();
    }
    btn.disabled = true;
    line.textContent = 'Testing…';
    line.setAttribute('data-state', 'missing');
    var started = Date.now();
    var done = false;

    // A local 35B model answered a one-word ping in 35 seconds. With only a
    // static "Testing…" that is indistinguishable from a hang, so count up,
    // and give up rather than spin forever.
    var ticker = window.setInterval(function () {
      if (done) return;
      line.textContent = 'Testing… ' + Math.round((Date.now() - started) / 1000) + 's';
    }, 1000);

    function finish(ok, text) {
      if (done) return;
      done = true;
      window.clearInterval(ticker);
      btn.disabled = false;
      line.textContent = text;
      line.setAttribute('data-state', ok ? 'ready' : 'missing');
    }
    window.setTimeout(function () {
      finish(false, 'Timed out after ' + Math.round(TEST_TIMEOUT_MS / 1000) + 's. A large local model can be slower — try a smaller one.');
    }, TEST_TIMEOUT_MS);
    function elapsed() { return (Date.now() - started) + ' ms'; }

    if (id === 'ollama') {
      // Reachability alone is not a useful answer: /api/tags returning 200
      // while the chosen model is not installed is exactly how a green test
      // preceded a failed generation. Prove the model can answer.
      return fetchOllamaModels()
        .then(function (list) {
          syncOllamaModelOptions(list);
          if (!list.length) {
            finish(false, 'Reachable, but no models installed. Run: ollama pull llama3.1');
            return null;
          }
          var wanted = currentOllamaModel();
          if (list.indexOf(wanted) === -1) {
            finish(false, 'Model "' + wanted + '" is not installed. Installed: ' + list.join(', '));
            return null;
          }
          return llmRequest(provider, wanted, '', provider.testBody(wanted))
            .then(function (payload) {
              if (!provider.extract(payload) && !providerThinking(payload, provider)) throw emptyReplyError(payload);
              finish(true, 'OK · ' + wanted + ' · ' + elapsed());
            });
        })
        .catch(function (err) {
          finish(false, ollamaFailureText(err));
        });
    }

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
        if (!provider.extract(payload) && !providerThinking(payload, provider)) {
          throw emptyReplyError(payload);
        }
        finish(true, 'OK · ' + model + ' · ' + elapsed());
      })
      .catch(function (err) {
        var info = providerErrorText(provider, err);
        finish(false, info.title + (info.message ? ' — ' + info.message : ''));
      });
  }

  // Any thinking trace on the first choice, whatever the provider names it.
  function providerThinking(payload, provider) {
    try {
      // Ollama's native API puts the trace at message.thinking, not under
      // choices[]. Without this a reasoning model's ping looks like silence,
      // and the test fails against a server that answered 200.
      if (provider && typeof provider.thinking === 'function' && provider.thinking(payload)) return 'thinking';
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
      staleBar.hidden = !(state.builder === 'html' && state.htmlBytes >= 0 && state.data &&
        (state.url !== state.htmlUrl || state.byteSize !== state.htmlBytes));
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
    var icon = el('div', 'empty-icon');
    icon.appendChild(svgIcon(['M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z', 'M4 10h16M9 10v9'], 22));
    box.appendChild(icon);
    box.appendChild(el('p', 'empty-title', 'Explore any API'));
    box.appendChild(el('p', 'empty-body',
      'Enter an API endpoint and Imago will turn the response into a readable interface.'));
    box.appendChild(el('p', 'chip-row-label', 'Try an example'));

    var picker = el('div', 'example-picker');
    var select = el('select', 'example-select');
    select.setAttribute('aria-label', 'Try an example API');
    fillExampleSelect(select);
    select.addEventListener('change', function () { pickExample(select); });
    picker.appendChild(select);
    box.appendChild(picker);
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
      generateInterfaceNow();
    });
    box.appendChild(btn);
    dom.interfaceOut.appendChild(box);
  }

  // kind 'note' is for states that are not failures (no key yet): red is
  // reserved for something that actually went wrong.
  function showAlert(title, body, kind, action) {
    var box = el('div', kind === 'note' ? 'alert alert-note' : 'alert');
    var ico = el('span', 'alert-ico');
    ico.appendChild(svgIcon(['M12 8v5', 'M12 16.2v.1', 'M10.3 4.3 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z'], 17));
    box.appendChild(ico);
    var text = el('div');
    text.appendChild(el('p', 'alert-title', title));
    text.appendChild(el('p', 'alert-body', body));
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

  function applySpec(spec, source) {
    if (!spec) spec = normalizeSpec(buildFallbackSpec(state.data, state.url));
    if (!spec) spec = minimalSpec();
    state.spec = spec;
    state.specSource = source;
    state.pendingGenerate = false;

    dom.interfaceHead.hidden = true;   // the title lives in the lead row instead
    dom.cacheBadge.hidden = false;
    dom.cacheBadge.setAttribute('data-kind', source);
    dom.cacheBadge.textContent = source === 'generated' ? 'Generated'
      : source === 'cache' ? 'From schema cache' : 'Basic layout';

    resetInterfaceOut(false);

    // The page header the plan asked for: title, one line of context, and
    // what the reader can do next. Off stage the source badge sits here; on
    // stage it moves to the stage bar.
    var head = el('header', 'stage-head');
    var headTop = el('div', 'stage-head-top');
    headTop.appendChild(el('h1', 'stage-title', spec.title));
    headTop.appendChild(dom.cacheBadge);
    head.appendChild(headTop);
    if (spec.subtitle) head.appendChild(el('p', 'stage-sub', spec.subtitle));
    var actions = renderActions(spec.actions || [], state.data);
    if (actions) head.appendChild(actions);
    dom.interfaceOut.appendChild(head);

    dom.interfaceOut.appendChild(renderSpecBody(spec, state.data, state.diff));


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
    document.body.classList.add('is-stage');
    syncTrail();
    savePrefs();
  }

  function leaveStage() {
    state.stage = false;
    state.stagePref = false;
    state.stack = [];
    document.body.classList.remove('is-stage');
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
    leaveStage();
  }

  function followUrl(url) {
    if (!isUrl(url)) { toast('That field is not a URL.', 'error'); return; }
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
    // Remember what is actually on screen. performRequest can refuse (another
    // request in flight) or fail, and either way the reader must not be left
    // looking at page A's data under page B's URL and crumb.
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

  /* ── Saved requests ────────────────────────────────────────────────────── */

  // Saved-list avatars carry a letter, not a colour: the semantic set is
  // reserved for changed / live / failed, and purple is banned outright.

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
        var onScreen = !!state.data && (item.id === state.activeRequestId || item.url === state.url);
        var li = el('li', 'saved-item' + (onScreen ? ' is-active' : ''));

        var open = el('button', 'saved-open');
        open.type = 'button';
        open.title = item.url;
        open.setAttribute('aria-label', 'Open ' + item.name);
        if (onScreen) open.setAttribute('aria-current', 'page');
        open.addEventListener('click', function () { loadSavedRequest(item.id); });

        open.appendChild(el('span', 'saved-avatar', (item.name || '?').charAt(0).toUpperCase()));
        var main = el('span', 'saved-main');
        main.appendChild(el('span', 'saved-name', item.name));
        main.appendChild(el('span', 'saved-url', hostOf(item.url) || item.url));
        open.appendChild(main);

        var status = el('span', 'saved-status');
        if (onScreen && state.changedCount > 0) {
          status.appendChild(el('span', 'saved-changed', String(state.changedCount)));
        }
        if (onScreen && state.refreshIntervalMs) {
          var live = el('span', 'saved-live');
          live.title = 'Watching';
          status.appendChild(live);
        } else if (!onScreen) {
          status.appendChild(el('span', 'saved-when', formatRelative(item.lastUsedAt || item.createdAt)));
        }
        open.appendChild(status);
        li.appendChild(open);

        var del = el('button', 'icon-btn saved-delete danger');
        del.type = 'button';
        del.title = 'Delete';
        del.setAttribute('aria-label', 'Delete ' + item.name);
        del.appendChild(svgIcon(['M4 6.5h16', 'M9.5 6.5V4.8h5v1.7', 'M6.5 6.5 7.4 20h9.2l.9-13.5'], 14));
        del.addEventListener('click', function () { deleteSavedRequest(item.id); });
        li.appendChild(del);

        dom.savedList.appendChild(li);
      })(list[i]);
    }
  }

  /* ── History strip ──────────────────────────────────────────────────────
     Time made visible: one tick per stored fetch of this endpoint, yellow
     where that fetch changed something. Only the newest snapshot keeps its
     body, so a tick opens the Changes inspector rather than an old page.
     ---------------------------------------------------------------------- */

  function renderHistory() {
    var strip = dom.historyStrip;
    if (!strip) return;
    var list = state.data ? getSnapshotsFor(currentRequestKey()) : [];
    clear(strip);
    if (list.length < 2) { strip.hidden = true; return; }
    strip.hidden = false;

    var changedFetches = 0;
    for (var c = 0; c < list.length; c += 1) if (list[c] && list[c].changed > 0) changedFetches += 1;

    var head = el('div', 'history-head');
    head.appendChild(el('span', 'history-title', 'History'));
    head.appendChild(el('span', 'history-count', list.length + ' fetches'));
    if (changedFetches) {
      var hot = el('span', 'history-hot', changedFetches + ' changed something');
      head.appendChild(hot);
    }
    strip.appendChild(head);

    var track = el('div', 'history-track');
    track.setAttribute('role', 'list');
    for (var i = 0; i < list.length; i += 1) {
      (function (snap, isLast) {
        var tick = el('button', 'history-tick' + (snap.changed > 0 ? ' is-changed' : '') + (isLast ? ' is-now' : ''));
        tick.type = 'button';
        tick.setAttribute('role', 'listitem');
        var when = snap.fetchedAt ? formatClock(new Date(snap.fetchedAt).getTime()) : '';
        var label = when + (snap.changed > 0 ? ' · ' + snap.changed + ' changed' : ' · no change') + (isLast ? ' · on screen' : '');
        tick.title = label;
        tick.setAttribute('aria-label', label);
        tick.addEventListener('click', function () { setActiveTab('changes'); });
        track.appendChild(tick);
      })(list[i], i === list.length - 1);
    }
    strip.appendChild(track);

    var foot = el('div', 'history-foot');
    var first = list[0] && list[0].fetchedAt ? formatClock(new Date(list[0].fetchedAt).getTime()) : '';
    foot.appendChild(el('span', null, first));
    foot.appendChild(el('span', null, 'now'));
    strip.appendChild(foot);
  }

  // The rail's examples: one tap loads a demo, the same as the picker.
  function renderRailExamples() {
    if (!dom.railExamples) return;
    clear(dom.railExamples);
    for (var i = 0; i < DEMOS.length; i += 1) {
      (function (demo) {
        var li = el('li');
        var b = el('button', 'rail-example');
        b.type = 'button';
        b.appendChild(el('span', 'rail-example-name', demo.name));
        b.appendChild(el('span', 'rail-example-host', hostOf(demo.url)));
        b.addEventListener('click', function () { loadExample(demo.url); });
        li.appendChild(b);
        dom.railExamples.appendChild(li);
      })(DEMOS[i]);
    }
  }

  function loadExample(url) {
    state.stack = [];
    if (state.pane !== 'playground') setAppPane('playground');
    navigateTo(url, '');   // public demo host: the last endpoint's headers stay behind
  }

  // Every write to the URL box goes through here so Save reads as unavailable
  // while there is nothing to save (it used to look live and answer with an
  // error toast). aria-disabled, not disabled: the click handler still checks
  // the real value, so a stale flag can never block a legitimate save.
  function setUrlInput(value) {
    dom.urlInput.value = value;
    syncSaveBtn();
  }
  function syncSaveBtn() {
    if (!dom.saveBtn || !dom.urlInput) return;
    dom.saveBtn.setAttribute('aria-disabled', dom.urlInput.value.trim() ? 'false' : 'true');
  }

  function saveCurrentRequest() {
    var url = dom.urlInput.value.trim();
    if (!url) { toast('Enter a URL before saving.', 'error'); return; }

    var list = getSavedRequests();
    // Saved requests live in localStorage, which outlives the tab. Strip the
    // credential headers the same way prefs does; the user re-enters them.
    var split = redactSecretHeaders(parseHeaders(dom.headersInput.value));
    var headers = split.safe;
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
    if (split.redacted.length) {
      toast(split.redacted.join(', ') + ' not saved — credentials stay in this session.', 'warn');
    }
  }

  function loadSavedRequest(id) {
    var list = getSavedRequests();
    var found = null;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) { found = list[i]; break; }
    }
    if (!found) return;
    // A click mid-request would put B's URL and headers over page A.
    if (state.inFlight) return;

    state.activeRequestId = found.id;
    setUrlInput(found.url);
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

  // The destructive action users reach for to remove their credentials. It has
  // to clear the in-memory state too: savePrefs() runs on the next pane change,
  // tab change or `beforeunload`, and would otherwise write the header text
  // straight back out of state.
  function clearAllData() {
    try {
      window.localStorage.removeItem(STORE.requests);
      window.localStorage.removeItem(STORE.specs);
      window.localStorage.removeItem(STORE.snaps);
      window.localStorage.removeItem(STORE.prefs);
      for (var ki = 0; ki < PROVIDER_IDS.length; ki += 1) {
        window.localStorage.removeItem(KEYS[PROVIDER_IDS[ki]]);
      }
    } catch (err) { /* ignore */ }
    invalidateSnapshotCache();
    setSessionHeaders('');
    syncKeyInputs();
    setKeyStatus();

    state.activeRequestId = null;
    state.diff = null;
    state.changedCount = 0;
    state.headersText = '';
    state.headers = {};
    state.url = '';
    state.stack = [];
    if (dom.headersInput) dom.headersInput.value = '';
    if (dom.urlInput) setUrlInput('');

    // Write a clean prefs object now rather than waiting for the next
    // savePrefs to serialise whatever is still in memory.
    setPrefs({ onboarded: true });

    renderSavedList();
    renderChangesPane();
    renderStorageSummary();
    updateMeta();
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

  // Header names whose values are credentials. Matched case-insensitively
  // against the whole name, so `x-api-key` matches but `x-api-version` does not.
  var SECRET_HEADER = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|apikey|x-auth-token|auth-token|x-access-token|access-token|x-csrf-token|x-session-token|token|secret|x-secret)$/i;

  function sameOrigin(a, b) {
    try { return new URL(a).origin === new URL(b).origin; } catch (err) { return false; }
  }

  // Splits a header map into the part that is safe to persist and the names of
  // the credentials that were withheld. Credentials live in the session only.
  function redactSecretHeaders(headers) {
    var safe = {}, redacted = [];
    var names = Object.keys(headers || {});
    for (var i = 0; i < names.length; i += 1) {
      if (SECRET_HEADER.test(names[i].trim())) redacted.push(names[i]);
      else safe[names[i]] = headers[names[i]];
    }
    return { safe: safe, redacted: redacted };
  }

  function hasSecretHeader(text) {
    return redactSecretHeaders(parseHeaders(text)).redacted.length > 0;
  }

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
      fetchedAt: snapshot.fetchedAt, status: snapshot.status, changed: snapshot.changed || 0,
      data: null, omitted: true
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

  // Returns false when the request was refused before any fetch started, so
  // navigateTo can roll back the stack push and URL-bar write it already did.
  function performRequest(isAuto) {
    if (state.inFlight) return false;

    var url = dom.urlInput.value.trim();
    if (!url) {
      toast('Enter an API URL first.', 'error');
      return false;
    }
    var parsed;
    try {
      parsed = new URL(url);
    } catch (err) {
      toast('That URL is not valid.', 'error');
      return false;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      toast('Only http and https URLs are supported.', 'error');
      return false;
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
          changed: state.changedCount,
          data: data
        });
        renderHistory();

        touchSavedRequest(url);
        // These two panes stringify the whole body and build ~1500 spans. On a
        // 10s auto-refresh that ran every tick for tabs nobody was looking at.
        state.rawPaneDirty = true;
        state.schemaPaneDirty = true;
        if (state.tab === 'raw') renderRawPane();
        if (state.tab === 'schema') renderSchemaPane();
        renderChangesPane();
        updateMeta();

        if (state.byteSize > LARGE_RESPONSE_BYTES) {
          toast('Large response (' + formatBytes(state.byteSize) + ') — only a compact sample goes to ' + getProvider(getSessionProvider()).label + '.');
        }

        return resolveSpec(url, print, false);
      })
      .then(function () {
        state.dirtySinceSend = false;
        state.navRestorePoint = null;   // the navigation committed
        // A pending Generate prompt is waiting on the reader. Ticking behind it
        // re-renders the prompt (re-enabling the button they just pressed) and
        // spends another request per tick.
        if (state.refreshIntervalMs && !state.pendingGenerate) startTimer();
      })
      .catch(function (err) { handleRequestFailure(err, isAuto); })
      // Both arms, not a trailing .then: if handleRequestFailure itself throws
      // this must still run, or inFlight stays true, the send button stays
      // disabled, and every later request returns at the in-flight guard —
      // the app is silently bricked until reload.
      .then(finishRequest, finishRequest);
  }

  function finishRequest() {
    state.inFlight = false;
    if (dom.sendBtn) dom.sendBtn.disabled = false;
    updateMeta();
    savePrefs();
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

    // A failed navigation must not leave the URL bar, crumb and request key
    // describing a page that never loaded while page A's data is on screen.
    if (state.navRestorePoint) {
      rollbackNavigation(state.navRestorePoint);
      state.navRestorePoint = null;
    }

    if (state.data && state.spec) {
      // The loading state cleared the pane — put the last good interface back
      // so a failure never costs you the view you were reading.
      applySpec(state.spec, state.specSource);
      showAlert(isAuto ? 'Auto-refresh failed' : title, detail);
    } else {
      if (state.stage) leaveStage();
      dom.interfaceHead.hidden = true;
      resetInterfaceOut(false);
      var box = el('div', 'empty');
      box.appendChild(el('p', 'empty-title', title));
      box.appendChild(el('p', 'empty-body', detail));
      dom.interfaceOut.appendChild(box);
    }
  }

  /* ── Spec resolution: cache → (explicit) model call → fallback ─────────────── */

  // The no-key state, said once and quietly: the page rendered fine, it is
  // just the basic layout. It used to be a banner, a toast, a badge and a
  // top-bar pill all saying the same thing, and on a phone the banner pushed
  // the data below the fold. One line under the title, with the way out.
  // Called after the fallback renders, since applySpec clears the pane.
  function noKeyAlert() {
    var provider = getProvider(getSessionProvider());
    var line = el('p', 'keyline');
    line.appendChild(el('span', null, 'No ' + provider.label + ' key, so this is the basic layout.'));
    var add = el('button', 'keyline-action', 'Add a key');
    add.type = 'button';
    add.addEventListener('click', function () { setAppPane('settings'); });
    line.appendChild(add);
    var head = dom.interfaceOut.querySelector('.stage-head');
    if (head) {
      var sub = head.querySelector('.stage-sub');
      head.insertBefore(line, sub ? sub.nextSibling : head.children[1] || null);
      dom.cacheBadge.hidden = true;   // the line says it; the badge would repeat it
    } else {
      dom.interfaceOut.insertBefore(line, dom.interfaceOut.firstChild);
    }
  }

  // The active provider has no key but another one does: switch to it rather
  // than spending a call that can only 401. Returns true when a usable key
  // is now active.
  function useKeyedProvider() {
    var active = getSessionProvider();
    // A keyless provider (Ollama) is usable as-is; a keyed one only with its
    // key. Fallback re-homes to a *keyed* provider that has one — never to
    // Ollama uninvited, or every keyless user would bounce into localhost.
    if (providerUsable(active)) return true;
    for (var i = 0; i < PROVIDER_IDS.length; i += 1) {
      if (providerNeedsKey(PROVIDER_IDS[i]) && getProviderKey(PROVIDER_IDS[i])) {
        setSessionProvider(PROVIDER_IDS[i]);
        syncProviderUi({ force: true });
        setKeyStatus();
        toast('Switched to ' + getProvider(PROVIDER_IDS[i]).label + ' — it has a key.', 'ok');
        return true;
      }
    }
    return false;
  }

  function resolveSpec(url, print, userTriggered) {
    if (state.builder === 'html') {
      return resolveHtml(url, print, userTriggered);
    }
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

    if (!useKeyedProvider()) {
      applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
      noKeyAlert();
      return Promise.resolve();
    }

    if (!userTriggered) {
      // A brand new shape costs a model call, so ask before spending it.
      state.pendingGenerate = true;
      showGeneratePrompt();
      return Promise.resolve();
    }

    return callGemini(url, print);
  }

  // One switch, two controls (the playground toggle and the Settings
  // select). Every change routes through here so they can never disagree.
  function syncBuilderUi() {
    if (dom.builderSelect) dom.builderSelect.value = state.builder;
    var pairs = [[dom.builderPlanBtn, 'spec'], [dom.builderHtmlBtn, 'html']];
    for (var i = 0; i < pairs.length; i += 1) {
      var btn = pairs[i][0], mode = pairs[i][1];
      if (!btn) continue;
      var on = state.builder === mode;
      btn.className = on ? 'seg-btn is-active' : 'seg-btn';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function setBuilder(mode, silent) {
    state.builder = mode === 'html' ? 'html' : 'spec';
    savePrefs();
    syncBuilderUi();
    if (!silent) {
      toast(state.builder === 'html'
        ? 'Full-HTML builder on — the model writes the whole page, sandboxed.'
        : 'Structured-plan builder on.');
    }
    // Re-resolve what is on screen so the switch is visible immediately:
    // a remembered artefact applies, otherwise the generate prompt.
    if (state.data && state.schemaHash) {
      resolveSpec(state.url, { hash: state.schemaHash, schema: state.schema }, false);
    }
  }

  // HTML-mode twin of the spec cache path above: same honesty rules (cache,
  // then key check, then ask before spending), different artefact.
  function resolveHtml(url, print, userTriggered) {
    var cache = getSchemaSpecs();
    var cached = cache[print.hash];

    if (cached && cached.html) {
      var doc = normalizeHtmlDoc(cached.html);
      if (doc) {
        cached.lastUsedAt = new Date().toISOString();
        cache[print.hash] = cached;
        setSchemaSpecs(cache);
        applyHtml(doc, 'cache');
        return Promise.resolve();
      }
    }

    if (!useKeyedProvider()) {
      applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
      noKeyAlert();
      return Promise.resolve();
    }

    if (!userTriggered) {
      state.pendingGenerate = true;
      showGeneratePrompt();
      return Promise.resolve();
    }

    return callHtml(url, print);
  }

  function generateInterfaceNow() {
    if (!state.data || !state.schemaHash) return;
    if (state.generating) return;       // one model call at a time
    // A pressed button with no key behind it would only 401: say so instead.
    if (!useKeyedProvider()) {
      applySpec(normalizeSpec(buildFallbackSpec(state.data, state.url)), 'fallback');
      noKeyAlert();
      return;
    }
    if (state.builder === 'html') {
      showInterfaceLoading('Writing a full HTML page…');
      callHtml(state.url, { hash: state.schemaHash, schema: state.schema });
      return;
    }
    showInterfaceLoading('Designing an interface…');
    callGemini(state.url, { hash: state.schemaHash, schema: state.schema });
  }

  function callHtml(url, print) {
    state.generating = true;
    var providerId = getSessionProvider();
    var provider = getProvider(providerId);
    var model = (dom.modelName.value || '').trim() || provider.defaultModel;
    var apiKey = getActiveKey();

    return generateHtml({
      url: url,
      schema: print.schema,
      sample: compactSample(state.data),
      provider: providerId,
      model: model,
      apiKey: apiKey
    }).then(function (doc) {
      // Same mid-flight race as the spec path: a refresh landing while the
      // model writes must not file the page under a shape it never saw.
      if (state.schemaHash !== print.hash) {
        throw wrapError('Response changed while the page was being written',
                        'The data was refreshed mid-request. Press Regenerate for the new shape.');
      }

      var store = getSchemaSpecs();
      var entry = store[print.hash] || {
        hash: print.hash, schema: print.schema,
        sourceUrl: url, createdAt: new Date().toISOString()
      };
      // A page can be several times fatter than a plan. Cache it only while
      // it fits — an oversized doc still renders, it just is not remembered.
      if (doc.length <= MAX_CACHED_HTML_BYTES) {
        entry.html = doc;
        entry.model = model;
        entry.lastUsedAt = new Date().toISOString();
        store[print.hash] = entry;
        setSchemaSpecs(store);
      } else {
        toast('Page too large to remember — it will be rewritten next time.', 'warn');
      }

      applyHtml(doc, 'generated');
      toast('Page generated' + (doc.length <= MAX_CACHED_HTML_BYTES ? ' and remembered as ' + print.hash : ''), 'ok');
    }).catch(function (err) {
      var htmlInfo = providerErrorText(provider, err);

      applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
      showAlert(htmlInfo.title, htmlInfo.message);
      toast(htmlInfo.title, 'error');
    }).then(function () { state.generating = false; },
            function () { state.generating = false; });
  }

  function callGemini(url, print) {
    state.generating = true;
    var providerId = getSessionProvider();
    var provider = getProvider(providerId);
    var model = (dom.modelName.value || '').trim() || provider.defaultModel;
    var apiKey = getActiveKey();

    return generateSpec({
      url: url,
      schema: print.schema,
      sample: compactSample(state.data),
      provider: providerId,
      model: model,
      apiKey: apiKey
    }).then(function (rawSpec) {
      // An auto-refresh tick can land while the model is thinking and replace
      // state.data with a differently shaped body. Caching this spec under the
      // stale print.hash, or applying it to the new data, is how a plan for one
      // shape ends up rendering another.
      if (state.schemaHash !== print.hash) {
        throw wrapError('Response changed while the interface was being designed',
                        'The data was refreshed mid-request. Press Generate again for the new shape.');
      }

      var normalized = normalizeSpec(rawSpec);
      if (!normalized) throw wrapError(provider.label + ' returned an unusable spec', 'Falling back to a heuristic interface.');

      var store = getSchemaSpecs();
      store[print.hash] = {
        hash: print.hash, schema: print.schema, spec: normalized, model: model,
        sourceUrl: url, createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString()
      };
      setSchemaSpecs(store);

      applySpec(normalized, 'generated');
      toast('Interface generated and remembered as ' + print.hash, 'ok');
    }).catch(function (err) {
      var info = providerErrorText(provider, err);

      applySpec(normalizeSpec(buildFallbackSpec(state.data, url)), 'fallback');
      showAlert(info.title, info.message);
      toast(info.title, 'error');
    }).then(function () { state.generating = false; },
            function () { state.generating = false; });
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
    if (dom.savedList) renderSavedList();   // the rail's live dot follows
  }

  // Setup and settings inputs share the <id>Key convention: setup boxes are
  // setup<CapitalisedId>Key, settings boxes are <id>Key.
  function setupKeyInputFor(id) {
    return dom['setup' + id.charAt(0).toUpperCase() + id.slice(1) + 'Key'];
  }

  /* ── Events ────────────────────────────────────────────────────────────── */

  function wireEvents() {
    var relayoutHandle = null;
    window.addEventListener('resize', function () {
      if (relayoutHandle) window.clearTimeout(relayoutHandle);
      relayoutHandle = window.setTimeout(scheduleTimelineLayout, 140);
    });

    // No key gate in front of the product: straight to a rendered page.
    dom.landingStart.addEventListener('click', function () { enterApp(); });
    dom.landingSkip.addEventListener('click', function () { enterApp(); });
    wireSpecimen();
    dom.landingAbout.addEventListener('click', function () {
      toast('Imago turns an API response into an interface, remembers the shape, and watches it change.');
    });

    dom.setupContinue.addEventListener('click', function () {
      var lastFilled = '';
      for (var ki = 0; ki < PROVIDER_IDS.length; ki += 1) {
        var id = PROVIDER_IDS[ki];
        var box = setupKeyInputFor(id);
        var value = box ? box.value.trim() : '';
        if (value) {
          setProviderKey(id, value);
          lastFilled = id;
        }
      }
      // Last field wins the default — the key just typed is the one in use.
      if (lastFilled) setSessionProvider(lastFilled);
      if (lastFilled) {
        syncProviderUi({ force: true });
        syncKeyInputs();
        setKeyStatus();
        toast('Keys saved on this device.', 'ok');
      }
      enterApp();
    });
    dom.setupLater.addEventListener('click', function () { enterApp(); });
    for (var si = 0; si < PROVIDER_IDS.length; si += 1) {
      (function (input) {
        if (!input) return;
        input.addEventListener('keydown', function (event) {
          if (event.key === 'Enter') { event.preventDefault(); dom.setupContinue.click(); }
        });
      })(setupKeyInputFor(PROVIDER_IDS[si]));
    }

    dom.appNav.addEventListener('click', function (event) {
      // The Settings button wraps an icon and a label; a click lands on those.
      var btn = event.target && event.target.closest && event.target.closest('[data-view]');
      if (btn) setAppPane(btn.getAttribute('data-view'));
    });
    dom.brandHome.addEventListener('click', function () { setAppPane('playground'); });
    dom.brandHome.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setAppPane('playground'); }
    });
    if (dom.settingsClose) dom.settingsClose.addEventListener('click', function () { setAppPane('playground'); });
    if (dom.sheetScrim) dom.sheetScrim.addEventListener('click', function () { setAppPane('playground'); });
    if (dom.railClose) dom.railClose.addEventListener('click', function () { setAppPane('playground'); });
    if (dom.inspectBtn) {
      dom.inspectBtn.addEventListener('click', function () {
        setActiveTab(state.tab === 'interface' ? (state.inspectTab || 'changes') : 'interface');
      });
    }
    renderRailExamples();
    // The pill is the fastest route to the keys: one click opens Settings.
    dom.keyStatus.addEventListener('click', function () { setAppPane('settings'); });
    dom.keyStatus.style.cursor = 'pointer';

    dom.reqForm.addEventListener('submit', function (event) {
      event.preventDefault();
      state.stack = [];          // a typed URL starts a new trail
      state.stagePref = true;
      performRequest(false);
    });

    dom.stageBack.addEventListener('click', goBack);
    window.addEventListener('popstate', function (event) {
      var depth = (event.state && event.state.imagoDepth) || 0;
      if (depth >= state.historyDepth) return;   // forward, or not one of ours
      var steps = state.historyDepth - depth;
      state.historyDepth = depth;
      if (state.stage) stepBack(steps);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // Innermost first: a sheet, then the inspector, then the trail.
      if (state.pane !== 'playground') { setAppPane('playground'); return; }
      if (state.tab !== 'interface') { setActiveTab('interface'); return; }
      if (state.stage) goBack();
    });
    if (dom.modelName) {
      dom.modelName.addEventListener('input', function () {
        setSessionModel(dom.modelName.value.trim());
        syncChatTarget();
      });
    }

    dom.urlInput.addEventListener('input', function () {
      state.activeRequestId = null;
      syncSaveBtn();
      markDirty();
    });

    dom.saveBtn.addEventListener('click', saveCurrentRequest);
    if (dom.exampleSelect) {
      fillExampleSelect(dom.exampleSelect);
      dom.exampleSelect.addEventListener('change', function () {
        pickExample(dom.exampleSelect);
      });
    }
    // A new request starts from an empty command bar.
    dom.newRequestBtn.addEventListener('click', function () {
      setAppPane('playground');
      state.stack = [];
      state.activeRequestId = null;
      setUrlInput('');
      dom.headersInput.value = '';   // the next host must not inherit these
      markDirty();
      renderSavedList();
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

    // The WAI-ARIA tablist keyboard contract: Left/Right move between tabs,
    // Home/End jump to the ends. Focus follows selection, which is the right
    // pattern here because switching a pane is cheap and has no side effects.
    dom.tabBar.addEventListener('keydown', function (event) {
      var keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
      if (keys.indexOf(event.key) === -1) return;
      var buttons = [].slice.call(dom.tabBar.querySelectorAll('button'));
      if (!buttons.length) return;
      var current = buttons.indexOf(document.activeElement);
      if (current === -1) return;
      var next;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else if (event.key === 'ArrowRight') next = (current + 1) % buttons.length;
      else next = (current - 1 + buttons.length) % buttons.length;
      event.preventDefault();
      var tabName = buttons[next].getAttribute('data-tab');
      if (tabName) setActiveTab(tabName);
      buttons[next].focus();
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

    dom.providerSelect.addEventListener('change', function () {
      setSessionProvider(dom.providerSelect.value);
      syncProviderUi({ force: true });
      setKeyStatus();
      toast('Provider set to ' + getProvider(dom.providerSelect.value).label + '.');
    });
    if (dom.ollamaEndpoint) {
      dom.ollamaEndpoint.addEventListener('input', function () {
        var prefs = getPrefs();
        prefs.ollamaEndpoint = dom.ollamaEndpoint.value.trim();
        setPrefs(prefs);
      });
    }

    for (var wi = 0; wi < PROVIDER_IDS.length; wi += 1) {
      (function (id) {
        var input = keyInputFor(id);
        if (input) input.addEventListener('input', function () { storeKeyFromInput(input, id); });
        var testBtn = dom[id + 'TestBtn'];
        if (testBtn) testBtn.addEventListener('click', function () { testProvider(id); });
      })(PROVIDER_IDS[wi]);
    }
    dom.modelName.addEventListener('input', function () {
      setSessionModel(dom.modelName.value.trim());
    });
    if (dom.builderSelect) {
      dom.builderSelect.addEventListener('change', function () {
        setBuilder(dom.builderSelect.value);
      });
    }
    var segBtns = [[dom.builderPlanBtn, 'spec'], [dom.builderHtmlBtn, 'html']];
    for (var bi = 0; bi < segBtns.length; bi += 1) {
      (function (btn, mode) {
        if (btn) btn.addEventListener('click', function () { setBuilder(mode); });
      })(segBtns[bi][0], segBtns[bi][1]);
    }
    dom.clearKeyBtn.addEventListener('click', function () {
      for (var ci = 0; ci < PROVIDER_IDS.length; ci += 1) {
        setProviderKey(PROVIDER_IDS[ci], '');
      }
      syncKeyInputs();
      syncProviderUi();
      setKeyStatus();
      toast('All keys cleared.');
    });

    if (dom.chatForm) {
      dom.chatForm.addEventListener('submit', function (event) {
        event.preventDefault();
        var text = dom.chatInput ? dom.chatInput.value : '';
        if (!text.trim() || chatBusy) return;
        if (dom.chatInput) dom.chatInput.value = '';
        sendChat(text);
      });
    }
    if (dom.chatClearBtn) dom.chatClearBtn.addEventListener('click', clearChat);

    dom.clearStorageBtn.addEventListener('click', function () {
      if (!window.confirm('Clear all saved requests, cached interfaces, snapshots and API keys?')) return;
      clearAllData();
      toast('All saved data cleared.', 'ok');
    });

    // keep "x ago" honest while idle
    window.setInterval(function () { if (!state.tickHandle && state.data) updateMeta(); }, 10000);
    window.addEventListener('beforeunload', savePrefs);
  }

  // The landing hero: one response and the interface it became, for three
  // examples. The switcher swaps both halves; Try an example opens the app on
  // whichever one is showing.
  function wireSpecimen() {
    var root = document.querySelector('.specimen');
    if (!root) return;
    var tabs = root.querySelectorAll('.specimen-switch button');
    var url = DEMOS[0].url;
    function show(name) {
      for (var i = 0; i < tabs.length; i += 1) {
        var on = tabs[i].getAttribute('data-example') === name;
        tabs[i].classList.toggle('is-active', on);
        tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) {
          var shown = qs('specimenUrl');
          if (shown) shown.textContent = tabs[i].getAttribute('data-url');
        }
      }
      var panes = root.querySelectorAll('.spec-pane');
      for (var j = 0; j < panes.length; j += 1) {
        var match = panes[j].getAttribute('data-example') === name;
        panes[j].hidden = !match;
        panes[j].classList.toggle('is-active', match);
      }
      var demo = { pokemon: 'pokeapi.co', weather: 'open-meteo', library: 'openlibrary' }[name];
      for (var d = 0; d < DEMOS.length; d += 1) {
        if (DEMOS[d].url.indexOf(demo) !== -1) { url = DEMOS[d].url; break; }
      }
    }
    for (var t = 0; t < tabs.length; t += 1) {
      (function (tab) {
        tab.addEventListener('click', function () { show(tab.getAttribute('data-example')); });
      })(tabs[t]);
    }
    if (dom.landingTry) {
      dom.landingTry.addEventListener('click', function () {
        var prefs = getPrefs();
        prefs.onboarded = true;
        setPrefs(prefs);
        showView('app');
        loadExample(url);
      });
    }
  }

  /* ── Bootstrap ─────────────────────────────────────────────────────────── */

  function cacheDom() {
    var ids = ['landingView', 'setupView', 'appView', 'landingStart', 'landingSkip', 'landingAbout', 'landingTry',
                'setupGeminiKey', 'setupGroqKey', 'setupContinue', 'setupLater', 'appNav', 'brandHome', 'keyStatus', 'avatar',
                'panePlayground', 'paneSaved', 'paneSettings', 'reqForm', 'urlInput', 'sendBtn', 'saveBtn',
                'exampleSelect', 'refreshToggle', 'refreshInterval', 'livePill', 'liveCount', 'runMeta', 'stLastChecked',
               'stSize', 'stCache', 'stChanged', 'changedChip', 'nextChip', 'stNextRefresh', 'tabBar',
               'interfaceCard', 'interfaceHead', 'interfaceTitle', 'cacheBadge', 'interfaceOut',
               'rawOut', 'copyRaw', 'schemaOut', 'schemaHashChip', 'changesOut', 'snapshotsOut',
                'headersInput', 'savedList', 'savedEmpty', 'newRequestBtn', 'geminiKey', 'groqKey',
                'geminiKeyStatus', 'groqKeyStatus', 'modelName',
                'clearKeyBtn', 'clearStorageBtn', 'storageSummary', 'toast', 'builderSelect',
                'builderPlanBtn', 'builderHtmlBtn',
                'geminiTestBtn', 'geminiTestStatus', 'groqTestBtn', 'groqTestStatus',
                'ollamaTestBtn', 'ollamaTestStatus', 'modelOptions', 'modelNote',
               'chatLog', 'chatForm', 'chatInput', 'chatSendBtn', 'chatTarget', 'chatClearBtn',
                'providerSelect', 'providerHint', 'modelHint', 'ollamaEndpoint',
                'ollamaServerGroup', 'ollamaNoteOrigin',
               'stageBar', 'stageBack', 'stageCrumb', 'stageLive', 'stageLiveCount', 'stageSource',
               'inspectBtn', 'inspector', 'historyStrip', 'railExamples', 'railClose',
               'settingsClose', 'sheetScrim'];
    for (var i = 0; i < ids.length; i += 1) dom[ids[i]] = qs(ids[i]);
  }

  function enterApp() {
    var prefs = getPrefs();
    var firstRun = !prefs.onboarded;
    prefs.onboarded = true;
    setPrefs(prefs);
    showView('app');
    // Value before the key: a first visit opens on a real page, rendered from
    // the basic layout. The key is asked for when it would buy something.
    if (firstRun && !state.data && !dom.urlInput.value.trim()) loadExample(DEMOS[0].url);
  }

  // One-time move from the old single session key: file it under the provider
  // its prefix names, then drop the session copies so they stop shadowing.
  function migrateLegacyKeys() {
    var moved = false;
    try {
      var slots = [window.sessionStorage.getItem('imago.apiKey'),
                   window.sessionStorage.getItem('imago.geminiKey')];
      for (var i = 0; i < slots.length; i += 1) {
        var legacy = slots[i];
        if (!legacy) continue;
        var id = detectProvider(legacy) || DEFAULT_PROVIDER;
        if (!getProviderKey(id)) setProviderKey(id, legacy);
        moved = true;
      }
      window.sessionStorage.removeItem('imago.apiKey');
      window.sessionStorage.removeItem('imago.geminiKey');
    } catch (e) { /* ignore */ }
    return moved;
  }

  function restoreSession() {
    if (migrateLegacyKeys()) toast('Your saved key was moved to the new per-provider store.', 'ok');
    // The OpenCode provider was removed; drop its slot if one was ever stored.
    try { window.localStorage.removeItem('imago.key.opencode'); } catch (e) { /* ignore */ }
    syncKeyInputs();
    if (dom.ollamaEndpoint) {
      try { dom.ollamaEndpoint.value = String(getPrefs().ollamaEndpoint || ''); }
      catch (e) { /* ignore */ }
    }
    dom.modelName.value = getSessionModel() || getProvider(getSessionProvider()).defaultModel;
    setSessionModel(dom.modelName.value);
    syncProviderUi();
    setKeyStatus();
  }

  function restoreLastView() {
    var prefs = getPrefs();

    state.builder = prefs.builder === 'html' ? 'html' : 'spec';
    syncBuilderUi();

    if (prefs.lastUrl) setUrlInput(prefs.lastUrl);
    syncSaveBtn();
    // Older builds persisted headers to localStorage. Migrate them into the
    // session once, then scrub the durable copy so the credentials stop
    // surviving a browser restart.
    if (prefs.lastHeadersText) {
      setSessionHeaders(prefs.lastHeadersText);
      delete prefs.lastHeadersText;
      setPrefs(prefs);
    }
    var sessionHeaders = getSessionHeaders();
    if (sessionHeaders) dom.headersInput.value = sessionHeaders;
    state.headersText = sessionHeaders;
    state.activeRequestId = prefs.activeRequestId || null;
    state.url = prefs.lastUrl || '';
    state.refreshIntervalMs = Number(prefs.refreshIntervalMs) || 0;
    state.stagePref = prefs.stage !== false;
    syncRefreshUi();

    setAppPane('playground');   // sheets do not reopen on reload
    setActiveTab(prefs.activeTab || 'interface');
    renderSavedList();

    if (!restoreFromSnapshot(state.url)) {
      // No body to show: an inspector reopened now would have no tab bar to
      // close it with, and would cover the canvas on a phone.
      setActiveTab('interface');
      dom.tabBar.hidden = true;
      showInterfaceEmpty();
      updateMeta();
    }
  }

  // Rebuild a page from its newest stored snapshot without spending a request.
  // Used on reload, and by Back — a browser does not refetch history either.
  function restoreFromSnapshot(url) {
    var snapshot = latestSnapshotWithData(url ? hashString(url) : '');
    if (!snapshot) return false;

    state.url = url;
    state.data = snapshot.data;
    state.dataUrl = url;
    state.status = snapshot.status;
    state.lastCheckedAt = new Date(snapshot.fetchedAt).getTime();
    state.diff = null;
    state.changedCount = 0;
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

    if (state.builder === 'html') {
      var htmlEntry = getSchemaSpecs()[print.hash];
      var cachedDoc = htmlEntry && htmlEntry.html ? normalizeHtmlDoc(htmlEntry.html) : null;
      if (cachedDoc) applyHtml(cachedDoc, 'cache');
      else if (useKeyedProvider()) {
        state.pendingGenerate = true;
        showGeneratePrompt();
      } else {
        applySpec(normalizeSpec(buildFallbackSpec(snapshot.data, url)), 'fallback');
        noKeyAlert();
      }
      updateMeta();
      return true;
    }

    var entry = getSchemaSpecs()[print.hash];
    var normalized = entry && entry.spec ? normalizeSpec(entry.spec) : null;
    if (normalized) applySpec(normalized, 'cache');
    else applySpec(normalizeSpec(buildFallbackSpec(snapshot.data, url)), 'fallback');

    updateMeta();
    return true;
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

  /* ── Test seam ─────────────────────────────────────────────────────────
     This file is one IIFE with no module boundary, so the unit suite has no
     other way in: the pure helpers plus the state/dom objects the tests assert
     against are hung off one object here.

     This grants no capability an attacker did not already have. Everything
     reachable through it — including getActiveKey — reads browser storage on
     the same origin, which any script running in this page can read directly.
     It is a convenience for tests, not a trust boundary. See TESTING.md.
     ────────────────────────────────────────────────────────────────────── */
  window.__imago = {
    state: state, dom: dom, STORE: STORE, SESSION: SESSION,
    // pure helpers
    parsePath: parsePath, canonPath: canonPath, getByPath: getByPath,
    isUrl: isUrl, isImageUrl: isImageUrl, formatValue: formatValue,
    formatBytes: formatBytes, byteLength: byteLength, humanize: humanize,
    deriveSchema: deriveSchema, mergeSchemas: mergeSchemas,
    stableStringify: stableStringify, hashString: hashString,
    fingerprint: fingerprint, flatten: flatten, diffData: diffData,
    normalizeSpec: normalizeSpec, normalizeActions: normalizeActions,
    buildFallbackSpec: buildFallbackSpec, deriveActions: deriveActions,
    escapeHtml: escapeHtml, highlightJson: highlightJson,
    parseHeaders: parseHeaders, headersToText: headersToText,
    endpointTitle: endpointTitle, hostOf: hostOf,
    sameOrigin: sameOrigin, redactSecretHeaders: redactSecretHeaders,
    // storage
    readJSON: readJSON, writeJSON: writeJSON,
    getPrefs: getPrefs, setPrefs: setPrefs, savePrefs: savePrefs,
    getSnapshots: getSnapshots, setSnapshots: setSnapshots,
    invalidateSnapshotCache: invalidateSnapshotCache,
    fetchOllamaModels: fetchOllamaModels, ollamaBase: ollamaBase, ollamaAltBase: ollamaAltBase,
    sendChat: sendChat, clearChat: clearChat, chatTarget: chatTarget,
    chatTurns: function () { return chatTurns; },
    getSessionHeaders: getSessionHeaders, setSessionHeaders: setSessionHeaders,
    hasSecretHeader: hasSecretHeader, minimalSpec: minimalSpec,
    rollbackNavigation: rollbackNavigation, finishRequest: finishRequest,
    pushSnapshot: pushSnapshot, getSnapshotsFor: getSnapshotsFor,
    getSchemaSpecs: getSchemaSpecs, getSavedRequests: getSavedRequests,
    getActiveKey: getActiveKey, getProviderKey: getProviderKey,
    setProviderKey: setProviderKey, hasAnyKey: hasAnyKey,
    getSessionProvider: getSessionProvider, setSessionProvider: setSessionProvider,
    getProvider: getProvider,
    // examples
    DEMOS: DEMOS, fillExampleSelect: fillExampleSelect, pickExample: pickExample,
    // full-html builder
    normalizeHtmlDoc: normalizeHtmlDoc, buildHtmlPrompt: buildHtmlPrompt,
    applyHtml: applyHtml, setBuilder: setBuilder,
    testProvider: testProvider, providerErrorText: providerErrorText,
    // behaviour
    applySpec: applySpec, performRequest: performRequest,
    goBack: goBack, stepBack: stepBack, pushHistory: pushHistory,
    followUrl: followUrl, navigateTo: navigateTo,
    handleRequestFailure: handleRequestFailure,
    renderRawPane: renderRawPane, renderSchemaPane: renderSchemaPane,
    setActiveTab: setActiveTab, enterStage: enterStage, leaveStage: leaveStage,
    updateMeta: updateMeta,
    restoreFromSnapshot: restoreFromSnapshot, currentRequestKey: currentRequestKey,
    clearAllData: clearAllData,
    callGemini: callGemini, generateInterfaceNow: generateInterfaceNow,
    resolveSpec: resolveSpec, getSchemaSpecs: getSchemaSpecs, showInterfaceEmpty: showInterfaceEmpty, setUrlInput: setUrlInput,
    loadSavedRequest: loadSavedRequest,
    setAppPane: setAppPane, renderHistory: renderHistory, renderSavedList: renderSavedList,
    enterApp: enterApp, isBookkeeping: isBookkeeping, stripBody: stripBody,
    init: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
