# Paper Machine — the Imago launch, told in 3D

The launch video (and its rebuild in `../a-rebuild`) tells the story in flat, UI-accurate
frames. This take keeps everything the brand owns — paper and ink, amber only for
*changed* and green only for *live*, Inter Display / JetBrains Mono, the 128 bpm track, Amigo —
and changes the medium: the story happens on a lit paper table, where the data is a
physical thing you can watch pile up and then be put in order.

## The idea

**JSON is stuff. Imago puts it in order.** Instead of scrolling a document, the raw
response *falls* on Amigo as thousands of real glyphs. The press doesn't open a page;
it makes the pile levitate and sort itself into a clean, readable page — the moment
Imago "reads the shape". On the drop, that order turns into interfaces: real app
cards rise out of the table, one per beat.

## Beats (bars of 1.875 s)

| Time | What happens |
|---|---|
| 0–3.75 | Amigo grooves on the table. *"Every API answers in JSON."* The first glyphs start to rain. |
| 3.75–7.5 | The camera cranes up: the rain becomes a pile around Amigo, who dodges, spins and shivers. *"15,411 lines of it."* |
| 7.5–11.25 | The GET bar slides in; the Pikachu URL types. Amigo hops on the button and charges on every eighth note. *"Paste it. Press it."* |
| 11.25–15 | Launch. The pile lifts and flies into a page, line by line, seen from overhead; Amigo lands on the finished page. *"Imago reads the shape."* |
| 15–22.5 | **Drop.** The glyphs sink into the table; eight real interfaces rise in an arc, one per beat, while the camera orbits. *"Whatever it returns."* Amigo spins on bar 10. |
| 22.5–26.25 | The Forecast card comes forward: the Live pill lights green, the temperature washes amber on two beats (with chimes), Amigo jolts. *"Watches it change."* |
| 26.25–30 | The cards topple flat, one per eighth; the Imago mark's field bars slide in and merge, *"Imago"*, *"APIs become interfaces."*, `imago.onslate.in`. Hold. |

## How it's built (all editable)

- `build.py` writes `imago-paper-machine.blend`; render the scene "Paper Machine".
- **Glyph Field** (Geometry Nodes on "Glyphs: keys" / "Glyphs: values"): one procedural
  system driven by the scene clock. Its modifier inputs are the choreography —
  *Rain Start/End, Drop Height, Pile Radius, Sort Start/Spread, Page Origin/Scale,
  Exit Start*. Keys and values are two layers of the same page so the syntax colours
  stay put.
- Amigo is a real solid (the SVG body and legs, extruded and bevelled) on a three-level
  rig: `Amigo` (where) → `Amigo lean` (rotation about the feet) → `Amigo squash`.
- Cards are bevelled slabs with the real app screenshots; the camera is keyframed
  with a `Camera aim` empty (Track To + depth of field).
- EEVEE with ray-traced shadows and GI, motion blur on; the world shows paper to the
  camera and a dimmer sky to the lighting.

## Honest notes

- The type standing in 3D is lit, so it reads as ink on paper rather than flat #1B1B19.
- The glyph count (64 real lines of the Pikachu response) is chosen for legibility of
  the sorted page; the "15,411 lines" claim is the real number from the API.
