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
- **Amigo character bible (personality is motion only; no face, eyes, arms, speech bubbles or props attached to the body; the aperture never animates like an eye):**
  - *Groove:* whenever idle, Amigo bobs on every beat (a small squash on the kick, anchored at the feet) and side-steps on the off-beats. It is never dead still until the final hold.
  - *Moves:* hop (stretch → arc → squash → settle); spin (a full rotation in the air around its centre on a big hop); pancake (squashed flat to 25% height by an impact, then pops back up with overshoot); shiver (fast deterministic x-jitter shaking off debris); double-take (lean away, snap back, lean away further); charge-up (squashes lower on each eighth-note, then launches); surf (rides a moving card, leaning into the motion); stamp (drops hard from above onto a target and the target dips); peek (half hidden behind a card edge, then pops out); tumble (a sideways roll when knocked).
  - *Spirit:* curious, cheeky, a bit of a show-off. It reacts to every event on screen: the JSON flood, the button, the drop, a value changing.
  - Overshoot and squash are allowed on Amigo's body only; UI and type keep long-tail power3/expo settles.
- **Palette/type:** unchanged from frame.md: paper ground, ink everything, white cards with the brand shadow; amber = changed and green = live, only where they mean that. Display = Inter Display 600 (−0.035em), labels = Inter, mono = JetBrains Mono for URLs, JSON and hashes.
- **Real screenshots:** `assets/app-*.png` are the real current app. Present them as floating app windows (white card, 14px radius, brand shadow, slight 3D tilt allowed), never full-bleed flat, never with fake browser chrome. Crop to the content region (skip the sidebar) where the beat needs the interface big.
- **Density:** every frame carries at least 3 beat-timed events. No frame holds still for more than 1 beat except the final 0.9s.
- **Negative list:** slideshow (dump then freeze), screensaver drift, lazy breathing loops, a slow back-half pan/push, `repeat`/`yoyo`, `Math.random` (use index-derived pseudo-random), CSS transitions/keyframes, glow, gradients, purple, rainbow stat bars, faces on Amigo.


## Worker notes (all frames)

- Fonts are staged in assets/fonts/: Inter-Regular/Medium/SemiBold.otf, InterDisplay-Medium/SemiBold.otf, JetBrainsMono-Regular/Medium.ttf. Use project-root paths (assets/fonts/...).
- Amigo SVG: inline the three shapes from assets/amigo-mascot.svg (viewBox 0 0 32 32: two leg rects plus the body path with its aperture knock-out), filled with currentColor. Squash/stretch is scaleX/scaleY with the transform-origin at the feet (50% 100% of the figure's box).
- Real app screenshots are 2400×1500 PNGs of a 1600×1000 viewport. The left sidebar takes about the first 13.5% of the width (≈325px of 2400) and the top bar about the first 5.5% of the height (≈85px of 1500); the interface content sits right of and below those; crop with object-position or a wrapper with overflow:hidden when the beat needs the interface large.
- Ids must start with a letter (e.g. f05-card-1), never a digit, so selectors stay valid and lint stays clean.
- Deterministic only: any "random" scatter derives from the element index (e.g. sin(i*12.9898)*43758 frac).
- Keep total runtime exactly the frame's duration; the frame's exit is the harness transition (hard cut for most frames).
