# Asset Descriptions

⚠️  No vision credentials — descriptions below are catalog-derived (alt text, headings, section context, filename) instead of Vision-generated. To get richer Vision descriptions on the next capture, set GEMINI_API_KEY (or GOOGLE_API_KEY), or HYPERFRAMES_VERTEX_PROJECT_ID plus HYPERFRAMES_VERTEX_SERVICE_ACCOUNT for Vertex service-account auth, and re-run.

The `logo-<hash>.svg` filename prefix is a structural hint (DOM said this SVG was inside a `<header>`, home-link `<a>`, or had an aria-label matching the page brand). To pick the actual brand logo without Vision, open the `logo-*` candidates in a previewer or rasterize them with `sharp` before referencing — composing a fake logo ships off-brand in the final video.

- favicon.svg — 1KB, favicon
- icon-apple-touch-icon-unsized.svg — 1KB, icon apple touch icon unsized
- icon-icon-unsized.svg — 1KB, icon icon unsized
- og-image.png — 66KB, og image
- svgs/logo-2319c4d2.svg — logo 2319c4d2
- svgs/logo-5627d4e9-2.svg — logo 5627d4e9 2
- svgs/logo-5627d4e9.svg — logo 5627d4e9
- svgs/logo-f35d744c.svg — logo f35d744c
- svgs/svg-0b955f7b.svg — svg 0b955f7b
- svgs/svg-11d4a7d5.svg — svg 11d4a7d5
- svgs/svg-1a91ac98.svg — svg 1a91ac98
- svgs/svg-4d9a6b36-2.svg — svg 4d9a6b36 2
- svgs/svg-4d9a6b36.svg — svg 4d9a6b36
- svgs/svg-579a1abe.svg — svg 579a1abe
- svgs/svg-78fc548a.svg — svg 78fc548a
- svgs/svg-9f2b04b3.svg — svg 9f2b04b3
- svgs/svg-ad4e1ff1.svg — svg ad4e1ff1
- svgs/svg-cce72b4e-2.svg — svg cce72b4e 2
- svgs/svg-cce72b4e.svg — svg cce72b4e
- svgs/svg-d1691132.svg — svg d1691132
- svgs/svg-f772f815.svg — svg f772f815

## Supplied from the repo (BRIEF.md → Assets)

- amigo-mascot.svg — Amigo, the mascot: single-colour (currentColor) standing body with aperture + two legs, 32×32 viewBox. The video's guide.
- imago-logo.svg — Imago primary lockup: Reveal mark + "Imago" wordmark, ink on transparent, 156×40.
- imago-logo-dark.svg — Imago lockup for dark grounds.
- imago-mark.svg — the Reveal mark alone, 32×32, currentColor.
- landing-full-page.png — 1920-wide capture of imago.onslate.in: "APIs become interfaces." hero, dark JSON panel (pokeapi pikachu) beside the drawn Pikachu card, Pokémon/Weather/Library tabs, three feature columns (Reads the shape · Remembers it · Watches it change) with "From schema cache", "Live · 24s", "Changed 3" pills.

## Real app captures (v2, captured 2026-09-25 from the current build at 1600×1000 @2x, no model key → basic layouts)

- app-pokemon.png — Imago app: sidebar (Endpoints, Try an example list of 10), GET bar with pokeapi pikachu URL, "Pikachu" interface: sprite, Base experience 112, Height 4, stat bars, Types electric, Abilities.
- app-weather.png — "Forecast" for open-meteo Chennai: Temperature 30.1 °C, Relative humidity 67 %, Wind 17.6 km/h, Hourly temperature line chart (24 points · low 27 · high 35.2).
- app-currency.png — "Frankfurter": Amount 1, Base USD, Date 24 Sep 2026, Rates EUR 0.8797, INR 95.96.
- app-library.png — "Openlibrary" The Hobbit search: table of 5 docs (The Hobbit · J.R.R. Tolkien · 1937 …), Number found 224.
- app-thirukkural.png — Kural 1: Tamil couplet chips, transliteration, English meaning, section Virtue.
- app-wikipedia.png — "Chennai" Wikipedia summary: photo, timestamp, description "Capital of Tamil Nadu, India", extract paragraph.
- app-sunrise.png — "Sunrise sunset": Sunrise 00:26, Day length 12h 7m, twilight grid (UTC).
- app-charizard.png — "Charizard": sprite, Base experience 240, Height 17, stat bars, Types fire/flying.
- app-watch.png — Forecast with Watch toggled ON, 30s interval, green "Live · 27s" pill, toast "Watching. Want a notification when it changes…".
- app-inspect.png — Forecast with the Inspect panel open (tabs Response · Schema · Changes · Headers), snapshot row "HTTP 200 · sch_1t1u1v1 · body stored".
- app-landing.png — landing: "APIs become interfaces." hero, URL input, dark JSON panel + drawn Forecast card, three feature columns.
