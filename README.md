# Imago

**APIs become interfaces.**

Imago is a browser-only API playground. You give it a GET endpoint; it fetches the
JSON, works out what *shape* the response is, asks Gemini to design an interface for
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
      yes → reuse the stored UI spec          (no Gemini call)
      no  → ask (once) → Gemini returns a UI spec → store it
  → render the spec with local components
  → snapshot the response and diff it against the last one
```

The important detail: **Gemini never returns HTML, CSS, or JavaScript.** It returns a
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
    { "type": "metric",   "path": "height", "label": "Height" },
    { "type": "badges",   "path": "types",  "label": "Types", "itemPath": "type.name" },
    { "type": "statBars", "path": "stats",  "label": "Base stats",
      "labelPath": "stat.name", "valuePath": "base_stat", "max": 255 }
  ]
}
```

The renderer supports `title`, `text`, `metric`, `image`, `badges`, `list`, `table`,
`statBars`, `chart`, `link`, `jsonBlock`, and `section`. Anything else in a model
response is discarded before rendering.

### Schema caching

Two responses with the same structure produce the same fingerprint:

```js
{ "temperature": 31, "humidity": 72 }   // temperature:number, humidity:number
{ "temperature": 25, "humidity": 81 }   // ...same shape → same hash
```

So refreshing an endpoint every 10 seconds for an hour is ~360 API calls and, if the
shape never changes, **one** Gemini call. The cache is what makes auto-refresh cheap
enough to be worth having.

Because a new shape costs a real API call, Imago asks before spending one — a new
schema shows a **Generate interface** button rather than silently calling out.

---

## How this satisfies the assignment

**Get something from the internet.** Imago fetches any public GET endpoint you give it
with `fetch()`, and calls the Gemini REST API to interpret the response.

**Remember something.** In `localStorage`: your saved requests, the schema-to-interface
mappings Imago has generated, response snapshots, and your session (URL, headers,
active tab and pane, refresh interval, whether you've onboarded). Reload the page and
you land back where you were — with the last interface rebuilt from the stored
snapshot, without spending a request.

**React to time.** Auto-refresh at 10s / 30s / 60s with a live countdown and a pulsing
Live indicator; a "last checked" clock that ages as you watch it; and snapshot
comparison that highlights exactly which values changed since the previous fetch —
both as a list of changed paths and as a `CHANGED` flag on the affected components.

These aren't three features bolted together. Imago remembers *how it interpreted a
shape* so it doesn't have to think twice, and it uses time to show you *what moved*.
Memory and time are the product.

---

## Running it

No build step, no npm, no framework, no external dependency of any kind. Any static
server works:

```bash
python3 -m http.server 5173
```

Then open <http://127.0.0.1:5173>.

Use a real server rather than opening `index.html` as a `file://` URL — CORS behaves
far more predictably from `http://127.0.0.1`.

### Getting a Gemini API key

1. Go to <https://aistudio.google.com/apikey>.
2. Create an API key.
3. Paste it into the setup screen, or later under **Settings**.

**Imago never stores your key in `localStorage`.** It lives in `sessionStorage` and is
gone when you close the tab. There is no backend, so there is nowhere to hide a shared
key — you use your own, and it stays on your machine.

The model field defaults to `gemini-2.5-flash-lite` and is editable. If that model is
unavailable to you, try `gemini-3.5-flash`.

### Without a key

Imago still works. Without a key — or if Gemini fails, rate-limits, or returns
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
```

`app.js` is organised as: constants → state → storage → DOM helpers → path utilities →
schema fingerprinting → snapshot diffing → Gemini → spec validation → renderer →
views → saved requests → request flow → auto-refresh → events → bootstrap.

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
