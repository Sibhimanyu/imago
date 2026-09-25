# Imago brand kit

The assignment's three deliverables, one editable Illustrator file each, built
from `scripts/` so every piece shares the same palette, mark geometry and hero.

| Piece | Editable file | Exports |
|---|---|---|
| Task 1, the logo, as a 13-page brand book. **Logo:** the master lockup (primary and reversed), the name, what the mark means, anatomy, construction, versions, misuse. **Mascot:** meet Amigo (standing and resting), using Amigo. **System:** colour, type, voice | `imago-task1-logo.ai` (RGB) | Book: `exports/imago-brand-guidelines.pdf`, `exports/guidelines/*.png`. Logo: `exports/imago-task1-logo_*.svg`, `exports/logo-*.png`, `exports/imago-task1-logo.pdf`. Mascot: `exports/imago-mascot_*.svg`, `exports/amigo*.png` |
| Task 2, the A4 flyer, CMYK, 3 mm bleed | `imago-task2-flyer-a4.ai` | `exports/imago-task2-flyer-a4-print.pdf` (PDF/X-4), `exports/imago-task2-flyer-a4-preview.png` |
| Task 3, the blog banner, 1200 × 700 px, RGB | `imago-task3-blog-banner.ai` | `exports/imago-task3-blog-banner.png`, `.jpg`, `@2x.png` |

## Direction

- **Mark.** The accepted "Reveal" mark, drawn in Illustrator from its 32-unit
  SVG geometry (`DESIGN.md`), not redrawn. The wordmark is Inter Display
  SemiBold, outlined in the logo file so it never depends on the font.
- **Colour.** Ink and paper only. Amber appears once per piece, on the one
  thing that changed since the last fetch (the highlighted JSON field, the
  change chip, the history ticks, the "Watches endpoints change" rule), which is
  what amber means in the app. Green is the live dot. The flyer uses hand-set
  CMYK values; every colour is also a swatch in the "Imago" group.
- **Hero.** A raw Open-Meteo response on the left becomes its interface on the
  right, the product's promise shown rather than described. The flyer and the
  banner draw the same hero at different scales.
- **Call to action.** The app's own command bar ("Paste an API URL or a curl
  command"), so the ad shows the first thing you do.

## Rebuild

Needs Illustrator plus the Inter, Inter Display and JetBrains Mono fonts.

```bash
brand/kit/scripts/build.sh task1    # the brand book, after the logo and mascot exports
brand/kit/scripts/build.sh flyer    # or banner
```

It runs in whichever Illustrator is open. The logo and the mascot are drawn
on the book's own pages as editable vectors; `logo.jsx` and `mascot.jsx` build
their standalone artboards into `build/` (ignored) only to write the SVG, PNG
and PDF exports.

A rebuild closes and replaces only that piece's own document; nothing else
open in Illustrator is touched.
