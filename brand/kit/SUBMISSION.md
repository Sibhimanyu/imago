# Imago: branding and promotional design

Submission notes for the *Web App – Branding & Promotional Design* assignment.
The web app is **Imago** (<https://imago.onslate.in>): paste an API URL or a
curl command, and it reads the JSON's shape and draws a live interface for it.

The same story as a page, with the files and the versions they replaced:
<https://sibhimanyu.github.io/imago/brand/>

## What to submit

Three editable Illustrator files, one per task, in `brand/kit/`:

| Task | Editable file | Final exports (`brand/kit/exports/`) |
|---|---|---|
| 1. App logo | `imago-task1-logo.ai` | `imago-task1-logo_*.svg`, `imago-task1-logo.pdf`, `logo-*.png`; the book as `imago-brand-guidelines.pdf` and `guidelines/01–13.png`; the mascot as `imago-mascot_*.svg`, `amigo.png`, `amigo-resting.png` |
| 2. A4 promotional flyer | `imago-task2-flyer-a4.ai` | `imago-task2-flyer-a4-print.pdf` (print), `imago-task2-flyer-a4-preview.png` |
| 3. Blog banner | `imago-task3-blog-banner.ai` | `imago-task3-blog-banner.png`, `.jpg`, `@2x.png` |

**Tools used (for the form):** Adobe Illustrator and Claude. Photoshop was not
used: every piece is vector, and the few raster images (screenshots inside the
book) are exports of the vector files.

## Against the brief

### Task 1: App logo

| The brief asks for | What we have |
|---|---|
| An original logo that represents the app | The **Reveal** mark: two rounded bars (the keys and values an API sends back) join one body, and a window opens in it (the interface Imago finds in the data). "Data in. Interface out." |
| Made in Photoshop or Illustrator | Drawn in Illustrator from the mark's 32-unit geometry |
| Simple, recognisable, scalable | One flat shape, drawn on a 32-unit grid. The book sets minimum sizes (16 px for the bare mark; the app icon below 24 px) and shows the mark from 16 to 64 px |
| Suitable colours and typography | Ink `#1B1B19` and paper `#F6F5F1` only; amber is kept for one meaning, "this changed". Wordmark in Inter Display SemiBold, outlined so it never depends on the font |
| Final logo in editable vector format | `imago-task1-logo.ai` (all vectors), plus SVG and PDF exports |

The Task 1 file is a 13-page **brand book**, so the logo arrives with the
reasoning and the rules behind it:

- **Logo:** the master lockup (primary and reversed), the name, what the mark means, anatomy, construction and clear space, the four versions, misuse.
- **Mascot:** Meet Amigo (standing, and resting with Zs), Using Amigo (where it appears, where it never does, its rules).
- **System:** colour (HEX, RGB, CMYK), typography, voice and use.

The name: *imago* is Latin for image, and the final adult stage of an insect
after metamorphosis. Raw JSON goes in; its finished form comes out. Swap two
letters and it becomes *amigo*, Spanish for friend, which is the mascot.

### Task 2: A4 promotional flyer

| The brief asks for | What we have |
|---|---|
| Size: A4 | 595.28 × 841.89 pt, with bleed (the PDF's trim box is exactly A4) |
| Colour mode: CMYK | CMYK document, hand-set CMYK values; the print PDF contains no RGB |
| Purpose: print promotion | `imago-task2-flyer-a4-print.pdf`, PDF/X-4, with an 8 pt (about 2.8 mm) bleed |
| App logo and name | Top left |
| Short headline or tagline | "APIs become interfaces." |
| Key features or benefits | Three benefits, each a title and one line: *Reads the shape*, *Remembers it*, *Watches it change*; plus four plain facts (runs in your browser, keys stay on your device, works without a key, share any page as a link) |
| Suitable visuals or graphics | A real Open-Meteo weather response turning into the interface Imago draws from it, with a three-step "how it works" |
| Call to action | "Paste your first endpoint.", "Free. No account. Nothing to install.", the address `imago.onslate.in` and a scannable vector QR code (checked: it decodes to the live site) |

About 130 words. A skimmer gets the headline, the picture, the three benefit
titles and the call to action (about 15 words); a reader gets the rest.

### Task 3: Blog banner

| The brief asks for | What we have |
|---|---|
| Size: 1200 × 700 px | 1200 × 700 (plus a 2400 × 1400 `@2x`) |
| Colour mode: RGB | RGB document and exports |
| App identity | The logo, top left, and the address, bottom left |
| A suitable headline | "Introducing Imago", then "APIs become interfaces." and one line |
| Relevant visuals | Two fields of a weather response and the value they become, with amber on what changed since the last fetch |
| The same style as the logo and flyer | The same ink and paper, amber meaning, type and hero idea |

It is designed as a blog banner, not a copy of the website's hero: the header
and share image of a launch post, often seen 300 to 500 px wide in a feed. So
it has a few big words, one idea drawn large enough to read at that size, and
nothing that looks clickable. Every element was checked at 400 px wide.

### A connected visual identity

All three pieces use the same palette, type, mark geometry and one idea: a raw
API response becoming a readable interface, with amber marking only what
changed. They are built by the same Illustrator scripts (`brand/kit/scripts/`)
from one shared library, so a colour or a mark change reaches every piece.

## Process: decisions and what changed after review

The brief asks not to accept the first AI answer. These are the calls that
changed the work:

- **Logo.** The logo is the app's existing Reveal mark, already recorded in
  the design system, drawn exactly in Illustrator rather than redrawn. A
  separate exploration of alternative marks (sheets in `exports/concepts/`
  and `exports/abstract/`, not part of the submission) did not replace it.
- **Mascot.** Amigo started standing; we added a resting pose with two Zs,
  then corrected it: the Zs belong only to Amigo **lying down**, never
  standing. That is now a rule in the book.
- **Flyer, three rounds.** The first version had about 160 words. We asked
  what a flyer is for and cut it to 29, which undersold the product. We then
  researched how much a promotional handout should carry (roughly 50 to 150
  words; AIDA order; a skim layer and a read layer; QR codes at 2.5 cm or more
  with a quiet zone and a label) and rebuilt it at about 130 words. The link
  and QR code became real once the live address was found.
- **Banner.** It started as a copy of the website's hero. We researched what a
  blog banner is (a post header and share image, seen small) and redesigned it
  for that job. The website's hero kept the interactive version: a live demo
  and a working paste bar.
- **Files.** The logo, mascot and guidelines began as separate files; we
  merged them into one Task 1 brand book so the submission is exactly three
  files, one per task.

## Rebuilding

Needs Illustrator and the Inter, Inter Display and JetBrains Mono fonts.

```bash
brand/kit/scripts/build.sh task1    # the brand book, after the logo and mascot exports
brand/kit/scripts/build.sh flyer
brand/kit/scripts/build.sh banner
```

More on the design direction is in `brand/kit/README.md`.
