# Changelog

All notable changes to Imago are recorded here. Dates are YYYY-MM-DD.

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
