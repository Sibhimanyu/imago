# Zoho Social: the two-week launch run

Fourteen posts, one a day, each scheduled in Zoho Social for **LinkedIn**
(profile) and **X**. Every image is in [`social/`](social/), captured from
the live site. Each post shows one real API becoming a page, or one thing
Imago does that other tools don't.

- **When:** 9:30 am IST on weekdays. Post Day 1 on the same morning as Show HN
  and dev.to (see [marketing.md](marketing.md)).
- **Call to action:** try it, then star the repo. Nothing to sign up for.
- **Links:** the `#open=` links go straight to that API's page, so every post
  is also a demo.
- **Images:** all are the basic layout (no model key), which is what a new
  visitor sees first. If you want Generated pages for any post, add your key,
  open the same link and replace the image.
- X counts every link as 23 characters. Every X post below fits in 280.
- **Open-Meteo credit.** Their data is CC BY 4.0, so any post showing it
  names them: Day 3 in the text, and the landing page image (Days 7, 8, 13)
  carries the credit under the demo.

---

### Day 1: Imago is live
**Media:** `social/demo.mp4` (LinkedIn), `social/demo.gif` (X)

**LinkedIn**
> You found a free API. Before you use it, you want to know what's in it. So
> you open the URL and scroll a wall of JSON, or write a throwaway page just
> to see the data.
>
> I built Imago to be that throwaway page. Paste an API URL and it draws the
> response as a page: the values that matter up top, a fact sheet under them,
> tables and charts for the rest.
>
> It's free and open source. It runs in your browser, with no account and no
> server, so your keys stay on your machine.
>
> Try it: https://imago.onslate.in
> Code (a star helps): https://github.com/Sibhimanyu/imago

**X**
> Imago is live.
>
> Paste an API URL. Instead of a wall of JSON, you get a page: headline values, a fact sheet, tables and charts.
>
> Free, open source, runs in your browser. No account.
>
> https://imago.onslate.in
> Code: https://github.com/Sibhimanyu/imago

---

### Day 2: A Pokémon, not a JSON tree
**Media:** `social/pokemon.png`

**LinkedIn**
> PokeAPI's Pikachu, as Imago draws it: the sprite, stat bars, the type as a
> badge, and the links in the response turned into buttons you can follow.
>
> Nobody told Imago what a Pokémon is. It reads the shape of the JSON, such as
> a named array of numbers or an image URL, and picks a component for each.
>
> Open it yourself:
> https://imago.onslate.in/#open=https://pokeapi.co/api/v2/pokemon/pikachu

**X**
> PokeAPI's Pikachu, drawn by Imago: sprite, stat bars, type badge, links as buttons.
>
> Nobody told it what a Pokémon is. It read the shape of the JSON.
>
> https://imago.onslate.in/#open=https://pokeapi.co/api/v2/pokemon/pikachu

---

### Day 3: A forecast, read for a human
**Media:** `social/weather.png`

**LinkedIn**
> Open-Meteo's forecast for Chennai. The raw response puts 31.2 in one object
> and "°C" in another. Imago puts them back together: temperature as the
> headline with its unit, humidity as a meter, the hourly forecast as a chart,
> and bookkeeping like generation time folded into Details.
>
> Weather data by Open-Meteo.com (CC BY 4.0).
>
> https://imago.onslate.in/#open=https://api.open-meteo.com/v1/forecast?latitude=13.08&longitude=80.27&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1

**X**
> Open-Meteo puts 31.2 in one object and "°C" in another.
>
> Imago puts them back together: the temperature as the headline, humidity as a meter, the hourly forecast as a chart.
>
> Data: Open-Meteo.com
> https://imago.onslate.in/#open=https://api.open-meteo.com/v1/forecast?latitude=13.08&longitude=80.27&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1

---

### Day 4: Watch an endpoint change
**Media:** `social/watch.png`

**LinkedIn**
> Turn on Watch and Imago fetches the endpoint again every 10, 30 or 60
> seconds and marks exactly what changed since the last fetch. The history
> strip shows when things changed.
>
> This is the International Space Station's position, watched every 10
> seconds. Every value that changed has a CHANGED tag.
>
> https://imago.onslate.in/#open=https://api.wheretheiss.at/v1/satellites/25544
> (Turn on Watch once it opens.)

**X**
> Watch re-fetches an endpoint every 10, 30 or 60s and marks exactly what changed.
>
> Here's the ISS, watched every 10 seconds.
>
> https://imago.onslate.in/#open=https://api.wheretheiss.at/v1/satellites/25544

---

### Day 5: The model never writes HTML
**Media:** `social/schema.png`

**LinkedIn**
> A design choice I'd make again: the model never writes HTML.
>
> Imago works out the response's shape (the schema on the right) and sends it
> to the model with a short sample of values. The model returns a small JSON
> plan: which fields matter and which component shows each one. Imago's own renderer draws
> the plan, and every value goes in as text. Nothing from an API or a model is
> ever treated as markup.
>
> The code is open: https://github.com/Sibhimanyu/imago

**X**
> The model never writes HTML.
>
> It gets the response's shape and returns a small JSON plan: which fields matter, which component shows each. Imago's own renderer draws it as text. Nothing from an API or a model is treated as markup.
>
> https://github.com/Sibhimanyu/imago

---

### Day 6: A search becomes a table
**Media:** `social/library.png`

**LinkedIn**
> Open Library, searching "the hobbit". An array of objects becomes a table,
> with columns chosen by what tells one row from another: title, author,
> edition count, first published.
>
> https://imago.onslate.in/#open=https://openlibrary.org/search.json?title=the+hobbit&limit=5

**X**
> An array of objects becomes a table. Columns are picked by what tells one row from another.
>
> Open Library, "the hobbit":
> https://imago.onslate.in/#open=https://openlibrary.org/search.json?title=the+hobbit&limit=5

---

### Day 7: No key? It still works
**Media:** `social/landing.png`

**LinkedIn**
> Imago works with no key and no account. With no model, the same renderer
> runs on rules: it finds the title, pairs numbers with their units, turns
> time series into charts, and tucks bookkeeping away.
>
> None of those rules knows any particular API. A test fails if a sample
> API's field names turn up in them.
>
> For a designed page, add a free Gemini or Groq key. It stays in your
> browser.
>
> https://imago.onslate.in

**X**
> No key, no account, still works.
>
> Without a model, Imago's renderer runs on rules that know no particular API. A test fails if a sample API's field names leak into them.
>
> A free Gemini or Groq key gets you a designed page.
>
> https://imago.onslate.in

---

### Day 8: Paste a curl command
**Media:** `social/landing.png` (the paste bar)

**LinkedIn**
> The box takes a curl command as well as a URL, straight from an API's docs
> or your browser's "Copy as cURL".
>
> Headers go into Inspect → Headers, `-u` becomes Basic auth, and `-G -d`
> becomes a query string. Headers the browser sets itself (Cookie,
> User-Agent) are left out, and Imago tells you which. Headers only last as
> long as the tab is open.
>
> https://imago.onslate.in

**X**
> Paste a curl command, not just a URL. Straight from the docs or "Copy as cURL".
>
> Headers go to Inspect, -u becomes Basic auth, -G -d a query string. Headers the browser sets itself are left out, and named.
>
> https://imago.onslate.in

---

### Day 9: திருக்குறள், drawn from JSON
**Media:** `social/thirukkural.png`

**LinkedIn**
> Kural 1 from a Thirukkural API: the Tamil verse, its transliteration, its
> meaning and its section, laid out from the response alone. Imago doesn't
> know what a kural is. It reads what the JSON holds.
>
> https://imago.onslate.in/#open=https://tamil-kural-api.vercel.app/api/kural/1

**X**
> Kural 1, straight from a Thirukkural API: the Tamil verse, its transliteration and meaning, laid out from the JSON alone.
>
> https://imago.onslate.in/#open=https://tamil-kural-api.vercel.app/api/kural/1

---

### Day 10: 360 fetches, one model call
**Media:** `social/watch.png`

**LinkedIn**
> Watching an endpoint every 10 seconds for an hour is about 360 fetches and,
> if the response keeps the same shape, one model call.
>
> Imago saves each plan under a fingerprint of the response's shape. The
> values change and the shape doesn't, so the plan is reused. That makes
> Watch cheap enough to leave on, even on a free key.

**X**
> Watching an endpoint every 10s for an hour: ~360 fetches, one model call.
>
> Imago caches each plan by the response's shape. The values change, the shape doesn't, so the plan is reused.

---

### Day 11: Share a page, not your keys
**Media:** `social/pokemon.png`

**LinkedIn**
> Share copies a link that opens the same page for someone else: the endpoint
> and the layout. It never carries your headers, keys or the response itself.
> Their browser fetches the data fresh. A key in the address (`?api_key=`) is
> left out too, and Imago warns you if that means the link may not load for
> them.

**X**
> Share copies a link that opens the same page for someone else.
>
> It carries the endpoint and the layout, never your headers, keys or the response. Their browser fetches it fresh.

---

### Day 12: For people who run APIs
**Media:** `social/badge.png`

**LinkedIn**
> If you run a public API, one line in your README gives your readers an
> "Open in Imago" button that opens your example response as a page. No
> sign-up, no script on your site, and nothing passes through a server.
>
> The link is imago.onslate.in/#open= followed by your endpoint. The badge and
> snippet are here:
> https://github.com/Sibhimanyu/imago/blob/master/launch/open-in-imago.md

**X**
> Run a public API? One line in your README gives readers an "Open in Imago" button.
>
> imago.onslate.in/#open= plus your endpoint. No sign-up, no script, no server in between.
>
> https://github.com/Sibhimanyu/imago/blob/master/launch/open-in-imago.md

---

### Day 13: Open source, no build step
**Media:** `social/landing.png`

**LinkedIn**
> Imago is MIT-licensed, and there's no build step: native ES modules, no
> framework, nothing extra loaded in the browser. A static server runs it.
>
> Issues and pull requests are welcome. If a page comes out wrong, the issue
> form asks for a Share link, which shows exactly what you saw.
>
> https://github.com/Sibhimanyu/imago

**X**
> Imago is MIT-licensed with no build step: native ES modules, no framework. A static server runs it.
>
> Issues and PRs welcome.
>
> https://github.com/Sibhimanyu/imago

---

### Day 14: Send me your worst endpoint
**Media:** `social/demo.gif`

**LinkedIn**
> Two weeks since launch. The most useful thing you can send me is an
> endpoint Imago draws badly. Press Share on the page and paste the link into
> an issue. It shows exactly what you saw, and it's how the rules get better.
>
> https://github.com/Sibhimanyu/imago/issues/new/choose

**X**
> Two weeks in. Send me an endpoint Imago draws badly.
>
> Press Share, paste the link into an issue. It shows me exactly what you saw.
>
> https://github.com/Sibhimanyu/imago/issues/new/choose
