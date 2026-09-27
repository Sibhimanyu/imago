# Marketing: developers hear about it

Imago is free and open source, so the marketing is too: show the product
working, link to the code, and ask for one thing, **try it, then star the
repo**. No sign-up funnel, no email list, no social accounts to run.

## The API gallery

<https://imago.onslate.in/apis/>

Developers meeting a new API search for it: "pokeapi example response",
"open-meteo api". Each gallery page answers that search, then hands them to
Imago with that endpoint loaded.

| Page | What it shows |
|---|---|
| [PokeAPI](https://imago.onslate.in/apis/pokeapi/) | One Pokémon: sprite, stat bars, type badge |
| [Open-Meteo](https://imago.onslate.in/apis/open-meteo/) | A forecast with units rejoined and hours charted (credited, CC BY 4.0) |
| [Open Library](https://imago.onslate.in/apis/open-library/) | A search result as a table of books |
| [Frankfurter](https://imago.onslate.in/apis/frankfurter/) | The day's exchange rates |
| [Wikipedia](https://imago.onslate.in/apis/wikipedia/) | An article summary |
| [ISS](https://imago.onslate.in/apis/iss/) | The space station's position, and how it changes |

Every page has real text about the API (so search engines can read it), the
live response drawn by Imago's own renderer, a fallback screenshot, "Open it
in Imago", a link to that API's Discussions thread and the free-pricing
line. The reels stay in the press kit. There's a sitemap and robots.txt.

**Where it lives.** On imago.onslate.in itself, one site with the app:

| Path | What |
|---|---|
| `/` | The app |
| `/apis/`, `/apis/<api>/` | The gallery |
| `/press/` | The press kit, with the reels |
| `/waitlist/` | The hosted-AI waitlist |

**Build:** `./publish.sh` copies the app into `dist/`, runs
`node gallery/build.mjs` and merges `gallery/dist/` in (it stops if a gallery
file would replace an app file), then `catalyst deploy slate imago`.

## Measuring it: Zoho PageSense

Free forever up to 5,000 visitors a month: visitor analytics, heatmaps,
funnels and 5 goals. Set up on 2026-09-26:

- **Project:** "Imago API gallery" (`imago1`) in the `sibhimanyugt0` portal,
  with MCP access on so goals and reports can be read and changed from here.
- **Tracking code:** `pagesense.html`, in the `<head>` of every page on
  imago.onslate.in: the gallery build places it in its pages, and `index.html`
  carries the same tag (a test keeps the two identical). The app's CSP lets in
  PageSense's two hosts, `cdn-in.pagesense.io` and `static.zohocdn.com`.
  The trade-off: PageSense runs on the same site as people's model keys, so
  it could read them.
- **Goals** (link clicks, tracked on every page):
  - *Opened Imago from the gallery*: links starting `https://imago.onslate.in/#open=`
  - *Went to a Discussions thread*: links containing `github.com/Sibhimanyu/imago/discussions`
  - *Downloaded a press-kit reel*: links containing `/press/reels/`
  - *Went to the waitlist*: links containing `onslate.in/waitlist/`
- **Heatmap:** "Gallery heatmap" on every page, 5,000 visitors. It is
  created and configured; PageSense will let it launch once it registers the
  snippet (the snippet loads and sends data; the dashboard lags).
- **Cookie banner:** on, "notify visitors and allow to opt out".

**How we'll know it worked:** visits from search, which API pages they land
on, and the share who click through to Imago.

## Always on

- The landing page's live demo: a real forecast becomes an interface before
  the page asks for anything.
- The demo GIF at the top of the GitHub README.
