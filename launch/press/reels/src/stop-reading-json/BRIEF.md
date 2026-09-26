---
workflow: general-video
flow: automation
storyboard: no
message: "Stop reading raw JSON. Paste the URL, get a page."
destination: social-vertical
aspect: 1080x1920
language: en
length: 16s
---

## Intent

Hero short-form social reel (Reels/Shorts/TikTok), replacing paste-to-page. Hook in the first 1.5 s over a fast wall of Pikachu's real JSON, then typing the URL, riser, beat drop on the page reveal, punch-ins, four more APIs on the beat, Amigo, end card.

## Assets

- Real Imago captures from https://imago.onslate.in/#app at 432x768 CSS, 3x (capture/capture.mjs, capture/strip.mjs): the raw Response pane (1,500 lines shown, "… 14008 more lines"), the bar typed character by character, the Pikachu page, Open Library, Open-Meteo, Thirukkural, ISS.
- Music: "Fireworks" by Alexander Nakarada (FreePD, CC0). SFX: Pixabay Content License (bundled with media-use). See launch/press/reels/AUDIO-CREDITS.md.

## Notes

- Brand: ink #1b1b19, paper #f6f5f1. No amber (nothing "changed" here), no green. Inter Display SemiBold captions, JetBrains Mono for code.
- The Open-Meteo clip carries "Weather data by Open-Meteo.com".
- index.html is generated: edit index.template, then `python3 build.py`.
