# TODOS

Open work, mostly the informational and deferred findings from the design audit
(`.gstack/design-reports/design-audit-localhost-2026-09-21.md`) and the /ship
pre-landing review that shipped 0.1.0.0. The ten critical findings from that
review are fixed and listed under Completed.

## Accessibility

### Touch targets missed by the coarse-pointer rule

**What:** The `@media (pointer: coarse)` block enumerates selectors and omits
`.icon-btn` (32x32) and `.switch` (23px tall).

**Why:** `.icon-btn` is the run and delete control on every saved item, so the
two most consequential buttons in the list are the two below 44px on a phone.

**Context:** `styles.css`, the coarse-pointer block near the top. Either add
the two selectors or key the rule off a class every interactive element
carries, so the next control added cannot be missed the same way. Confirmed
still present by /qa on 2026-09-22.

**Effort:** S
**Priority:** P2
**Depends on:** None

### 12 inline SVGs carry no aria-hidden or role

**What:** 12 inline `<svg>` elements have neither `aria-hidden="true"`, a
`role`, nor a `<title>`.

**Why:** Decorative icons are exposed to assistive tech as unnamed graphics,
adding noise between the labels that matter. The mark itself is labelled; these
are the small UI glyphs.

**Context:** `index.html` and the icon builders in `app.js` (`svgIcon`,
`actionIcon`). A one-attribute sweep: `aria-hidden="true"` on anything purely
decorative. Found by /qa on 2026-09-22 (ISSUE-008).

**Effort:** S
**Priority:** P3
**Depends on:** None

## Frontend

### No spacing or type tokens

**What:** 56 distinct padding values and 23 distinct font sizes, several at
half-pixel values.

**Why:** Nothing stops the next value from being a 57th. The 12px floor and the
contrast rules currently hold because they were applied by hand, not because the
system prevents violations.

**Context:** `styles.css`. A `--sp-*` / `--fs-*` pass on a 4/8 scale, then
replace literals. It touches nearly every rule, so it is its own change with its
own visual diff — do not fold it into a feature branch.

**Effort:** L
**Priority:** P2
**Depends on:** None

### Hardcoded hex values outside :root

**What:** Roughly 30 literal colours live outside the token block — hover greys,
green and red ink variants, the changed-surface tint, the landing weather
gradient, and the `#f5b52e` landing sun.

**Why:** DESIGN.md says colour only ever means changed, live or failed. A
literal that is near-but-not-equal to a semantic token (the sun is a fourth
hand-mixed amber next to `--yellow`) quietly breaks that rule.

**Context:** `styles.css` and the inline SVGs in `index.html`. Fold each into an
existing token or justify it as art direction in DESIGN.md.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Dead width transitions on meters and bars

**What:** `.val-meter-fill`, `.statbar-fill` and `.gauge-arc` declare
transitions on `width` / `stroke-dashoffset`.

**Why:** Both wrong and useless: `width` animates on the layout thread rather
than the compositor, and the nodes are rebuilt on every render with the final
value already set, so nothing animates anyway. The declarations buy bookkeeping
and no motion.

**Context:** `styles.css`. Either delete all three, or reuse the fill node across
renders and animate `transform: scaleX()` with `transform-origin: left`.

**Effort:** S
**Priority:** P3
**Depends on:** None

### backdrop-filter on both sticky bars

**What:** `.appbar` and the stage bar carry
`backdrop-filter: saturate(160%) blur(12px)`.

**Why:** A blurred backdrop on a sticky element re-samples and re-blurs the full
bar width every scroll frame, which is a reliable way to drop a low-end phone
below 60fps. Both bars already sit at 86% opacity, so the blur contributes
almost nothing visually.

**Context:** `styles.css`. Raise the background to full opacity, or gate the blur
behind a `min-width` media query so phones get the flat bar.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Renderer

### Schema-spec cache is unbounded and unregeneratable

**What:** `imago.schemaSpecs` grows forever — no cap, no eviction — and the
recorded `lastUsedAt` is never read. There is also no way to regenerate a
cached spec.

**Why:** Each entry embeds a full derived schema, so exploring many endpoints
steadily fills localStorage; the quota fallback only sheds snapshots, so once
the spec store alone nears the quota every write fails permanently. And once a
poor-but-valid layout is cached for a shape, the Generate prompt never returns —
the only escape is Clear all data.

**Context:** `callGemini()` in `app.js`. Cap at ~50 entries evicting on the
`lastUsedAt` already recorded, have the quota path shed old specs too, and add a
Regenerate action on the stage that bypasses the cache.

**Effort:** M
**Priority:** P1
**Depends on:** None

### Snapshot keys ignore request headers

**What:** Snapshot lists, the diff baseline and reload restoration are keyed on
`hashString(url)` alone.

**Why:** Fetch the same endpoint as a different identity and the diff is
computed against the other identity's body — every field reports as changed, and
a reload rehydrates the wrong response into the interface.

**Context:** `currentRequestKey()` in `app.js`. Mix a hash of the parsed headers
into the key and drop snapshots whose header fingerprint no longer matches.

**Effort:** M
**Priority:** P2
**Depends on:** None

### Falsy payloads are treated as no data

**What:** Every check tests the truthiness of `state.data`, so a valid `0`,
`false`, `""` or `null` body reads as "nothing fetched" — the run-meta row
hides, auto-refresh refuses to start, and a failure discards the rendered page.

**Why:** The request succeeded and the byte size and schema hash are known, but
the UI says otherwise.

**Context:** `app.js`. `state.hasData` was added for exactly this and is set but
not yet consulted everywhere; finish routing the truthiness checks through it.

**Effort:** S
**Priority:** P2
**Depends on:** None

### Duplicate gradient id when a spec has two charts

**What:** `renderChart` writes `id="imagoChartFill"` per chart and `styles.css`
resolves the area fill through the document-global `url(#imagoChartFill)`.

**Why:** Two charts in one spec emit two elements with the same id. Invalid HTML,
every chart paints from whichever gradient resolves first, and per-chart styling
can never diverge.

**Context:** `renderChart()` in `app.js`. Generate a unique id per chart and set
`fill` on the polygon directly.

**Effort:** S
**Priority:** P3
**Depends on:** None

### Invalid request headers are misreported as a CORS failure

**What:** `parseHeaders` accepts any `name: value` pair, so a forbidden or
malformed header makes `fetch` throw a `TypeError` that the failure handler's
`/failed to fetch|networkerror|load failed/i` heuristic labels "Network or CORS
failure".

**Why:** The user is told the endpoint is down when their own input is at fault.

**Context:** `parseHeaders()` and `handleRequestFailure()` in `app.js`. Validate
names against the RFC token charset and surface a distinct "Invalid header"
error.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Content

### Empty response is labelled "not JSON" and its message dangles

**What:** A 0-byte response renders `Imago renders JSON APIs. The endpoint
returned 0 B starting with: ` — a clause with nothing after it.

**Why:** The label is wrong (an empty body is not malformed JSON) and the
sentence visibly runs out, which reads like a bug even though the request was
handled correctly.

**Context:** The not-JSON branch in `performRequest`'s response handling in
`app.js`. Give a 0-byte body its own message and drop the "starting with"
clause when there is no snippet. Found by /qa on 2026-09-22 (ISSUE-006).

**Effort:** S
**Priority:** P3
**Depends on:** None

## Infrastructure

### Mark path duplicated across eight files

**What:** The Imago mark path data is copy-pasted verbatim into `index.html`,
`favicon.svg`, three files in `assets/`, and three brand boards.

**Why:** A mark revision is eight hand edits and nothing syncs them. The
`<desc>` drifting out of sync with the geometry was exactly this failure, caught
in review.

**Context:** Keep `assets/imago-mark.svg` as the one source and have
`publish.sh` inline it, or at minimum record the file list as a checklist in
`docs/CODE-INTEGRATION.md`.

**Effort:** M
**Priority:** P3
**Depends on:** None

### npm audit reports 5 advisories in dev dependencies

**What:** `npm install` reports 5 vulnerabilities (3 moderate, 1 high, 1
critical) in the Vitest/jsdom dependency tree.

**Why:** Dev-only and never shipped — `publish.sh` copies an explicit file list,
so nothing from `node_modules` reaches `dist/`. Worth confirming rather than
assuming, and worth clearing so the signal is not permanently noisy.

**Context:** Run `npm audit` for the tree, then `npm audit fix` where it does
not force a major bump.

**Effort:** S
**Priority:** P3
**Depends on:** None

### applySpec's last-resort guard is unreachable, so untested

**What:** `if (!spec) spec = minimalSpec()` in `applySpec` cannot currently fire,
because `buildFallbackSpec` returns a root-legal spec for every input.

**Why:** Its test asserts the guard is sound, not that it triggers — the one
mutation in the suite that survives. Recorded so nobody reads that green as
coverage it is not.

**Context:** `TESTING.md` documents this. Either find a real input that reaches
it, or accept it as defence-in-depth and leave the note.

**Effort:** S
**Priority:** P4
**Depends on:** None

## Completed

### Ollama, per-provider keys and connection tests — v0.2.0.0

**What:** Ollama as a third provider, a key per provider, a Test button per
provider, and a full-HTML render mode. Plus the fixes that made Ollama
actually usable.

**Why:** Generating with Ollama failed outright — the reply hit the model's
default 4096-token context and came back truncated mid-JSON, reported as
"returned an unusable spec". The connection test only pinged /api/tags, so it
went green while the configured model (`qwen3`, not a real tag on a stock
install) did not exist.

**Context:** Ollama moved to its native /api/chat, where num_ctx and
num_predict can be set and the schema is passed as `format`. The test now runs
a real completion with the model that would be used. Settings reads the
installed models and offers them. Verified end to end against a live server:
gemma4:latest returns a generated plan in ~40s.

Ollama from a hosted origin still needs `OLLAMA_ORIGINS=<origin> ollama serve`
— Ollama's CORS rejects non-localhost origins by default (403 measured). The
error message names the exact command with the real origin substituted.

**Effort:** L
**Priority:** P1
**Completed:** v0.2.0.0 (2026-09-22)

### QA pass on v0.1.0.0 — six fixes

**What:** Fixed by /qa on branch run-qa-checks, 2026-09-22. Health score
87 → 99.

- A field named `constructor` was silently dropped from every interface.
  `humanize()` looked words up on a plain object, so the key hit
  `Object.prototype.constructor`, the label became a function, and the fact was
  lost. `LABEL_WORDS` is prototype-free now. (ISSUE-002)
- The tabs claimed `role=tab`/`role=tablist` with `aria-controls` 0/5, no
  `role=tabpanel`, no `aria-labelledby` and no `tabindex`, so arrow keys did
  nothing. Fully wired, with Left/Right/Home/End and a roving tabindex. This
  was the P1 accessibility item. (ISSUE-005)
- `frame-ancestors` in the meta CSP is ignored by spec: it logged a console
  error on every page load and provided no protection. (ISSUE-001)
- The stage crumb was `display:none` on phones, so the stage bar gave no host
  and no depth. (ISSUE-004)
- The Headers tab sat 62px off a 375px viewport with no scroll affordance, so
  the request-headers editor was undiscoverable on mobile. (ISSUE-003)
- `#modelName` had no accessible name at all. (ISSUE-007)

**Why:** One silent data-loss path, one accessibility contract that was
announced but not implemented, and a console error on 100% of loads.

**Context:** Report at `.gstack/qa-reports/qa-report-localhost-2026-09-22.md`.
Every fix has a mutation-checked regression test; the suite went 55 → 64 tests.

**Effort:** M
**Priority:** P1
**Completed:** v0.1.0.0 (2026-09-22)

### Ten critical findings from the pre-landing review

**What:** Cross-origin credential replay on follow actions; credentials
persisted to localStorage; "Clear all data" resurrecting them; scalar JSON
bodies crashing the renderer; the request pipeline bricking itself on a throwing
failure handler; Back desyncing from browser history; failed navigation showing
the wrong page; a model call racing auto-refresh; Raw and Schema panes rebuilt
on every hidden-tab refresh; the snapshot store fully re-parsed per request.

**Why:** Token leakage, data loss on clear, and dead-end app states.

**Context:** Each fix has a mutation-checked regression test in
`test/regressions.test.js`.

**Effort:** L
**Priority:** P0
**Completed:** v0.1.0.0 (2026-09-22)

### No test framework

**What:** Vitest + jsdom, 55 tests, CI workflow, TESTING.md.

**Why:** A 4000-line unbundled `app.js` had nothing checking it.

**Context:** `app.js` is one IIFE reached through a `window.__imago` seam. Three
jsdom traps are documented in TESTING.md.

**Effort:** M
**Priority:** P0
**Completed:** v0.1.0.0 (2026-09-22)

### Design audit findings 001–012

**What:** Mobile timeline, WCAG AA tokens, stage-bar identity, 12px type floor,
heading order, focus rings and coarse-pointer targets, ink stat bars, phone fact
sheet, ink avatars, ink chart strokes, single `--link` token, mono floors.

**Why:** Design B → A−, detector 33 → 12 on app files.

**Context:** `.gstack/design-reports/design-audit-localhost-2026-09-21.md`.

**Effort:** L
**Priority:** P1
**Completed:** v0.1.0.0 (2026-09-22)

### Undefined quota handler and broken .spec-body selector

**What:** `writeJSON` called a `setStatusMessage` that was defined nowhere; a
block comment inside a selector silently scoped `.spec-body` to stage mode only.

**Why:** The first quota error turned a successful fetch into a failure screen.
Off-stage layouts lost their flex column and gap.

**Context:** The design audit had reported the `.spec-body` comment and
concluded it did not reproduce. It did.

**Effort:** S
**Priority:** P0
**Completed:** v0.1.0.0 (2026-09-22)
