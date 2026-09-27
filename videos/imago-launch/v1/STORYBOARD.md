---
format: 1920x1080
duration: 30s
message: "Paste an API, get the interface its data deserves."
arc: BAB — before (raw JSON) → bridge (paste the URL) → after (real interfaces) → proof → CTA
audience: developers who poke at APIs
mode: collaborative
music: upbeat bright tech pop, confident, clean 120 bpm groove, launch promo
---

## Decisions

- **Spine:** Amigo, who is in every beat (paper-white on the dark frame 02) and ends beside the logo. Hero prop: the pikachu JSON (raw in 02, pasted in 03, turned into the card in 04, returning as the first card of 05).
- **Direction:** every seam flows leftward.
- **Held frame:** the last 1.2s of frame 07.
- **Bans:** no face, arms or speech bubbles on Amigo · no brand hue or gradient · no glow · no rainbow stat bars · colour only for changed/live · no slideshow cards · no screensaver drift.
- **Truthfulness:** every number on screen comes from real Imago output (pokeapi pikachu, open-meteo Chennai, openlibrary "dune"). The UI is rebuilt in the current landing-hero style from the captured site. The one depicted change, 30.5 → 31.2°C in 06, is illustrative: it demonstrates the watch feature and is not a recorded reading.
- **Sketch sheet:** storyboard.html v1.1 (design-review: Amigo smaller than the logo in 07, in-frame labels ≥1.4cqw, sketch notes moved out of frames)

## Video direction

- **Palette (frame.md, by role):** paper `bg` #F6F5F1 is the ground of every frame except 02, whose ground is `code-bg` ink. Ink `primary` carries all type, Amigo, stat bars, chart lines and the CTA pill. `card-bg` white cards with a 1px `border` and the brand hero shadow. Colour only with meaning: `changed` amber and `live` green appear in frame 06 alone. `code-number` blue only on numeric JSON tokens.
- **Type (frame.md roles):** display = Inter Display 600, tracking −0.035em, for headlines and hero numerals; body/labels = Inter 400/500, never below 1.4cqw; mono = JetBrains Mono for URLs, JSON and hashes only.
- **Beat grid:** music is 120 bpm with a beat every 0.5s and a bar every 2s, starting at t≈0. Every reveal, hop and swap lands on a half-second, and frame boundaries fall on beats. Name reveals by the frame-local beat they land on.
- **Motion grammar:** long-tail `power3` settles for UI and type, `expo.out` on fast arrivals. No bounce or elastic on UI. **The one playful exception is Amigo's body:** hop arcs with squash on landing and stretch on take-off (anticipation → stretch → arc → squash → settle), because the mascot's physics is its whole personality. The squash is a scaleY/scaleX pair anchored at the feet, never an overshooting spring on cards.
- **Reveal model:** silent film, so music is the voiceover. Each piece enters on its own beat; nothing is on screen before its beat. Headlines build per line or per word.
- **Amigo rules:** single-colour ink (paper on the dark 02); body + aperture + two legs only. No face, arms or speech bubbles. It gestures by leaning, hopping, pressing and peeking. Draw it from `assets/amigo-mascot.svg` inline (fill = currentColor) so the legs can squash with the body. It is never larger than the logo in 07.
- **Rhythm / held frames:** 01–05 build energy. Frame 06 lets each statement land and read for about a bar. **Frame 07's last 1.2s is the held frame**: nothing moves except, at most, a subtle jitter.
- **Captions:** none (no narration). Keep important content in the top ~83% anyway, except Amigo's deliberate bottom-edge peek in 02.
- **Negative list:** slideshow (everything dumped at t=0, then frozen); screensaver (elements drifting independently); lazy breathing loops; a slow pan or push in the back half; `repeat`/`yoyo`; `Math.random`; CSS transitions/keyframes; glow, gradients, purple; rainbow stat bars; fake browser chrome or cursors; stock decoration.

## Locked

- storyboard.html v1.1 confirmed by the user ("I like it", then "build it") on 2026-09-25: all 7 layouts, copy and seams.

## Frame 1 — Amigo's cold open

- scene: Empty warm paper. Amigo hops in from the left on the beat, lands with a squash, leans toward a line that types beside them: "Another API."
- voiceover: ""
- duration: 3.5s
- poster: 2.6s
- transition_in: cut
- status: animated
- src: compositions/frames/01-cold-open.html
- type: hook
- persuasion: Pain validation (relatable everyday moment)
- beat: curiosity
- asset_candidates: assets/amigo-mascot.svg — Amigo, the guide
- on_screen: "Another API." → "Another wall of JSON."
- blueprint: typewriter-reveal (Adapt)
- focal: assets/amigo-mascot.svg
- roles: amigo-mascot = cutout (the guide)
- sfx: soft pop on the landing, typewriter ticks

Adapt: keep the typed line and its in-place correction; the brand payoff is deferred to 07, so Amigo's lean replaces the logo pop.
Scene 1 (0.0–1.0s): empty paper with a faint ink floor line. On beat 1 Amigo hops in from off-left along an arc (stretch on take-off), lands at left-third on beat 2 (0.5s) with a squash, and settles. Asymmetric 30/70, Amigo ~30% of frame height. → spring-pop-entrance (squash settle)
Scene 2 (1.0–2.0s): a caret appears right of Amigo; "Another API." types in the display role at the h3 size, upper-right of centre. Amigo leans toward it, rotating around the feet. → discrete-text-sequence + context-sensitive-cursor
Scene 3 (2.0–2.6s): on beat 5 a strike line draws through "Another API." and it shrinks up to muted.
Scene 4 (2.6–3.5s): "Another wall / of JSON." types on two lines at the h1 size. The caret holds; Amigo holds the lean. A held read into the zoom-through.

narrativeRole: Opens on the viewer's own routine — one more endpoint to read — with Amigo as the friendly guide who's been there.
keyMessage: You've been here before.

## Frame 2 — The wall of JSON

- scene: The dark JSON panel from the landing hero fills the frame and scrolls fast — braces, keys, nested arrays blur past. Amigo peeks in from the bottom edge, tilts back as the wall towers over them.
- voiceover: ""
- duration: 3s
- poster: 1.8s
- transition_in: zoom-through
- status: animated
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

## Frame 3 — Paste it in

- scene: Imago's GET bar slides up centred. A pokeapi URL types into it in JetBrains Mono. Amigo hops onto the ink → button and presses it with a squash — the headline lands above: "Paste an API. Get its interface."
- voiceover: ""
- duration: 4s
- poster: 3.2s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/03-paste.html
- type: product_intro
- persuasion: Friction reduction (one field, one press)
- beat: relief
- asset_candidates: assets/imago-mark.svg — mark beside the input; assets/amigo-mascot.svg — Amigo presses the button
- on_screen: "GET https://pokeapi.co/api/v2/pokemon/pikachu" · "Paste an API. Get its interface."
- blueprint: prompt-type-submit-generate (Adapt)
- focal: Imago GET bar (rebuilt from the captured landing/app input)
- roles: assets/amigo-mascot.svg = cutout (presser); assets/imago-mark.svg = unused here (the logo is held back for 07)
- sfx: key ticks, a click/press thunk on the button, a bright shimmer on submit

Adapt: keep "type into the real input, then submit" as the signature; the submit is Amigo physically pressing the → button, and the answer arrives in 04.
Scene 1 (0.0–0.8s): paper ground. The GET bar (white card, sink GET chip, mono URL field, ink square → button) rises from below to centre-low (~58% width) and settles. Centred, 1 depth layer plus the card shadow.
Scene 2 (0.8–2.2s): "https://pokeapi.co/api/v2/pokemon/pikachu" types into the field in mono with a caret. Meanwhile on beat 2 (1.0s) the headline line 1 "Paste an API." builds above in the display role, h1 size, centred. → discrete-text-sequence
Scene 3 (2.2–3.0s): Amigo hops in from the right edge along an arc and lands standing on top of the → button on beat 5 (2.5s).
Scene 4 (3.0–4.0s): beat 7 (3.0s): Amigo squashes down hard and the button dips with it (press), then both spring back and the button flashes paper-white for one beat. On the same beat line 2 "Get its interface." lands. Held read. → press-release-spring

narrativeRole: The bridge — the whole product in one gesture; the value claim lands here (beat 3 is the first beat after the hook pair).
keyMessage: One URL is all it takes.

## Frame 4 — JSON becomes Pikachu

- scene: The JSON panel sits left; on the beat its lines lift out and fly right, snapping into the Pikachu card — "Pikachu" title, 112 base experience counts up, stat bars fill one after another, "electric" type chip pops. Amigo bounces once on top of the card as it settles.
- voiceover: ""
- duration: 4.5s
- poster: 3.6s
- transition_in: crossfade
- status: animated
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

## Frame 5 — Whatever it returns

- scene: Amigo stays pinned bottom-left, hopping on each beat, while the card beside them hard-swaps: Pikachu profile → Chennai weather (30.5°C, humidity 72%, the temperature line draws) → Open Library "dune" (48,232 found, book rows cascade). Label under Amigo swaps with it: Pokémon / Weather / Library.
- voiceover: ""
- duration: 4.5s
- poster: 3.4s
- transition_in: push-slide LEFT
- status: animated
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

## Frame 6 — Three promises

- scene: Kinetic-type triptych on paper, one statement per beat, each sealed by the real product pill it names. (1) "The model never writes HTML." — a JSON plan chip {"type":"stat"} snaps into a rendered stat. (2) "Remembers every shape." — schema hash a3f9c1e0 types, "From schema cache" pill pops. (3) "Watches it change." — a value flips 30.5 → 31.2, highlights amber, "Live · 24s" green and "Changed 3" amber pills pop. Amigo hops from pill to pill.
- voiceover: ""
- duration: 6s
- poster: 5.2s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/06-promises.html
- type: benefit_highlight
- persuasion: Value stacking + risk reversal (safe by design)
- beat: trust + confidence
- asset_candidates: assets/amigo-mascot.svg — hops between the pills
- on_screen: "The model never writes HTML." · "Remembers every shape." · "Watches it change."
- blueprint: kinetic-type-beats (Adapt)
- focal: the three statements, each sealed by its real product pill
- roles: assets/amigo-mascot.svg = supporting (hops pill to pill)
- sfx: a slam on each statement, pops on the pills, a bright chime when the value turns amber

Adapt: keep "a statement builds across full-screen beats onto a payoff". There are three statements, each followed by a proof prop; earlier statements shrink up to a muted stack instead of leaving, so the frame accumulates.
Scene 1 (0.0–1.8s): beat 1: "The model never writes HTML." lands centre-left (display, h1). Beat 3 (1.0s): below it, a mono chip {"type":"stat","field":"base_experience"} snaps and resolves into a rendered stat block "Base experience 112" (scale-swap). Amigo hops onto the chip. → kinetic-beat-slam + scale-swap-transition
Scene 2 (1.8–3.6s): on beat 4 (1.8s → snap to 2.0s) statement 1 shrinks up to muted at the top, and "Remembers every shape." lands. Beat 6 (2.5s): the mono hash "a3f9c1e0 { "temperature": "number" }" types in, then the pill "From schema cache" pops (white pill, 1px line). Amigo hops onto the pill.
Scene 3 (3.6–6.0s): beat 8 (4.0s): statement 2 joins the muted stack, and "Watches it change." lands large (display, the largest type in the film so far). Beat 9 (4.5s): a Temperature card shows 30.5°C. Beat 10 (5.0s): the value flips 30.5 → 31.2 (the old value strikes and shrinks left), the card border and fill turn `changed` amber, and a "CHANGED" tag pops. Beat 11 (5.5s): the pills "● Live · 24s" (live green) and "Changed 3" (changed amber) pop right; Amigo lands between them. Held read to the end.

narrativeRole: The three reasons to trust it — safe, cheap, live — straight from the landing's feature columns.
keyMessage: Safe, remembered, live.

## Frame 7 — APIs become interfaces

- scene: Amigo walks to centre-left and stops; the Imago Reveal mark assembles beside them (two field bars slide in and merge into the body, aperture opens), wordmark "Imago" types on, then "APIs become interfaces." lands large below; an ink pill "imago.onslate.in" pops, with a muted line "Free · runs in your browser · MIT". Amigo does one last hop and stays.
- voiceover: ""
- duration: 4.5s
- poster: 4s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/07-outro.html
- type: cta
- persuasion: Friction reduction (free, no account)
- beat: motivation
- asset_candidates: assets/imago-logo.svg — primary lockup; assets/imago-mark.svg — Reveal mark to assemble; assets/amigo-mascot.svg — Amigo beside the logo
- on_screen: "Imago" · "APIs become interfaces." · "imago.onslate.in" · "Free · runs in your browser · MIT"
- blueprint: logo-assemble-lockup (Reproduce)
- focal: the Imago Reveal mark + "Imago" wordmark (from assets/imago-mark.svg; the wordmark is live Inter 600 text per brand)
- roles: assets/imago-logo.svg = reference for the lockup proportions; assets/imago-mark.svg = cutout (assembled from its three parts); assets/amigo-mascot.svg = supporting, and SMALLER than the mark
- sfx: two soft clicks as the field bars merge, a warm resolve chord/whoosh on the tagline, silence on the hold

Reproduce: the mark comes to exist from its parts and resolves into a centred lockup extended to URL + CTA. The signature is the two field bars sliding in and merging into the body as the aperture opens.
Scene 1 (0.0–1.0s): paper ground. Amigo walks in from the left with three small hops and stops left of centre, smaller than the mark will be (~0.8× the mark height).
Scene 2 (1.0–2.0s): beat 3: the mark's two rounded field bars slide in from the left and merge into the body; the aperture opens (the knock-out scales from 0). Beat 4 (1.5s): "Imago" types on right of the mark (Inter 600, −0.025em). The lockup sits centred in the upper-middle band.
Scene 3 (2.0–3.3s): beat 5: "APIs become interfaces." builds word-by-word below (display, h1, centred). Beat 7 (3.0s): the ink pill "imago.onslate.in" (mono) pops, and "Free · runs in your browser · MIT" fades up under it in muted. → dynamic-content-sequencing + spring-pop-entrance (smooth settle)
Scene 4 (3.3–4.5s): beat 7.5: Amigo does one last small hop and settles. **Held frame from 3.3s to the end:** nothing moves (subtle jitter at most). Music fades out over the last 1.5s of the film. This is the film's only real exit: it ends on the hold.

narrativeRole: Names the product and gives the one action — open the URL.
keyMessage: Try it now, free.
