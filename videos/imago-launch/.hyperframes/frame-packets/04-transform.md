# Frame packet: 04-transform

## Project inputs

- Project: /Users/sibhi-zstch1643/conductor/workspaces/something-that-does-stuff/abu-dhabi/videos/imago-launch
- Design tokens: /Users/sibhi-zstch1643/conductor/workspaces/something-that-does-stuff/abu-dhabi/videos/imago-launch/frame.md
- RULES_DIR: /Users/sibhi-zstch1643/.claude/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 4 — JSON becomes Pikachu

- scene: The JSON panel sits left; on the beat its lines lift out and fly right, snapping into the Pikachu card — "Pikachu" title, 112 base experience counts up, stat bars fill one after another, "electric" type chip pops. Amigo bounces once on top of the card as it settles.
- voiceover: ""
- duration: 4.5s
- poster: 3.6s
- transition_in: crossfade
- status: built
- src: compositions/frames/04-transform.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: awe
- asset_candidates: assets/landing-full-page.png — hero JSON panel + Pikachu card, the layout to rebuild and animate
- on_screen: JSON → Pikachu card (Base experience 112 · Height 4 · Hp 35 · Attack 55 · Defense 40 · Sp. atk 50 · Sp. def 50 · Speed 90 · electric)
- blueprint: device-surface-showcase (Adapt)
- focal: the Pikachu interface card (rebuilt in the current landing-hero style)
- roles: assets/landing-full-page.png = reference for the JSON panel + Pikachu card layout; assets/amigo-mascot.svg = cutout
- sfx: whoosh as lines fly, soft ticks on each stat bar, a pop as Amigo lands

Adapt: keep "a floating window holds as hero while its content resolves"; the flow is JSON → card rather than screen → screen. The signature move is the JSON lines flying into the card slots.
Scene 1 (0.0–0.8s): split 35/65. The dark JSON panel (mono, 8 lines: name "pikachu", base_experience 112, height 4, stats…, types ["electric"]) sits left; the white card frame scales up from 0.94 to 1 on the right, empty.
Scene 2 (0.8–2.0s): on beats 2–4, key JSON tokens ("pikachu", 112, 4) lift out of the panel as mono ghosts and fly right on eased arcs. Each morphs into its card slot: title "Pikachu" (display), the "Base experience" label with 112, "Height" with 4. The panel dims to 40% as it empties. → card-morph-anchor (token → slot)
Scene 3 (2.0–3.4s): 112 counts up 0→112 (tabular nums); the stat rows Hp 35 · Attack 55 · Defense 40 · Sp. atk 50 · Sp. def 50 · Speed 90 fill left-to-right in a stagger, one row per half-beat, ink fills on sink tracks; the "electric" chip pops in top-right. → counting-dynamic-scale (count only, no size growth) + stat-bars-and-fills
Scene 4 (3.4–4.5s): on beat 8 (3.5s) Amigo drops from above and lands on the card's top edge near the right corner (squash, one small settle). The card holds: held read into the push-slide.

narrativeRole: The payoff of the promise — the same data, finally in its finished form.
keyMessage: The view the data deserves.

## Selected blueprint: device-surface-showcase

# device-surface-showcase — Device / Surface Showcase

**intent**: A product surface — a device mockup or a floating browser/app window — is the hero held in frame while its screens cycle through a real flow, showcased by a camera move that ranges from a static hold to a continuous 3D push.

**roles served**

- Key_Feature (from key-feature-device-screen-tour, key-feature-floating-window-scroll, key-feature-3d-device-hand-demo): show a feature being \_experienced inside its real interface\* — the surface houses the action and its screens advance through a flow, rather than enumerating tiles or chasing a cursor across a workflow. (Note: the three founding drafts are Key_Feature and variants differ by MECHANIC, not role; the mined stepwise-flow variant widens the blueprint to Product_Intro.)
- Key_Feature (from demo-page-scroll-spotlight): the floating-window push-scroll variant carried to a spotlight climax — a real webpage rendered as a tilted 3D card coasts in (power2, like a phone held up — no spring), header keywords flare on a karaoke glow as the VO names them, the page rolls to the demoed section, and one element LIFTS off the surface (translateZ + scale) under a radial spotlight that dims the rest.
- Product_Intro (from stepwise-flow-completion): a compact end-to-end product flow — setup/auth → action → success/confirm — plays out cursorless as successive screen states inside the held surface, capped by a confirming button press; bookended by title-card beats. The surface introduces the product by \_completing its core loop\*, not by touring screens.
- Key_Feature (from `showcase-carousel`): the showcase-carousel — two surfaces in sequence (a widget card cycling brand skins, a phone frame with app screens sliding through it) gated by interstitial claim words; the screen cycle is a breadth carousel ("N brands / N apps"), not a flow.

**duration**: 5–11.3s (page-scroll-spotlight 5–9s · floating-window 7.8s · 3d-hand 7.9s · in-device approval 7.9s · stepwise-flow 8.5–9.4s · device-tour 9.6s · showcase-carousel 11.3s)

**shot structure** One product surface — a `[device mockup]` or a `[floating browser/app window]` — is the persistent hero on a `[styled backdrop: gradient / radial / stylized 3D void]`; its `[screens/sections]` cycle through a real `[product flow]` while a showcase camera (static-hold, push-in→zoom-out, or one continuous push) presents it. Each screen state holds ~1.0–1.5s.

- Scene 1 (0.0–~1.5s): The surface ESTABLISHES — it `[slides in from an edge / drifts in from a tilt / dissolves from a full-frame title card]` and settles, with a `[accent shape or backdrop]` resolving behind it; the first `[screen]` is visible. The showcase camera begins (see variants).
- Scene 2 (~1.5–~Xs): The surface is OPERATED on its own face — a `[tap/select/scroll]` triggers the first screen advance: old content `[pushes out / scrolls up]`, new `[screen/section]` `[pulls up / pushes in from the side]`; concurrently a `[label / header word / side headline]` updates. The camera continues its move.
- Scene 3+ (~Xs–end, repeat for `[2–4 screen beats]`): The surface ADVANCES through successive `[screens/sections]`, each a discrete swap or scroll synced to the surface's flow, while the secondary copy `[swaps out-up / in-up]` or stays marked to hold reading position. HOLDS on the final `[screen]` (or, for one variant, blooms out — see variant).

- Variant — static-tour (key-feature-device-screen-tour, 9.6s): a `[device mockup]` slides in from off-screen and settles (ease-out); an `[accent-color shape]` scales up behind it (spring overshoot). Camera STAYS STATIC the entire clip — all motion is element/UI-level: a tap COMPRESSES a button (95%→100%), the UI scrolls/transitions to the next view (old pushes out, new pulls up), and a `[side headline]` SWAPS beside the device (old slides up + fades, new slides up + in) per screen. Holds on the final screen. No camera move, no cursor.
- Variant — floating-window (key-feature-floating-window-scroll, 7.8s): OPENS on a full-frame `[title card]` (a small `[icon]` draws in at center, `[feature name]` below; holds ~2s), which DISSOLVES to a `[macOS-style browser/app window]` floating on a `[vivid gradient]` (traffic-lights + `[URL pill]` + tabs; left nav, central content, right `[sidebar]`). Camera PUSHES IN on a `[target region/sidebar]` (active item highlighted `[accent]`, a cursor drifts down the list), then ZOOMS BACK OUT to re-frame the whole window while the content SCROLLS through `[sections]`; the `[highlighted item]` stays marked. One push-in→zoom-out arc, gated by the title-card opener.
- Variant — 3d-hand (key-feature-3d-device-hand-demo, 7.9s): FULLY 3D — a `[3D device]` drifts in a `[stylized 3D void / bloom + particles]`, opening tilted and self-rotating to face the lens nearly flat as ONE CONTINUOUS forward camera push begins (no cuts). A glossy `[3D hand]` rises from the bottom-foreground and GESTURE-DRIVES the surface: it swipes to scroll a `[picker/sidebar panel]` of `[option cards]` and taps `[option]` (while a `[header word]` letter-flips in place); the selection APPLIES — a `[new layout]` grows from center to fill the device face, nav flips, a `[marquee]` scrolls horizontally; the hand swipes again to scroll the page upward through `[sections]`, then drifts out. The camera never stops pushing; the bright device face keeps growing toward the lens until it BLOOMS into a `[light]` wash — a zoom-through "portal" exit that fills the frame.
- Variant — stepwise-flow (Product_Intro, 8.5–9.4s; in-device Key_Feature sub-mode 7.9s): CURSORLESS end-to-end flow — the surface completes `[setup/auth → action → success]` as a narrative arc. Opens on a `[title card]` that fades in/out on an ambient gradient (or a typed `[command]` running character-by-character on a terminal field). The `[flow surface]` arrives (phone mock slides up oversized and settles / bordered log panel replaces the command) and step 1 completes via rapid sequential pops — `[OTP digits]` fill boxes left-to-right capped by a green check, or `[log steps]` pop top-down with highlighted tokens, ending on a trailing-dots waiting state. State advances laterally (old content slides out left, new in from right, chrome persists) or via a dark-to-light scene swap into a white `[detail/confirm card]` whose elements stagger in. COMMIT: the `[CTA button]` is pressed (press dip / spinner "Processing") and a `[success state]` renders with check bullets — in the in-device sub-mode the commit runs a biometric ritual: dim overlay, `[squircle]` spring-pops, a ring draws around an icon, the icon morphs to a checkmark and holds; a slight camera push-in fires ONLY at the state transition (camera punctuates the commit, then re-locks). EXIT: the surface leaves and closing `[title cards]` pop in and ease smaller — the surface exits before the coda instead of holding. Camera otherwise static. For this variant the persistent hero is the FLOW, not one surface: a terminal panel may hand off wholesale to a confirm card.
- Variant — showcase-carousel (Key_Feature, 11.3s): TWO surfaces in sequence on a slowly drifting `[pastel mesh gradient]`, static camera, gated by centered interstitial `[claim words]` (fade in with gentle scale-up, fade out). Act 1: a white `[widget card]` scales in, flips/morphs into a tilted vertical widget and CYCLES `[N brand skins]` (~0.8s each) — one shared layout, per-skin content and accent swaps — while a large `[brand logo]` crossfades below per flip; the widget scales away. Act 2: a `[phone frame]` enters oversized and tilted, settles upright at center; full `[app screens]` slide left through it (~1s each), holding on the last. The screen cycle is a breadth carousel, not a flow — no taps, no cursor, no camera.

**motion vocabulary** surface establish (edge slide-in + settle / tilt drift-in + self-rotate-to-camera / title-card dissolve); accent shape spring behind surface; element-level screen-cycling (scroll-swap, push-in-from-side, scale-swap); button tap-compress; staggered side-headline reveal + copy swap (out-up / in-up); in-place header-word letter-flip; floating browser-window-on-gradient idle float; full-frame title-card opener (icon draw-in + label); camera push-IN on a region; camera zoom-OUT re-frame; content scroll-through; one continuous 3D camera-follow push (no cuts); 3D device drift + self-rotate; stylized-environment bloom/particles; 3D-hand entrance + swipe-scroll + tap (gesture-driven); picker-panel slide-in; template-apply grow-from-center; horizontal marquee scroll; gesture-driven page scroll; zoom-through bloom/portal exit; static-hold (no camera) as the floor of the camera range. Stepwise-flow additions: title-card bookends (fade-in/out opener; closers pop in then ease smaller); typed terminal command with prompt chevron; sequential top-down log pops with sub-line reveals; animated trailing-dots wait state; sequential digit pops left-to-right + green check confirm; lateral screen slide with persistent chrome; dark-to-light scene swap; staggered card element build-in (fade + slide-up); button press dip + fill flip; spinner processing state; success check-bullet reveal; notification banner spring-in with overshoot; lockscreen fade/blur-away as a card expands to fill the device face; commit-synced micro push-in; dim overlay; squircle spring pop; circular ring draw; icon morph to checkmark; surface exit before a title coda. Showcase-carousel additions: interstitial claim-word gate; brand-skin cycling with per-flip logo crossfade; card flip/morph into a tilted widget; oversized-tilted surface entry settling upright; fast slide-left screen carousel inside a static frame; drifting mesh-gradient backdrop.

**rule mapping** (per motion verb → backing rule, or flagged special)

- screen-cycling — UI scrolls/sections scroll inside the surface (device-tour, floating-window scroll, 3d-hand page scroll) → `3d-page-scroll` (webpage/app as a tilted card whose content `translateY`-scrolls to sections; primary mechanic for the surface's screen flow)
- floating-window establish + the surface presented as a tilted/floating UI card → `3d-page-scroll` (the tilt/perspective framing) + `css-3d-transforms` (perspective/`translateZ` depth)
- screen / side-copy state swaps (discrete screen states; side headline content swapping per beat) → `discrete-text-sequence`
- side-headline reveal (staggered fade + slide-up) → `discrete-text-sequence`
- in-place header-word letter-flip (3d-hand) → `hacker-flip-3d`
- screen swap as a coordinated shrink-out / pop-in between two screen states → `scale-swap-transition`
- template-apply "new layout grows from center to fill the face" (3d-hand) → `center-outward-expansion` (clustered-at-center → expand to fill)
- the surface morphing between states / title-card→window dissolve as the eye-anchor transition → `card-morph-anchor`
- button tap-compress (95%→100% press feedback) → `press-release-spring` (or `physics-press-reaction` for a heavier press)
- floating-window cursor click on the highlighted list item → `cursor-click-ripple`
- accent-highlight pop on the active sidebar/list item → `asr-keyword-glow` (accent glow on the focused item)
- drifting cursor down the sidebar list (floating-window) → `camera-cursor-tracking` (flat-cursor drift; pairs with the push-in)
- floating browser-window idle float / 3D device drift-breathe → `sine-wave-loop`
- 3D device drift + self-rotate-to-camera + perspective depth (3d-hand) → `css-3d-transforms` (CSS-3D) **or** `3d.md` technique (true Three.js/R3F device); see camera modifier
- horizontal `[marquee]` scroll (3d-hand) → `viewport-change` (PAN mode on the marquee strip) — _thin fit; a literal CSS-marquee/translateX loop is closer to a `gsap-effects`/CSS recipe than a named motion rule_
- 3D-hand entrance + swipe + tap as the interaction DRIVER (gesture input that scrolls/selects) → **flagged special — needs a heavier capability beyond the rule library (R3F/Three.js + WebGL), NOT a motion-shape rule.** The 3D hand model + WebGL bloom have a _technique_ backing (`3d.md` — R3F, `useGLTF` HandModel, `--gl=swiftshader` for the shader/bloom), but no motion-shape rule models a 3D hand as the swipe-to-scroll / tap-to-select gesture protocol. `context-sensitive-cursor` / `camera-cursor-tracking` only model a flat typing/pointer cursor, not a 3D gesturing hand.
- zoom-through bloom / portal exit (3d-hand) → **flagged special — needs a heavier capability beyond the rule library (WebGL), NOT a named transition rule.** Capability is `techniques.md` → WebGL shader (via `3d.md` headless WebGL: `--gl=swiftshader --concurrency=1`), but no named transition rule covers a bloom/portal fly-through.
- typed terminal command / non-linear log text (stepwise-flow) → `discrete-text-sequence` (typing + threshold state replacement) with `dynamic-content-sequencing` computing each step's window from content length
- sequential top-down log pops / OTP digit pops left-to-right / staggered confirm-card build-in → `spring-pop-entrance` (staggered group form; low overshoot for log lines)
- trailing-dots wait state → `sine-wave-loop` (finite repeats; step the opacity of 3 dots on a shared phase)
- lateral screen slide with persistent chrome → the existing screen-cycling mapping (`3d-page-scroll` translateX form inside the clipped surface); chrome sits outside the sliding layer
- notification banner spring-in / squircle pop (in-device) → `spring-pop-entrance`
- lockscreen fade/blur-away + card expands to fill the device face → `card-morph-anchor` (uniform-scale container morph — never tween width/height) + `depth-of-field-blur` (the blur-away)
- commit-synced micro push-in (camera punctuates the Approve/tap, then re-locks) → `multi-phase-camera` (single short push phase placed at the state transition)
- button press dip + fill flip / Approve press-down spring-back → `press-release-spring` (already mapped; the fill flip is its color-transition variation)
- spinner processing state → `svg-icon-enrichment` (rotating internal element with explicit SVG center)
- success check bullets / biometric ring draw → `svg-path-draw` (check strokes; ring rotated −90° to start at 12 o'clock) + `spring-pop-entrance` for the bullet pops
- icon morph to checkmark (biometric ritual) → **flagged special — SVG path morph, see hyperframes-keyframes (morph)**; no motion-shape rule models it — mechanics live in `techniques.md` / the keyframes skill, same tier as the blueprint's existing WebGL flags
- interstitial claim-word gate (fade + gentle scale-up, then out) → `gsap-effects` (plain fade/scale chord; deliberately quieter than `kinetic-beat-slam`)
- brand-skin cycling with per-flip logo crossfade → `discrete-text-sequence` (whole-state content replacement at thresholds) + `scale-swap-transition` where a flip reads as shrink-out/pop-in; the card→tilted-widget flip/morph → `card-morph-anchor` + `css-3d-transforms`
- drifting mesh-gradient backdrop → `sine-wave-loop` (very-low-amplitude position/hue drift on gradient blobs)

**camera modifier**: The showcase camera spans a RANGE keyed by variant, all on a single content-wrapping virtual camera (`viewport-change`):

- static-tour → NO camera move (`viewport-change` held at scale 1, or omitted); all motion is element-level. This is the floor of the range and what distinguishes the device-tour from the rest.
- floating-window → a two-phase push-in → zoom-out arc → `multi-phase-camera` (e.g. dramatic-reveal 1.1→1.0→0.95 feel): push IN on the `[sidebar/region]` via `coordinate-target-zoom` (off-center target = scale + counter-translate), then `multi-phase-camera` zooms back OUT to re-frame the whole window while content scrolls.
- 3d-hand → ONE continuous forward push (no cuts) → `multi-phase-camera` in steady-push mode (1.0→1.03→1.06… plus its sine micro-drift) layered over `css-3d-transforms`/`3d.md` so the device self-rotates-to-lens during the push; the push runs unbroken into the bloom/portal exit (exit itself is the WebGL-shader flagged special above). Across all three: `viewport-change` is the base virtual-camera primitive; `multi-phase-camera` sequences the push/zoom phases (and supplies the always-on micro-drift that keeps even the "static" tour from feeling dead); `coordinate-target-zoom` aims the push at off-center screen detail.

**Overflow (pan/scroll surfaces — required for a clean `check`):** a panned or scrolled surface deliberately moves content PAST the edges of its framing card. Clip it at the card (`overflow: hidden` on the card/window) AND mark the moving inner layer (the `.world` / surface wrapper holding the screenshot + any markers/labels) with `data-layout-allow-overflow` — otherwise `check` reports `text_box_overflow` / `container_overflow` errors for the parts that scroll off (e.g. a marker label panned off the left edge). The card clips them visually; the attribute tells the layout audit it's intentional, not a layout bug.

## Selected motion rule: card-morph-anchor

---
name: card-morph-anchor
description: Container morphs dimensions and border-radius between shots, serving as a visual transition anchor.
metadata:
  tags: morph, anchor, transition, border-radius, container, shape
---

# Card Morph Anchor

A free-floating container morphs apparent size, corner radius, and surface treatment between two shots — the morph itself IS the transition; the viewer's eye tracks the persistent container. Distinct from [anchored-layout-expand.md](anchored-layout-expand.md) (an edge-pinned live layout participant that grows along one axis and reflows neighbors — here nothing is pushed) and [theme-crossfade-morph.md](theme-crossfade-morph.md) (a whole-theme reskin under a fixed anchor — here a single container changes shape).

## How It Works

Since `width`/`height` tweens are forbidden, **substitute uniform `scale` for apparent size**; the remaining morph channels are **paint-only**: `borderRadius`, `background`, `boxShadow`. All channels ride ONE tween (one ease, one duration) so the shape morphs in lockstep. Content choreography: old content fades out during the first ~40% of the morph, new content fades in during the last ~40% — the shape-only gap between is the natural "blink." Optionally the morph card itself fades at the very end, revealing the real next-shot element rendered behind it.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<!-- DOM order = stacking: the anchor renders BEFORE the card, so the card is on top -->
<div class="next-shot-anchor"><img src="{nextShotAnchor}" alt="anchor" /></div>
<div class="morph-card">
  <div class="content-old">{shotOneContent}</div>
  <div class="content-new">{shotTwoContent}</div>
</div>
```

```css
.morph-card {
  width: SHOT_ONE_W;
  height: SHOT_ONE_H; /* shot-1 geometry; the morph is scale, never width/height */
  border-radius: SHOT_ONE_RADIUS;
  background: {surfaceShotOne};
  overflow: hidden; /* content must clip during the shape change */
  display: grid;
  place-items: center;
  will-change: transform;
}
.content-old,
.content-new {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
}
.content-new {
  opacity: 0; /* author its inner sizes at apparent-size ÷ END_SCALE — it scales with the card */
}
.next-shot-anchor {
  position: absolute;
  opacity: 0; /* fades in as the morph card fades out */
}
```

```js
const END_SCALE = SHOT_TWO_W / SHOT_ONE_W; // uniform — keep the two shots aspect-matched

// Hold shot 1 for HOLD_BEAT first — an instant morph reads as glitchy.

// One tween, all channels: uniform scale + paint-only properties.
tl.to(
  ".morph-card",
  {
    scale: END_SCALE,
    borderRadius: SHOT_TWO_RADIUS / END_SCALE, // borderRadius is pre-scale — divide to land the APPARENT radius
    background: "{surfaceShotTwo}",
    boxShadow: "{shadowShotTwo}",
    duration: MORPH_DUR,
    ease: "power2.inOut",
  },
  MORPH_START,
);

tl.to(
  ".content-old",
  { opacity: 0, duration: MORPH_DUR * OLD_FADE_FRAC, ease: "power1.in" },
  MORPH_START,
);
tl.to(
  ".content-new",
  { opacity: 1, duration: MORPH_DUR * NEW_FADE_FRAC, ease: "power1.out" },
  MORPH_START + MORPH_DUR * (1 - NEW_FADE_FRAC),
);

// Optional handoff — card fades out over the pixel-identical real anchor.
tl.to(
  ".morph-card",
  { opacity: 0, duration: MORPH_DUR * FINAL_FADE_FRAC, ease: "power1.in", immediateRender: false },
  MORPH_START + MORPH_DUR * (1 - FINAL_FADE_FRAC),
);
tl.to(
  ".next-shot-anchor",
  { opacity: 1, duration: MORPH_DUR * FINAL_FADE_FRAC, ease: "power1.out" },
  MORPH_START + MORPH_DUR * (1 - FINAL_FADE_FRAC),
);
```

## Morph channels

| channel        | how                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------- |
| apparent size  | uniform `scale` — the substitution for the forbidden `width`/`height` tween; aspect preserved  |
| `borderRadius` | paint-only; pre-scale units — tween to `APPARENT_RADIUS / END_SCALE`, ≤ half the smaller side  |
| `background`   | paint-only; gradients interpolate only with equal stop counts (solid→solid: `backgroundColor`) |
| `boxShadow`    | paint-only; base shadow → accent glow shifts emphasis                                          |

## Variations

- **Landing on a non-centered target** (dock icon, sidebar slot): add `x`/`y` to the same tween, computed as the FLIP-style delta between the card's and the target's rects — `getBoundingClientRect()` both at build time (single-scene only, per the contract) and tween the difference. Don't hand-compute from CSS values: paddings, borders, and parent transforms compound, and center-vs-edge arithmetic is the classic off-by-half bug.
- **Aspect change between shots**: uniform scale preserves aspect — morph to the nearest uniform fit and let the crossfade/handoff absorb the small delta, or drop the handoff and hold the card's final state.

## Values

| token             | range                     | notes                                                                                |
| ----------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| HOLD_BEAT         | 0.6–1.5s                  | ≥ shot 1's entry settle; the viewer must register shot 1 first                       |
| MORPH_DUR         | 0.6–1.2s                  | < 0.5s can't fit both content fades                                                  |
| END_SCALE         | SHOT_TWO_W / SHOT_ONE_W   | icon-sized handoffs typically land at 80–400px apparent width                        |
| SHOT_TWO_RADIUS   | ≤ min(W, H)/2 apparent    | half the smaller side = perfect circle; beyond is clamped                            |
| OLD/NEW_FADE_FRAC | 0.3–0.5 each, sum ≤ 1     | the gap between is the shape-only "blink"                                            |
| FINAL_FADE_FRAC   | 0 (no handoff) or 0.1–0.2 | only when a pixel-identical anchor exists                                            |
| ease              | `power2.inOut` canonical  | `power3`/`expo.inOut` OK; never `back`/`elastic` — overshoot fights the shape change |

## Critical Constraints

- **❗ Uniform-scale substitution** — never tween `width`/`height`; `scale` + the paint-only channels (`borderRadius`, `background`, `boxShadow`) are the ONLY morph properties.
- **❗ Handoff anchor must be pixel-identical to the card's final state** — same apparent size, radius, background, shadow, inner icon dimensions. Any delta = a visible pop during the crossfade. Can't match exactly? Drop the handoff and hold the morph card.
- **❗ Stacking by DOM order, never a z-index snap mid-fade** — render the anchor before the card; a `tl.set({ zIndex })` during an active opacity tween flips stacking before the fade finishes and flickers.
- **`overflow: hidden`** on the card — content must clip as the radius changes.
- **Hold a beat before morphing**; same ease family for shape and crossfade (mixed eases read unsynchronized).

## See also

`anchored-layout-expand` (edge-pinned one-axis growth with reflow) · `theme-crossfade-morph` (whole-theme reskin under a fixed anchor) · `scale-swap-transition` (content swap without shape change) · `sine-wave-loop` (a breath on the final state).

## Selected motion rule: counting-dynamic-scale

---
name: counting-dynamic-scale
description: Counter animation where the value counts up while transform scale grows to its final size, creating escalating visual weight without per-frame text reflow.
metadata:
  tags: counter, counting, scale, transform, number, dynamic, emphasis
---

# Counting with Dynamic Scale

A number counts from A → B while its transform scale grows to the final size — escalating visual weight ("this is impressive") without tweening `font-size` or forcing text layout on every frame. The final font size is static CSS; only the transform changes.

## How It Works

Two synchronized tweens at the SAME timeline position with the SAME ease: (1) a proxy value rendered as text via `onUpdate` (`Math.round(...).toLocaleString()`), (2) the counter's transform `scale: START_SCALE → 1`, where `START_SCALE = START_SIZE / END_SIZE`. A suffix (`%`, `×`, `+`) slides in AFTER the count lands — the number gets its own beat — and a label fades in early.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="counter-wrap">
  <span class="counter" id="counter">0</span><span class="counter-suffix">{suffix}</span>
</div>
<div class="counter-label">{label}</div>
```

```css
.counter-wrap {
  display: flex;
  align-items: baseline;
  justify-content: center;
  width: {counterContainerWidth}; /* fixed width — no layout shift as digit count changes */
}
.counter {
  font-variant-numeric: tabular-nums; /* MANDATORY — digits keep equal width */
  display: inline-block;
  font-size: {endSize}; /* final size is static; GSAP animates scale, not font-size */
  transform-origin: center center;
}
.counter-suffix {
  opacity: 0;
  transform: translateY(20px);
}
```

```js
const counter = document.getElementById("counter");
const state = { value: 0 };
const START_SCALE = START_SIZE / END_SIZE;

// Count value — onUpdate changes text only
tl.to(
  state,
  {
    value: TARGET_VALUE,
    duration: COUNT_DUR,
    ease: COUNT_EASE,
    onUpdate: () => {
      counter.textContent = Math.round(state.value).toLocaleString();
    },
  },
  0,
);

// Visual growth — compositor transform sharing the count's timing + ease
tl.fromTo(counter, { scale: START_SCALE }, { scale: 1, duration: COUNT_DUR, ease: COUNT_EASE }, 0);

// Suffix slides in AFTER the count completes
tl.to(
  ".counter-suffix",
  { opacity: 1, y: 0, duration: SUFFIX_DUR, ease: `back.out(${SUFFIX_BOUNCE_FACTOR})` },
  COUNT_DUR,
);

// Label fades in early
tl.from(".counter-label", { opacity: 0, y: 12, duration: LABEL_DUR, ease: "power2.out" }, LABEL_AT);
```

## Variations

- **Direct `innerText` tween (no proxy)** — GSAP can tween `innerText` directly for a number-only counter; keep the proxy form when you need locale formatting or suffix logic. The scale tween stays separate either way:

```js
tl.to(
  counter,
  { innerText: TARGET_VALUE, duration: COUNT_DUR, ease: COUNT_EASE, snap: { innerText: 1 } },
  0,
);
```

- **3D depth entry** — add a `tl.from(".counter", { z: -300, ... }, 0)` push-in; requires `perspective` on `.counter-wrap` and `transform-style: preserve-3d` on the counter.
- **Multi-stat coordinated reveal** — 3 stats counting in parallel share the SAME ease, duration, and start position so they finish together (a chord, not an arpeggio). Each stat usually also needs a paired graphic (bar / ring / stars) — don't stop at the number; see [stat-bars-and-fills.md](stat-bars-and-fills.md).

## Values

| token                 | range                                       | notes                                                                         |
| --------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| TARGET_VALUE          | 2–3 digits ideal                            | 4+ digits needs a wider container; must fit at END_SIZE without clipping      |
| START_SIZE / END_SIZE | START ≈ 40–60% of END                       | design inputs used once for START_SCALE; never tween either                   |
| COUNT_DUR             | 1.2–2.5s                                    | below ~0.8s reads as a flash — the eye must read the digits scrolling past    |
| COUNT_EASE            | `power2.out` / `power3.out` ⭐ / `expo.out` | shared by value + scale; more `.out` = more dramatic deceleration at the peak |
| SUFFIX_DUR            | 0.3–0.6s                                    | fires at `COUNT_DUR`, never during the count                                  |
| SUFFIX_BOUNCE_FACTOR  | 1.4–2.0                                     | overshoot is fine on the suffix (it's punctuation, not data)                  |
| LABEL_AT / LABEL_DUR  | AT < COUNT_DUR/2; 0.4–0.7s                  | label arrives before the count peaks                                          |

## Critical Constraints

- **`tabular-nums` mandatory** + fixed-width container as belt-and-suspenders — without them digit-count transitions (9 → 10 → 100) jitter as glyph widths change.
- **Never set `fontSize` in `onUpdate`** — final type size is static CSS; only the transform changes per frame. Keep `onUpdate` O(1): set text only, no style writes or DOM creation.
- **`Math.round`, not `Math.floor`** — halfway through the final integer should already display the final value.
- **Avoid `back.out` / `elastic.out` on the counter itself** — overshoot makes the number look unstable (it's data, not decoration). Grow in place, don't bounce.
- **Label is BIG TEXT, not a page-style caption** — a tiny paragraph under a hero-size number reads as visual noise in video. Display-size, uppercase, tracked: the label is part of the headline.

## See also

`stat-bars-and-fills` (the paired graphic — give it the same ease/duration so number and fill land as one beat) · `svg-path-draw` (icons drawing in around the number) · `center-outward-expansion` (icons bursting outward at the count peak).

## Selected motion rule: stat-bars-and-fills

---
name: stat-bars-and-fills
description: Data-viz primitives that pair a number with a graphic — growth bars (CSS scaleY stagger), a progress fill (bar or ring), and a partial star-rating wipe. Seek-safe, deterministic.
metadata:
  tags: data, stats, chart, bars, progress, ring, stars, rating, infographic, number
---

# Stat Bars & Fills

The graphics that give a stat **visual weight** beside its number: a small bar chart, a progress bar/ring filling to a percentage, or a star row filling to a fractional rating. Pair these with [counting-dynamic-scale.md](counting-dynamic-scale.md) (the number) for a complete stat scene.

**Layout blueprint — pick ONE and hold it across all stats:**

- **Single-focus** — one centered frame, the number is the hero, a ring or bar sits under/around it. Cleanest for a sequential reveal (stat 1 → stat 2 → stat 3 in the same frame).
- **Split-frame** — big number on the left, paired graphic on the right. Better when stats are shown together or each needs a distinct visual.

Don't mix blueprints between stats in one piece — that reads as inconsistent.

## Recipe

### 1 — Growth Bars (CSS `scaleY` stagger)

Bars grow from the baseline with a stagger; the last bar is the accent. Heights are authored in CSS (inline height per bar); GSAP only reveals `scaleY: 0 → 1` — never animate `height`.

```css
.bars {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  height: 280px;
}
.bar {
  width: 48px;
  background: #3a4a64;
  transform: scaleY(0);
  transform-origin: bottom center; /* grow UP from the baseline, not from center */
}
.bar:last-child {
  background: #ffc300; /* accent the final/current bar */
}
```

```js
tl.to(".bar", { scaleY: 1, duration: 0.7, ease: "power3.out", stagger: 0.08 }, 0.3);
```

### 2 — Progress Fill

**Bar form** — `scaleX` from a left origin:

```css
.track {
  width: 520px;
  height: 16px;
  background: #1b263b;
  border-radius: 8px;
  overflow: hidden;
}
/* width:100% is REQUIRED — an absolutely-positioned fill with no width is 0px, and scaleX of 0 is
   still 0 → the bar renders invisible (automated gates may miss a zero-width scaled element). */
.fill {
  width: 100%;
  height: 100%;
  background: #ffc300;
  transform: scaleX(0);
  transform-origin: left center;
}
```

```js
const PCT = 0.92; // 92%
tl.to(".fill", { scaleX: PCT, duration: 1.0, ease: "power2.out" }, 0.3);
```

**Ring form** — measured stroke draw (mechanics in [svg-path-draw.md](svg-path-draw.md)):

```js
const ring = document.querySelector("#ring");
const LEN = ring.getTotalLength(); // measure, don't hard-code the circumference
ring.style.strokeDasharray = LEN;
ring.style.strokeDashoffset = LEN; // empty
// rotate the <circle> -90deg in CSS so the fill starts at 12 o'clock
tl.to(ring, { strokeDashoffset: LEN * (1 - 0.92), duration: 1.1, ease: "power2.out" }, 0.3);
```

### 3 — Star-Rating Fill (fractional)

A gold star row revealed left-to-right to a fractional value (e.g. 4.6 / 5) via a clip wipe over a gold layer sitting on a gray layer.

```html
<div class="stars">
  <div class="stars-gray">★★★★★</div>
  <div class="stars-gold" id="goldStars">★★★★★</div>
</div>
```

```css
.stars {
  position: relative;
  font-size: 64px;
  letter-spacing: 8px;
}
.stars-gray {
  color: #2b3548;
}
.stars-gold {
  position: absolute;
  inset: 0;
  color: #ffc300;
  width: 100%;
  clip-path: inset(0 100% 0 0);
}
```

```js
const RATING = 4.6,
  MAX = 5;
tl.to(
  "#goldStars",
  { clipPath: `inset(0 ${100 - (RATING / MAX) * 100}% 0 0)`, duration: 1.0, ease: "power2.out" },
  0.3,
);
```

## Values

| token         | range       | notes                                                                               |
| ------------- | ----------- | ----------------------------------------------------------------------------------- |
| bar count     | 4–6         | reads as "a trend" without clutter; the last bar is the current/accent value        |
| fill duration | 0.8–1.2s    | matched to the paired count-up so number and graphic land together (share the ease) |
| stagger       | 0.06–0.1s   | larger feels sluggish, 0 loses the build                                            |
| accent hue    | exactly one | bars/fill/stars all use the same accent, the rest is muted                          |

## Critical Constraints

- **`scaleY` / `scaleX` / `clipPath`, never `height`/`width` tweens** — author each bar's final height in CSS and scale from 0.
- **`transform-origin`** must be `bottom` (bars grow up) / `left` (fills grow right) — the default center origin scales from the middle and looks wrong.
- **`.fill` needs `width: 100%`** — a zero-width fill scaled by any factor is still invisible, and automated gates may miss it.
- **Measure, don't hard-code** — ring length via `getTotalLength()`; a hard-coded circumference breaks if the radius changes.
- **Match the number's timing** — the fill and the count-up peak together (same start + ease) so the stat resolves as one beat, not two; a paired counter's `onUpdate` must be O(1) (see [counting-dynamic-scale.md](counting-dynamic-scale.md)).
- **One accent hue, consistent blueprint** — see `hyperframes-creative/references/data-in-motion.md`.

## See also

`counting-dynamic-scale` (the number beside the graphic — same ease/duration) · `svg-path-draw` (progress-ring draw mechanics) · `hyperframes-creative/references/data-in-motion.md` (stat layout + visual weight).
