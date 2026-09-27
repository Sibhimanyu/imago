# Imago launch — Blender

Two Blender films of the Imago launch, both rendered straight from their `.blend`.

| | File | Render |
|---|---|---|
| **A — Rebuild** | `a-rebuild/imago-launch-a.blend` | `a-rebuild/renders/imago-launch-a.mp4` (render the scene "Imago Launch") |
| **B — Paper Machine** | `b-new-take/imago-paper-machine.blend` | `b-new-take/renders/imago-paper-machine.mp4` (render the scene "Paper Machine") |

Render from the command line: `blender -b <file.blend> -a`, or open the file and press
Ctrl+F12. Renders are not committed (see `.gitignore`); each takes ~5–12 minutes.

## A — the rebuild

A frame-accurate, editable copy of `../imago-launch` (the HyperFrames/GSAP video):
nine scenes, each its own Blender scene (like After Effects precomps), laid out on the
master scene's Video Sequencer with the push / zoom-through transitions, the music
and all 25 sound effects.

- Every HTML element is an Empty named after its id; what it draws hangs under it.
- Every GSAP tween became two keyframes with the matching Blender easing, checked
  against the browser frame by frame (the few that couldn't match are baked).
- Rounded rects, shapes, strokes and live text (typing, counters, syntax-coloured
  rows) are Geometry Nodes objects: edit sizes and strings in the modifier panel.
- Object colour is the fill; the `opacity` custom property on the empties is CSS opacity.

Rebuild it from the source video: `tools/probe-all.sh` (headless Chromium dumps each
scene) then `blender -b --factory-startup -P a-rebuild/build.py`.
QA: `tools/qa.sh a-rebuild/imago-launch-a.blend <out> <seconds...>` renders frames next
to the original.

## B — Paper Machine

A new take in the same brand, in real 3D. See `b-new-take/CONCEPT.md`.
Rebuild: `blender -b --factory-startup -P b-new-take/build.py`.
