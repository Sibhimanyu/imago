# Marketing: developers hear about it

Imago is free and open source, so the marketing is too: show the product
working, link to the code, and ask for one thing, **try it, then star the
repo**. No sign-up funnel, no email list, no social accounts to run.

## The API gallery

<https://imago-apis-oavuixyf.onslate.in>

Developers meeting a new API search for it: "pokeapi example response",
"open-meteo api". Each gallery page answers that search, then hands them to
Imago with that endpoint loaded.

| Page | What it shows |
|---|---|
| [PokeAPI](https://imago-apis-oavuixyf.onslate.in/pokeapi/) | One Pokémon: sprite, stat bars, type badge |
| [Open-Meteo](https://imago-apis-oavuixyf.onslate.in/open-meteo/) | A forecast with units rejoined and hours charted (credited, CC BY 4.0) |
| [Open Library](https://imago-apis-oavuixyf.onslate.in/open-library/) | A search result as a table of books |
| [Frankfurter](https://imago-apis-oavuixyf.onslate.in/frankfurter/) | The day's exchange rates |
| [Wikipedia](https://imago-apis-oavuixyf.onslate.in/wikipedia/) | An article summary |
| [ISS](https://imago-apis-oavuixyf.onslate.in/iss/) | The space station's position, and how it changes |

Every page has real text about the API (so search engines can read it), the
live response drawn by Imago's own renderer, a fallback screenshot, "Open it
in Imago", a link to that API's Discussions thread, the free-pricing line,
and a reel. There's a sitemap and robots.txt.

**Where it lives, and why.** It is a second Zoho Catalyst Slate app on its own
address, not part of imago.onslate.in. Imago keeps people's model keys in the
browser, where any script on that site could read them, so the analytics
script must never run there. A different address is a different site to the
browser, and cannot see Imago's storage.

**Build:** `node gallery/build.mjs` → `gallery/dist/`, deployed with
`catalyst deploy slate imago-apis`.

## Measuring it: Zoho PageSense

Free forever up to 5,000 visitors a month: visitor analytics, heatmaps,
funnels and 5 goals.

1. Create a PageSense project for the gallery address.
2. Put the tracking snippet in `gallery/pagesense.html`; the build places it
   in every page's `<head>`.
3. Goals: clicks on links starting `https://imago.onslate.in/#open=` (visitors
   who went on to Imago), and clicks to the waitlist and to Discussions.

**How we'll know it worked:** visits from search, which API pages they land
on, and the share who click through to Imago.

## Always on

- The landing page's live demo: a real forecast becomes an interface before
  the page asks for anything.
- The demo GIF at the top of the GitHub README.
