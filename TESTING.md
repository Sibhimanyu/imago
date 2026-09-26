# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast,
trust your instincts, and ship with confidence — without them, vibe coding is
just yolo coding. With tests, it's a superpower.

## Running

```bash
npm test          # one pass
npm run test:watch
npm run test:coverage
```

Coverage is real, not the harness's: `test/harness.js` writes the bundle it
evaluates to `.cache/app.js` with an inline source map and runs it under that
file URL, so V8's coverage maps back onto the modules in `js/`. On
2026-09-26 it stood at 90.7% of lines and 81.2% of branches; `render.js`
(66%) is the gap.

A test that boots a *patched* copy of the bundle (`boot({ app: APP.replace(…) })`)
runs it without the bundle's source URL. Every offset after the patch has
moved, so its coverage, filed under `.cache/app.js`, would be mapped onto the
wrong lines. When `config.js` moved near the top of the bundle, that one
patched constant dragged the whole report from 90% to 36%.

Framework: **Vitest 2.1** with **jsdom 25**. The browser loads `js/main.js` as
native ES modules with no build step. jsdom cannot run module scripts, so
`test/harness.js` bundles those same modules into one classic script with
esbuild, once per test file, and evaluates it in each fresh jsdom. Same source,
one packaging step, test-only.

## How the suite reaches into the app

The app is booted through the page, not imported: each test needs a fresh DOM
and fresh module state. So `js/main.js` carries a **test seam**: a single
`window.__imago = { ... }` object exposing the pure helpers plus the `state` and
`dom` objects. `test/harness.js` builds a jsdom, evaluates the bundle inside it,
and hands the seam back.

The seam ships to the browser. That is deliberate and grants no new capability:
everything reachable through it, `getActiveKey` included, reads same-origin
browser storage that any script in the page can already read. It is a test
convenience, not a trust boundary — so don't treat it as one, and don't put
anything behind it that isn't already reachable.

If you add a function the tests need, add it to the seam. Keep the seam a flat
list of references; do not put logic in it.

### The harness gotcha that cost an afternoon

`boot()` is **async** and must be awaited. It waits for the jsdom `load` event
*before* evaluating the app. Evaluate too early, while `document.readyState`
is still `'loading'`, and `main.js` defers `init()` to `DOMContentLoaded` — then
runs it a second time when that fires, re-running `cacheDom()` and re-wiring
every event handler behind the test's back. That double-init silently
invalidated three regression tests before it was caught.

Two other jsdom traps the harness already handles:

- **`Storage` is a Proxy.** `localStorage.setItem = fn` creates a stored *key*
  named `setItem`; it does not override the method. Stub
  `window.Storage.prototype.setItem` instead (see `stubSetItem` in
  `test/regressions.test.js`).
- **There is no layout.** Every `offsetWidth` / `offsetHeight` is 0, so the
  timeline layout pass never takes its real branches. The harness defines
  non-zero boxes on `HTMLElement.prototype`.

## Layers

| File | What it covers |
|---|---|
| `test/pure.test.js` | Path parsing, `getByPath`, diffing, spec normalisation, HTML escaping, header parsing and redaction, origin comparison. The trust boundary between untrusted input and the renderer. |
| `test/regressions.test.js` | One test per critical bug fixed, named after the behaviour that was broken. |
| `test/onescreen.test.js` | The one-screen layout: inspector and Settings sheet, the trail, the history strip, the endpoint rail, first run without a key, and the basic layout (units, series, Details). |
| `test/design-sync.test.js` | The Figma sync gate: token extraction from `:root`, the UI-surface hash, the Figma manifest against the screenshot list, and `design:check` run end to end in a sandbox copy. |
| `test/modules.test.js` | The module check (`npm run check`): a name used without an import, an assignment to an import, duplicates, unreachable modules, and the shipped `js/` passing it. |
| `test/calm.test.js` | A calm Watch tick: only changed components are swapped (same nodes, images and focus otherwise), a new layout swaps in one step with scroll and focus kept, a Full HTML frame survives a tick, and the change highlight's timing and reduced-motion rule. |
| `test/audit.test.js` | The 2026-09-24 audit: a request's lifetime (replace, abort, time out, ignore late replies), layouts remembered by shape, what may leave the browser (the HTML frame, address keys, share links, framing), and the page and its controls. |

`test/harness.js` also exports `jsonFetch(body)` for a one-shot fetch stub and
`flush()` to drain pending promise jobs.

## Conventions

- Tests assert **behaviour**, never that a value is merely defined. A test that
  cannot fail is worse than no test, because it reports safety that isn't there.
- Every regression test names the bug in its title and says, in a comment, what
  the user saw when it was broken.
- **Untrusted input gets hostile input.** `normalizeSpec` and `buildFallbackSpec`
  sit between a language model's output and the DOM; they are tested with
  `null`, wrong types, unknown component types, and a 500-entry component list,
  not just a well-formed spec.
- Never import a secret, API key, or credential into a test.

## Mutation-check anything you claim is covered

A passing suite does not prove the test would fail if the fix were removed.
Break the fix on purpose and confirm the suite goes red:

```bash
cp js/request.js /tmp/request.js.good      # whichever module holds the fix
# delete or invert the guard you are testing, then:
npm test
cp /tmp/request.js.good js/request.js
```

This caught three tests in this suite that passed no matter what the source
did. One known survivor remains: the `minimalSpec()` fallback in `applySpec` is
unreachable today, because `buildFallbackSpec` now returns a root-legal spec for
every input. Its test asserts the guard is *sound* rather than that it fires.
That is deliberate, and recorded here so nobody reads the green as coverage it
isn't.

## Expectations when changing code

- New function → a test for it.
- Bug fix → a regression test that fails without the fix. Mutation-check it.
- New error path or `if`/`else` branch → cover both sides.
- Never commit code that makes an existing test fail.
