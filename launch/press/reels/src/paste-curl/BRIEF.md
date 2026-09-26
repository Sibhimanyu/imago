---
workflow: general-video
flow: automation
storyboard: no
message: "Copied as cURL? Paste it into Imago: headers picked up, Basic auth too, straight to a page."
destination: social-vertical
aspect: 1080x1920
language: en
length: 14s
---

## Intent

Short-form social reel (Reels/Shorts/TikTok). Hook in the first 1.5 s, cuts on the beat of a CC0 track, SFX on every action, kinetic captions readable muted. Replaces nothing; new reel alongside stop-reading-json.

## Assets

- Real Imago captures from https://imago.onslate.in/#app at 432x768 CSS, 3x (capture/capture.mjs): pasting `curl 'https://pokeapi.co/api/v2/pokemon/pikachu' -H 'Accept: application/json' -H 'X-Demo: imago'` and `curl 'https://httpbin.org/basic-auth/imago/demo' -u imago:demo`.
- The devtools network panel is a clean generic mock, labelled on screen as one.
- Music: "Favorite" by Alexander Nakarada (FreePD, CC0). SFX: Pixabay Content License (bundled with media-use). See launch/press/reels/AUDIO-CREDITS.md.

## Notes

- Brand: ink #1b1b19, paper #f6f5f1. No amber (nothing "changed" here), no green. Inter Display SemiBold captions, JetBrains Mono for code.
- Truth: every Imago frame is a real capture; Share-link claim matches the product ("never carries your headers or keys").
