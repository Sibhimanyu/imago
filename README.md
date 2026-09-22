# Imago

**APIs become interfaces.**

Imago is a browser-only API playground. You give it a GET endpoint; it fetches the
JSON, works out what *shape* the response is, asks a model to design an interface for
that shape, and renders it with its own components. It remembers every interpretation
it has made, and it watches endpoints change over time.

Most API tools stop at pretty-printed JSON. Imago reads the JSON and builds the view
the data deserves — a Pokémon becomes a profile with stat bars and type badges, a
weather endpoint becomes metrics and a temperature chart, a book search becomes a table.

> **imago** *(n.)* — Latin for *image*; in entomology, the final, fully-formed adult
> stage an insect reaches after metamorphosis. Raw JSON goes in; its finished form
> comes out.

---

## How it works

```
API URL
  → fetch()
  → JSON response
  → derive structural schema  (values replaced by their types)
  → hash that schema
  → seen this shape before?
      yes → reuse the stored UI spec          (no model call)
      no  → ask (once) → the model returns a UI spec → store it
  → render the spec with local components
  → snapshot the response and diff it against the last one
```

The important detail: **the model never returns HTML, CSS, or JavaScript.** It returns a
small structured JSON plan — which fields matter and how each should be represented —
and Imago's own renderer turns that plan into DOM. Every value is written with
`textContent`, so nothing from the API or the model is ever interpreted as markup.

A spec looks like this:

```json
{
  "title": "Pikachu",
  "layout": "profile",
  "components": [
    { "type": "image",    "path": "sprites.front_default", "label": "Sprite" },
    { "type": "metric",   "path": "height", "label": "Height", "emphasis": "hero" },
    { "type": "badges",   "path": "types",  "label": "Types", "itemPath": "type.name" },
    { "type": "statBars", "path": "stats",  "label": "Base stats",
      "labelPath": "stat.name", "valuePath": "base_stat", "max": 255 }
  ]
}
```

The renderer supports `title`, `text`, `metric`, `image`, `badges`, `list`, `table`,
`keyValue`, `gauge`, `timeline`, `statBars`, `chart`, `link`, `jsonBlock`, and
`section`. Anything else in a model response is discarded before rendering.

### The renderer does not trust the plan

A plan is written against a *schema*, so it can be wrong about the response: a `text`
aimed at an object, a `chart` aimed at a string, a path that resolves to nothing. The
renderer reconciles every component against the value it actually found and renders
what that value can support — an object becomes a key/value sheet, an array of objects
becomes a table, an array of numbers becomes a chart. No card ever renders as
`{27 fields}`.

Two more passes run before anything is drawn:

- **Meaning.** Every scalar is classified from its value *and* its key, then written
  for a human: `2026-09-20T08:03:52+02:00` renders as **08:03** with the date beneath
  it, `44036` under `day_length` renders as **12h 13m**, `64.51` under
  `moon_illumination` renders as **64.51%** with a meter. The untouched value is always
  one hover away in the element's `title`.
- **Hierarchy.** Components are split into three tiers — one or two headline values,
  a dense fact sheet, then the wide structures (tables, charts, timelines). A page of
  identically sized cards is not an interface.

`emphasis: "hero"` marks the field the reader came for; `emphasis: "quiet"` marks
bookkeeping. If a plan says nothing, Imago ranks the fields itself.

### The plan is the whole page

Once a plan renders, it takes the screen. The request bar, tabs, meta chips and app
navigation step aside; what remains is the generated page and a single **Back**
control. The plan decides the page's `layout` (`profile`, `dashboard`, `table`, `list`,
`article`, `timeline`, `raw`), its sections and hierarchy, and — through `actions` —
what the reader can do next:

```json
"actions": [
  { "type": "follow",  "path": "species.url", "label": "Species" },
  { "type": "follow",  "path": "next",        "label": "Next page" },
  { "type": "watch",   "interval": 30,        "label": "Watch" },
  { "type": "refresh", "label": "Refresh" },
  { "type": "raw",     "label": "Raw JSON" }
]
```

`follow` opens a URL found in the response as the next generative page; Imago keeps a
trail, so Back pops through the pages you followed and, from the first one, returns
you to the controls (typing a new URL, headers, saving, settings). `watch` turns on
auto-refresh at the given interval, `refresh` fetches now, `raw` reveals the JSON at
the bottom of the page. A `follow` whose path does not hold a URL at render time is
dropped silently. The browser's Back button and <kbd>Esc</kbd> do the same as Back.

### When there is no key, or no model

The fallback plan is not a last resort — it is the same renderer driven by local
heuristics: it hoists a `current`/`results` object to the surface, pairs numbers with
their `*_units` siblings, collects three or more timestamps into a timeline, turns
named numeric arrays into stat bars, chooses table columns by what identifies a row
(and follows `{ name, url }` wrappers to the name), sinks `generationtime_ms` and
friends to the bottom of the page, picks a layout, and turns every URL in the body —
paging keys first — into a `follow` action.

### Schema caching

Two responses with the same structure produce the same fingerprint:

```js
{ "temperature": 31, "humidity": 72 }   // temperature:number, humidity:number
{ "temperature": 25, "humidity": 81 }   // ...same shape → same hash
```

So refreshing an endpoint every 10 seconds for an hour is ~360 API calls and, if the
shape never changes, **one** model call. The cache is what makes auto-refresh cheap
enough to be worth having.

Because a new shape costs a real API call, Imago asks before spending one — a new
schema shows a **Generate interface** button rather than silently calling out.

---

## How this satisfies the assignment

**Get something from the internet.** Imago fetches any public GET endpoint you give it
with `fetch()`, and calls a model provider REST API to interpret the response.

**Remember something.** In `localStorage`: your saved requests, the schema-to-interface
mappings Imago has generated, response snapshots, and your session (URL, active tab and
pane, refresh interval, whether you've onboarded). Reload the page and you land back
where you were — with the last interface rebuilt from the stored snapshot, without
spending a request.

Request headers are the exception. They are where an `Authorization: Bearer ...` goes,
so they get the same treatment as your model key: `sessionStorage`, gone when the tab
closes. Saving a request keeps its ordinary headers and drops the credential ones, and
tells you which. Following a link out of a response never carries your headers to a
different host.

**React to time.** Auto-refresh at 10s / 30s / 60s with a live countdown and a pulsing
Live indicator; a "last checked" clock that ages as you watch it; and snapshot
comparison that highlights exactly which values changed since the previous fetch —
both as a list of changed paths and as a `CHANGED` flag on the affected components.

These aren't three features bolted together. Imago remembers *how it interpreted a
shape* so it doesn't have to think twice, and it uses time to show you *what moved*.
Memory and time are the product.

---

## Running it

No build step, no framework, and nothing the browser has to download but the three
files in this repo. Any static server works:

```bash
python3 -m http.server 5173
```

Then open <http://127.0.0.1:5173>.

Use a real server rather than opening `index.html` as a `file://` URL — CORS behaves
far more predictably from `http://127.0.0.1`.

### Tests

npm is used for the test suite only; nothing it installs is shipped.

```bash
npm install
npm test
```

Vitest and jsdom, run against the same `app.js` the browser gets. See
[TESTING.md](TESTING.md) before adding tests — `app.js` is a single IIFE reached
through a test seam, and jsdom has a few traps that are documented there.

### Getting an API key

Imago supports two providers. Paste a key and it picks the right one from the key
prefix; you can also choose explicitly in **Settings**.

| Provider | Get a key | Default model | If that model is gone |
|---|---|---|---|
| Google Gemini | <https://aistudio.google.com/apikey> | `gemini-2.5-flash-lite` | `gemini-3.5-flash` |
| Groq | <https://console.groq.com/keys> | `openai/gpt-oss-20b` | `openai/gpt-oss-120b` |

Gemini keys start with `AIza`, Groq keys with `gsk_`, which is how the
auto-detection works.

Both providers are asked to pin their reply to the UI spec schema — Gemini
through `responseMimeType` + `responseSchema`, Groq through
`response_format: json_schema`. If a model family ignores that, Imago retries
once in plain JSON mode with the schema inlined in the prompt.

Groq note: `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` were deprecated
for free and developer tiers on 17 June 2026, which is why the default is
`openai/gpt-oss-20b`. The model field is editable, so a future rename costs you
one edit rather than a new build.

**Imago never stores your key in `localStorage`.** It lives in `sessionStorage`
and is gone when you close the tab. There is no backend, so there is nowhere to
hide a shared key — you use your own, and it stays on your machine.

### Without a key

Imago still works. Without a key — or if the provider fails, rate-limits, or returns
something unusable — it falls back to a heuristic interface built from the response
itself: it finds a title field, the most likely primary image, and the first handful of
scalar fields. The badge beside the title always tells you which path you got:
`Generated`, `From schema cache`, or `Fallback`.

---

## Demo endpoints

Built into the empty state as one-click chips:

| | |
|---|---|
| Pokémon | `https://pokeapi.co/api/v2/pokemon/pikachu` |
| Weather | `https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1` |
| Dictionary | `https://api.dictionaryapi.dev/api/v2/entries/en/imago` |
| Books | `https://openlibrary.org/search.json?title=the+hobbit&limit=5` |
| Sunset | `https://api.sunrise-sunset.org/json?lat=13.0827&lng=80.2707&formatted=0` |
| Charizard | `https://pokeapi.co/api/v2/pokemon/charizard` |

Any CORS-friendly GET endpoint works. Optional request headers are supported under the
Headers tab, one `Name: value` per line. Endpoints that don't send CORS headers can't
be reached from any browser-only app — Imago reports that clearly rather than failing
silently.

---

## Files

```
index.html    landing, onboarding, and app shell
styles.css    design system and all three layouts
app.js        everything else, in labelled sections
test/         vitest suite (not shipped)
publish.sh    assembles dist/ for deployment
```

`app.js` is organised as: constants → state → storage → DOM helpers → path utilities →
schema fingerprinting → snapshot diffing → providers → spec validation → renderer →
views → saved requests → request flow → auto-refresh → events → bootstrap → test seam.

---

## Limits

GET only. No POST/PUT/PATCH, no OAuth, no cookies, no GraphQL or WebSockets, no
collections or environments. Imago is not trying to be Postman — the whole idea is the
response-to-interface step, so everything else stays out of the way.

Snapshots are capped at 10 per endpoint, and only the newest keeps its response body,
so tracking a 300 KB endpoint costs one body rather than ten.

---

## Tool usage disclosure

ChatGPT was used for ideation and planning. Claude (via Claude Code) was used for
implementation support.
