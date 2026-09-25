# Listings

Where people already look for a tool like this, and what to post there. Each
one keeps working after it is posted: a listing is found by search long after
launch day.

## Show HN (Hacker News)

**Title:** Show HN: Imago – paste an API URL, get an interface instead of JSON

**URL:** https://imago.onslate.in

**First comment:**

> I kept doing the same thing with every new API: open the URL, scroll a
> screen of raw JSON, then write a throwaway page to see whether the data was
> any use. Imago skips the throwaway page.
>
> Paste a GET endpoint (or a curl command). It fetches the JSON, works out the
> response's shape, and draws a page for it: a Pokémon becomes a profile with
> stat bars, a forecast becomes metrics and a chart, a search becomes a table.
>
> A few things that might interest HN:
>
> - The model never writes HTML. It returns a small JSON plan (which fields
>   matter, which component shows each), and Imago's own renderer draws it with
>   textContent. Nothing from the API or the model is ever treated as markup.
> - The plan is cached by the response's *shape*, so watching an endpoint every
>   10 seconds for an hour is ~360 fetches and one model call.
> - It works with no key at all. The fallback is the same renderer driven by
>   heuristics, and a test fails if any sample API's field names leak into
>   those rules.
> - There is no backend. Keys stay in your browser. It's MIT-licensed, with no
>   build step: native ES modules.
>
> It only reads public, CORS-enabled GET endpoints, which is the honest limit
> of anything that runs only in a browser. I'd love reports of endpoints it
> draws badly. The Share button makes a link that shows me exactly what you saw.
>
> Code: https://github.com/Sibhimanyu/imago

Post on a weekday morning US Eastern time. Stay in the thread for the first
three hours.

## Product Hunt

- **Name:** Imago
- **Tagline (60):** Paste an API URL. Get an interface, not JSON.
- **Topics:** Developer Tools, APIs, Open Source
- **Pricing:** Free
- **Gallery:** `brand/kit/exports/imago-task3-blog-banner@2x.png`, then
  screenshots of the Pokémon profile, the weather dashboard and the Changes
  drawer. The launch video goes first if it's finished.
- **Description:**

> Imago reads a JSON response's shape and draws the page it deserves: headline
> values, a fact sheet, tables and charts. Save endpoints, turn on Watch, and
> it highlights exactly what changed since the last fetch. Share a page with a
> link that never carries your keys. It runs in your browser and is free and
> open source, with a free Gemini or Groq key or none at all.

- **Maker comment:** the Show HN first comment, cut to the first two paragraphs.

## AlternativeTo

List Imago as an alternative to **JSON Crack** (it turns JSON into pictures),
**Hoppscotch** and **Postman** (they're where people first call an API). The
difference to state in one line: *Imago draws the response as an interface,
not a tree or a pretty-printed body.*

- License: Open source (MIT)
- Platforms: Online, self-hosted
- Tags: api-client, json-viewer, developer-tools

## GitHub

- **Topics** on the repo: `api`, `json`, `api-client`, `json-viewer`,
  `developer-tools`, `generative-ui`, `no-build`, `vanilla-js`.
- **Awesome lists:** find current lists of API development tools and JSON
  tools, and send one pull request each with this line, in that list's own
  format:

  `- [Imago](https://github.com/Sibhimanyu/imago) - Paste an API URL and get an interface drawn from the response's shape. Browser-only, MIT.`

  Read each list's contributing rules first. Most want a certain number of
  stars or a certain age, so these can wait a few weeks after launch.
