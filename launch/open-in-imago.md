# Put "Open in Imago" in your API's docs

If you publish a public JSON API, one line of Markdown lets every reader of
your docs see a response as an interface, not a wall of JSON. No sign-up, no
key, no script on your site.

[![Open in Imago](https://imago.onslate.in/assets/open-in-imago.svg)](https://imago.onslate.in/app/#open=https://api.open-meteo.com/v1/forecast?latitude=13.08&longitude=80.27&current=temperature_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1)

*(That one opens a live Open-Meteo forecast.)*

## The link

```
https://imago.onslate.in/app/#open=<your endpoint>
```

The app lives at `/app/`; links written before, as
`https://imago.onslate.in/#open=<endpoint>`, keep working.

Put the endpoint after `#open=` exactly as you would type it. Query strings
are fine. If the endpoint itself contains a `#`, encode it first
(`encodeURIComponent`).

## The badge

Markdown:

```markdown
[![Open in Imago](https://imago.onslate.in/assets/open-in-imago.svg)](https://imago.onslate.in/app/#open=https://api.example.com/v1/items/1)
```

HTML:

```html
<a href="https://imago.onslate.in/app/#open=https://api.example.com/v1/items/1">
  <img src="https://imago.onslate.in/assets/open-in-imago.svg" alt="Open in Imago" width="128" height="28">
</a>
```

## What your reader gets

- The endpoint fetched fresh in their browser, drawn as a page: headline
  values, a fact sheet, tables and charts for the wide parts.
- With no model key, the basic layout, which needs nothing from them. With a
  free Gemini or Groq key, a designed page.
- Links inside the response become buttons, so they can walk your API.

## What it needs from your API

- **HTTPS and a public GET.** Links to `http://`, `localhost` or a private
  address are refused, so a link cannot aim a reader's browser at their own
  network.
- **CORS.** `Access-Control-Allow-Origin: *` on the response. Without it no
  browser app can read your API, and Imago tells the reader so.
- **No secret in the link.** Anyone can read the address. If your endpoint
  needs a key, link to a sample that does not.

The reader's browser does all of it. Imago has no server, so nothing about
your API or your readers passes through one.
