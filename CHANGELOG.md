# Changelog

All notable changes to Imago are recorded here. Dates are YYYY-MM-DD.

## [0.22.2.0] - 2026-09-27

### Changed

- **The three assignment reports are shorter and easier to scan.** About a
  quarter of the prose is gone from the tech, launch and brand reports (the
  launch report's LinkedIn post copy now lives in `launch/social-posts.md`),
  and secondary detail folds away under "More detail". Each section opens
  with one takeaway line and reads as cards, stat tiles, checklists and
  framed screenshots. New visuals: the plan's schema view (tech), the
  Open-Meteo PR, SUPPORT.md and the data credit (launch), and the logo's
  construction and four versions (brand). The tech report's numbers are
  current: 507 tests in 30 files, 92% line coverage, 17 modules.

## [0.22.1.0] - 2026-09-27

### Added

- **The three assignment reports link to each other.** A thin bar above each
  report's header (Technology, Business, Design) goes to any of the three from
  any of them, with the page you are on marked. It stays at the top as you
  scroll and shows on phones too. The tech report's one-way "Business report"
  chip is gone, since the bar replaces it.

## [0.22.0.0] - 2026-09-27

### Added

- **The launch film is on the landing page.** "Imago in 30 seconds" sits
  under the hero: the 30-second launch video, re-encoded for the web (2.8 MB,
  down from 9.9 MB) with its end card as the poster. It has sound, so it never
  plays or downloads until you press play, and a text description goes with
  it for anyone who cannot watch it.
- **More of what Imago does, on the landing page.** "What else it does" lists
  six features the three headline ones leave out: curl import, following
  links, editing a page, sharing it, alerts while you are in another tab, and
  the basic layout with no key. "How it works" gives the four steps (fetch,
  fingerprint, plan once, render) and the limits: GET only, and the API has
  to allow web pages.
- **Footer links** to the API gallery, the press kit, the source on GitHub
  and help. Figma re-synced.

## [0.20.0.3] - 2026-09-27

### Changed

- **The Full HTML quota note passes instead of staying up.** Switching Full
  HTML on used to open a yellow banner above the page that stayed as long as
  the switch was on. What it costs is now said once, in the toast when you
  switch it on, and warning toasts stay up six seconds so there is time to
  read them.

## [0.20.0.2] - 2026-09-27

### Fixed

- **Full HTML works with Groq again.** gpt-oss reasons before it answers,
  and on a big response (a Pokémon, 361 KB) it could come back with no page,
  which Imago reported as "The model did not return a usable HTML document."
  Imago now asks gpt-oss for low reasoning effort on the page call, so the
  reply has room for markup. A reply that still isn't a page gets one more
  try. A page with a line of prose in front of it ("Here is the page:") is
  kept, not thrown away. When both tries fail, the error says why: an empty
  reply, or a reply that ran out of room.

## [0.21.0.0] - 2026-09-27

### Changed

- **The app has its own address: `/app/`.** The landing page stays at `/`.
  They used to share one URL, with the app at `/#app`, and analytics and
  heatmaps ignore everything after `#`, so a heatmap of `/` mixed landing-page
  clicks with clicks inside the app. `./publish.sh` serves the same page at
  `/app/` (marked noindex), and it picks its view from the path. Old
  addresses keep working: `/#app`, `/#open=` and `/#share=` open the app and
  the address becomes `/app/`, without a reload. Share links and the
  gallery's "Open it in Imago" now use `/app/#open=`; the docs show the new
  form. Every local file in `index.html` is named from the site root, so the
  page works at either address.
- PageSense: a *Landing page heatmap* for `/` beside the gallery's, and the
  "Opened Imago from the gallery" goal counts `/app/#open=` links.

## [0.20.0.1] - 2026-09-27

### Fixed

- **The page shows at once, in Safari too.** Zoho PageSense hides the whole
  page (html and body at opacity 0) until its A/B and location checks finish,
  and in Safari that left a blank page for seconds. Imago runs no
  experiments, so styles.css now keeps html and body visible with selectors
  that outrank PageSense's. The PageSense script loads `async`, so it no
  longer holds up the app's own scripts, and every app module is
  modulepreloaded, fetched alongside main.js instead of one round trip after.
  The stylesheet and those preloads now come before theme-boot.js, the one
  script that blocks the parser, so they no longer wait a round trip for it.
- **A deploy reaches people who already visited.** Slate serves every file
  with a one-year cache and the project cannot change that header, so a
  returning browser kept its old styles.css and modules (and could mix a new
  main.js with old ones). `./publish.sh` now runs `scripts/version-assets.mjs`,
  which puts one `?v=<hash>` of all the site's CSS and JS on every local
  stylesheet, script, modulepreload and module import in `dist/`, so each
  deploy is a new set of URLs. The source files are untouched.

## [0.20.0.0] - 2026-09-27

### Changed

- **One site.** The API gallery, the press kit and the hosted-AI waitlist
  moved from their own Slate app (imago-apis-oavuixyf.onslate.in) onto
  imago.onslate.in, beside the app: `/apis/` and `/apis/<api>/` for the
  gallery, `/press/` and `/waitlist/`. `./publish.sh` builds them into the
  same `dist/` and stops if a gallery file would replace an app file. The
  pages use the app's own stylesheet and icons, and the site has one sitemap
  and robots.txt. The `imago-apis` Slate app is gone from `catalyst.json`.
- **PageSense measures the whole site, the app included.** The same
  `pagesense.html` tag is in every page's `<head>`. The app's CSP lets in
  PageSense's two hosts by name (`cdn-in.pagesense.io`,
  `static.zohocdn.com`) and no other outside script, and still no
  `unsafe-eval`. This is a trade-off: PageSense now runs on the same site as
  the model keys in localStorage, so it could read them.
- **The reels are in the press kit only.** They no longer play on the
  gallery's home page or on each API page.
- The waitlist links in the app and the gallery point at
  `https://imago.onslate.in/waitlist/`, and the waitlist function accepts
  calls from that origin.

## [0.19.1.1] - 2026-09-26

### Fixed

- **A Watch tick no longer flashes the page.** Every tick cleared the page
  and built it again from nothing: images reloaded (a sprite drew blurred
  until it was marked pixel art again), focus fell out of the page, an
  expanded table folded shut, and a Full HTML page's frame was created again
  and showed blank white until it loaded. Now a tick builds the page
  off-screen and, when the layout is the same, swaps in only the values that
  changed; the rest stay exactly as they were. When the layout did move, the
  page is swapped in one step with scroll and focus kept. A Full HTML page
  keeps its frame when the tick would write the same one.
- **Changed values say so, briefly.** A value a tick changed gets a short
  amber wash and rises into place (under a quarter of a second), then keeps
  its usual CHANGED flag. Nothing moves with reduced motion on.
- A request you start (Go, Generate, a new endpoint) still rebuilds the page
  as before.

## [0.19.1.0] - 2026-09-26

### Fixed

- **A plain http:// API says why it fails.** Browsers block an https page
  from calling an http:// address, and Imago only allows http:// on
  localhost, so such a request never leaves the browser. Imago used to say
  "Could not reach" the host, blaming a server that was up. It now names the
  real cause and the two ways round it: the API's https:// address, or
  localhost (for example through an SSH tunnel).

## [0.19.0.0] - 2026-09-26

The model is a choice, and it is remembered.

### Changed

- **Model is a dropdown.** Settings lists each provider's models, lightest
  first, with the default marked. The choice is saved in this browser, one
  per provider, so switching providers and back keeps what you picked. It
  used to be a text box that forgot itself when the tab closed.
- A model you typed in an older build is kept: it moves into the saved choice
  once, and stays in the list even if the list does not have it.

## [0.18.0.0] - 2026-09-26

A dark theme.

### Added

- **Dark theme.** Settings → Appearance has a Theme choice: System, Light or
  Dark. System is the default: it follows your device and switches with it
  while Imago is open. The choice is saved in this browser. A small script in
  the page head applies it before the first paint, so a dark reader never
  sees a white flash.
- **Full HTML pages follow the theme.** The model now builds its page from a
  fixed set of colour variables, and Imago fills them in for the current
  theme when it shows the page, so a page written in light mode sits right
  in a dark app and changes with it.

### Changed

- Every colour a theme needs to restate is now a named token in `styles.css`,
  and Figma's `imago` variables have a Dark mode next to Light. The 00 Shipped
  page gains dark captures of the landing, a page and Settings.

## [0.17.0.0] - 2026-09-26

Full HTML is a switch on the page again, and its pages sit in the app.

### Changed

- **Full HTML is a switch beside Watch, not a Settings dropdown.** Turn it
  on and a yellow note stays under the toolbar for as long as it is on: a
  page costs a model call per endpoint rather than per shape, a much longer
  reply, and another call when the data changes. The Interface card is gone
  from Settings.
- **Full HTML pages keep to Imago's colours.** The model is told to use a
  white page, the app's ink and border colours and at most one accent, with
  no dark themes or big gradients, so a page no longer stands out of the app
  like a pasted-in screenshot. It is also told never to add facts the data
  does not contain.
- **The Endpoints list says how to fill it.** Its empty text names the Save
  button and what the dot and the number mean, and the + says it clears the
  URL bar.

## [0.16.0.0] - 2026-09-26

A designed page now comes from a hosted provider, with your own key.

### Removed

- **Ollama support.** Imago no longer talks to a model on your own machine.
  The Ollama choice, its server address field and its model list are gone
  from Settings, and so is the Ollama section of the README and SUPPORT.md.
  Google Gemini and Groq remain, each with a free key. With no key, Imago
  shows the basic layout it builds from the response itself, as before.

### Changed

- **A saved Ollama choice moves to a working provider.** If you had picked
  Ollama, Imago now opens on the provider that holds a key, or Google Gemini
  if none does, puts that provider's default model in the Model field instead
  of the local model name, drops the saved server address, and tells you once.

## [0.15.0.0] - 2026-09-26

### Added

- **The hosted-AI waitlist is open.** "Join the waitlist" on the landing page
  and in Settings now lead to a waitlist page on the API gallery's own origin.
  It posts to a Catalyst Advanced I/O function (`functions/waitlist`) that
  checks the form, drops bots that fill a hidden field, keeps only the four
  answers (email, use case, has a key, price) in a Catalyst Data Store table,
  and says "already on the list" for a repeat. Only the gallery's origin may
  call it. Imago itself still has no server.

## [0.14.1.0] - 2026-09-26

### Fixed

- **A value that is one HTML element reads as its words.** A field such as a
  display title wrapped in a `<span>` showed its tags as text. It now shows
  the words inside, with entities decoded; nothing is parsed as HTML, and the
  raw value stays in the element's title on hover. Text that only mentions a
  tag is left alone.

## [0.14.0.0] - 2026-09-26

### Added

- **Free, and why.** The landing page says what Imago costs and why: free
  forever when you bring your own free Gemini or Groq key, or none, because
  there is no server to pay for; and a hosted-AI plan that would be paid,
  because it would need a server and costs money on every call. The hosted
  plan is a waitlist only: not built, no payment.
- **Waitlist links, off until there is a form.** "Join the waitlist" on the
  landing page and "No key? Join the hosted-AI waitlist." in Settings read
  their address from one constant, `WAITLIST_URL`. Empty, they stay hidden;
  only an https address shows them, opening in a new tab. No third-party
  script or embed is allowed on this origin, and a test says so.
- **Questions and ideas** go to GitHub Discussions, linked from the new-issue
  page.

## [0.13.4.0] - 2026-09-26

### Fixed

- **The landing demo credits Open-Meteo.** Their forecast data is licensed
  CC BY 4.0, which asks for an attribution link wherever it is shown, and the
  demo showed it with none. "Weather data by Open-Meteo.com" now sits under
  the demo, linked; on phones it goes on its own line under the note.

### Changed

- **One partner, not five.** Of the example APIs, only Open-Meteo has a
  README list where Imago belongs, and it asks for pull requests. The launch
  kit now asks there, and says why the others were dropped.

## [0.13.3.1] - 2026-09-26

### Fixed

- **A share or open link pasted into an open Imago tab opens.** Only the
  hash changed, so the page did not reload, and the link was read only on
  load: the tab showed the landing page instead. It now opens the link as a
  fresh load would.

### Changed

- **The launch kit is three jobs:** marketing (the Zoho Social run with its
  images, Show HN, dev.to, Reddit), partners and support. The README opens
  with a demo GIF.

## [0.13.3.0] - 2026-09-26

The launch: a link an API's docs can write by hand, and somewhere to get help.

### Added

- **Open in Imago links.** `https://imago.onslate.in/#open=<endpoint>` opens
  the app and fetches that endpoint once, Watch off. Unlike a share link it is
  readable, so an API's docs can write one by hand. It follows the same rule:
  public https only. `assets/open-in-imago.svg` is the badge to go with it.
- **Support.** `SUPPORT.md` walks through each error Imago shows and its fix.
  GitHub issue forms cover a page that came out wrong (asking for its Share
  link) and anything else broken.
- **The launch kit** in `launch/`: who Imago is for, the partner kit for API
  owners, the partner pitch, the listings and the launch post.

## [0.13.2.0] - 2026-09-25

### Changed

- **The landing demo is always the weather forecast.** The Pokémon, Weather
  and Library tabs are gone, and so is the random first pick: the page shows
  one live Open-Meteo response, the same picture as the banner and flyer.

### Fixed

- **Refresh and Watch always reach the API.** Requests used the browser's
  HTTP cache, so an API that allows caching (PokeAPI allows a day) was
  answered from the browser, not the network. It looked fast, and a watched
  endpoint of that kind could never change. Every fetch, the landing demo's
  too, now goes to the API.

## [0.13.1.0] - 2026-09-25

The landing hero takes the banner's call to action.

### Added

- **Paste straight into the landing page.** The Get started and Try an
  example buttons become the banner's bar: paste a URL or a curl command and
  press Enter, and the app opens and runs it. A pasted curl command runs at
  once, headers and all. Empty, the arrow just opens the app. "Or try the
  example" under it opens the demo that is showing.

### Fixed

- **Switching the demo's examples no longer moves the page.** The interface
  card took its height from whatever it drew, so each tab, and the moment
  it was still fetching, resized the hero by up to 150px. It now has a fixed
  height on desktop and on phones.

## [0.13.0.0] - 2026-09-25

The fixes from a full audit (security, correctness, hands-on QA), each with a
regression test in `test/audit.test.js`.

### Fixed

- **A remembered layout names the response it shows.** Layouts are kept per
  response shape, but their title was written about one response, so every
  Pokémon opened after Pikachu was titled "Pikachu". A plan now names the
  field its title comes from (`titlePath`), and another endpoint of the same
  shape gets its own title and no borrowed subtitle.
- **A remembered HTML page stays with its endpoint.** It has one response's
  values written into it, so it is no longer shown for another endpoint of
  the same shape, and the "data changed" bar compares against the response
  it was written from. A page written from a response that needed
  credentials is not remembered.
- **A slow request no longer locks the app.** A new request replaces the one
  in flight (which is aborted), instead of being ignored while the URL you
  typed was lost. Requests time out after 30 seconds and model calls after
  two minutes, with a message saying so.
- **Late model replies are dropped.** A reply for a page you have left no
  longer replaces the page on screen, and Generate always starts a call,
  instead of going dead while another page's call was running.
- **A failed request puts back what was on screen**: the Generate prompt, a
  generated HTML page (a failed Watch tick no longer wipes it), or the plan.
  Before, an older page's layout could be drawn over another endpoint's data.
- **Watch keeps a page live when the response changes shape.** It shows the
  basic layout with a Generate button, instead of swapping the page for the
  Generate prompt while the timer kept fetching behind it. Clear all data now
  stops Watch.
- **A rejected key stops reading as ready.** After a provider refuses a key,
  in Test or in a generation, Settings says "Rejected", the ready pill goes,
  and pages use the basic layout with "rejected your key" until the key
  changes.
- Nanosecond and microsecond timestamps render as dates instead of crashing
  the page.
- Charts report the series' real length, low and high; thinning keeps each
  stretch's peak and trough.
- A search's result list leads its page as a full-width table, with **Show
  all** for long tables. Numbers repeated under two names (`numFound`,
  `num_found`) show once, and `start` goes to Details.
- A list inside a table row is summarised ("hp 35, attack 55 +4") instead of
  being dropped.
- `[null, {…}]` is read as a list of objects.
- An address without `https://` gets one.
- Error messages keep the response snippet and "Below is …, the last page
  that loaded" in separate paragraphs; an empty body says so, and an empty
  200 is "Empty response", not "not JSON".
- Deleting a saved endpoint moves focus to the next row. Save shows **Saved**
  with a filled star, and names the endpoint after the page ("Pikachu").
- The landing hero no longer jumps when the live demo loads or the example
  changes. **Get started** always puts the cursor in the address box.
- The meta row hides while another endpoint loads, instead of describing the
  page that is leaving.
- A damaged saved request or snapshot entry no longer stops the app booting.

### Security

- **The full-HTML frame loads only what the data holds.** Images, CSS
  `url()`s and links must be URLs already in the response; refreshes, link
  tags, media and event attributes are removed; and the frame carries its own
  policy (`default-src 'none'`). A page can no longer carry the response it
  was given out to another site in an image URL.
- **Keys in the address stay home.** Credential parameters (`api_key`,
  `appid`, `key`, `token`, …) are left out of share links and masked in the
  prompt sent to the model.
- **Share links open only public https endpoints**, never `localhost` or a
  LAN address, and do not start Watch.
- **Imago refuses to run inside another site's frame**, since the host sends
  no header against framing and a `<meta>` policy cannot.
- A response fetched with credential headers is kept in the session only,
  not in stored snapshots. Only the 30 most recently fetched endpoints keep a
  history.

### Added

- `npm run test:coverage`, with coverage that maps back onto `js/`.

## [0.12.1.0] - 2026-09-24

### Changed

- **The landing hero follows the brand banner.** The headline, the pitch and
  the two buttons sit on the left, left-aligned. On the right is the live demo
  as one composition: the response in a dark panel with its GET URL at the
  top, and the interface Imago draws from it on a white card that overlaps
  the panel. The example tabs and the "Fetched live" note sit underneath. On
  a phone the card overlaps the bottom of the panel instead of its side. The
  demo is still fetched live and drawn by the real renderer; only its layout
  changed. The Figma landing page and the shipped screens are synced to match.

## [0.12.0.0] - 2026-09-24

### Changed

- **Nothing on the landing page is made up any more.** The demo used to be
  three hand-built cards: Pikachu, Chennai weather and The Hobbit, with
  invented JSON, an embedded sprite, a false "From schema cache" badge and a
  fake "Changed, was 30.4 °C". Now it fetches the example's real response
  when the landing page opens and draws it with the app's own renderer, with
  no model. Which example shows first is picked at random.
- **The basic layout no longer knows the example APIs.** Rules keyed to their
  field names are gone: `base_stat`, `moves`, `forms`, `encounter`, `sprite`
  (Pokémon); `ia`, `lending`, `ebook`, `availability` (Open Library);
  `day_length` (Sunrise-Sunset); and the rule that renamed `temperature_2m`
  to "Temperature" (Open-Meteo). In their place are rules that work from the
  data's shape. Bars are drawn for the quantity that varies most in small
  rows. Lists too long to read, and objects that hold nothing but links, fold
  into Details. Labels say what the key says, so `temperature_2m` reads
  "Temperature 2m". A test fails if sample-API vocabulary comes back.
- The model prompt's example path is neutral (`data.items.0.name`), not taken
  from an example API.

### Fixed

- **A failed request says which page is still showing.** When a request
  failed, the last page that loaded stayed on screen under a banner about the
  other host, which read as if the two were connected. The banner now names
  the page, for example "Below is Pikachu, the last page that loaded."

## [0.11.1.0] - 2026-09-24

### Changed

- **The landing page and the app have separate addresses.**
  <https://imago.onslate.in/> is always the landing page and
  <https://imago.onslate.in/#app> is always the app. Reloading keeps you on
  whichever one you are on. Before, anyone who had opened the app once was
  sent straight to it on every visit and never saw the landing page again.
- The browser's Back button goes from the app to the landing page, and Forward
  goes back into the app. Inside the app, Back still steps back through the
  pages you followed.
- A shared link opens the app at `#app`, so reloading it stays in the app.

## [0.11.0.1] - 2026-09-24

### Fixed

- **The app is live at <https://imago.onslate.in>.** The old address returned
  404. Link previews (the image shown when the link is pasted into a chat) now
  point at the new address, so they no longer show a broken image.

## [0.11.0.0] - 2026-09-24

### Added

- **imago ↔ amigo.** Swap two letters and *imago* becomes *amigo*, Spanish for
  friend. The landing page says so, with the two swapped letters marked in the
  yellow the app uses for a value that changed.
- **Amigo on the empty page.** The mascot (the Imago mark standing up) now
  greets you where the app is waiting for a URL, replacing the generic icon.
- The brand brief explains the anagram and how to use it: Imago is the
  product, Amigo is the helper, and the line is said once.

## [0.10.5.0] - 2026-09-24

### Added

- **The Imago mark takes you back to the landing page.** Before, once you had
  opened the app there was no way back to it. **Open app** brings you back to
  the page you were on.

### Fixed

- **Works properly with a finger on a phone.** Every control is now at least
  44px to tap: the page buttons, close buttons, the interval picker, Details,
  the Watch switch and the edit bar. Some already had the larger size, but
  later rules in the stylesheet were overriding it.
- **iOS no longer zooms in when you tap a field.** Text fields are 16px on touch
  screens.
- **The toast is readable on a phone.** A message that wrapped used to squeeze
  the pill into a circle. It now stretches across the screen above the command
  bar.
- **Page buttons stay together.** On a narrow phone, or with Watch on, the Watch
  controls get their own row instead of pushing a single button onto a second
  line.
- Small labels are at least 12px on phones.

## [0.10.4.0] - 2026-09-23

### Changed

- **Page titles use a display typeface** (SF Pro Display or Segoe UI Variable
  Display, whichever the system has). Nothing extra is downloaded.
- **The live dot pulses once per refresh** instead of all the time, and not at
  all if you have reduced motion turned on.
- **Only small images are drawn as crisp pixels.** Sprites and icons stay sharp,
  and photos are no longer drawn blocky.

## [0.10.3.0] - 2026-09-23

### Changed

- **Watch does less work on every tick.** The endpoint list and history strip
  used to be rebuilt from scratch every time the page redrew: every Watch
  refresh, and the history strip twice per fetch. Now they are rebuilt only
  when something they show has actually changed, and an unchanged tick no
  longer re-reads the saved endpoints. The "x ago" times still update as
  before.

## [0.10.2.0] - 2026-09-23

### Fixed

- **Names that are code keep their case.** A response about a GitHub login or
  repo, or a package, shows its name exactly as the API wrote it: `left-pad`
  used to become "Left pad". Plain names like `pikachu` still read as
  "Pikachu".
- **A failed request no longer mixes two pages.** When opening an endpoint
  failed, the page you were reading came back with the other endpoint's
  history and highlight. It now describes the page on screen, and the URL box
  keeps what you typed so you can fix it and resend.

## [0.10.1.0] - 2026-09-23

Nothing to see, deliberately: this release changes how the app is built, not what
it does.

### Changed

- **The app is now 16 small modules instead of one 6,300-line file.** Each module
  covers one part of the app: storage, the renderer, the request flow and so on.
  It is still served as-is, with no build step. The change makes future work
  faster and safer.
- **A new check runs on every change**, so a module that uses something from
  another without importing it fails before it can ship as a blank page.

## [0.10.0.0] - 2026-09-23

The page is yours to adjust.

### Added

- **Edit a page.** Edit puts a small bar on each field. You can rename its
  label, move it to the Headline, Normal or Details, or hide it. Hidden fields
  are listed above the page, each with a Show button, and Reset page puts
  everything back.
- **Edits are saved for the response's shape**, so every endpoint that returns
  the same shape gets the same page. Share links carry the edited page. Watch
  pauses while you edit, and Clear all data removes edits too.

### Fixed

- **The no-key line no longer disappears when the page is redrawn.** Entering
  Edit, among other things, used to drop it and bring back the "Basic layout"
  badge. It now reappears on each redraw, exactly once.
- **The phone toolbar stays on one row.** The refresh-interval picker now waits
  until Watch is on, leaving room for Save, Edit, Share and Inspect.

## [0.9.0.0] - 2026-09-23

Watch now works while you're looking at something else.

### Added

- **Know when a watched page changes.** With Watch on, a change found while
  you're in another tab puts a count in the tab title, like
  "(3) Forecast — Imago", until you come back. If you allow it, a browser
  notification also says what changed, like "Rate: 1.1 → 1.2".
- **Asked once, never pushed.** Turning Watch on offers notifications once, as
  a button in a toast. Nothing prompts on its own, and the title count works
  without permission.

## [0.8.0.0] - 2026-09-23

Pages you build can leave your browser.

### Added

- **Share a page.** Share copies a link that opens the same page for someone
  else, with the endpoint and its layout, so they see what you see even without
  a key. The link never carries your headers, keys or the response; their
  browser fetches fresh data. A layout from a link is checked like a model's
  plan and never saved into their cache, and the link is cleared from the
  address bar once it is opened. If the endpoint needed your headers, you are
  told the link may not load for others.

### Changed

- **On a phone, Save, Share and Inspect are icon buttons**, so the toolbar stays
  on one row. They keep their names for screen readers.

## [0.7.0.0] - 2026-09-23

The page you get without a key stops losing and mixing up fields.

### Fixed

- **Different fields keep different labels.** `load_1m`, `load_5m` and
  `load_15m` all used to read "Load". The measuring height is now dropped only
  after a weather measure (temperature_2m still reads "Temperature").
- **A value called `units` is shown.** Only a unit table is treated as
  bookkeeping. `units: 42` used to be tucked away in Details, even when it was
  the number the page was about.
- **Series with gaps still chart.** A time series with a `null` in it (common
  for unfinished hours) used to be dropped from the page.
- **A third series is no longer lost.** Two charts lead and the rest chart
  inside Details.
- **Details stays open.** With Watch on it used to snap shut on every refresh.
- **Back no longer leaves the page.** Back from a page with nothing behind it
  used to drop out of the page silently, after loading an example or starting a
  new request.

### Removed

- The old key-setup screen, which nothing had shown since the landing page
  started going straight to the app.

## [0.6.0.0] - 2026-09-23

Real APIs on the first try: bring the request the way your docs or dev tools
give it to you, and when the browser cannot read an API, find out why.

### Added

- **Paste a curl command.** The command bar takes a URL or a curl command,
  typed or pasted: whatever "Copy as cURL" or an API's docs hand you. The URL
  and headers are filled in and the request runs. `-u` becomes Basic auth and
  `-G -d` becomes a query string. Headers the browser sets itself (Cookie,
  User-Agent and the like) are left out and named, and a command that is not a
  GET is refused with the reason.
- **A header count in the command bar.** When headers are set, a chip says how
  many and opens them.

### Fixed

- **A failed fetch says what actually went wrong.** "This API does not allow
  browser apps" (and whether your headers are the likely cause), "Could not
  reach <host>", or "You are offline", in place of one "Network or CORS failure"
  for all three. Telling them apart takes one extra no-cors request, sent
  without your headers or cookies.
- **A bad header is caught before sending.** An invalid header name, or one
  the browser refuses to send, is named in place, instead of being reported as
  the server being down.

## [0.5.0.0] - 2026-09-23

Less on the screen, and every piece of it means one thing. The page you asked
for is the first thing you see, even without a key.

### Added

- **Figma always matches what ships.** The design file has a page of
  screenshots taken from the real app, desktop and phone, and the colour and
  corner-radius tokens come straight from the stylesheet. A UI change can no
  longer merge without the Figma file being brought along.
- **Undo for deleting an endpoint.** One tap deletes, and the toast offers to
  put it back where it was.

### Changed

- **No key is said once, quietly.** One line under the title ("No Google
  Gemini key, so this is the basic layout. Add a key") replaces a banner, a
  toast, a badge and a top-bar pill that all said the same thing. On a phone
  the data is now on the first screen.
- **One home per control.** Watch, refetching and the raw response live in
  the toolbar only; the page no longer repeats them as buttons.
- **The empty page offers the examples once**: the list beside it on a wide
  screen, four buttons on a phone. Watch, Save and Inspect wait until there
  is something to act on.
- **Plain words above the page**: when it was checked and how big it is, and
  a change count only when something changed.
- **Settings shows one provider at a time**: its key, its test and its model.
  A key pasted under the wrong provider is filed under the right one.
- **Get started opens a page ready to paste into**; Try an example loads the
  example. They used to do the same thing.
- The avatar circle is gone, and the phone Endpoints button no longer looks
  selected when it is not.

### Fixed

- **Keyboard focus survives auto-refresh.** With Watch on, focus in the
  endpoint list or history strip used to fall back to the top of the page
  every 10–60 seconds.
- **Settings behaves as a dialog**: focus moves in, Tab stays inside, and
  closing returns you to where you were. The inspector has a real close
  button, so arrow keys through its tabs can no longer close it.
- **Charts keep their shape on wide screens.** Axis numbers were stretched
  sideways and the dots were ovals.
- Metric labels line up, two facts share their row instead of leaving a gap,
  and Escape no longer leaves a page when there is nothing to go back to.
- The landing example fills its response column and says what the
  highlighted lines mean; its small print is larger and passes contrast.

## [0.4.0.0] - 2026-09-23

One screen. The page you are reading never leaves it: your endpoints sit
beside it, the raw response slides in next to it, and a history strip shows
every fetch and which ones changed something.

### Added

- **An endpoint rail.** Saved endpoints live down the left edge with a green
  dot on the one that is live, a count of what changed since you last looked,
  and when it was fetched. Examples sit at the bottom of the rail, one tap
  away. On a phone the rail opens as a sheet.
- **An inspector beside the page.** Response, Schema, Changes and Headers open
  in a drawer next to the page instead of replacing it, so you can read the
  raw JSON and the page it became at the same time.
- **A history strip.** Every fetch is a tick; the ones that changed something
  are marked, and tapping one opens what changed.
- **A landing page that shows the idea.** The hero is a live specimen — a real
  response next to the page Imago builds from it — with Pokémon, weather and
  library examples, and "Try an example" opens the one you are looking at.
- **Better pages when there is no AI key.** Time series become charts
  ("Hourly temperature"), weather-style responses get a located subtitle
  ("13.13° N, 80.25° E · GMT"), and bookkeeping fields (units, generation
  time) fold into a Details section instead of crowding the page.

### Changed

- **Settings opens as a sheet over the page** rather than a separate screen,
  and Escape closes the top layer first: sheet, then inspector, then the trail.
- **The command bar moves to the bottom of the screen on phones**, where your
  thumb is.
- **Colour means one thing each.** Yellow only ever means "changed", green
  only "live", red only "failed" — the no-key notice, provenance badge and
  key pill are now neutral.
- **Save reads as unavailable while the URL box is empty**, instead of
  looking live and answering with an error.
- First run opens straight onto an example page instead of a key form.

### Fixed

- **Examples and New request no longer carry your last endpoint's headers.**
  Tapping an example after using an authenticated API could send that API's
  `Authorization` header to the public demo host.
- **The Settings gear works when you tap the icon itself**, not just the
  space around it — on a phone it was the only way in.
- **Reloading with an inspector tab open but nothing stored** no longer opens
  an inspector you cannot close.
- Opening an endpoint while a request is running no longer overwrites the
  form. The Imago mark answers Enter and Space. On iPhone, focusing the URL
  box no longer zooms the page. History ticks and the rail's delete button
  are large enough, and visible enough, to hit on a touch screen.

## [0.3.0.0] - 2026-09-23

Talk to your provider before you trust it, and get a straight answer when
something is wrong.

### Added

- **A try-it chat console in Settings.** Send a message to whichever provider
  you have selected and read the reply, using the same code path the interface
  builder uses — so if the conversation works, generating works. It carries the
  conversation, names the model and how long the reply took, counts the seconds
  while a local model thinks, and shows a reasoning model's thinking behind a
  toggle rather than leaving you staring at an empty answer.

### Fixed

- **"Unreachable" no longer means "something went wrong".** A reasoning model
  that replies with thinking and no text was being read as silence, and every
  failure — including that one — was reported as the server being unreachable.
  The result was a message telling you to restart Ollama while Ollama was
  answering every request successfully. The word is now reserved for an actual
  connection failure, and everything else says what really happened.
- **Ollama is reached at 127.0.0.1 rather than localhost.** `localhost` can
  resolve to an IPv6 address that Ollama is not listening on, which looks
  exactly like the server being down. Imago now tries the other address
  automatically and remembers the one that worked.
- On a secure page, an unreachable Ollama explains that some browsers refuse to
  let an https page talk to a local server at all, so you stop re-checking a
  setting that was never the problem.

## [0.2.0.0] - 2026-09-22

Run Imago against a model on your own machine, keep a key for each provider,
and check a provider works before you rely on it.

### Added

- **Ollama support.** Point Imago at a model running locally — no key, nothing
  leaves your machine. Selecting Ollama reads the models you have pulled and
  offers them, so you pick from what exists instead of typing a name and hoping.
- **A key per provider.** Gemini and Groq keys are kept separately with their
  own status, rather than one box you overwrite each time you switch.
- **Test buttons.** One tiny call per provider tells you whether it actually
  works, with the reason when it does not. A slow local model shows the seconds
  ticking up, and a test that gets no answer gives up rather than hanging.
- **Full HTML mode.** As an alternative to the structured plan, the model can
  write the whole page. It renders sandboxed with scripts disabled.

### Fixed

- **Generating with Ollama failed outright.** The reply came back cut off
  mid-sentence and Imago called the result unusable. It was running into the
  model's default context limit; Imago now asks for the room a full interface
  needs, and says plainly when a reply was cut short instead of blaming the
  model.
- **A passing Ollama test did not mean generating would work.** The test only
  checked the server was up, so it went green while the selected model was not
  installed. It now asks the model to answer, and names the models you do have
  when the chosen one is missing.
- **A rejected API key now says so**, whatever error the provider returns.
  Gemini reports a bad key differently from Groq, and that read as a vague
  "request failed".
- **Ollama's own error messages reach you** — "model not found" used to appear
  as a bare HTTP code.
- The Settings page no longer leaves a dead gap with one card stranded below
  it; the cards pack into two columns, or one on a narrow screen.
- Fields named after JavaScript internals (a response with a key called
  `constructor`) are no longer silently dropped from the interface.
- The response tabs now work with the arrow keys and announce themselves
  correctly to a screen reader.
- The stage bar keeps naming the host on a phone, and the tab strip shows that
  it scrolls.
- The model field has a name assistive tech can read.
- Removed a Content-Security-Policy directive that did nothing in a meta tag
  and logged an error on every page load.

## [0.1.0.0] - 2026-09-22

First tagged release. Paste an API URL and Imago turns the response into a
readable interface you can explore, save and watch for changes.

### Added

- **Generated interfaces.** Paste any public API URL and get a laid-out page —
  fact sheets, tables, charts, timelines, stat bars, galleries — instead of raw
  JSON. Bring a Gemini or Groq key and the shape is designed by a model; without
  one, a heuristic fallback still reads well.
- **Stage mode.** Once a page renders it owns the screen: the request bar, tabs
  and navigation step aside, leaving a single Back control.
- **Follow the data.** Links inside a response become actions, so you can walk
  from one endpoint to the next and press Back to retrace.
- **Change tracking.** Auto-refresh on an interval, see which fields moved
  highlighted in place, and read a field-by-field Changes list against the
  previous response.
- **Saved requests** with per-request snapshot history, plus Raw and Schema
  views of any response.
- **Two providers.** Gemini and Groq, auto-detected from the key you paste, with
  an explicit override in Settings.
- **Interface reuse.** A designed layout is remembered against the response's
  schema, so revisiting a familiar shape costs no model call.
- **Reveal brand system** — the Imago mark, one typeface, ink-and-paper palette,
  documented in DESIGN.md.
- **Test suite.** Vitest and jsdom, with 55 unit and regression tests and a CI
  workflow. See TESTING.md.

### Fixed

- Custom request headers are no longer sent to a different host when you follow
  a link out of a response. Credentials stay with the origin you typed them for.
- API credentials typed into the headers box no longer persist to disk. They
  live in the browser session, like the provider key, and any copy left behind
  by an earlier build is migrated and scrubbed on first load.
- "Clear all saved data" now actually removes saved credentials instead of
  letting the next click write them back.
- Endpoints returning a bare value (`null`, a number, a string — common for
  /health and /ping) render instead of failing.
- A failed request no longer shows the previous page's data under the new page's
  address, and Back no longer strands you on a page that never loaded.
- Back stays in step with the browser's own Back button; it previously ejected
  you from a page you had not left, then stopped responding.
- A failed request can no longer leave the app unable to send another one until
  you reload.
- Refreshing while the "generate an interface" prompt is open no longer spends a
  request per tick or applies a layout designed for data that has since changed.
- Timeline labels stack into a readable list on narrow screens instead of
  colliding.
- Text, labels and captions meet WCAG AA contrast and never render below 12px.
- Every control has a visible keyboard focus ring, and touch targets are 44px on
  coarse pointers.
- Headings run in order, so screen-reader navigation is not broken by skipped
  levels.
- The generated layout keeps its spacing outside stage mode; a stray comment had
  been disabling the rule.
- Storage running out is reported instead of throwing.
- Paths containing an unterminated bracket resolve fully; a field literally named
  `__proto__` or `constructor` is no longer mistaken for internal machinery; and
  a collection emptying to `[]` is reported as a change.

### Changed

- Colour now means exactly one thing — changed, live or failed. Stat bars,
  avatars, chart strokes and the JSON highlighter render in ink and let size and
  length carry the ranking.
- Raw and Schema views are built when you open them rather than on every
  refresh, and the snapshot store is read through an in-memory cache, so a
  10-second refresh no longer stutters.
- The app runs behind a Content-Security-Policy.
- Deploys use a repo-relative path, so anyone can publish from their own clone.
- The mark's accessible description and the geometry published in DESIGN.md now
  match the mark that actually ships.
- Development tooling moved from a copy vendored into the repo to a shared
  install.

### Removed

- Dead code and orphaned styles left behind by the design pass, and the
  duplicate blue token that had crept back into the palette.
