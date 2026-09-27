# Frame packet: 04-shape

## Project inputs

- Project: /Users/sibhi-zstch1643/conductor/workspaces/something-that-does-stuff/abu-dhabi/videos/imago-launch
- Design tokens: /Users/sibhi-zstch1643/conductor/workspaces/something-that-does-stuff/abu-dhabi/videos/imago-launch/frame.md
- RULES_DIR: /Users/sibhi-zstch1643/.claude/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 4 — It reads the shape

- scene: Amigo falls back into frame huge, and the camera flies through its aperture window into Imago's engine. Real pikachu values turn into types, the types collapse into the schema id sch_1t1u1v1, and "Seen this shape before?" builds to the silence before the drop.
- voiceover: ""
- duration: 3.75s
- poster: 2.6s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/04-shape.html
- type: feature_showcase
- persuasion: Mechanism reveal (the how, made visual)
- beat: intrigue → suspense
- asset_candidates: assets/amigo-mascot.svg — Amigo's aperture as the window; assets/app-inspect.png — reference for the real schema id / snapshot row
- blueprint: zoom-out-workspace-reveal (Adapt: inverted, a push THROUGH the aperture)
- focal: the value→type transformation
- roles: amigo-mascot = cutout (becomes the portal); app-inspect = reference only
- sfx: a whoosh-through, soft digital blips per type swap, a rising riser into a hard silence at 3.55s

Adapt: keep one continuous camera move through nested levels; it pushes IN through Amigo's aperture rather than zooming out.
Scene 1 (0.0–0.94s): Amigo drops back in from the top, huge (fills ~80% of frame height), lands with a squash, and the camera immediately pushes into its aperture (the knock-out rounded rect), which scales up to fill the frame. Inside is ink ground. → coordinate-target-zoom
Scene 2 (0.94–2.34s): inside, a compact real pikachu JSON block (name "pikachu", base_experience 112, height 4, is_default true, abilities […], types ["electric"]) in mono. On beats 3, 4 and 5 each value flips to its type in a 3D char flip: "pikachu" → "string", 112 → "number", true → "boolean", [...] → "array". The label "Reads the shape." types in above (paper, h2). → hacker-flip-3d
Scene 3 (2.34–3.28s): beat 6: the typed block collapses into a single mono chip "sch_1t1u1v1" (the real schema id) with a fingerprint-style ring drawn around it (svg self-draw). Beat 7: "Seen this shape before?" builds under it word-by-word.
Scene 4 (3.28–3.75s): tension: the chip trembles (deterministic jitter), and at 3.55s everything cuts to pure ink (the music's silence dip) and holds black into the drop.

narrativeRole: Shows the clever part (structure, not values) in the calm before the drop.
keyMessage: Same shape, same design, no second model call.

## Selected blueprint: zoom-out-workspace-reveal

# zoom-out-workspace-reveal — Zoom-Out Workspace Reveal

**intent**: Open TIGHT on one full-bleed detail — a graphic macro or a small UI region — let micro-action play in close-up, then ONE continuous decelerating zoom-out reveals that everything seen so far lives inside a containing whole (a design-tool workspace / a multi-pane agent workspace); the frame locks at the wide and element-level payoff carries on. The zoom-out IS the narrative engine and the reveal-of-nesting is the payoff — distinct from `grid-card-assemble`, where a zoom-OUT is an optional camera modifier garnishing an element-stagger assemble; here nothing assembles, the world was whole all along, and the single outward move is what re-scopes its meaning. The structural inverse of every existing push-in shape (`constellation-hub`'s push-in, `device-surface-showcase`'s continuous push, `dataviz-countup`'s push-through).

**roles served**

- Hook (from `continuous-zoomout-nesting-reveal`): when the open should be a full-bleed graphic mystery — a blob morphing, a macro blossom blooming — resolved by one unbroken exponentially-decelerating zoom-out that passes THROUGH an intermediate composition (oversized headline / card artwork / web page) before revealing the whole thing is an artboard inside a design tool (panels, layers, inspector, timeline); the frame locks and the canvas keeps animating, ending mid-action.
- Benefits (from `close-up-open-single-zoom-out-reveal`): when the payoff is scale/breadth — micro-actions play in extreme close-up on one small UI region (file rows popping in, a highlight stepping, a guided glide down a list), then ONE fast smoothly-decelerating zoom-out (~0.5–1s) reveals the region was a corner of a huge multi-pane agent workspace (chat + artifact preview + sidebar); the wide holds static to the end while element-level payoff completes the story ("look how much the agent did — and here's the deliverable").

**duration**: 6.8–11s (Hook continuous-pull both 6.8s; Benefits dwell-then-snap 10.7–11s — the dwell and the post-lock payoff stretch, the reveal itself does not)

**HARD RULE — no zoom-in anywhere; camera static outside the single reveal.** Carried verbatim from both Benefits goldens and structurally true of both Hook goldens: the camera's only scale motion is OUTWARD. One zoom-out per shot. Before the reveal the camera either holds, glides/pans along the close-up surface, or is already running the (only) pull-back; after the reveal decelerates to a full stop the frame is LOCKED — every later change (pane swap, pane expansion, cursor travel, playhead scrub, canvas animation) is element/layout motion, never camera. No push-in, no punch, no re-zoom, no second reveal. Violating this collapses the shape back into a generic camera tour.

**shot structure** (one oversized static world — the full `[whole: workspace]` authored at final layout from frame 0 — with the camera starting scaled far in on the `[detail]`; the reveal is one scale animation on the world; two folded sub-shapes — **(A) continuous nesting pull** (Hook) and **(B) close-up dwell → snap reveal** (Benefits))

- **Scene 1 (0.0–~2.5s) — full-bleed detail + micro-action.** Extreme close-up: the `[detail: graphic macro — blob / blossom stem / small UI region — file list / browser corner]` fills the frame edge-to-edge with NO containing chrome, canvas, or neighboring panes visible. The detail PERFORMS in close-up — this beat is never a static hold:
  - _Variant — Hook (A)_: the graphic itself moves/morphs/blooms — an organic `[accent]` blob flows across and morphs into an undulating wavy line, or blurred macro forms sharpen as circular petals pop and expand outward into a flat vector `[motif]` — while the pull-back is ALREADY running underneath (the camera never waits).
  - _Variant — Benefits (B)_: camera holds (or glides) while UI micro-action plays — `[rows: filenames / list items]` pop in top-to-bottom, a soft `[highlight]` steps down row-by-row, or the camera rides down a list while gently pulling back. Optional blur-to-sharp resolve on the opening frame.

- **Scene 2 (~2.5s–reveal start) — the middle beat.** Diverges by sub-shape:
  - _Variant — Hook (A) — intermediate nesting level_: the continuing zoom-out resolves a mid-level composition, still full-bleed, still no chrome — oversized `[headline]` glyphs descend into frame as partial letterforms and settle centered (the "descent" is pure world-scale: the letters are static in world space, the camera pull produces the motion), or the `[motif]` is revealed living inside a `[card]` in a row of cards on a `[web page]`. The viewer re-scopes once — and still doesn't know the real container.
  - _Variant — Benefits (B) — close-up beat advances_: the close-up story develops at the same tightness — the view shifts to an adjacent `[panel]`, a new `[row]` fades/slides in and grows its panel, a `[cursor]` enters and hovers it with a soft highlight. This is the pre-reveal dwell; tension is "we're deep inside something."

- **Scene 3 (the reveal) — ONE decelerating zoom-out completes; frame LOCKS.** The signature move. The camera pulls back to scale 1 and eases to a full stop, revealing the containing `[whole]`:
  - _Variant — Hook (A)_: the pull is the tail of the SAME continuous zoom running since frame 0 (total travel ~4.3–4.5s of a 6.8s shot), with strong exponential deceleration — the `[intermediate composition]` turns out to be `[an artboard / a phone-screen mock]` on a `[design-tool canvas]`: light chrome, left pages/layers panel, right properties inspector, blue selection box, bottom animation timeline with keyframe bars.
  - _Variant — Benefits (B)_: the pull is a discrete rapid burst (~0.5–1s) from the held close-up — smooth, heavily decelerating — landing the full `[multi-pane agent workspace]`: left `[chat pane]` with the prompt + status + response, center/right `[artifact pane: spreadsheet / deck preview]`, optional `[sidebar: progress checklist + artifacts + context]`.
  - Both: the zoom-out ends BEFORE the shot does — always leave a post-lock act. The deceleration-to-stop is what makes the lock legible.

- **Scene 4 (lock–end) — element-level payoff on the locked wide.** The reveal is not the ending; the close-up's world keeps living inside the wide. All motion is element/layout:
  - _Variant — Hook (A)_: a `[cursor]` enters from off-frame and glides to hover/click the selected element, or a `[playhead]` scrubs left-to-right across the bottom timeline while the canvas artwork animates in sync (petals rotate about their hub, a starburst spins in place, a motif sweeps/shifts). Ends MID-ACTION — the tool is alive.
  - _Variant — Benefits (B)_: a `[file-attachment card]` fades in → the cursor clicks `[Open]` → the artifact pane swaps content via a quick white-out → the viewer pane expands full-width over its neighbor (LAYOUT motion, not camera) landing on the `[deliverable: full slide / dashboard]`; or the frame simply holds long and static while the cursor drifts to rest near the `[payoff stat]`. Struck-through checklist items in the sidebar read as completed work. Long hold to the end.

**motion vocabulary**: one continuous scale-driven zoom-out with exponential/eased deceleration (no cuts) · single fast decelerating zoom-out burst (~0.5–1s) · workspace-lock at zoom end · full-bleed no-chrome opening · blur-to-sharp macro focus resolve · organic blob flow + morph into undulating wavy line · squiggle-underline settle with residual undulation · circular petals popping/expanding outward (bloom) · oversized letters descending into frame as partial glyphs (world-scale, not element motion) · text scaling down through the frame to a centered settle · rows pop in top-to-bottom · selection highlight steps down row-by-row · camera rides/pans down a list while pulling back · new row fades/slides in and grows its panel · cursor hover with soft row highlight · cursor entering from off-frame and gliding to hover/click · timeline playhead scrub left-to-right · in-canvas rotation about a hub / spin-in-place · motif shift/sweep-in · file-attachment card fade-in · cursor click · pane content swap via quick white-out · pane expands full-width over neighbor (layout motion) · checklist items shown struck-through · long static hold · cursor drift to rest · ends mid-action (Hook).

**rule mapping** (motion verb → `rule-id`)

- the single decelerating zoom-out on the whole world → `viewport-change` (one `.world` wrapper; `cam` object as single source of truth via `onUpdate`; start `cam.scale` at the reveal ratio with `T = -offset × S` centering the detail, tween scale → 1 and translate → 0 with ONE shared ease — the detail drifts from frame-center to its home slot as the wide takes over, exactly the golden read)
- off-center detail framed at open, zoom-out to wide → `coordinate-target-zoom` ("Zoom out (target → wide view)" variation — nested wrappers, reverse phases: start zoomed on the measured target, tween outer scale → 1 + inner translate → 0 with shared duration/ease; measure the detail's center after `fonts.ready`, never hand-derive)
- pre-reveal glide/ride down a list while gently pulling back (Benefits B) → `viewport-change` (pan + scale composed on the one `cam` object) — sequencing the slow-glide → hold → fast-pull profile → `multi-phase-camera` (phase machinery; this shape runs the same scale-agnostic math at 4–12× outward — see `viewport-change`'s scale-guide range note)
- exponential deceleration-to-stop → ease selection (`expo.out` / `power4.out` on the reveal tween) — parameter guidance, no rule needed; after the stop, NO camera tweens exist on the timeline (hard rule above)
- blur-to-sharp macro resolve chorded to the early pull → `depth-of-field-blur` (refocus/settle variation: `--dof` ramps to 0 as the zoom recedes, same timeline position as the pull)
- oversized partial glyphs descending / text scaling down through the frame → no element tween — authored static in world space; `viewport-change`'s pull produces the motion (author trap: animating the letters separately double-moves them)
- organic blob flow + morph into wavy line → SVG path morph — see `hyperframes-keyframes` (morph); flagged special, like `device-surface-showcase`'s WebGL specials — substitute a non-morph accent when the capability isn't loaded
- squiggle-underline residual undulation → `sine-wave-loop` (finite bounded undulation)
- circular petals pop/expand outward (bloom) → `spring-pop-entrance` (staggered pops) + `center-outward-expansion` (petals expand from the hub to final positions)
- rows pop in top-to-bottom → `spring-pop-entrance` (staggered group, ≤500ms stagger cap) or `gsap-effects` (low-drama fade + short slide stagger)
- selection highlight steps down row-by-row → `gsap-effects` (stepped `tl.set` repositions at time thresholds — instant steps, no glide; trivial, no dedicated rule needed)
- new row fades/slides in → `spring-pop-entrance` (soft variant); its panel growing to fit → `anchored-layout-expand` (one-axis layout expansion)
- cursor enters off-frame → glides → hovers → clicks → `cursor-click-ripple` (move-to-target, co-depress, ripple); soft hover row-highlight → `gsap-effects` (background-color/opacity tween)
- timeline playhead scrub left-to-right → `gsap-effects` (linear `ease:"none"` translateX); in-sync canvas animation = place the artwork tweens at the same timeline position as the scrub (sync is free on one paused timeline)
- in-canvas rotation about a hub / spin-in-place (petal flower, starburst) → `svg-icon-enrichment` (SVG `setAttribute('transform','rotate(deg cx cy)')` for explicit centers)
- motif shift/sweep-in on a card → `gsap-effects` (masked translate) or `techniques.md` clip-path reveal
- file-attachment card fade-in → `spring-pop-entrance` (soft) / `gsap-effects` fade
- pane content swap via quick white-out → `discrete-text-sequence` (whole-state swap at a threshold) + `gsap-effects` (white flash overlay with attack-decay opacity envelope)
- pane expands full-width over neighbor (layout motion) → `anchored-layout-expand` (one-axis layout hand-off; width/height tweens stay forbidden)
- checklist items struck-through / status states → static content, or `discrete-text-sequence` if they check off on screen
- long static hold + cursor drift to rest → hold needs no rule; the drift is a single slow `gsap-effects` translate that ARRIVES somewhere meaningful (rests near the payoff stat) — it performs, it is not idle wobble
- ends mid-action (Hook) → the playhead/canvas tweens simply run to the composition edge — no exit move, no rule

**camera law — staging the one move** (the camera is the engine here, not a modifier)

- Build the ENTIRE `[whole]` workspace at final layout inside one `.world` wrapper; there is no second set. The open is `cam.scale = S0` (typically 4–12× — whatever makes the `[detail]` full-bleed) with counter-translate centering the detail; the reveal tweens to `scale 1, translate 0`. `overflow: hidden` on the scene; background on the scene, never the world.
- Crispness constraint: everything visible at open must survive S0 magnification — author the detail as DOM/vector (text, SVG, CSS shapes); any raster inside the close-up needs `sourceResolution ≥ rendered × S0`.
- Sub-shape A: the reveal tween spans ~0–4.5s with `expo.out`-class deceleration — one tween, no phases, no cuts; element beats (morph, bloom, glyph settle) are positioned along it.
- Sub-shape B: optional gentle pre-reveal pan/pull (`viewport-change` pan, or a slow scale ease-out ≤ ~15% travel) during the dwell, then the reveal burst (~0.5–1s, heavy decel) as its own tween; camera fully static after.
- Never: a zoom-in, a second zoom-out, camera motion after the lock, or replacing the reveal with a cut. One outward move is the whole grammar.

**boundary vs `grid-card-assemble`**: it already carries an optional zoom-OUT reveal modifier (glass-card / logo-wall variants), so the two shapes border each other. The test: if elements ASSEMBLE and the pull-back merely shows the assembled array in context, it's `grid-card-assemble`; if the world is whole from frame 0 and the single decelerating pull-back is itself the story — close-up mystery → nesting reveal → locked-frame payoff — it's this blueprint. Related evidence: a mined profile-page golden runs the same single UI zoom-out/scroll-up reveal at small scale inside a kinetic-type shot, corroborating the move's currency without sharing the shape.

## Selected motion rule: coordinate-target-zoom

---
name: coordinate-target-zoom
description: Zoom into a specific non-centered element by combining scale with counter-translation — target ends at viewport center after the zoom completes.
metadata:
  tags: camera, zoom, scale, translate, target, off-center, focus
---

# Coordinate Target Zoom

A simple `scale > 1` on a wrapper pushes off-center content OFF the visible canvas. To zoom _into_ a specific non-centered element, apply scale AND an inverse translation in lockstep so the target lands at viewport center.

## How It Works

Two nested wrappers, separated concerns — never scale and translate on the SAME element (`translate * scale` ≠ `scale * translate` in CSS transform composition):

1. **Outer wrapper** applies `scale` (the zoom) around `transform-origin: 50% 50%`
2. **Inner wrapper** applies `translate(x, y)` (the counter-shift)

The counter-translate is the **negation** of the target's offset from viewport center:

```
T = -offset
```

Derivation: the inner translate moves the target to `offset + T` in pre-scale units; the outer scale S (around center) maps that to `S × (offset + T)`; landing at center means `S × (offset + T) = 0` → **`T = -offset`**. The formula does NOT depend on S — the translate is identical at 1.5×, 2×, or 3×. A common wrong intuition is `T = -offset × (S - 1)`: it coincidentally matches at S = 2 and is wrong at every other scale.

⚠️ **This is the NESTED-wrapper formula.** The single-wrapper camera in [viewport-change.md](viewport-change.md) puts `translate(x,y) scale(S)` on ONE element, where CSS applies scale first — there the counter-translate is **`T = -offset × S`**. The two formulas are not interchangeable; match the formula to the wrapper structure.

## Getting the offset

`T = -offset` is only as good as `offset`. The #1 way this pattern ships broken is hand-computing `offset` from a layout formula, getting the **sign** or magnitude wrong, and letting the zoom amplify a small error off-screen. **Default to measuring the target's real laid-out center; reserve the formula for symmetric rows.**

**Default — measure the actual center (works for ANY layout).** Immune to sign errors because it reads the rendered DOM, not a mental model:

```js
await document.fonts.ready; // metrics final; fallback fonts are 10–30px off → tens of px after a 3×+ zoom
const W = 1920,
  H = 1080;
const r = document.getElementById("target-card").getBoundingClientRect();
const TARGET_OFFSET_X = r.left + r.width / 2 - W / 2;
const TARGET_OFFSET_Y = r.top + r.height / 2 - H / 2;
```

Measure **once at setup** and bake — never per-frame in `onUpdate`. Because the measurement is async (`fonts.ready`), build and register the timeline inside the same `async` setup so the baked offset is ready before `window.__timelines[id]` is published.

**Shortcut — symmetric equal-width row ONLY:**

```js
const index_offset = targetIndex - (N - 1) / 2;
const TARGET_OFFSET_X = index_offset * (CARD_WIDTH + CARD_GAP);
```

⚠️ This assumes every sibling is the **same width**. The moment the row is asymmetric, it gives the wrong answer — often the wrong **sign**: the heavier side shifts the centered target the _opposite_ way you'd guess (e.g. `companion(220) + gap + wordmark + gap + chip(110)` puts the wordmark ~55px **right** of center, but "chip − companion" intuition says left). For anything but equal cards, **measure**.

**Headroom budget — cap the scale from the measured size.** A zoom multiplies any centering error; keep the target ≤ ~88% of the canvas at peak:

```js
const maxScale = Math.min((0.88 * W) / r.width, (0.88 * H) / r.height);
const ZOOM_SCALE = Math.min(DESIRED_SCALE, maxScale);
```

A target filling 97%+ of the frame reads as cut-off the instant its center is slightly off — and a hand-baked offset always is. (The perception gate flags this as `primary-offscreen`; `data-layout-allow-overflow` does **not** exempt it.)

## Recipe

```html
<div class="zoom-outer" id="zoom-outer">
  <div class="zoom-inner" id="zoom-inner">
    <div class="content">
      <div class="card">{other}</div>
      <div class="card target" id="target-card">{target}</div>
      <div class="card">{other}</div>
    </div>
  </div>
</div>
```

```css
.scene {
  overflow: hidden; /* REQUIRED — at zoom > 1 the scaled content leaks past the frame */
}
.zoom-outer {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  transform-origin: 50% 50%; /* center scaling is what the counter-translate math assumes */
  will-change: transform;
}
.zoom-inner {
  display: grid;
  place-items: center;
  will-change: transform;
}
```

```js
// TARGET_OFFSET_X/Y and ZOOM_SCALE come from "Getting the offset" — measured
// at setup (after fonts.ready), baked. Counter-translation = -offset.
const counterX = -TARGET_OFFSET_X;
const counterY = -TARGET_OFFSET_Y;

// Scale and counter-translate MUST share position, duration, AND ease —
// otherwise the target visibly wanders mid-zoom.
tl.to("#zoom-outer", { scale: ZOOM_SCALE, duration: ZOOM_DUR, ease: "power3.inOut" }, ZOOM_AT);
tl.to(
  "#zoom-inner",
  { x: counterX, y: counterY, duration: ZOOM_DUR, ease: "power3.inOut" },
  ZOOM_AT,
);
```

## Variations

- **Zoom out (target → wide view)**: reverse the phases — start zoomed-in, then tween to `scale: 1` + `x: 0, y: 0`; the "reveal" beat is the panorama.
- **Multi-target zoom sequence**: chain zooms (target A → pause → target B → pull back); each segment needs its own counter-translation pair.

## Values

| token      | range                                   | notes                                                                                      |
| ---------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| ZOOM_SCALE | 1.5× modest → 3× dominant → 5×+ extreme | cap via the headroom budget; raster media needs `sourceResolution ≥ rendered × ZOOM_SCALE` |
| ZOOM_DUR   | 1.0–2.0s                                | under 0.8s feels like a teleport, over 2.5s drags; both tweens share it                    |
| ZOOM_AT    | after the layout lands + 0.5–1.5s       | give the viewer time to scan the layout before the camera commits                          |
| DWELL      | ≥ 1.0s after the zoom settles           | 1.5–2s ideal — the viewer must be able to read the target (climax dwell)                   |

## Critical Constraints

- **Outer scales, inner translates** — never both transforms on one element; nested wrappers keep the math clean.
- **`transform-origin: 50% 50%` on the outer wrapper** — non-center origin breaks the counter-translate derivation.
- **`overflow: hidden` on the scene root** — zoomed content leaks past the frame otherwise.
- **Scale and counter-translate share duration + ease** at the same timeline position, or the target drifts mid-zoom.
- **Offset measured once at setup** (after `fonts.ready`), baked — never recomputed per-frame, never hand-derived for a non-symmetric layout (wrong sign → target shoved off-frame).
- **Scale within the headroom budget** — target ≤ ~88% of the canvas at peak, derived from the measured size.

## See also

[viewport-change.md](viewport-change.md) (single-wrapper form, `T = -offset × S`) · [multi-phase-camera.md](multi-phase-camera.md) (a zoom phase inside a phased camera) · [sine-wave-loop.md](sine-wave-loop.md) (idle breathing after the zoom settles) · [discrete-text-sequence.md](discrete-text-sequence.md) (text assembly in the target before the zoom).

## Selected motion rule: hacker-flip-3d

---
name: hacker-flip-3d
description: Character-level 3D rotation with random glyph substitution for a decryption reveal effect.
metadata:
  tags: text, 3d, reveal, decode, hacker, randomization, perspective
---

# Hacker Flip 3D Reveal

Characters flip down from 90° in 3D while cycling through pseudo-random glyphs, then settle on the target character — a "decryption" / airport flap-display reveal. Resolves to a short target word (typically a brand or label).

## How It Works

Each character gets its own per-char tween from `rotateX: 90deg` (hidden, hinged at the bottom edge) to `0deg` (upright), staggered across the word. Below `REVEAL_THRESHOLD` progress the char displays a seeded pseudo-random glyph that reshuffles every few frames; past it, the real target character clicks into place — so the eye catches the right letter just as the flip settles. A hidden ghost copy of the full word reserves layout width so narrow flicker glyphs never shift the line.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="hacker-text-wrap" id="hacker-text" data-target="{phrase}">
  <!-- ghost row + per-char spans injected by the setup script -->
</div>
```

```css
/* the scene root (or nearest 3D ancestor) MUST set perspective: 1500px */
.hacker-text-wrap {
  font-family: {monoFont}; /* monospace so flicker glyphs hold width */
  font-weight: 900;
  font-size: HACKER_FONT_SIZE;
  position: relative; /* ghost stacks absolutely behind the live row */
}
.hacker-char {
  display: inline-block;
  transform-origin: bottom; /* flap-display hinge */
  transform-style: preserve-3d;
}
.hacker-ghost {
  opacity: 0;
  pointer-events: none;
  position: absolute;
  inset: 0 auto auto 0;
}
```

```js
const wrap = document.getElementById("hacker-text");
const targetWord = wrap.dataset.target;
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";

// Ghost row (reserves width) + live per-char spans
const ghost = document.createElement("div");
ghost.className = "hacker-ghost";
ghost.textContent = targetWord;
wrap.appendChild(ghost);
const charEls = [...targetWord].map((ch) => {
  const span = document.createElement("span");
  span.className = "hacker-char";
  span.textContent = ch === " " ? " " : ch;
  span.dataset.target = ch;
  wrap.appendChild(span);
  return span;
});

// Index-seeded hash — same frame always yields the same glyph
function pseudoGlyph(seed) {
  const h = ((seed * 9301 + 49297) % 233280) / 233280;
  return GLYPHS[Math.floor(h * GLYPHS.length)];
}

charEls.forEach((el, i) => {
  const state = { p: 0 };
  tl.to(
    state,
    {
      p: 1,
      duration: FLIP_DURATION,
      ease: "power3.out",
      onUpdate: () => {
        if (state.p < REVEAL_THRESHOLD) {
          el.textContent = pseudoGlyph(i * 1000 + Math.floor(state.p * 100));
        } else {
          el.textContent = el.dataset.target === " " ? " " : el.dataset.target;
        }
        el.style.transform = `rotateX(${90 - state.p * 90}deg)`;
        el.style.opacity = Math.min(1, state.p * 2);
      },
    },
    i * CHAR_STAGGER,
  );
});
```

## Variations

- **Top-down hinge** — `transform-origin: top` for a falling-flap look.
- **Center spin** — `transform-origin: center` reads as a barrel roll, not a flap.
- **Number-only pool** — restrict `GLYPHS` to digits for a price / countdown decode.
- **Two-pass decode** — chain two `FLIP_DURATION` tweens with different glyph pools (symbols → letters → real) for a longer reveal.

## Values

| token            | range                           | notes                                                                              |
| ---------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| HACKER_FONT_SIZE | 6–10% of viewport min-dimension | the flip IS the focal beat; ghost must use the identical size                      |
| FLIP_DURATION    | 0.4–1.0s                        | under 0.4s the flicker phase has no time; over 1.0s drags                          |
| CHAR_STAGGER     | 0.03–0.08s                      | total decode = `CHAR_STAGGER × (chars − 1) + FLIP_DURATION` — fit the phase budget |
| REVEAL_THRESHOLD | 0.5–0.7                         | lower reveals too early (no tension); higher reads as a hard end-reveal            |
| FLICKER_RATE     | 3–6 frames per glyph swap       | <3 looks like noise; >6 looks like discrete typing                                 |

Reference: `../examples/proof-logo-chain.html` (163px, 0.55s, 0.033s, 0.6).

## Critical Constraints

- **`perspective` on the scene root REQUIRED** — without parent perspective, `rotateX` renders as a 2D squash, not a 3D flip; `transform-style: preserve-3d` on each char.
- **Ghost placeholder** with identical content + font must back the live chars — without it, narrow glyphs shift the layout mid-flicker (monospace preferred; the ghost makes a proportional face recoverable).
- **Flicker seed = char index + quantized progress** — the same frame must show the same glyph.
- **Flicker rate ≥ ~3 frames per swap**; `onUpdate` work stays O(1) per char per frame.
- **Center the flip dead-center and add NO decorative chrome** (timestamp lines, "// AUTH" tags, status dots) — the flip is the beat. A necessary secondary label is BIG typography (56–72px caps + tracking) in the same stack, never a tiny corner annotation.

## See also

`card-morph-anchor` (flip reveals a phrase, card morphs into the next shot) · `counting-dynamic-scale` (the numeric counterpart).
