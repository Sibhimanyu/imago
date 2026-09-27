# Frame packet: 05-any-api

## Project inputs

- Project: /Users/sibhi-zstch1643/conductor/workspaces/something-that-does-stuff/abu-dhabi/videos/imago-launch
- Design tokens: /Users/sibhi-zstch1643/conductor/workspaces/something-that-does-stuff/abu-dhabi/videos/imago-launch/frame.md
- RULES_DIR: /Users/sibhi-zstch1643/.claude/skills/hyperframes-animation/rules

## Assigned storyboard block

## Frame 5 — Whatever it returns

- scene: Amigo stays pinned bottom-left, hopping on each beat, while the card beside them hard-swaps: Pikachu profile → Chennai weather (30.5°C, humidity 72%, the temperature line draws) → Open Library "dune" (48,232 found, book rows cascade). Label under Amigo swaps with it: Pokémon / Weather / Library.
- voiceover: ""
- duration: 4.5s
- poster: 3.4s
- transition_in: push-slide LEFT
- status: built
- src: compositions/frames/05-any-api.html
- type: benefit_highlight
- persuasion: Rule of three (breadth)
- beat: excitement
- asset_candidates: assets/amigo-mascot.svg — the pinned anchor
- on_screen: "Pokémon." "Weather." "Books." → "Whatever it returns."
- blueprint: fixed-anchor-cycle (Reproduce)
- focal: the cycling interface card
- roles: assets/amigo-mascot.svg = cutout (the pinned anchor)
- sfx: a soft tick on each hop/swap, a light whoosh on the final line

Reproduce: the pinned anchor is Amigo plus the headline; the cycling region is the card. Hard-cut swaps on the beat. The signature is the anchor staying still while the card swaps.
Scene 1 (0.0–1.0s): headline "Whatever / it returns." is in upper-left (display, h1-ish), set on beat 1. Amigo stands lower-left with the label stack Pokémon (active, ink) / Weather / Library (muted). The card on the right shows the Pikachu card (compact: title, 112, 4, four bars). Asymmetric 40/60, with a ghost card offset behind for depth.
Scene 2 (1.0–2.5s): beat 3 (1.0s): Amigo hops in place (stretch/squash), and on landing the card hard-cuts to Chennai weather: "Chennai", "Live weather", Temperature 30.5°C, Humidity 72%, and a "Temperature today" sink well whose ink line self-draws left to right (24 points, low 25.1 · high 34). The label stack steps to Weather. → discrete-text-sequence (label) + svg-path-draw (chart)
Scene 3 (2.5–3.5s): beat 6 (2.5s): the next hop, and the card hard-cuts to Open Library: "Openlibrary" q "dune", 48,232 found (counts up), and three book rows cascading in (Dune · Frank Herbert · 1965; Dune Messiah · Frank Herbert · 1969; Children of Dune · Frank Herbert · 1976, the live openlibrary.org top three). The label steps to Library. → dynamic-content-sequencing
Scene 4 (3.5–4.5s): all three labels turn ink together, then the Library card holds. Held read.

narrativeRole: Proves it isn't one demo — every shape of response gets its own interface.
keyMessage: Any GET endpoint.

## Selected blueprint: fixed-anchor-cycle

# fixed-anchor-cycle — Fixed Anchor, Cycling World

**intent**: One element is PINNED — a wordmark, a composer box, an anchor line that enters once and never moves again — while the adjacent region (or the entire surrounding theme) cycles through many discrete states around it, cadence often manipulated (steady stepping, a fast carousel, or a slow→accelerating flurry), resolving on an emphasis beat into a completed lockup or a muted freeze. The stillness of the anchor IS the claim: everything changes, this stays. Distinct from `kinetic-type-beats` sub-shape A, where a word-slot inside a centered line swaps and the sentence itself is the subject — there the anchor is a sentence frame on a bare type field; here the anchor is the PRODUCT identity and what cycles around it can be non-text (whole theme skins, chrome/logo swaps, textured label chips, a carousel list), the cycle asserts breadth ("everyone says / works everywhere / calling all X"), and the resolve completes the anchor into a lockup. Distinct from `ticker-takeover`, whose cycle ends in a collision — a hero crashes in and shoves the text aside; here nothing ever collides with the anchor: the cycle stops, and a final element quietly joins it.

**roles served**

- Brand_Outro (from `static-anchor-rapid-text-swaps`): when the sign-off is the brand name sitting immovable while praise quotes / tagline words cycle beside or beneath it — steady per-word highlight stepping, or a hard-cut chip flurry that accelerates — landing on the finished lockup ("bolt.new / prompt, run, edit, deploy / enjoy."; "Opus 4.6 by ANTHROP\C").
- Benefits: when "works everywhere" is shown literally — one product surface (a prompt composer with one verbatim string) pinned dead-center while its ENTIRE shell morphs in place through N product themes (background, typography, radii, chrome, logos all crossfading at once), ending in a washed-out freeze.
- Hook: when the opener is a roll-call — a static anchor line holds while an accent-colored line beneath it runs as a fast vertical carousel through an audience/option list, then the block clears into follow-up statement beats that land the brand line.

**duration**: 6.6–11.1s (Benefits shortest ~6.6s at 4 theme beats; Brand_Outro ~9–9.4s; Hook longest ~11s when the anchor-cycle block hands off to follow-up statement beats). The cycle engine itself occupies ~3–5s regardless of role.

**shot structure** (flat static frame — camera locked in every member; a `[bg]` field, solid or subtly drifting; two folded sub-shapes — **(A) adjacent-region cycle**: the anchor holds and a neighboring slot swaps through N states; **(B) whole-context morph**: the anchor holds and everything AROUND it re-skins in place)

- **Scene 1 (0.0–~2.0s) — the anchor lands and PINS.** The `[anchor: wordmark / product name / composer box / lead line]` enters once — fade/scale-in centered, word-by-word build, or already present at frame one — at a fixed position it will hold for the entire clip. Zero movement from here on: no drift, no breathe, no re-layout. If the anchor is a UI surface (sub-shape B), it carries a `[verbatim string]` with a blinking cursor.

- **Scene 2 (~2.0s–~70% of runtime) — the cycle engine (signature move).** The world changes around the unmoved anchor. Choose by sub-shape:
  - **Sub-shape A (adjacent-region cycle)**: a region beside/beneath the anchor steps through N discrete states — pick ONE swap mechanic and ONE cadence:
    - _swap mechanics_: instant hard-cut label replacement (a `[chip / tape label]` slaps over the old one, texture/highlight shifting slightly, chip width re-fitting each `[phrase]` — growing away from the anchor, never over it); sequential per-word highlight stepping (one word of the `[tagline]` snaps bright/bold while the rest sits dim grey, the highlight walking the line); or a fast vertical carousel (each `[list item]` slide/fades through the accent slot ~0.5s/phrase).
    - _cadences_: steady stepping (~0.5–1s/state), or **slow→accelerating flurry** — ~1s beats compressing to ~0.15–0.3s per swap, breadth escalating into a blur of states (12–16 states read as "everyone"; 3–8 read as a roll-call).
    - Geometry law: the cycling region NEVER overlaps, touches, or displaces the anchor; size the layout so the longest state still fits inside the frame with clear margins.
  - **Sub-shape B (whole-context morph)**: at ~1.3s intervals the entire theme — `[bg color]`, typography, corner radii, toolbar icons, footer `[brand logos]`, contextual lines — morphs in place via quick (~0.3s) crossfades through N `[product skins]`, every property blending simultaneously. No hard cuts, no wipes; the anchor's content string is identical in every skin (chrome details like a `> ` prefix may adapt per skin).

- **Scene 3 (~70–85%) — the emphasis beat.** The cycle resolves — it does not just stop:
  - _Variant — Brand_Outro (highlight stepping)_: the whole `[tagline]` snaps solid bright at once — full-line illumination after the per-word walk.
  - _Variant — Brand_Outro (flurry)_: the flurry halts and HOLDS on the `[longest / weightiest phrase]` — a beat of stillness after acceleration.
  - _Variant — Benefits (theme morph)_: the final beat mutes — a faint `[dot-grid]` fades in across the background while the UI drops to low opacity, a washed-out blueprint freeze.
  - _Variant — Hook (carousel)_: the anchor block clears, handing off to 1–3 centered word-by-word statement beats (kinetic-type-beats territory) that carry toward the close.

- **Scene 4 (final beat → end) — lockup completion and HOLD.** A final element joins the still-unmoved anchor and the finished composition holds static to the end: a `[closing word]` drops in below, aligned to the last cycled state ("enjoy."); the chip vanishes on a hard cut and the `[brand sign-off]` appears beside the anchor on a shared baseline ("by ANTHROP\C"); or the final `[brand line]` builds word-by-word dead-center and holds ("with Copilot."). Long static hold — the lockup is the payoff, give it 20–30% of the runtime.

**motion vocabulary**: anchor fade/scale-in entrance; permanently pinned anchor (zero movement, no idle breathe); instant hard-cut label/chip replacement (slap-over with subtle texture/highlight shift); chip width resize-to-fit per phrase (grows away from the anchor); sequential per-word highlight stepping through a line; dim-to-grey line state; whole-line illumination snap; fast vertical carousel slide/fade of one line under a static line; cadence acceleration (slow ~1s beats into a ~0.15–0.3s flurry); hold-on-longest-phrase emphasis beat; in-place theme morph crossfade (~0.3s) blending background/fonts/radii/icons simultaneously; per-beat chrome/logo swap; blinking text cursor; contextual line appearing/disappearing across beats; dot-grid backdrop fade-in; global opacity washout; end freeze; word-by-word phrase build; block clear between scenes; drop-in entrance of a final word; hard cut to final lockup; long static hold.

**rule mapping**

- instant hard-cut chip/label/phrase swaps at time thresholds; per-word highlight stepping (color/weight state swaps); dim-line → full-line illumination snap; per-state chip width set (a per-state layout property, set discretely — never tweened) → `discrete-text-sequence`
- fast vertical carousel of the accent line under the static anchor (slide/fade stepped swaps in a masked slot) → `vertical-spring-ticker` (its footer-reveal step unused — Scene 4's lockup takes its place)
- per-phrase state windows computed from a script of N states (praise quotes, audience list, theme beats) → `dynamic-content-sequencing` (Accelerating cadence — for the flurry, pre-compute the beat array with shrinking `hold` values, geometric decay over the state list)
- word-by-word phrase builds (anchor line, follow-up statements, final brand line) → `dynamic-content-sequencing` + `waterfall-entry` (or `kinetic-beat-slam` when the statements should land percussively)
- anchor entrance fade/scale-in; drop-in of the final closing word → `spring-pop-entrance` (restrained overshoot — the register here is editorial, not bouncy)
- blinking cursor in the pinned composer → `context-sensitive-cursor` (color adapts per theme skin at segment boundaries)
- whole-context theme morph → `theme-crossfade-morph` (N pre-styled full-scene layers stacked at the same geometry, opacity-crossfaded, the shared anchor string rendered once on top); the composer shell's radius/surface component alone → `card-morph-anchor`
- subtly drifting background field beneath the cycle → `sine-wave-loop` (bounded drift; the anchor itself gets none)
- dot-grid fade-in + global opacity washout freeze; long static hold → `gsap-effects` (plain opacity tweens) / static hold (no rule needed)

**camera modifier**: none — every member is fully camera-static; the cycle is the only motion, and the pinned anchor's stillness is load-bearing. Do not add a push-in "for energy"; it would break the anchor contract.

## Selected motion rule: discrete-text-sequence

---
name: discrete-text-sequence
description: Replace entire text states at frame thresholds for non-linear typing effects — typos, bulk additions, pauses, backspaces, simulated thinking.
metadata:
  tags: text, typing, discrete, threshold, non-linear, sequence
---

# Discrete Text Sequence

Instead of character-by-character typewriter, replace entire string states at time thresholds — enabling non-linear effects (typos, backspaces, bulk paste, "thinking" gaps) that smooth per-char typing can't achieve. If your effect is "type each character, no edits", this rule is overkill — use the smooth-slice variation below.

## How It Works

The typing is authored as a sparse array of `{ t, text }` states; on every `onUpdate` a **reverse search** finds the latest entry whose `t` has passed and renders its text. Display jumps between states with no animation between them — the realism comes from the schedule shape: fast keystroke clusters (0.06–0.20s apart), pauses at word breaks (0.3–0.6s), a typo, backspaces peeling back to the fork, then a bulk paste replacing many chars in one entry. A block cursor blinks via a deterministic sin square wave on the same timeline.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="terminal">
  <div class="prompt">$</div>
  <div class="text-wrap">
    <span class="text" id="text"></span><span class="cursor" id="cursor">_</span>
  </div>
</div>
```

```css
.terminal {
  font-family: {monoFont}; /* monospace required — proportional jitters even in a fixed box */
  display: flex;
  align-items: baseline;
  font-size: TERMINAL_FONT_SIZE;
}
.text-wrap {
  display: inline-flex;
  align-items: baseline;
  min-width: TEXT_WRAP_MIN_WIDTH; /* ≥ widest state — stops right-edge jitter */
  white-space: nowrap;
}
.cursor {
  display: inline-block; /* inline ignores width */
  width: CURSOR_WIDTH;
}
```

```js
// Each entry shows from its t until the NEXT entry's t.
// Shape: keystrokes → typo → backspace to the fork → bulk paste → completion mark.
const SEQUENCE = [
  { t: 0.0, text: "" },
  { t: T_K1, text: "{p1}" }, // first keystrokes (~3-5 chars, 0.1-0.2s apart)
  { t: T_K2, text: "{p1 + ' ' + p2_typo}" }, // continuation containing a typo
  { t: T_BS, text: "{p1 + ' ' + p2_partial}" }, // backspace(s) — peel back to the fork
  { t: T_BULK, text: "{fullCorrectedText}" }, // bulk paste — many chars in one jump
  { t: T_DONE, text: "{fullCorrectedText + ' ✓'}" }, // completion marker
];

// Reverse-search for the latest entry whose t has passed
function textAt(time) {
  for (let i = SEQUENCE.length - 1; i >= 0; i--) {
    if (time >= SEQUENCE[i].t) return SEQUENCE[i].text;
  }
  return "";
}

const textEl = document.getElementById("text");
const cursorEl = document.getElementById("cursor");

const driver = { t: 0 };
tl.to(
  driver,
  {
    t: TOTAL_DURATION,
    duration: TOTAL_DURATION,
    ease: "none",
    onUpdate: () => {
      textEl.textContent = textAt(driver.t);
    },
  },
  0,
);

// Cursor blink — deterministic sin square wave, never a CSS animation
const blink = { p: 0 };
tl.to(
  blink,
  {
    p: Math.PI * 2 * BLINK_CYCLES,
    duration: TOTAL_DURATION,
    ease: "none",
    onUpdate: () => {
      cursorEl.style.opacity = Math.sin(blink.p) > 0 ? "1" : "0";
    },
  },
  0,
);
```

## Variations

- **Smooth character slice** (continuous typewriter — no pauses, no edits): faster to author but uniformly "machine-typed", missing the human realism:

```js
const fullText = "{fullPhrase}";
const len = { v: 0 };
tl.to(
  len,
  {
    v: fullText.length,
    duration: TYPE_DUR,
    ease: "power1.inOut",
    onUpdate: () => {
      textEl.textContent = fullText.substring(0, Math.floor(len.v));
    },
  },
  0,
);
```

- **Thinking pause** — hold one state for `THINK_HOLD_DUR` (0.8–2.0s; under 0.5s reads as a stutter, not thought) simply by leaving a gap before the next entry's `t`.
- **State pulse on completion** — when the final state lands, `tl.to(".text", { scale: 1.03–1.08, duration: 0.15–0.3, yoyo: true, repeat: 1 }, T_DONE)`.
- **Per-state color shift** — in `onUpdate`, branch on `driver.t` vs the milestones: success color after `T_DONE`, dim mid-edit, normal while typing.

## Values

| token               | range                                        | notes                                                                  |
| ------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| TERMINAL_FONT_SIZE  | 48–96px                                      | full-bleed comps; smaller for terminal-style detail                    |
| TEXT_WRAP_MIN_WIDTH | ≥ widest state                               | measure with a hidden probe after `document.fonts.ready` if unsure     |
| milestone `t`s      | keystrokes 0.06–0.20s apart; pauses 0.3–0.6s | monotonically increasing; `T_DONE ≤ TOTAL_DURATION − ~1s` climax dwell |
| TYPE_DUR (smooth)   | `chars × 0.06–0.12s`                         | fast → relaxed                                                         |
| BLINK_CYCLES        | one cycle per 0.5–0.8s                       | `TOTAL_DURATION / 0.8 ≤ BLINK_CYCLES ≤ TOTAL_DURATION / 0.5`           |
| CURSOR_WIDTH        | ~0.3× font size                              | gap to text single-digit px so the cursor feels attached               |

## Critical Constraints

- **Reverse-search the array each frame** — O(n) with small n (≤30 typical); don't index by frame, the sequence is sparse.
- **`min-width` on the text wrap is mandatory** — without it the right edge jitters as state length changes.
- **Discrete jumps must be INSTANT** — any transition on the text turns the jump into a smear and kills the "typing" feel.
- **Cursor blink is sin/sequence-driven on the timeline**, `display: inline-block`, monospace font, `white-space: nowrap` (wrapping mid-state breaks the illusion; trailing spaces must survive).
- **Discrete vs smooth** — use discrete only for non-linear states (typos, pauses, bulk paste); plain typing takes the smooth-slice variation.

## See also

`context-sensitive-cursor` (same SEQUENCE pattern + segment-colored cursor) · `3d-text-depth-layers` (discrete text with layered depth) · `counting-dynamic-scale` (discrete label beside a smooth counter) · `press-release-spring` (post-completion press beat).

## Selected motion rule: dynamic-content-sequencing

---
name: dynamic-content-sequencing
description: Auto-calculate timeline start/end times from content length + per-item duration config — longer content gets more screen time without hardcoded numbers.
metadata:
  tags: timeline, sequencing, dynamic, duration, content-aware, utility
---

# Dynamic Content Sequencing

A utility pattern (not a motion rule in itself) for scenes that show a SEQUENCE of items (cards, phrases, stats): each item's duration is computed from its content length + per-item config, and the sequencer assigns absolute start/end times automatically — no hardcoded offsets per item. Distinct from [discrete-text-sequence](discrete-text-sequence.md) (one text element changing states) — this rule swaps between distinct content blocks.

## How It Works

A content array of `{ eyebrow, title, body, speedFactor, hold }` entries is reduced once at build time into a flat `TIMELINE` of `{ …entry, start, end }` — duration per entry is `BASE_DURATION + body.length × SEC_PER_CHAR + hold`, so longer text earns more reading time. A single linear driver's `onUpdate` reverse-searches the active entry and swaps the DOM **only on transitions** (a `lastTitle` guard — per-frame `textContent` writes flicker in render); an optional progress bar fills 0→100% across the whole run.

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="display">
  <div class="eyebrow" id="eyebrow"></div>
  <div class="title" id="title"></div>
  <div class="body" id="body"></div>
  <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
</div>
```

```css
.body {
  min-height: 160px; /* reserve space — content height varies; without this, layout jumps */
}
.progress-fill {
  height: 100%;
  width: 0%;
}
```

```js
// N entries, each with its own pacing (optionally a speedFactor multiplier);
// the final entry uses a larger hold (closing beat).
const CONTENT = [
  { eyebrow: "{eyebrow1}", title: "{title1}", body: "{body1}", hold: HOLD_MID },
  // …
  { eyebrow: "{eyebrowN}", title: "{titleN}", body: "{bodyN}", hold: HOLD_FINAL },
];

// Pre-compute absolute start/end ONCE — never in onUpdate.
let cumulative = 0;
const TIMELINE = CONTENT.map((entry) => {
  const dur = BASE_DURATION + entry.body.length * SEC_PER_CHAR + entry.hold;
  const start = cumulative;
  cumulative += dur;
  return { ...entry, start, end: cumulative };
});

function entryAt(time) {
  for (let i = TIMELINE.length - 1; i >= 0; i--) {
    if (time >= TIMELINE[i].start) return TIMELINE[i];
  }
  return TIMELINE[0];
}

const eyebrowEl = document.getElementById("eyebrow");
const titleEl = document.getElementById("title");
const bodyEl = document.getElementById("body");
const progressEl = document.getElementById("progress-fill");

const TOTAL_DURATION = cumulative + TAIL_PAD;
const driver = { t: 0 };
let lastTitle = "";

tl.to(
  driver,
  {
    t: TOTAL_DURATION,
    duration: TOTAL_DURATION,
    ease: "none",
    onUpdate: () => {
      const entry = entryAt(driver.t);
      // Swap content only on transitions — no per-frame DOM thrash
      if (entry.title !== lastTitle) {
        eyebrowEl.textContent = entry.eyebrow;
        titleEl.textContent = entry.title;
        bodyEl.textContent = entry.body;
        lastTitle = entry.title;
      }
      progressEl.style.width = `${(driver.t / TOTAL_DURATION) * 100}%`;
    },
  },
  0,
);
```

## Variations

- **Crossfade between items** — return BOTH adjacent entries during an overlap window (`time ≥ e.start − overlap && time ≤ e.end + overlap`, overlap ≈ 0.3s) and render them with opacities computed from distance to the boundary.
- **Per-item motion variation** — map an `entry.style` key to an existing rule per chapter (e.g. `3d-text-depth-layers` → `hacker-flip-3d` → `counting-dynamic-scale`); the sequencer only orchestrates timing.
- **Auto-extend composition duration** — you can set `data-duration` from the computed `TOTAL_DURATION` in script, but HF reads `data-duration` at composition load and setting it after init may not take effect — author the duration manually from a rough total.

### Accelerating cadence (geometric hold decay)

For rhetorical escalation — "everyone says…", a roll-call, a praise flurry — the beat grid itself accelerates: early entries hold ~1s (read speed), then windows shrink geometrically into a ~0.15–0.3s flurry, braking on an emphasis state before the resolve. The acceleration is pre-computed into the same flat `TIMELINE` — still content-driven, still deterministic, no speed-up tween anywhere:

```js
// Geometric decay on the hold, clamped at a flurry floor; the brake state holds longest.
const HOLDS = CONTENT.map((entry, i) => Math.max(FLURRY_FLOOR, HOLD_START * Math.pow(DECAY, i)));
HOLDS[CONTENT.length - 1] = HOLD_FINAL;

let cumulative = 0;
const TIMELINE = CONTENT.map((entry, i) => {
  // Past ~0.5s states are glanced as motion texture, not read —
  // drop the per-char term or you never reach flurry speed.
  const readable = HOLDS[i] >= READ_THRESHOLD;
  const dur = HOLDS[i] + (readable ? entry.body.length * SEC_PER_CHAR : 0);
  const start = cumulative;
  cumulative += dur;
  return { ...entry, start, end: cumulative };
});
```

Worked example — **praise-chip flurry**: ~16 short quotes hard-cut through a chip beside a pinned wordmark. First 3 states at `HOLD_START = 1.0` (each reads fully); `DECAY = 0.8` shrinks every following window until `FLURRY_FLOOR = 0.2` catches it (≈12 states over ~2.5s — a churn of acclaim, individually glanced); the longest phrase takes `HOLD_FINAL ≈ 1.6` as the brake before the closing lockup.

Values: `HOLD_START` 0.8–1.2s; `DECAY` 0.75–0.88 (higher = longer runway before the flurry bites); `FLURRY_FLOOR` 0.15–0.3s (below ~0.15s swaps strobe); `READ_THRESHOLD` ~0.5s; brake ≥ 4× the floor or the stop doesn't register as a beat. The 3–6 entry guidance relaxes here — 12–18 states are legal precisely because flurry states aren't individually read. The hard-cut discipline (`lastTitle` guard, instant swaps) is what lets 0.2s states render clean.

## Values

| token         | range                 | notes                                                                                                                 |
| ------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| BASE_DURATION | 0.6–1.5s              | minimum per entry regardless of length — even one-word entries get read time                                          |
| SEC_PER_CHAR  | 0.03–0.06 s/char      | ≈17–33 chars/sec; uniform across the sequence so the pace reads as one engine; lean high for wide-character languages |
| HOLD_MID      | 0.5–1.0s              | dwell on a non-final entry; `< HOLD_FINAL`                                                                            |
| HOLD_FINAL    | 1.0–2.0s              | climax dwell — must exceed HOLD_MID by a clear margin so the close reads as a beat                                    |
| SPEED_FACTOR  | 0.5–2.0 (default 1.0) | per-entry only; if every entry shares a factor, fold it into SEC_PER_CHAR                                             |
| TAIL_PAD      | 0.0–1.0s              | quiet beat after the last entry; prefer 0 when the next composition owns the breath                                   |
| CONTENT N     | 3–6 entries           | <3 isn't a sequence; >6 drags (accelerating cadence relaxes this — see above)                                         |

Reference: `../examples/messaging-multi-phrase.html`.

## Critical Constraints

- **Pre-compute the TIMELINE once at build** — never recompute in `onUpdate`; the reverse search over the flat array is the whole per-frame cost.
- **DOM swap only on entry transition** (`lastTitle`/key guard) — per-frame `textContent` assignment flickers in HF render.
- **`min-height` on the body element** — without reservation, downstream elements (progress bar, brand) jitter as content height varies.
- **Sequential only** — for parallel tracks use a different reduction.
- **Titles fit one line at the chosen size; bodies fit inside `min-height` after wrapping.**

## See also

`discrete-text-sequence` (per-entry typewriter on the body) · `context-sensitive-cursor` (cursor color per chapter) · `vertical-spring-ticker` (animated word swap instead of hard cut) · `scale-swap-transition` (visual morph between entries).

## Selected motion rule: svg-path-draw

---
name: svg-path-draw
description: Animate SVG paths drawing progressively using stroke-dasharray and stroke-dashoffset.
metadata:
  tags: svg, stroke, draw, path, reveal, icon, vector
---

# SVG Path Draw

Reveals an SVG shape by animating its stroke as if a pen were tracing it. Two stroke properties together: **`stroke-dasharray = <pathLength>`** makes the entire path one dash; **`stroke-dashoffset`** starts at the path length (dash shifted fully out of view → invisible) and tweens to `0` (fully drawn). The length comes from the DOM API `path.getTotalLength()` — measured, never guessed.

Works on anything with a stroke: `<path>`, `<circle>`, `<rect>`, `<line>`, `<polyline>`, `<polygon>`, `<ellipse>`.

## Recipe

```html
<!-- inside a standard scene clip -->
<svg class="logo-mark" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path id="bar-left" d="M 60 40 L 60 160" />
  <path id="bar-right" d="M 140 40 L 140 160" />
  <path id="bar-mid" d="M 60 100 L 140 100" />
</svg>
```

```css
.logo-mark path {
  fill: none; /* outline-only draw — a fill would appear immediately and ruin the reveal */
  stroke: {accentColor};
  stroke-width: 12;
  stroke-linecap: round; /* softer endpoints */
  stroke-linejoin: round;
}
```

```js
// Setup: measure each path and set its dash pattern. Real measured geometry, not a magic number.
document.querySelectorAll(".logo-mark path").forEach((p) => {
  const len = p.getTotalLength();
  p.style.strokeDasharray = `${len}`;
  p.style.strokeDashoffset = `${len}`;
});

// Stagger draws so the eye reads continuous motion — each segment starts at
// ~70-80% of the previous segment's duration, before it finishes.
tl.to(
  "#bar-left",
  { strokeDashoffset: 0, duration: SEGMENT_DRAW_DUR, ease: "power2.out" },
  SEG_1_START,
);
tl.to(
  "#bar-right",
  { strokeDashoffset: 0, duration: SEGMENT_DRAW_DUR, ease: "power2.out" },
  SEG_2_START,
);
tl.to(
  "#bar-mid",
  { strokeDashoffset: 0, duration: FINAL_SEGMENT_DUR, ease: "power2.out" },
  SEG_3_START,
);

// Companion wordmark fades in only after the last stroke settles.
tl.to(
  ".brand-line",
  { opacity: 1, duration: BRAND_FADE_DUR, ease: "power1.out" },
  BRAND_FADE_START,
);
```

## Variations

- **Ring starting at 12 o'clock** — `<circle>` / `<rect>` strokes start at 3 o'clock by default; rotate the element `-90deg` so a progress ring draws from the top:

```html
<circle
  cx="100"
  cy="100"
  r="60"
  id="ring"
  style="transform-origin: 100px 100px; transform: rotate(-90deg)"
/>
```

- **Linear (constant-speed) draw** — `ease: "none"` for a steady-rate "real pen" trace.
- **Draw then fill** — for filled shapes, tween `fillOpacity: 0 → 1` AFTER the stroke completes (requires `fill-opacity: 0` initially and a real `fill` in CSS):

```js
tl.to(
  "#path",
  { strokeDashoffset: 0, duration: SEGMENT_DRAW_DUR, ease: "power2.out" },
  SEG_1_START,
);
tl.to(
  "#path",
  { fillOpacity: 1, duration: FILL_FADE_DUR, ease: "power1.out" },
  SEG_1_START + SEGMENT_DRAW_DUR,
);
```

## Values

| token             | range                                   | notes                                                                                              |
| ----------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| SEGMENT_DRAW_DUR  | 0.3–0.8s                                | fast snap vs deliberate pen trace; >~1s feels sluggish for a logo reveal                           |
| FINAL_SEGMENT_DUR | 60–80% of SEGMENT_DRAW_DUR              | proportional to segment length — a short connector at full duration reads slower than its siblings |
| SEG_N_START       | previous start + 70–80% of its duration | reads as continuous motion, not N isolated animations                                              |
| SEG_1_START       | 0–0.4s                                  | a small ~0.2s lead-in lets the viewer settle before motion                                         |
| BRAND_FADE_START  | ≥ last stroke end (+ ~0.2s beat)        | earlier and the wordmark competes with the draw                                                    |
| BRAND_FADE_DUR    | 0.3–0.8s                                | snap (urgent) vs glide (premium)                                                                   |

Ease families are discrete choices: **stroke draws** use `power2.out` (a hand lifting at end of stroke) or `none` for constant speed — never `back.out` / `elastic.out` (pens don't bounce). **Fades** use `power1.out`.

## Critical Constraints

- **`fill: none`** for outline-only draws — otherwise the fill appears immediately.
- **Dasharray/dashoffset = the measured `getTotalLength()`**, set at setup; requires the SVG in the DOM (inline SVG is fine; a loaded `<image>` SVG is not).
- **Complex paths**: if `getTotalLength()` looks wrong, overestimate slightly (`len * 1.05`) — too large is invisible at animation start; too small clips the end.
- **Stagger multi-path draws at ~70–80%** of the previous segment's duration.
- **A drawn line must land on something.** When the path is a connector (rail, beam, underline, callout) rather than a shape, both endpoints must sit on real elements and the draw must do a job — reveal, route, validate, or emphasize. A stroke that only decorates empty space reads as filler; attach it or cut it.

## See also

`svg-icon-enrichment` (internal parts animate after the outline draws) · `counting-dynamic-scale` (stroke draws an icon while a number counts up) · `hacker-flip-3d` (logo draws, wordmark decodes beneath).
