# Amigo rig v2 — expressions (user-directed, 2026-09-26)

The user asked for more emotion than hopping: "only jumping can't show emotions… maybe shrink its eye or something. Do something more." So Amigo's aperture (the rounded-rect knock-out in the body) now works as its single eye/visor. It is still no mouth, no arms, no added features; the aperture itself changes shape and position.

## Markup (replace the old single evenodd body path)
Build Amigo as one inline SVG, viewBox "0 0 32 32", fill currentColor, with:
- `<g class="…-legL">` rect x=9 y=21.5 w=6 h=8.5 rx=3  and `<g class="…-legR">` rect x=17 y=21.5 w=6 h=8.5 rx=3 (legs are separate groups so they can move).
- Body = the OUTER shape only: `M13 3h6c4.4 0 7 2.9 7 7.3v9c0 4.2-2.7 6.7-6.9 6.7h-6.2C8.7 26 6 23.5 6 19.3v-9C6 5.9 8.6 3 13 3Z`, masked by an SVG `<mask>` (maskUnits="userSpaceOnUse", x=0 y=0 w=32 h=32): a white full rect plus a BLACK rounded rect = the aperture, x=10.9 y=9 width=10.2 height=5.3 rx=2.3 (this matches the original knock-out exactly at rest). Give that black rect an id so GSAP can tween it. The aperture therefore always shows what is behind Amigo (cards, JSON, paper), exactly like the original.
- Mask ids must be unique per frame (prefix with the frame's id prefix, e.g. f03-ap-mask).

## Aperture states (tween the black rect's attributes x/y/width/height/rx with GSAP `attr:`; keep the centre sensible; rest centre = (16, 11.65))
- rest: x 10.9 y 9 w 10.2 h 5.3 rx 2.3
- blink: h → 0.6 (centre kept: y ≈ 11.35) for ~0.08s, back to rest over ~0.1s
- squint / happy / determined: h 2.0, rx 1.0 (y ≈ 10.65)
- wide / surprised: w 11.6 h 7.6 rx 3.2 (x ≈ 10.2, y ≈ 7.85)
- scared / tiny: w 4.2 h 2.8 rx 1.4 (x ≈ 13.9, y ≈ 10.25)
- shut (impact): h 0.5
- gaze: shift x by up to ±2.2 and y by up to ±1.4 from the current state (look left/right/up/down at a target); combine with any state
- dazed: alternate gaze left/right with small amplitude while slightly tiny
Transitions between states ~0.08–0.18s, power2 in/out; blinks and snaps are fast. Never distort the BODY to express emotion beyond the existing squash/stretch; the eye and body language carry it.

## Body language (use alongside the face; hops are only one move among many)
lean toward/away (rotation about the feet), slump (scaleY 0.92 + slight forward tilt, held briefly), tremble (small deterministic x jitter), perk up (quick stretch 1.06 then settle), wobble (damped rotation ±8°), shrink back (translate away + scared eye), puff up (proud: scale 1.05 uniform, squint).
IMPORTANT: every held pose returns to true proportions (scaleX = scaleY = 1) within ~0.25s; the user dislikes held deformation (no leg spreading, no lingering non-uniform scale).

## Blink rhythm
Idle Amigo blinks now and then (about every 1.2–2s, deterministic times) so it feels alive even when not moving.
