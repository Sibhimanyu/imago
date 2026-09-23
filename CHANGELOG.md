# Changelog

All notable changes to Imago are recorded here. Dates are YYYY-MM-DD.

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
