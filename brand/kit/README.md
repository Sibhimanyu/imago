# Imago brand kit

The logo, an A4 print flyer and a blog banner, built in Adobe Illustrator 2026
from `scripts/`, so every piece shares the same palette, mark geometry and hero.

| Piece | Editable file | Exports |
|---|---|---|
| Logo (6 artboards: primary, reversed, app icon, mark, tile lockup, construction) | `imago-logo.ai` (RGB) | `exports/imago-logo_*.svg`, `exports/*.png`, `exports/imago-logo.pdf` |
| A4 flyer, CMYK, 3 mm bleed | `imago-flyer-a4.ai` | `exports/imago-flyer-a4-print.pdf` (PDF/X-4), `exports/imago-flyer-a4-preview.png` |
| Blog banner, 1200 × 700 px, RGB | `imago-blog-banner.ai` | `exports/imago-blog-banner.png`, `.jpg`, `@2x.png` |
| Brand guidelines (11 pages: name, what the mark means, anatomy, construction, versions, misuse, Amigo the mascot, colour, type, voice) | `imago-brand-guidelines.ai` | `exports/imago-brand-guidelines.pdf`, `exports/guidelines/*.png` |

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
brand/kit/scripts/build.sh logo    # or flyer, banner, guidelines
```

A rebuild closes and replaces only that piece's own document; nothing else
open in Illustrator is touched.
