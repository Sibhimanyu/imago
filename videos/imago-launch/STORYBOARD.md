---
format: 1920x1080
duration: 30s
message: "Paste an API, get the interface its data deserves."
arc: BAB on the music — intro groove (the pain) → filter build (paste) → breakdown (it reads the shape) → DROP (every API becomes an interface) → proof run → sting
audience: developers who poke at APIs
mode: collaborative
music: upbeat electronic festival drop, high-energy hip-hop fusion, driving bass, 128 bpm
---

## Decisions

- **Spine:** Amigo, who is in every beat (paper-white on the dark frame 02) and ends beside the logo. Hero prop: the pikachu response (15,411 lines of JSON in 02, pasted in 03, read as a shape in 04, the first card of the drop in 05).
- **Direction:** every seam flows leftward.
- **Held frame:** the last ~0.45s of frame 09 (the sting). Amigo turns into the logo there, so the end card has no mascot beside the logo.
- **Bans:** no face, arms or speech bubbles on Amigo · no brand hue or gradient · no glow · no rainbow stat bars · colour only for changed/live · no slideshow cards · no screensaver drift.
- **Truthfulness:** every number on screen comes from real Imago output (pokeapi pikachu = 15,411 pretty-printed lines; the 8 app captures; schema id sch_1t1u1v1 from the real Inspect panel). The UI is rebuilt in the current landing-hero style from the captured site. The one depicted change in 07 (30.1 → 30.4 °C) is illustrative: it demonstrates the watch feature and is not a recorded reading.
- **Sketch sheet:** v1 only (storyboard.html v1.1); v2 has none (design-review: Amigo smaller than the logo in 07, in-frame labels ≥1.4cqw, sketch notes moved out of frames)

## Video direction (v2)

- **Why v2:** the user found v1 boring. They asked for better music, more character for Amigo, and more content in the same 30s. v2 cuts every 1–2 bars, lands a hit on every beat, carries real app screenshots, and gives Amigo a personality.
- **Music map (assets/bgm/track.mp3, 128 bpm):** beat = 0.469s, bar = 1.875s, grid origin 0.01s.
  - 0–7.5s: four-on-the-floor groove.
  - 7.5–11.25s: filter-down build.
  - 11.25–14.8s: breakdown (quiet, techy).
  - 14.8–15.0s: silence dip.
  - **15.0s: DROP**, full energy to 28.1s.
  - 28.1–30s: tail fade.
  - Frame boundaries sit on bar lines. Inside a frame, beat n (frame-local) = n × 0.469s. Every hit, swap, slam and Amigo landing sits on a beat or half-beat (0.234s).
- **Amigo expressions (user-directed 2026-09-26, overriding the brand doc's no-expression rule for this film):** the aperture works as Amigo's single eye: wide, tiny, squint, blink, shut, gaze. The rig is in `.hyperframes/amigo-rig.md`. Hops are one move among many, emotion carries each beat, and held poses always return to true proportions. The film ends with Amigo flying into the end card and lying down to become the Imago mark (legs → field bars, aperture → window).
- **Amigo character bible (still no mouth, arms, speech bubbles or props):**
  - *Groove:* whenever idle, Amigo bobs on every beat (a small squash on the kick, anchored at the feet) and side-steps on the off-beats. It is never dead still until the final hold.
  - *Moves:* hop (stretch → arc → squash → settle); spin (a full rotation in the air around its centre on a big hop); pancake (squashed flat to 25% height by an impact, then pops back up with overshoot); shiver (fast deterministic x-jitter shaking off debris); double-take (lean away, snap back, lean away further); charge-up (squashes lower on each eighth-note, then launches); surf (rides a moving card, leaning into the motion); stamp (drops hard from above onto a target and the target dips); peek (half hidden behind a card edge, then pops out); tumble (a sideways roll when knocked).
  - *Spirit:* curious, cheeky, a bit of a show-off. It reacts to every event on screen: the JSON flood, the button, the drop, a value changing.
  - Overshoot and squash are allowed on Amigo's body only; UI and type keep long-tail power3/expo settles.
- **Palette/type:** unchanged from frame.md: paper ground, ink everything, white cards with the brand shadow; amber = changed and green = live, only where they mean that. Display = Inter Display 600 (−0.035em), labels = Inter, mono = JetBrains Mono for URLs, JSON and hashes.
- **Real screenshots:** `assets/app-*.png` are the real current app. Present them as floating app windows (white card, 14px radius, brand shadow, slight 3D tilt allowed), never full-bleed flat, never with fake browser chrome. Crop to the content region (skip the sidebar) where the beat needs the interface big.
- **Density:** every frame carries at least 3 beat-timed events. No frame holds still for more than 1 beat except the final 0.9s.
- **Negative list:** slideshow (dump then freeze), screensaver drift, lazy breathing loops, a slow back-half pan/push, `repeat`/`yoyo`, `Math.random` (use index-derived pseudo-random), CSS transitions/keyframes, glow, gradients, purple, rainbow stat bars, faces on Amigo.

## Locked

- v1 (storyboard.html v1.1, 7 frames) was built and reviewed; the user said it was "very boring" and asked for better music, more mascot character and more content in 30s. v1 is archived in v1/. v2 below replaces the frame list and skips the sketch pass at the user's direction (build straight to preview).

## Frame 1 — Amigo grooves, then gets hit

- scene: Amigo dances on the groove on empty paper. "Another API?" pops beside it, and a giant JSON brace "{" drops from the top and pancakes it.
- voiceover: ""
- duration: 3.75s
- poster: 3.2s
- transition_in: cut
- status: animated
- src: compositions/frames/01-groove.html
- type: hook
- persuasion: Pattern interrupt (playful setup, then an impact)
- beat: delight → surprise
- asset_candidates: assets/amigo-mascot.svg — Amigo
- blueprint: compose
- focal: assets/amigo-mascot.svg
- roles: amigo-mascot = cutout (hero)
- sfx: kick-synced soft pops on each bob, a cartoon whoosh on the fall, a heavy thud + squish on the pancake

Scene 1 (0.0–1.875s, bar 1): paper ground with an ink floor line. Amigo is centre-left, big (~42% of frame height), already grooving: a squash-bob on every beat, a side-step on the off-beats, and a spin on a big hop on beat 3 (0.94s) that lands on beat 4. → spring-pop-entrance
Scene 2 (1.875–2.81s): on beat 5, "Another" slams in right of Amigo (display h1); on beat 6, "API?" slams under it. Amigo does a double-take toward the words (lean away, snap back, lean away). → kinetic-beat-slam
Scene 3 (2.81–3.75s): on beat 7 a huge ink "{" (JetBrains Mono, taller than Amigo) drops from above the frame on a fast expo-in and hits Amigo on beat 8 (3.28s). Amigo pancakes to 25% height, the floor dips, and the words jolt. Hold that impact pose until the cut.

narrativeRole: Instant personality, then the pain lands physically.
keyMessage: APIs keep landing on you.

## Frame 2 — Amigo falls through 15,411 lines

- scene: (v2b rebuild; the user rejected the text-pile version as "horrible… scripted and structured") One clean, legible editor sheet of the real pikachu JSON in gentle 3D perspective, with a line-number gutter. It scrolls like a runaway document from line 1 to the real last line 15,411 while Amigo tumbles down it and lands on the final "}". "Readable? Barely."
- voiceover: ""
- duration: 3.75s
- poster: 3.5s
- transition_in: cut
- status: animated
- src: compositions/frames/02-avalanche.html
- type: pain_point
- persuasion: Pain agitation with a real number (Statistical proof)
- beat: overwhelm → comic defiance
- asset_candidates: assets/amigo-mascot.svg — Amigo tumbling down the document
- blueprint: compose
- sfx: a rushing paper/data cascade, a counter tick-roll, a pop as Amigo bursts out, a quick shake rattle

Scene 1 (0.0–0.47s): the sheet at line 1 ("{", "id": 25, "name": "pikachu" …), readable. Amigo, pancaked from frame 01, pops back to full height on the top edge.
Scene 2 (0.47–2.34s): the scroll accelerates into a motion-blurred rush through the real mid-file lines; the gutter's line number, enlarged, races through the thousands. Amigo loses its footing and tumbles.
Scene 3 (2.34–2.81s): a hard brake onto the real ending, lines 15407–15411 (… "past_types": [] / "}"). Amigo lands on the final "}" with a squash and a dizzy wobble.
Scene 4 (2.81–3.75s): "Readable?" (beat 7) and "Barely." (beat 8) slam in on the right. Amigo leans toward them, skeptical.

narrativeRole: Makes the pain huge and real (the actual line count), and Amigo survives it.
keyMessage: Raw responses aren't made for people.

## Frame 3 — Paste it. Press it.

- scene: Imago's real GET bar whips in. The pikachu URL types at speed while Amigo slides in on its belly, charges up on the → button with the filter build, and launches.
- voiceover: ""
- duration: 3.75s
- poster: 3.0s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/03-paste.html
- type: product_intro
- persuasion: Friction reduction (one field, one press)
- beat: anticipation
- asset_candidates: assets/app-landing.png — reference for the real URL input styling; assets/amigo-mascot.svg — Amigo
- blueprint: prompt-type-submit-generate (Adapt)
- focal: the GET bar (rebuilt, matching app-landing.png's input: white field, ink square → button)
- roles: app-landing = reference only; amigo-mascot = cutout
- sfx: key ticks, a slide whoosh, rising charge ticks on each eighth, a big launch boing + click

Adapt: the submit is Amigo's charge-and-launch, and the answer arrives across 04–05.
Scene 1 (0.0–0.94s): paper ground. The GET bar (GET chip · mono URL field · ink → button) slams in centred from the right edge. On beat 1 the headline "Paste any GET endpoint." builds word-by-word above it on beats 1–2 (display h2). → discrete-text-sequence
Scene 2 (0.94–1.875s): "https://pokeapi.co/api/v2/pokemon/pikachu" types very fast (about 3 characters per frame-tick, a caret riding the end). At the same time Amigo belly-slides in from the left along the top edge of the bar, tilted forward, and pops upright onto the → button on beat 4.
Scene 3 (1.875–3.28s): charge-up. On each eighth-note Amigo squashes a bit lower and the button dips with it (7 steps, 0.234s apart), tracking the music's build.
Scene 4 (3.28–3.75s): beat 8: release. Amigo launches straight up out of frame with a big stretch, and the button springs back and flashes. "Press." lands on the right in the display role as a one-word slam. → press-release-spring

narrativeRole: The whole product is one field and one press, and Amigo turns the press into a launch.
keyMessage: Paste any GET endpoint.

## Frame 4 — Different data. Same shape. One design.

- scene: (rebuilt; the user rejected the schema-id chip as "a random code type thing") Real Pikachu and Charizard JSON cards side by side; the values flip to their types, the two skeletons lock together, and they become one interface layout. "Different data." → "Same shape." → "One design." plus "Two responses. No second model call."
- voiceover: ""
- duration: 3.75s
- poster: 3.4s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/04-shape.html
- type: feature_showcase
- persuasion: Mechanism reveal, using the landing page's own claim ("Two responses with the same structure share one design")
- beat: intrigue → clarity
- asset_candidates: assets/amigo-mascot.svg — Amigo comparing the two cards
- blueprint: compose
- sfx: a whoosh-through, soft digital blips per type swap, a rising riser into a hard silence at 3.55s

narrativeRole: Shows the clever part (structure, not values) in the calm before the drop.
keyMessage: Same shape, same design, no second model call.

## Frame 5 — THE DROP: every API gets an interface

- scene: On the drop, eight real Imago interfaces slam in one per beat as floating app windows stacking into a deck: Pikachu, Forecast, Frankfurter, Openlibrary, Thirukkural, Wikipedia, Sunrise sunset, Charizard. Amigo surfs the deck. "Whatever it returns." is pinned.
- voiceover: ""
- duration: 3.75s
- poster: 3.5s
- transition_in: cut
- status: animated
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

## Frame 6 — Plans, never HTML. Key or no key.

- scene: Left, a mono UI plan types in. Right, Amigo stamps each planned component into a live card. "The model sends a plan. Never HTML." Then provider chips Gemini · Groq · Ollama · no key pop, with the app's real line "No Google Gemini key, so this is the basic layout."
- voiceover: ""
- duration: 3.75s
- poster: 3.4s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/06-plan.html
- type: benefit_highlight
- persuasion: Risk reversal (safe by construction) + Friction reduction (works with no key)
- beat: trust + relief
- asset_candidates: assets/amigo-mascot.svg — Amigo the stamper; assets/app-charizard.png — reference for the rendered stat card look
- blueprint: panel-edit-live-sync (Adapt)
- focal: plan → rendered component coupling
- roles: amigo-mascot = cutout; app-charizard = reference only
- sfx: typing ticks, a heavy stamp thunk per component, pops for the chips

Adapt: keep the bipartite stage (panel bound to a surface, the surface updating in the same beat); the "control" is the plan being typed, and Amigo's stamp is the coupling.
Scene 1 (0.0–1.875s): split 45/55 on paper. Left, a dark ink panel types a real-shaped plan in mono: {"layout":"profile","title":"name", "components":[{"type":"stat","field":"base_experience"}, {"type":"bars","field":"stats"}, {"type":"badges","field":"types"}]}. The first component line types on beat 1, the second on beat 2, the third on beat 3. On beats 2, 3 and 4, Amigo stamps down hard onto the right side, and each stamp leaves the matching live component on a white card: Base experience 240, the stat bars (ink, Charizard's real stats), and the fire / flying chips. Headline across the top on beats 1–2: "The model sends a plan." then "Never HTML." (ink, h2). → discrete-text-sequence
Scene 2 (1.875–3.75s): beat 5: the headline swaps (waterfall cut) to "No AI? It still works." Beat 6: four pills pop in a row: "Gemini" · "Groq" · "Ollama" · "No AI". Amigo hops along them, one per beat 6–8, landing on "No AI" on beat 8. Beat 7: the app's real muted line types under the card: "No Google Gemini key, so this is the basic layout."

narrativeRole: Two trust reasons at speed: safe output, and it works even without a key.
keyMessage: Safe by design, and no key required.

## Frame 7 — Watches it change

- scene: The real Forecast window (app-watch.png). The Watch switch flips on, the "Live · 27s" pill counts, and values tick: 30.1 → 30.4 turns amber "CHANGED", "Changed 1 → 3". Amigo sits on the Live pill and jolts at each change.
- voiceover: ""
- duration: 3.75s
- poster: 3.3s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/07-watch.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: control
- asset_candidates: assets/app-watch.png — real Forecast with Watch ON and the Live · 27s pill; assets/app-weather.png — the same Forecast before Watch
- blueprint: device-surface-showcase (Adapt)
- focal: assets/app-watch.png as a floating window
- roles: app-watch = focal (floating window, pushed in to the top-right controls region then pulled back); app-weather = supporting (the before state); amigo-mascot = cutout
- sfx: a switch click, a soft tick per second of the counter, a bright chime on each change

Adapt: a floating window hero whose state changes; the change overlays are rebuilt DOM on top of the real screenshot at measured positions (the rest of the window stays the real capture).
Scene 1 (0.0–0.94s): the Forecast window (app-weather.png) slides in as a floating tilted window and settles flat. Headline "Watches it change." builds top-left (h2).
Scene 2 (0.94–1.875s): a quick zoom-to-target onto the Watch switch area. On beat 3 the window crossfades to app-watch.png (switch ON, "30s", "Live · 27s" green pill). Amigo drops onto the Live pill and bobs. → coordinate-target-zoom
Scene 3 (1.875–3.28s): pull back to the whole window. On beat 5 an overlay on the Temperature value flips 30.1 → 30.4 and its block tints amber with a "CHANGED" tag. On beat 6 the humidity overlay flips 67 → 66 amber. On beat 7 a "Changed 3" amber pill pops next to Live. Amigo jolts (a mini hop plus shiver) on each change. Muted chips "10s · 30s · 60s" pop under the headline on beat 6.
Scene 4 (3.28–3.75s): beat 8: Amigo does a proud spin-hop on the pill and lands. Hold.

narrativeRole: The live superpower, proved on the real UI.
keyMessage: It watches your endpoints and marks what moved.

## Frame 8 — Four facts, four beats

- scene: Four full-screen word slams, one per beat, with Amigo hopping onto each: "Runs in your browser." · "No account." · "Open source." · "Free."
- voiceover: ""
- duration: 1.875s
- poster: 1.6s
- transition_in: cut
- status: animated
- src: compositions/frames/08-facts.html
- type: benefit_highlight
- persuasion: Friction reduction + value stacking (rule of four at speed)
- beat: confidence
- asset_candidates: assets/amigo-mascot.svg — Amigo
- blueprint: kinetic-type-beats (Reproduce)
- focal: the word slams
- roles: amigo-mascot = cutout
- sfx: a slam per beat (4), the last one bigger

Reproduce: a statement builds across full-screen beats, each its own move, onto a payoff.
Scene 1 (0.0–1.875s): four beats (0, 0.47, 0.94, 1.41s). Each phrase hard-cuts in centred (display h1, ink on paper, alternating a paper-on-ink inversion on beats 2 and 4 via the ground flipping). "Runs in your browser." → "No account." → "Open source." → "Free." Amigo lands under or on each phrase in a different pose: squash, spin, stamp, then a wide proud stance. → kinetic-beat-slam

narrativeRole: Removes the last objections in under two seconds.
keyMessage: Free, private, yours.

## Frame 9 — APIs become interfaces

- scene: The Imago Reveal mark assembles on the beat, "Imago" types, "APIs become interfaces." lands, the ink pill "imago.onslate.in" pops, It holds as the music tails out.
- voiceover: ""
- duration: 1.875s
- poster: 1.7s
- transition_in: cut
- status: animated
- src: compositions/frames/09-sting.html
- type: cta
- persuasion: Friction reduction (the one action)
- beat: motivation
- asset_candidates: assets/imago-mark.svg — the Reveal mark (assemble from its real parts); assets/imago-logo.svg — lockup reference; (Amigo removed from the end card at the user's request: logo and mascot looked odd together)
- blueprint: logo-assemble-lockup (Reproduce)
- focal: the Imago lockup
- roles: imago-mark = cutout; imago-logo = reference
- sfx: none (user: the end sound effect felt weird; the music tail carries the ending)

Reproduce: the mark comes to exist from its parts and resolves into a centred lockup plus URL.
Scene 1 (0.0–0.94s): beat 1: the two field bars slide in and merge into the body and the aperture opens. Beat 2: "Imago" types (Inter 600, live text).
Scene 2 (0.94–1.875s): beat 3: "APIs become interfaces." lands (display h1, centred below). Beat 3.5: the ink pill "imago.onslate.in" (mono) pops. **Held frame from ~1.0s to the end:** nothing moves. The music tails out.

narrativeRole: Name, promise, action.
keyMessage: Try it: imago.onslate.in.
