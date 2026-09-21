# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast,
trust your instincts, and ship with confidence — without them, vibe coding is
just yolo coding. With tests, it's a superpower.

## Running

```bash
npm test          # one pass
npm run test:watch
```

Framework: **Vitest 2.1** with **jsdom 25**. No bundler, no transpile step —
the suite loads the same `app.js` the browser gets.

## How the suite reaches into app.js

`app.js` is one 4000-line IIFE with no module boundary, because it ships to the
browser as a plain `<script>` with no build step. There is no export to import.

So the bottom of `app.js` carries a **test seam**: a single
`window.__imago = { ... }` object exposing the pure helpers plus the `state` and
`dom` objects. `test/harness.js` builds a jsdom, evaluates `app.js` inside it,
and hands the seam back.

The seam ships to the browser. That is deliberate and grants no new capability:
everything reachable through it, `getSessionKey` included, reads same-origin
browser storage that any script in the page can already read. It is a test
convenience, not a trust boundary — so don't treat it as one, and don't put
anything behind it that isn't already reachable.

If you add a function the tests need, add it to the seam. Keep the seam a flat
list of references; do not put logic in it.

### The harness gotcha that cost an afternoon

`boot()` is **async** and must be awaited. It waits for the jsdom `load` event
*before* evaluating `app.js`. Evaluate too early, while `document.readyState`
is still `'loading'`, and `app.js` defers `init()` to `DOMContentLoaded` — then
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
cp app.js /tmp/app.js.good
# delete or invert the guard you are testing, then:
npm test
cp /tmp/app.js.good app.js
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
