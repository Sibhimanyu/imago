# Changelog

All notable changes to Imago are recorded here. Dates are YYYY-MM-DD.

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
