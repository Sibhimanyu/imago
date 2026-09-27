# Frame packet: 02-json-wall

## Project inputs

- Project: /Users/sibhi-zstch1643/conductor/workspaces/something-that-does-stuff/abu-dhabi/videos/imago-launch
- Design tokens: /Users/sibhi-zstch1643/conductor/workspaces/something-that-does-stuff/abu-dhabi/videos/imago-launch/frame.md
- RULES_DIR: /Users/sibhi-zstch1643/.claude/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 2 — The wall of JSON

- scene: The dark JSON panel from the landing hero fills the frame and scrolls fast — braces, keys, nested arrays blur past. Amigo peeks in from the bottom edge, tilts back as the wall towers over them.
- voiceover: ""
- duration: 3s
- poster: 1.8s
- transition_in: zoom-through
- status: built
- src: compositions/frames/02-json-wall.html
- type: pain_point
- persuasion: Pain agitation (scale of the mess)
- beat: overwhelm
- asset_candidates: assets/landing-full-page.png — dark JSON panel (pokeapi pikachu response) as the source for the rebuilt scrolling panel
- on_screen: "Readable? Barely."
- blueprint: compose
- focal: rebuilt JSON wall (mono, from the landing hero's pikachu response)
- roles: assets/landing-full-page.png = reference only (the JSON is rebuilt as live mono text, not the screenshot)
- sfx: whoosh on entry, low riser under the scroll

Compose: a full-bleed ink ground. The pikachu JSON (id 25, base_experience 112, abilities static/lightning-rod, forms, game_indices, held_items oran-berry, moves mega-punch…) is set in mono at ~1.9cqw in paper-grey, numbers in code-number blue, and repeated to fill three screen-heights.
Scene 1 (0.0–1.5s): the JSON wall already scrolls upward at constant high speed from frame 0, with a slight vertical motion-blur streak. At 0.5s Amigo, in paper white, rises from below the bottom edge to peek in (about 60% visible, lower-left third). → motion-blur-streak
Scene 2 (1.5–2.0s): the scroll decelerates hard (power3); Amigo tilts back away from the towering wall. A dark gradient rises from the bottom 45% so the type area is clean ink.
Scene 3 (2.0–3.0s): on beat 5 "Readable?" slams in lower-right (paper, h1 size); on beat 6 "Barely." lands under it in muted-2. The scroll has stopped: held read. → kinetic-beat-slam (two beats only)

narrativeRole: Makes the pain physical — raw JSON is structure nobody should have to read by eye.
keyMessage: Raw responses aren't made for people.

## Selected motion rule: kinetic-beat-slam

---
name: kinetic-beat-slam
description: Percussive kinetic typography — short phrases slam in on a steady beat with distinct per-phrase entrances, optional rhythm chrome (metronome ticks, beat bar), then a locked finale.
metadata:
  tags: text, kinetic, typography, beat, rhythm, slam, percussive, punchy
---

# Kinetic Beat Slam

Short phrases hit one at a time on a **steady beat**, each with a _different_ entrance, then stack into a locked finale — the recipe for "punchy / rhythmic" text-forward pieces (taglines, manifestos, hype intros). The difference between generic and rhythmic is (1) one shared **onset array** driving every element, (2) **distinct** entrances per phrase rather than one reused helper, and (3) optional **rhythm chrome** that visibly keeps the beat.

## How It Works

A single tempo grid — `PULSE` seconds per sub-beat, `BEATS = [t0, t1, t2, …]` on that grid — is the rhythmic spine; every phrase entrance, accent, and chrome tick reads its time from it, so the piece locks to one pulse instead of drifting hand-tuned offsets. Each phrase gets a different transform axis (scale+blur slam / side snap / rise+rotate) with short attacks (0.35–0.6s on the hit), then the stack holds with a finite low-amplitude breath.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="kbs-stage">
  <div class="kbs-line" id="p1"><span class="verb">Notice</span> more.</div>
  <div class="kbs-line" id="p2"><span class="verb">Decide</span> faster.</div>
  <div class="kbs-line" id="p3"><span class="verb">Act</span> now.</div>
</div>
<!-- optional rhythm chrome -->
<div class="kbs-metronome" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
```

```css
.kbs-stage {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 120px 160px; /* title-safe margin */
}
.kbs-line {
  font-family: "Archivo Black", "League Gothic", sans-serif; /* embedded display face */
  font-size: 150px;
  line-height: 0.96;
  letter-spacing: -0.03em;
  color: #f5f5f5;
}
.kbs-line .verb {
  color: #ff5b2e; /* exactly one accent hue */
}
.kbs-metronome {
  position: absolute;
  bottom: 64px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 14px;
}
.kbs-metronome i {
  width: 6px;
  height: 28px;
  background: #ff5b2e;
  opacity: 0.25;
}
```

```js
// ONE tempo grid drives everything — phrases AND the metronome read it.
const PULSE = 0.4; // seconds per sub-beat
const BEATS = [PULSE * 1, PULSE * 5, PULSE * 9]; // phrase onsets, on the grid

// Distinct entrances per phrase (NOT one reused helper).
tl.fromTo(
  "#p1",
  { scale: 1.5, filter: "blur(16px)", opacity: 0 },
  { scale: 1, filter: "blur(0px)", opacity: 1, duration: 0.5, ease: "power4.out" },
  BEATS[0],
);
tl.fromTo(
  "#p2",
  { x: -320, opacity: 0 },
  { x: 0, opacity: 1, duration: 0.45, ease: "expo.out" },
  BEATS[1],
);
tl.fromTo(
  "#p3",
  { y: 90, rotation: 6, opacity: 0 },
  { y: 0, rotation: 0, opacity: 1, duration: 0.55, ease: "circ.out" },
  BEATS[2],
);

// Rhythm chrome: each tick flashes on the SAME grid, not a magic offset.
gsap.utils.toArray(".kbs-metronome i").forEach((tick, i) => {
  tl.to(tick, { opacity: 1, duration: 0.08, yoyo: true, repeat: 1, ease: "none" }, PULSE * (i + 1));
});

// Finale hold: floor (not ceil) so the repeat never overshoots data-duration;
// max(0,…) so a short hold never yields a negative repeat (GSAP reads negative as -1 = infinite).
const holdStart = BEATS[2] + 0.7,
  cycle = 1.6,
  holdDur = SCENE_DURATION - holdStart;
tl.to(
  ".kbs-stage",
  {
    scale: 1.01,
    duration: cycle / 2,
    ease: "sine.inOut",
    yoyo: true,
    repeat: Math.max(0, Math.floor(holdDur / cycle) - 1),
  },
  holdStart,
);
```

## Variations

- **Entrance easing by attack character** — `power4.out` hard slam ⭐ default hit · `expo.out` hardest snap (side-snaps, whip-ins) · `back.out(2)` overshoot pop (accents only, not body words) · `circ.out` heavy rise with momentum. Use **at least 3 distinct easings** across the piece.
- **Rhythm chrome alternatives** — a center beat bar or a `// label` monospace tag pulsing on-beat instead of the 5-tick metronome; mark any decorative that must survive a shader transition per `../transitions/overview.md`.
- **Finale dressing** — stack + accent underline sweep ([css-marker-patterns](css-marker-patterns.md)); don't just leave the last phrase sitting.

## Values

| token             | range                | notes                                                                                        |
| ----------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| BEATS spacing     | 1.2–1.8s             | <0.8s frantic, >2.5s loses the pulse; keep spacing even — it's a beat                        |
| entrance duration | 0.35–0.6s            | the hit must resolve before the next beat; exits ≤0.25s                                      |
| accent hue        | exactly 1            | the verbs; the rest mono white / near-black                                                  |
| display face      | 150px+, heavy weight | Archivo Black / League Gothic / Oswald — see `hyperframes-creative/references/typography.md` |

## Critical Constraints

- **One beat array, not scattered offsets** — every element times off `BEATS[]` / `PULSE`; this is the single biggest lever for "rhythmic".
- **Different entrance per phrase** — a reused `punchIn()` for all lines is the flat-but-competent tell. Vary the motion axis, reuse the ease _family_.
- **Finale repeat math**: `repeat: Math.max(0, Math.floor(dur / cycle) - 1)` — `Math.ceil` overshoots `data-duration` and trips the `gsap_repeat_ceil_overshoot` lint rule; a negative repeat is read by GSAP as `-1` (infinite).
- **No banned exit animations between scenes** — in a montage the _transition_ is the exit (`../transitions/overview.md`); only a final scene may fade out.
- **Display font must be embedded** or it silently falls back at render — Anton / Bebas-as-literal are NOT embedded (`Bebas Neue` aliases to League Gothic; verify in `typography.md`).

## See also

`3d-text-depth-layers` (extruded depth on the slammed words) · `css-marker-patterns` (finale underline/circle) · `sine-wave-loop` (the finale breath) · `../adapters/gsap-easing-and-stagger.md` (easing vocabulary).

## Selected motion rule: motion-blur-streak

---
name: motion-blur-streak
description: Fake directional velocity blur on a fast entrance or camera push-through — blur peaks at max speed and resolves to 0 at the settle, so the element streaks in then snaps sharp. Two paths — SVG feGaussianBlur on the motion axis, or an echo/ghost trail that collapses into the lead.
metadata:
  tags: motion-blur, velocity, streak, entrance, fly-in, ghost, echo, svg-filter, kinetic, camera, snap
---

# Motion-Blur Streak

Real motion blur isn't available to a seeked renderer (it integrates over shutter time), so this rule **fakes** it for a fast fly-in or hard camera push-through. The whole point is the _coupling_: the blur envelope rides the **same ease and window** as the position tween, so peak blur lands exactly on peak speed and the element is razor-sharp the instant it stops. Two paths:

- **(A) Directional SVG blur** — inline `<feGaussianBlur stdDeviation="X 0">` (X on the motion axis, 0 across it), tweened via a proxy. Cleanest; a true directional smear.
- **(B) Echo / ghost trail** — 2–4 duplicates at decreasing opacity, offset backward along the motion vector, collapsing into the lead as it settles. No filter cost; a stylized "speed-line" trail.

**Entrances and mid-shot moves only — never a mid-composition exit.** A blurred element fleeing off-frame mid-composition reads as a glitch; a hard exit between scenes is the transition's job (`../transitions/overview.md`). One sanctioned scope extension: the envelope may ride the **camera wrapper** during a travel leg — see the Camera-Travel Carve-Out.

## How It Works

A fast `out`-eased move front-loads velocity — fastest off the start, bleeding to zero at the settle. Map the blur/echo envelope onto that same curve: position travels from an off-frame / pushed-back start to rest over `MOVE_DUR`; in lockstep on the same window and ease the smear goes `PEAK_BLUR → 0` (A) or the ghosts collapse onto the lead (B). By the settle the element is fully crisp and dwells ≥1 s — the contrast between violent streak and still, sharp settle IS the effect. GSAP can't tween an SVG attribute directly: tween a plain `{ v }` proxy and write `setAttribute("stdDeviation", …)` in `onUpdate`, seeding it once at setup so a seek to t=0 shows the streaked start.

## Recipe

```html
<!-- inside a standard scene clip; overflow: hidden on the scene (the smear extends past rest) -->
<svg width="0" height="0" aria-hidden="true" style="position: absolute">
  <filter id="streak" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur id="streak-blur" in="SourceGraphic" stdDeviation="0 0" />
  </filter>
</svg>
<div class="streak-el" id="streak-el" style="filter: url(#streak)">{phrase}</div>
<!-- Path B instead: N-1 aria-hidden .streak-ghost duplicates BEHIND the lead, no filter -->
```

```js
// Path A — proxy-tweened directional blur.
const blurNode = document.getElementById("streak-blur");
const blurProxy = { v: PEAK_BLUR };
const writeBlur = () => blurNode.setAttribute("stdDeviation", `${blurProxy.v} 0`); // X axis only
writeBlur(); // seed frame 0 — a seek to t=0 must show the streaked start, not a sharp pre-frame

tl.fromTo(
  "#streak-el",
  { x: ENTER_FROM_X, opacity: 0 },
  { x: 0, opacity: 1, duration: MOVE_DUR, ease: MOVE_EASE },
  MOVE_START,
);
tl.to(blurProxy, { v: 0, duration: MOVE_DUR, ease: MOVE_EASE, onUpdate: writeBlur }, MOVE_START);

// Path B — ghosts on the SAME window/ease; per-ghost variation by index.
gsap.utils.toArray(".streak-ghost").forEach((g) => {
  const i = Number(g.dataset.i); // 1..N-1, set in HTML
  tl.fromTo(
    g,
    { x: ENTER_FROM_X - i * ECHO_STEP_PX, opacity: GHOST_BASE_OPACITY / i },
    { x: 0, opacity: 0, duration: MOVE_DUR, ease: MOVE_EASE },
    MOVE_START,
  );
});
```

## Variations

- **Vertical streak** — swap axes: `y`, `stdDeviation="0 Y"`, vertical echo offsets.
- **Camera push-through** — `scale: SCALE_FROM → 1` with a symmetric `"B B"` envelope (depth-wise smear, not directional): the wordmark punches out of soft focus and snaps crisp at the lock.
- **Staggered grid streak-in** — each card streaks into its slot at `MOVE_START + i * CARD_STAGGER` with its own blur proxy / ghosts; sharp the instant it lands.
- **Hold-the-streak** — blur on a marginally slower curve than position (position `expo.out`, blur `power3.out`) so the last wisp resolves just after arrival. Sparingly; default is locked envelopes.

## Camera-Travel Carve-Out

The envelope is also sanctioned at **wrapper level**: on the `.world` / camera wrapper of a virtual-camera scene ([viewport-change.md](viewport-change.md), [multi-phase-camera.md](multi-phase-camera.md), [3d-camera-flight.md](3d-camera-flight.md)) during a **travel leg** — a dive, a whip sweep, a violent final push. This does **not** violate "never a mid-composition exit": the world never leaves frame — the camera travels _through_ it, and every leg ends with the world at rest, sharp, inside the frame. Each leg is an **arrival** at the next pose, so the entrance doctrine applies leg by leg. Three deltas from the element-level recipe:

- **Envelope follows the leg's ease.** An `out` leg (dive, final push) uses the base recipe unchanged. An `inOut` repositioning leg peaks mid-leg: split the envelope at the velocity peak — `0 → PEAK` on the in-half ease over the first half, `PEAK → 0` on the out-half over the second. Seed the proxy at **0** for these (the streaked state lives mid-leg, not at t=0; seed-at-`PEAK_BLUR` belongs to the entrance shape, where the first frame IS the fastest).
- **Filter placement.** 2D camera: `filter: url(#streak)` on the `.world` wrapper. 3D flight: on the **perspective stage** above the 3D context — a `filter` on a `preserve-3d` element flattens it and collapses every `translateZ`. Never per-element inside the world: one frame-wide envelope, not N desynced ones.
- **Full-frame blur is heavy** — cap `PEAK_BLUR` ~18–20 at wrapper level (vs 30 for one element); a brief whip may touch ~24. Axis rule as usual: `"X 0"` for a lateral whip/pan, `"B B"` for a dive/push.

### Whip sweep (named composition)

The heavily-blurred lateral whip that resolves into the next region — two rules on one window:

1. **Position** — [nudge-curve.md](nudge-curve.md)'s three-phase chain on the camera state, tuned burst-dominant (tail still ≥3× ramp-in in time).
2. **Blur** — `0 → PEAK` across the ramp-in, held at `PEAK` through the linear burst (constant velocity = constant smear), `PEAK → 0` across the tail.

Swap or reveal the next region's content DURING the burst — the smear masks the change; the `power4.out` tail lands it sharp. Reveal during the burst, read after the tail.

```js
tl.to(cam, { x: WHIP_X * 0.1, duration: 0.12, ease: "power3.in", onUpdate: applyCamera }, WHIP_AT);
tl.to(
  cam,
  { x: WHIP_X * 0.75, duration: 0.1, ease: "none", onUpdate: applyCamera },
  WHIP_AT + 0.12,
);
tl.to(
  cam,
  { x: WHIP_X, duration: 0.35, ease: "power4.out", onUpdate: applyCamera },
  WHIP_AT + 0.22,
);

tl.to(blurProxy, { v: PEAK_BLUR, duration: 0.12, ease: "power3.in", onUpdate: writeBlur }, WHIP_AT);
// blur holds at PEAK through the linear burst (no tween needed — value rests at PEAK)
tl.to(blurProxy, { v: 0, duration: 0.35, ease: "power4.out", onUpdate: writeBlur }, WHIP_AT + 0.22);
```

## Values

| token              | range                                              | notes                                                                                           |
| ------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| MOVE_EASE          | `expo.out` / `power4.out` (default) / `power3.out` | `out`-family ONLY — `in`/`inOut` puts peak speed in the wrong place; position and blur share it |
| MOVE_DUR           | 0.25–0.6s                                          | over ~0.7s reads as a focus pull, not velocity                                                  |
| ENTER_FROM_X/Y     | 40–120% of the element's own dimension             | enough runway for the streak to read                                                            |
| PEAK_BLUR          | 8–30 (default 18)                                  | >30 erases the glyph at the start; ~18–20 cap at wrapper level                                  |
| SCALE_FROM         | 1.3–2.5                                            | push-through variation                                                                          |
| N (ghosts)         | 2–4                                                | >4 reads as strobe, not streak                                                                  |
| ECHO_STEP_PX       | 12–40px                                            | `N × step ≲ ENTER_FROM` so the furthest ghost starts inside the runway                          |
| GHOST_BASE_OPACITY | 0.3–0.6                                            | opaque ghosts read as duplicate elements                                                        |
| CARD_STAGGER       | 0.05–0.12s                                         | one assembling wave, not separate arrivals                                                      |

## Critical Constraints

- Blur peaks at peak speed and resolves to 0 at the settle — share the ease and window between position and envelope. A blur that lingers after the stop reads as a focus pull.
- Entrances / mid-shot arrivals only — never a mid-composition exit; wrapper-level use only per the carve-out.
- Seed `stdDeviation` at setup: at `PEAK_BLUR` for the entrance shape, at 0 for a whip / `inOut` leg.
- Generous filter region (`x="-50%" y="-50%" width="200%" height="200%"`) or the smear clips at the element's box edge.
- Directional axis: `"X 0"` horizontal, `"0 Y"` vertical, `"B B"` only for a depth/scale move — symmetric blur on a sideways move looks like defocus.
- Dwell ≥1 s sharp after the snap; a streak landing at the last beat reads as "flashed and gone".
- Heavy element on a solid field — thin type (< ~120px / 800 weight) or a busy backdrop swallows the smear.
- `overflow: hidden` on the scene — the smear / furthest ghost extends past the resting position during travel.

## See also

`kinetic-beat-slam` (streak as one beat's entrance) · `center-outward-expansion` (grid streak-in) · `scale-swap-transition` (same-footprint morph — not an arrival) · `nudge-curve` (the whip sweep's position half) · `3d-camera-flight` / `viewport-change` (the carve-out's wrappers).
