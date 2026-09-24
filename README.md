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

### Paste a curl command

The command bar takes a URL or a curl command: whatever API docs or your
browser's dev tools ("Copy as cURL") hand you. Pasting one runs it: the URL goes
in the box and the headers go in Inspect → Headers, with a chip in the command
bar saying how many are set. `-u` becomes Basic auth, `-G -d` becomes a query
string, and headers the browser sets itself (Cookie, User-Agent, …) are left out
and named. Headers stay in this tab's session.

### Edit a page

**Edit** puts a small bar on each field: rename its label, move it to the
Headline, Normal or Details, or hide it. Hidden fields are listed above the page,
each with a **Show** button, and **Reset page** puts everything back. Edits are
saved for the response *shape*, so every endpoint that returns the same shape
gets the same page, and a share link carries the edited page. Watch pauses while
you edit.

### Know when a watched page changes

With **Watch** on, a change found while you are in another tab puts a count in
the tab title ("(3) Forecast — Imago") until you come back. Turning Watch on
also offers, once, to send a browser notification that says what changed
("Rate: 1.1 → 1.2"). Nothing asks for permission unprompted, and the title
count works without it.

### Share a page

**Share** copies a link that opens the same page for someone else: the
endpoint and its layout, so they see what you see even without a key of their
own. The link never carries your headers, keys or the response itself; their
browser fetches fresh data. A layout from a link is checked like a model's plan
and is not saved into their cache. If the endpoint needed your headers, you are
told the link may not load for others.

### One screen

Imago is one screen. The command bar (paste a URL) sits on top, your saved endpoints
sit in a rail on the left, and the page the response became is the white canvas in
the middle. Each saved endpoint shows a green dot while it is being watched and a
yellow count when its last fetch changed something. **Inspect** opens the raw
material (Response, Schema, Changes, Headers) in a drawer beside the page, and
Settings opens as a sheet over it; <kbd>Esc</kbd> closes whichever is on top. The
Imago mark in the corner goes back to the landing page, and **Open app** returns you
to the page you left. On a phone the command bar moves to the bottom of the screen,
the endpoints open as a sheet, and every control is at least 44px to tap.

Under the page title, a **history strip** draws one tick per stored fetch, yellow
where that fetch changed something; a tick opens the Changes drawer. Only the newest
snapshot keeps its body, so the strip shows *when* things moved, not old pages.

The page itself is the plan. It decides the `layout` (`profile`, `dashboard`, `table`, `list`,
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
trail, and a **Back** control appears above the page once you have followed a link;
it pops through the pages you followed. `watch` turns on
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
so they stay in `sessionStorage`, gone when the tab closes. Saving a request keeps
its ordinary headers and drops the credential ones, and tells you which. Following
a link out of a response never carries your headers to a different host.

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

Vitest and jsdom, run against the same modules the browser gets (bundled into one
script for jsdom, which cannot run module scripts). See [TESTING.md](TESTING.md)
before adding tests — the suite reaches the app through a test seam, and jsdom has
a few traps that are documented there.

### Getting an API key

Imago supports three providers — two keyed, one local. The keyed providers have
one key box each in **Settings → API keys**. Typing into a box selects that
provider; the pill in the header shows what is active (`Google Gemini ready`,
`No Groq key`, `No keys`) and opens Settings on click.

| Provider | Get a key | Default model | If that model is gone |
|---|---|---|---|
| Google Gemini | <https://aistudio.google.com/apikey> | `gemini-2.5-flash-lite` | `gemini-3.5-flash` |
| Groq | <https://console.groq.com/keys> | `openai/gpt-oss-20b` | `openai/gpt-oss-120b` |
| Ollama (local) | none — runs on your machine | `qwen3` (type any pulled model) | any other pulled model |

If the active provider has no key but the other one does, Imago switches over
rather than spending a call that can only fail.

**Settings → Connection tests** pings each provider with one tiny call and says
inline what happened — `OK`, `rejected the API key`, or `Unreachable` for
Ollama with the origins fix. A red test there means generating would fail too,
so check it before blaming an endpoint for a failure.

### Ollama

Pick **Ollama (local)**, pull a model (`ollama pull qwen3`), type its name into
the Model field, and generate — no key involved. The server address is editable
in Settings (default `http://localhost:11434`).

Two honest limits, both on the browser's side, not Imago's:

- Imago must run on the **same machine** as Ollama, and the server must allow
  the page's origin: `OLLAMA_ORIGINS=http://localhost:5173 ollama serve`
  (add the hosted origin too if you use both).
- From the **hosted site** (`*.onslate.in`) Chrome additionally demands a
  Private-Network-Access header Ollama does not send (upstream issue
  `ollama/ollama#7000`), so hosted-to-local calls fail there. Local
  development server → local Ollama is the supported shape.

Both providers are asked to pin their reply to the UI spec schema — Gemini
through `responseMimeType` + `responseSchema`, Groq through
`response_format: json_schema`. If a model family ignores that, Imago retries
once in plain JSON mode with the schema inlined in the prompt.

Groq note: `llama-3.3-70b-versatile` and `llama-3.1-8b-instant` were deprecated
for free and developer tiers on 17 June 2026, which is why the default is
`openai/gpt-oss-20b`. The model field is editable, so a future rename costs you
one edit rather than a new build.

**Imago stores your keys in this browser's `localStorage`** (`imago.key.gemini`,
`imago.key.groq`), so they survive a restart. There is no backend, so there is
nowhere to hide a shared key — you use your own, and it stays on your machine.
The tradeoff is plain: anyone with access to this browser profile can read them.
"Clear all keys" in Settings and "Clear all saved data" remove them.

### Without a key

Imago still works, and it says so plainly. Without a usable key it falls back to
a heuristic interface built from the response itself — it finds a title field,
the most likely primary image, and the first handful of scalar fields — with a
neutral notice naming the missing key, where a free one lives, and an **Add a
key** button that opens Settings. A first visit skips the key form entirely and
opens on a rendered example, so you see what Imago does before it asks for anything.
In this basic layout, unit tables are applied to their values, time series become
charts, located responses name the place in the subtitle, and bookkeeping
(generation times, offsets, raw coordinates) folds into a **Details** section at
the foot of the page. The badge beside the title always tells you which path you got:
`Generated`, `From schema cache`, or `Fallback`.

---

## Demo endpoints

Built into the **Try an example** list at the foot of the endpoint rail, and the
Examples picker in the page toolbar:

| | |
|---|---|
| Pokémon | `https://pokeapi.co/api/v2/pokemon/pikachu` |
| Weather | `https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1` |
| Dictionary | `https://api.dictionaryapi.dev/api/v2/entries/en/hello` |
| Currency | `https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,INR` |
| Trivia | `https://opentdb.com/api.php?amount=5` |
| Library | `https://openlibrary.org/search.json?title=the+hobbit&limit=5` |
| Thirukkural | `https://tamil-kural-api.vercel.app/api/kural/1` |
| Wikipedia | `https://en.wikipedia.org/api/rest_v1/page/summary/Chennai` |
| Sunrise & Sunset | `https://api.sunrise-sunset.org/json?lat=13.0827&lng=80.2707&formatted=0` |
| Charizard | `https://pokeapi.co/api/v2/pokemon/charizard` |

Any CORS-friendly GET endpoint works. Optional request headers are supported under
Inspect → Headers, one `Name: value` per line. Endpoints that don't send CORS headers can't
be reached from any browser-only app — Imago reports that clearly rather than failing
silently.

---

## Files

```
index.html    landing and app shell
styles.css    design system and all three layouts
js/           the app, as native ES modules (no build step)
test/         vitest suite (not shipped)
scripts/      design sync, screenshots, the module check (not shipped)
publish.sh    assembles dist/ for deployment
```

`js/main.js` is the entry point (`<script type="module">`). The modules, roughly in
dependency order:

| Module | What it holds |
|---|---|
| `config.js` | constants, the model providers, the example endpoints |
| `state.js` | the one `state` object and the `dom` element cache |
| `storage.js` | localStorage/sessionStorage: prefs, keys, saved requests, snapshots, cached plans |
| `edits.js` | page edits: storage, and the edit bar and panel |
| `util.js` | DOM helpers, path utilities, formatting |
| `values.js` | value semantics: what a value is and how it reads |
| `schema.js` | schema fingerprinting and snapshot diffing |
| `llm.js` | model calls: plan generation and the full-HTML builder |
| `spec.js` | plan validation and the basic (no-key) layout |
| `render.js` | the renderer: components, layout, charts |
| `ui.js` | toast, view routing, the meta row and key pill |
| `chat.js` | the Settings try-it console |
| `panes.js` | inspector panes, interface states, the stage and tabs |
| `endpoints.js` | the endpoint rail and the history strip |
| `request.js` | headers, curl import, snapshots, the request flow, plan resolution, auto-refresh |
| `main.js` | events, bootstrap, Watch alerts, share links, the test seam |

Modules import freely from each other (cycles are fine: everything shared is a
function or an object). `npm run check` fails if a module uses a name another
module declares without importing it, since without a build step that would
only surface as a blank page.

---

## Limits

GET only. No POST/PUT/PATCH, no OAuth, no cookies, no GraphQL or WebSockets, no
collections or environments. A pasted curl command that sends a body or another
method is refused with the reason.

It runs in the browser, so an API has to allow web pages (CORS). When a fetch
fails, Imago sends one no-cors probe (no headers, no cookies) to tell "this API
refuses web pages" apart from "this server is unreachable", and says which, and
whether your headers are the likely cause. Imago is not trying to be Postman — the whole idea is the
response-to-interface step, so everything else stays out of the way.

Snapshots are capped at 10 per endpoint, and only the newest keeps its response body,
so tracking a 300 KB endpoint costs one body rather than ten.

---

## Tool usage disclosure

ChatGPT was used for ideation and planning. Claude (via Claude Code) was used for
implementation support.
