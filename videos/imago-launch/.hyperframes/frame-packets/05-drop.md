# Frame packet: 05-drop

## Project inputs

- Project: /Users/sibhi-zstch1643/conductor/workspaces/something-that-does-stuff/abu-dhabi/videos/imago-launch
- Design tokens: /Users/sibhi-zstch1643/conductor/workspaces/something-that-does-stuff/abu-dhabi/videos/imago-launch/frame.md
- RULES_DIR: /Users/sibhi-zstch1643/.claude/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 5 — THE DROP: every API gets an interface

- scene: On the drop, eight real Imago interfaces slam in one per beat as floating app windows stacking into a deck: Pikachu, Forecast, Frankfurter, Openlibrary, Thirukkural, Wikipedia, Sunrise sunset, Charizard. Amigo surfs the deck. "Whatever it returns." is pinned.
- voiceover: ""
- duration: 3.75s
- poster: 3.5s
- transition_in: cut
- status: outline
- src: compositions/frames/05-drop.html
- type: benefit_highlight
- persuasion: Value stacking + show-don't-tell (real product, real data)
- beat: excitement → awe
- asset_candidates: assets/app-pokemon.png — Pikachu interface; assets/app-weather.png — Forecast (30.1 °C, 67 %); assets/app-currency.png — Frankfurter rates; assets/app-library.png — Openlibrary The Hobbit table; assets/app-thirukkural.png — Kural 1; assets/app-wikipedia.png — Chennai summary; assets/app-sunrise.png — Sunrise sunset; assets/app-charizard.png — Charizard
- blueprint: grid-card-assemble (Adapt)
- focal: the slamming deck of real app windows
- roles: all 8 app-*.png = supporting cards (cropped to the content column, skip the sidebar); amigo-mascot = cutout (surfer)
- sfx: a big drop impact at 0.0, a card slap on each beat (8), a whoosh on each Amigo hop

Adapt: keep the staggered cascade of N items, cast as a beat-locked slam-deck rather than a grid; ends on a fanned deck.
Scene 1 (0.0s): hard downbeat. The ground flashes from ink back to paper; the first card (Pikachu) slams in huge from below-front, rotated −4°, and lands centre-right. "Whatever" slams left (display h1).
Scene 2 (0.47–3.28s): one card per beat, beats 2–7 (Forecast, Frankfurter, Openlibrary, Thirukkural, Wikipedia, Sunrise sunset). Each flies in from alternating sides on a fast expo arc and lands on top of the deck, slightly offset and rotated (index-derived ±2–6°), so the pile visibly grows. The previous top card dims a little. On beat 3 "it returns." completes the headline. Amigo rides the top card: it hops from card to card on every beat, landing as each new card arrives, and on beat 5 does a spin. → spring-pop-entrance
Scene 3 (3.28–3.75s): beat 8: Charizard slams last, and the deck fans out (cards spread into an arc) as Amigo lands on top of the fan in a wide squash-pose. A small muted label under the headline: "10 built-in examples · or paste your own".

narrativeRole: The payoff: real interfaces, one per beat, on the drop.
keyMessage: Any GET endpoint becomes a real interface.

## Selected blueprint: grid-card-assemble

# grid-card-assemble — Grid / Card Assemble

**intent**: N items (tiles / cards / logos / list-lines) self-assemble in a staggered cascade into a grid or vertical list and hold — a "look how much / who / what it does" beat that enumerates breadth at once; an optional camera zoom-OUT pulls back to reveal the assembled array sitting inside a vaster whole.

**roles served**

- Key_Feature (from key-feature-card-grid-assemble): a grid of labeled feature tiles/pills (icon + label) cascades one-by-one into a 2-col-brick / 3×3 grid, then holds near-static with a slow push-in — enumerate many capabilities, no live UI, no cursor.
- Key_Feature (from key-feature-glass-card-camera-reveal): open TIGHT on 2–3 glowing icons; a camera zoom-OUT unfolds a row of glassmorphism cards that grow from behind the icons (icons shrink to card headers), center card scales forward, the group floats, then sweeps out — a "pillars revealed at once" reveal variant of the same assemble shape.
- Benefits (from benefits-vertical-list): short value phrases populate a single vertical list ~1 item/sec, co-resident and accumulating; each line enters via a spring marker-pop + check-draw + pill mask-wipe, OR the whole stack snaps up one slot per beat (slot-machine) so the newest lands in the bright focal slot.
- Social_Proof (from social-proof-logo-grid-zoom-out): a wall of partner/app logos builds into a center grid (whole-enter / randomized pop-in / column slide-up), an optional headline + accent-gradient proof-number fills in above, then a continuous camera zoom-OUT shrinks the array to reveal a vast ecosystem; optional fixed HUD/viewfinder brackets; optional grid slide-up fly-out exit.
- Key_Feature (from live-data-populate-board): the array assembles by POPULATING ITSELF — skeleton pills fill and swap to real data, cards spring in tethered to map markers — and its state keeps flipping live after assembly (status pills stepping through states); no cursor, locked frame. The "look how much" beat becomes "look, it's doing it right now."
- Benefits (from item-field-to-payoff-card): a breadth FIELD — a rapidly streaming list past a fixed focal slot, or a chip array with one highlighted hero — plays its breadth motion, then CLEARS to concise centered payoff text (claim / price / URL end card). The array is the argument's setup; the payoff line is its landing.

**duration**: 3.0–10.5s (Social_Proof 3.0–6s · live-populate 4.2–7.8s · Key_Feature grid 5.8–7.3s · Benefits stream/field-to-payoff 5.9–8.4s · Key_Feature glass-card 6.5s · Benefits list 6.5–10.5s, scaling ~1 item/sec with count)

**shot structure** (consolidated template — concrete motion verbs, [slots])

- **Scene 1 (0.0–~1.0s) — open + first arrivals.** On a `[gradient / radial / dark background]` (optional `[dot-grid / drifting-watermark]` texture), an empty `[grid or list region]` is established and items begin to ASSEMBLE in a quick staggered cascade (~0.04–0.08s gap; list pacing ~1 item/sec). Each `[item: feature tile / pill / logo tile / benefit line]` fades + slides/scales a short distance directly into its slot (low drama — no scatter, no big bounce; spring overshoot reserved for accent markers). Camera static. An opening `[headline / hook]` may fill in line-by-line above the array, with any `[proof number]` counting up in an `[accent gradient]`.
- **Scene 2 (~1.0s–~Xs) — array resolves + holds.** Remaining items finish arriving; layout resolves into the final `[2-col-brick / 3×3 grid / dense mosaic / stacked list]`. The completed array HOLDS, alive but resting: a gentle continuous parallax/sine FLOAT on the tiles and/or a slow camera push-in (faint scale-up). Optional `[accent-color]` glow TRAVELS across/behind the tiles.
- **Scene 3 (~Xs–end) — settle / reveal / exit.** Everything settles and holds to the end, OR the optional camera modifier runs (see below), OR a `[closing line / CTA]` book-ends the array. OR the field CLEARS to payoff copy — the array exits and a concise centered `[claim / price / URL]` lands (price via a very fast character snap-build with a split-second partial state; URL via a left-to-right reveal, holding in `[accent]` and flipping to `[ink]` only in the final beat) — OR the camera PUSHES THROUGH one highlighted `[hero item]` (single rapid accelerating push-in) and crossfades into a second, vaster receding `[word-grid depth field]` that continuously scales down to reveal ever more items before fading to the payoff.

Variants (where roles diverge from the template):

- **Variant — Key_Feature grid**: items are labeled `[icon + feature-label]` tiles/pills assembling into a 2-col-brick / 3×3 grid; near-static hold with slow push-in + optional traveling-glow sweep; headline book-ends (`[hook]` → `[CTA]`). No camera reveal.
- **Variant — Key_Feature glass-card-reveal**: the assemble is CAMERA-DRIVEN, not element-stagger. Open tight on `[2–3 glowing icons]`; camera zoom-OUT grows `[N]` glass cards out from behind the icons (icons shrink ~50% to become card headers), `[center card]` scales ~105% and moves forward to overlap the sides (quick spring); cards hold side-by-side with continuous parallax float; exit = fast motion-blur SWEEP slides the cards off-frame.
- **Variant — Benefits vertical-list**: a single vertical `[benefit-line]` stack, ~1 item/sec, three sub-modes — (a) BUILD: each line stays fully lit; entry = `[marker]` spring-pop + `[check/icon]` draw-in + `[pill]` mask-wipe of the text; (b) SNAP: the whole stack steps up one slot per beat (~0.1s eased) so the newest line lands in the bright focal slot and lines leaving it dim by position; (c) STREAM: the list scrolls rapidly and continuously past the focal slot — center item opaque `[ink]` and slightly enlarged, neighbors faded/shrunk — then DECELERATES to stop on the `[chosen item]`; optionally split-framed against a fixed static `[label]` on the opposite side; the field then clears to a centered `[payoff line]`. Static camera; optional perpetual `[decorative orbit/disc]` on the opposite side. No camera reveal.
- **Variant — Key_Feature live-populate**: the assemble is a DATA-POPULATION wave, cursorless, frame locked (± one gentle opening zoom-out that makes room for the `[headline]`). Two board shapes — (a) ANCHORED: `[white data cards]` spring in one-by-one, each tethered by a thin line to its `[marker]` on a `[map/board surface]` whose markers pulse (expanding fading rings); (b) TABULAR: new `[columns]` appear as grey skeleton pills, progress fills run left→right staggered top-to-bottom (colored fill with a leading tip), each bar SWAPPING to its real `[value/avatar chip]` on completion. After assembly the array stays LIVE: `[status pills]` flip states in quick snappy swaps (color-coded, several in succession), or the `[headline]` crossfades and a second population wave runs on a newly revealed region — the table content scrolling horizontally beneath a sticky first column to expose it. Hold lands on the fully populated, fully updated final state.
- **Variant — Social_Proof logo-wall-zoom-out**: intro beat (`[trusted-by headline]` card OR a `[product screenshot]`) crossfades/cuts to a center logo grid that builds (whole-enter / randomized pop-in / column slide-up); a continuous camera zoom-OUT then shrinks the whole grid toward center to reveal a vast ecosystem and holds; optional fixed HUD/viewfinder brackets; optional exit = whole grid SLIDES UP and flies out through the top.

**motion vocabulary**: item stagger-assemble (fade + short slide/scale into slot) · brick/grid/list layout resolve · randomized pop-in · column slide-up · vertical-list step (slot-machine snap-and-hold) · spring-overshoot marker pop · check/icon draw-in · pill/label mask-wipe reveal · dim-by-position de-emphasis · line-by-line headline fill · accent-gradient number count-up · near-static hold · gentle parallax/sine float on hold · slow camera push-in · camera zoom-OUT reveal (continuous OR phased pull-back) · cards-grow-from-behind-icons · icon-shrink-to-header · center-card scale-up + forward overlap (spring) · traveling-glow sweep · fixed HUD/viewfinder brackets · motion-blur slide-out sweep (exit) · grid slide-up fly-out (exit) · book-end headline fade · perpetual decorative orbit/loop · skeleton-pill progress fill (left→right, leading tip, color transition) · fill-completes-swap-to-real-data · staggered top-to-bottom fill cascade · live status-pill state flips (color-coded, post-assembly) · tethered-card spring-in (thin line to an anchor marker) · pulsing marker rings · two-wave populate with headline crossfade · sticky-column internal horizontal scroll · rapid vertical stream past a fixed focal slot + deceleration stop · split fixed-label layout · pill-widens-as-label-fills arrival · highlighted hero chip · push-through-the-hero-item exit · receding word-grid depth field · clear-to-payoff coda · price snap-build (split-second partial state) · left-to-right URL reveal + final-beat color flip.

**rule mapping** (motion verb → `rule-id`)

- item stagger-assemble into slot → `center-outward-expansion` (per-item stagger + short-path slide variant; for a wall too dense for a true center burst, use it in its "starting partially-spread"/direct-into-slot form — see merge tension)
- brick/grid/list layout resolve → `center-outward-expansion` (target positions = final layout slots)
- randomized pop-in stagger → `gsap-effects` (stagger recipe; randomized `from`/order)
- column slide-up into grid → `gsap-effects` (per-column staggered slide-up)
- vertical-list step / slot-machine snap-and-hold → `vertical-spring-ticker` (STEPS = number of line advances)
- spring-overshoot marker pop → `spring-pop-entrance` (back.out spring) — also `gsap-effects` for the staggered pop chain
- check / icon draw-in inside marker → `svg-path-draw`
- live line-art icon in a tile (internal parts) → `svg-icon-enrichment`
- pill / label mask-wipe text reveal → `techniques.md` (clip-path reveal)
- dim-by-position de-emphasis → `gsap-effects` (per-line opacity by slot position; no dedicated rule)
- line-by-line headline fill → `discrete-text-sequence`
- accent-gradient proof number count-up → `counting-dynamic-scale`
- gentle parallax / sine float on hold → `sine-wave-loop` (apply the concurrent-elements amplitude `/√N` rule for a held grid)
- slow camera push-in → `multi-phase-camera` (steady-push phase pattern)
- center-card scale-up + forward overlap → `spring-pop-entrance` (the quick spring) + `techniques.md` CSS-3D (z-depth overlap)
- cards-grow-from-behind-icons / icon-shrink-to-header → driven by the camera reveal (`multi-phase-camera`) — the grow/shrink are scale tweens chorded to the pull-back phase; no separate rule
- fixed HUD / viewfinder brackets → `ai-tracking-box` (static-bracket variant — overlay frame, not tracking)
- book-end headline fade → `discrete-text-sequence` (or `gsap-effects` fade)
- perpetual decorative orbit / disc / loop → `sine-wave-loop` (or `orbit-3d-entry` if it's an orbiting badge ring)
- traveling-glow sweep across/behind tiles → `ambient-glow-bloom` (one-pass traveling glow sweep across the tiles)
- motion-blur slide-out sweep (glass-card exit) → `motion-blur-streak` (directional velocity blur on the fast sweep that carries the cards off-frame)
- grid slide-up fly-out exit → `gsap-effects` (plain staggered translate-off-frame; no dedicated rule needed — a basic exit tween, not a missing capability)
- skeleton-pill progress fill → `stat-bars-and-fills` (progress-fill `scaleX` form; the leading tip is a chorded child element)
- fill-completes-swap-to-real-data / live status-pill flips / headline crossfade between waves → `discrete-text-sequence` (whole-state replacement at time thresholds — the pill's states are text states)
- staggered top-to-bottom fill cascade → `gsap-effects` (per-row stagger on the fill tweens)
- tethered-card spring-in → `spring-pop-entrance` (the card) + `avatar-cloud-network` (the thin connection-line-to-anchor layout; anchor coordinates must match the marker exactly) + `svg-path-draw` if the tether draws in
- pulsing marker rings → `cursor-click-ripple` (its expanding-ring + attack-decay opacity envelope, minus the cursor/click, on a bounded repeat)
- sticky-column internal horizontal scroll → `viewport-change` (PAN form on the inner column layer; the sticky column sits outside the panned layer) — mark the moving layer `data-layout-allow-overflow` and clip at the table card
- rapid vertical stream past a focal slot + deceleration stop → `vertical-spring-ticker` (continuous form: one long decelerating translate instead of its stepped tweens; focal-slot emphasis reuses the dim-by-position mapping above)
- pill-widens-as-label-fills → `card-morph-anchor`'s substitution law (uniform `scaleX`/clip-path — never tween `width`) + `discrete-text-sequence` for the label fill
- push-through-the-hero-item exit → `multi-phase-camera` (single accelerating push phase) aimed via `coordinate-target-zoom` at the highlighted chip, crossfading at peak
- receding word-grid depth field → `viewport-change` (one `.world` wrapper, `cam.scale` ↓ continuously — the zoom-OUT reveal grammar pointed at a word field; size/opacity tiers fake the depth)
- price snap-build (split-second partial state) → `discrete-text-sequence` (non-linear typing with bulk additions — exactly its typo/partial-state mechanic)
- left-to-right URL reveal → `techniques.md` (clip-path reveal — same mapping as the pill mask-wipe); the final-beat color flip → `gsap-effects` (a `tl.set` at the beat — basic, no rule needed)

**camera modifier — zoom-OUT reveal** (optional; the role-defining move for the glass-card and logo-wall variants): a camera wrapper around the whole array scales DOWN over the hold, revealing the assembled grid/cards sitting inside a larger environment (ecosystem scale, or a row of cards unfolding from tight icons).

- Continuous single-pass zoom-out (Social_Proof ecosystem pull-back) → `viewport-change` (one wrapper, `cam.scale` ↓ via onUpdate — single source of truth)
- Phased pull-back → focus → settle, with built-in drift (Key_Feature tight-icons → cards-unfold) → `multi-phase-camera` (use the "Dramatic reveal: push → neutral → pull" / pull-back phase pattern; grow/shrink of cards chords to the pull-back phase)

---

```
BLUEPRINT: grid-card-assemble — serves Key_Feature, Benefits, Social_Proof (folded 4 drafts + 2 mined clusters: live-data-populate-board, item-field-to-payoff-card)
RULE COVERAGE: complete, no gaps — traveling-glow sweep → ambient-glow-bloom; motion-blur slide-out sweep (exit) → motion-blur-streak; grid slide-up fly-out (exit) → gsap-effects (plain translate); skeleton-fill populate → stat-bars-and-fills + discrete-text-sequence; push-through-hero exit → multi-phase-camera + coordinate-target-zoom
```

Merge tension: `center-outward-expansion` (the natural backing for stagger-assemble) caps cleanly at 3–8 items and explicitly warns 8+ causes mid-flight overlap chaos — but a Social_Proof logo wall is deliberately dense (12+ tiles), so for that variant the items must NOT burst from a shared center; they slide a short distance directly into their own slot (the rule's "starting partially-spread"/short-path form, or a `gsap-effects` per-item stagger), which the consolidated Scene-1 verb already specifies as "short distance directly into its slot."

## Selected motion rule: spring-pop-entrance

---
name: spring-pop-entrance
description: The canonical entrance pop — an element (or staggered group) arrives by scaling 0 → 1 on a smooth long-tail settle (power3 default); bouncy overshoot is a rare, explicitly-playful exception. fromTo so it's correct at t=0 under seek.
metadata:
  tags: spring, entrance, pop, scale, power3, settle, stagger, reveal, arrival
---

# Spring-Pop Entrance

> **Smooth beats bouncy.** This entrance defaults to a smooth long-tail settle — `power3.out` (or `expo.out` for a faster front) — that decelerates cleanly into the resting size with **no overshoot**. Bouncy `back.out` is the **#1 instant turn-off** in agent-made videos and is almost never executed well; it is a rare, explicitly-playful exception (consumer / fun brand), never the default. When unsure, settle smoothly.

THE entrance primitive: an element (or staggered group) arrives by springing from nothing — `scale: 0 → 1`, optional small `y` rise — and settles without bouncing. This is **arrival**, not reaction: distinct from [press-release-spring.md](press-release-spring.md) (a click/press → release feedback chain on an element that already rests on screen). Many blueprints used to borrow that rule to fake an entrance; reach for this instead.

## How It Works

One `fromTo` carries the whole arrival: from `{ scale: 0, opacity: 0 }` (explicit, so t=0 is correct under seek) to `{ scale: 1, opacity: 1, ease: "power3.out" }`. For a **group**, the same `fromTo` runs per element at `i * STAGGER`, capped so the group reads as one arriving beat. The `scale` grow is load-bearing; the `y` rise is garnish — drop everything else and it must still read as a clean entrance. Let the ease produce the settle: never hand-key a `scale: 1.1` mid-state (it double-bounces against the curve).

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="pop-hero" id="hero">{heroLabel}</div>

<div class="pop-grid">
  <div class="pop-item">{itemA}</div>
  <div class="pop-item">{itemB}</div>
  <div class="pop-item">{itemC}</div>
</div>
```

```css
.pop-hero,
.pop-item {
  transform-origin: 50% 50%; /* in-place pop; move to the source point for the anchored variation */
  will-change: transform;
}
.pop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: GRID_GAP;
  place-items: center;
}
```

```js
// Single hero pop — smooth long-tail settle, no overshoot.
tl.fromTo(
  "#hero",
  { scale: 0, opacity: 0 },
  { scale: 1, opacity: 1, duration: POP_DUR, ease: "power3.out" },
  ENTRY_AT,
);

// Staggered group pop — one arriving beat.
gsap.utils.toArray(".pop-item").forEach((el, i) => {
  tl.fromTo(
    el,
    { scale: 0, opacity: 0, y: Y_RISE },
    { scale: 1, opacity: 1, y: 0, duration: POP_DUR, ease: "power3.out" },
    GROUP_ENTRY_AT + i * STAGGER,
  );
});
```

## Variations

- **Calm settle** (premium / enterprise): `power3.out`, no rotation, `Y_RISE` 0–12px — a weighted, confident landing for a hero wordmark or product shot.
- **Firm settle** (everyday default): `power3.out` or `expo.out` for a punchier front, `Y_RISE` ~24px — cards, icons, callouts.
- **Exact-physics settle**: when the settle IS the shot, swap the ease for `springEase({ response: 0.4 })` (critically damped) from `../adapters/gsap-easing-and-stagger.md` → Spring Eases; take `duration` from the helper.
- **Origin-anchored pop**: a callout growing out of a specific point (marker, pointer tip) sets `transform-origin` to that point (e.g. `0% 100%`) so `scale: 0 → 1` reads as "emerging from the source", not "inflating in place".
- **Pop into a held slot**: land the pop and hold still — no idle loop baked into the entrance. If the held frame genuinely needs life, hand off to [sine-wave-loop.md](sine-wave-loop.md) for subtle jitter on a separate later tween; prefer revealing the next element on its VO cue.
- **Bouncy pop (RARE — explicitly-playful only)**: swap the ease for `back.out(OVERSHOOT)` and optionally settle a small `rotation: ROT_FROM → 0` so elements look hand-placed. Only for a deliberately playful register — never product / enterprise / serious tone:

```js
tl.fromTo(
  el,
  { scale: 0, opacity: 0, rotation: ROT_FROM },
  { scale: 1, opacity: 1, rotation: 0, duration: POP_DUR, ease: `back.out(${OVERSHOOT})` },
  GROUP_ENTRY_AT + i * STAGGER,
);
```

Even here keep `OVERSHOOT ≤ ~2` — past that it reads as cartoon wobble. Better still: the baked spring at `dampingFraction: 0.6–0.7` (same adapters doc) gives ~5–10% overshoot that reads physical where `back.out` reads cartoon.

## Values

| token      | range                                     | notes                                                            |
| ---------- | ----------------------------------------- | ---------------------------------------------------------------- |
| EASE       | `power3.out` default; `expo.out` punchier | `back.out(OVERSHOOT)` only in the playful variant                |
| POP_DUR    | 0.4–0.7s                                  | shorter = tight snap; hero must be visible by **t ≤ 0.5s**       |
| STAGGER    | 0.04–0.08s                                | `min(0.06, 0.5 / ITEM_COUNT)` — self-caps the window             |
| ITEM_COUNT | 3–9                                       | >9 makes the stagger vanish — switch to a wipe/sweep reveal      |
| Y_RISE     | 0–32px                                    | small; never large enough to read as a slide-up                  |
| ROT_FROM   | −10°–+10°                                 | playful variant only; alternate sign by index (`i % 2 ? 6 : -6`) |
| ENTRY_AT   | 0–0.4s                                    | a beat of quiet, but keep the subject landing by t ≤ 0.5s        |

## Critical Constraints

- Default ease `power3.out` (no overshoot); `back.out` only in the explicitly-playful variant, and there `OVERSHOOT ≤ ~2`.
- `ITEM_COUNT × STAGGER ≤ ~0.5s` — the group must land inside one beat.
- Entrances state the collapsed from-state in `fromTo` — never rely on a CSS-hidden start (it renders visible before the tween claims it under seek).
- `transform-origin: 50% 50%` for an in-place pop; the source point only for the anchored variation.
- This is a finite arrival — idle motion on a held element is a separate, later `sine-wave-loop` tween.

## See also

`center-outward-expansion` (pop while radiating to slots) · `press-release-spring` (the click-feedback counterpart) · `sine-wave-loop` (post-arrival jitter, sparingly).
