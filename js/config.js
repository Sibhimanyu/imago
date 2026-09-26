import { dom } from './state.js';
import { getPrefs, setPrefs } from './storage.js';
import { keyHint } from './values.js';
import { init } from './main.js';

/* ── Constants ─────────────────────────────────────────────────────────── */

// The hosted-AI waitlist, the one place its address lives: a page on the
// gallery's own origin that posts to a Catalyst function. Empty hides every
// waitlist link. It is only ever a plain link: no form script, iframe or
// embed is loaded on this origin. See launch/pricing.md.
var WAITLIST_URL = 'https://imago-apis-oavuixyf.onslate.in/waitlist/';

var STORE = {
  requests: 'imago.savedRequests',
  specs: 'imago.schemaSpecs',
  snaps: 'imago.snapshots',
  prefs: 'imago.preferences',
  edits: 'imago.pageEdits'
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
// Snapshot bodies are kept for this many endpoints, the most recently
// fetched first. Each endpoint used to keep one body forever.
var MAX_SNAPSHOT_ENDPOINTS = 30;
// A table shows this many rows until the reader asks for all of them.
var MAX_EXPANDED_ROWS = 500;

// How long a request may hang before it is given up. Mutable, not
// constants, so the suite can shorten them instead of waiting.
var TIMEOUTS = {
  request: 30000,   // the endpoint itself
  model: 120000     // a model call; a big local model can take a while
};

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

// The four examples an empty page offers on a phone, where the rail's
// full list is behind the Endpoints sheet. One of each kind of page.
var EMPTY_EXAMPLES = ['Pokémon', 'Weather', 'Dictionary', 'Library'];

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
    titlePath: { type: 'string' },
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

export { WAITLIST_URL, STORE, SESSION, KEYS, PROVIDERS, OLLAMA_OPTIONS, PROVIDER_IDS, DEFAULT_PROVIDER, getProvider, providerNeedsKey, ollamaModels, fetchOllamaModels, isChatModel, pickOllamaModel, OLLAMA_DEFAULT_BASE, ollamaBase, ollamaAltBase, ollamaFetch, detectProvider, DEFAULT_MODEL, MAX_SNAPSHOTS, MAX_SNAPSHOT_BYTES, LARGE_RESPONSE_BYTES, SAMPLE_CHAR_LIMIT, MAX_COMPONENTS, MAX_ROWS, MAX_HTML_BYTES, MAX_CACHED_HTML_BYTES, MAX_SNAPSHOT_ENDPOINTS, MAX_EXPANDED_ROWS, TIMEOUTS, DEMOS, EMPTY_EXAMPLES, COMPONENT_TYPES, LAYOUTS, EMPHASIS, ACTION_TYPES, MAX_ACTIONS, IMAGO_UI_SPEC_JSON_SCHEMA };
