# Imago brand integration

This document explains where the accepted Imago identity lives in the product
and how another agent should safely carry it forward.

The current identity is already wired into the app. Do not replace it unless the
user explicitly asks for a new logo.

Visual source of truth: `brand/identity.html`

## Core Geometry

Imago mark:

```svg
<rect x="4.2" y="6.4" width="12.8" height="6" rx="3"/><rect x="3" y="14.3" width="11.5" height="6" rx="3"/><path fill-rule="evenodd" d="M13.6 6.4h8c4.4 0 7 2.9 7 7.3v7.1c0 4.2-2.7 6.8-6.9 6.8h-8.1c-3.8 0-6-2.3-6-6.1v-9c0-3.8 2.2-6.1 6-6.1Zm7.8 6.2c-1.4 0-2.3.9-2.3 2.3v4.4c0 1.4.9 2.3 2.3 2.3h.7c1.4 0 2.3-.9 2.3-2.3v-4.4c0-1.4-.9-2.3-2.3-2.3h-.7Z"/>
```

Amigo mascot:

```svg
<g fill="currentColor">
  <rect x="9" y="21.5" width="6" height="8.5" rx="3"/>
  <rect x="17" y="21.5" width="6" height="8.5" rx="3"/>
  <path fill-rule="evenodd" d="M13 3h6c4.4 0 7 2.9 7 7.3v9c0 4.2-2.7 6.7-6.9 6.7h-6.2C8.7 26 6 23.5 6 19.3v-9C6 5.9 8.6 3 13 3Zm.2 6c-1.4 0-2.3.9-2.3 2.3v.7c0 1.4.9 2.3 2.3 2.3h5.6c1.4 0 2.3-.9 2.3-2.3v-.7c0-1.4-.9-2.3-2.3-2.3h-5.6Z"/>
</g>
```

## App Sprite

The in-app mark is defined in `index.html` as an SVG sprite:

```html
<!-- Brand marks. Every logo in the app is a <use> of these, so this block
     drives the whole UI. Note the geometry is duplicated in favicon.svg,
     assets/*.svg and brand/og.html — nothing syncs them. See
     docs/CODE-INTEGRATION.md for the full checklist. -->
<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
  <symbol id="imagoMark" viewBox="0 0 32 32" fill="currentColor"><rect x="4.2" y="6.4" width="12.8" height="6" rx="3"/><rect x="3" y="14.3" width="11.5" height="6" rx="3"/><path fill-rule="evenodd" d="M13.6 6.4h8c4.4 0 7 2.9 7 7.3v7.1c0 4.2-2.7 6.8-6.9 6.8h-8.1c-3.8 0-6-2.3-6-6.1v-9c0-3.8 2.2-6.1 6-6.1Zm7.8 6.2c-1.4 0-2.3.9-2.3 2.3v4.4c0 1.4.9 2.3 2.3 2.3h.7c1.4 0 2.3-.9 2.3-2.3v-4.4c0-1.4-.9-2.3-2.3-2.3h-.7Z"/></symbol>
  <symbol id="imagoIcon" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="8" fill="var(--mark-tile, #1b1b19)"/>
    <g fill="var(--mark-ink, #fff)" transform="translate(16 16) scale(.78) translate(-16 -16)"><rect x="4.2" y="6.4" width="12.8" height="6" rx="3"/><rect x="3" y="14.3" width="11.5" height="6" rx="3"/><path fill-rule="evenodd" d="M13.6 6.4h8c4.4 0 7 2.9 7 7.3v7.1c0 4.2-2.7 6.8-6.9 6.8h-8.1c-3.8 0-6-2.3-6-6.1v-9c0-3.8 2.2-6.1 6-6.1Zm7.8 6.2c-1.4 0-2.3.9-2.3 2.3v4.4c0 1.4.9 2.3 2.3 2.3h.7c1.4 0 2.3-.9 2.3-2.3v-4.4c0-1.4-.9-2.3-2.3-2.3h-.7Z"/></g>
  </symbol>
</svg>
```

Rules:

- Keep the bare mark as `currentColor`.
- Keep the icon tile controlled by `--mark-tile` and `--mark-ink`.
- Keep the tile `rx="8"`.
- The icon scale is `.78` for the current mark.
- Do not add gradient definitions or filters to the sprite.

Current `<use>` surfaces in `index.html`:

| Surface | Use |
|---|---|
| Landing nav | `#imagoIcon`, 26px |
| Setup card | `#imagoIcon`, 44px |
| App bar | `#imagoIcon`, 24px |

## Standalone Asset Copies

The same geometry is duplicated because the project intentionally has no asset
build step.

| File | Update when brand changes |
|---|---|
| `index.html` | Sprite symbols |
| `favicon.svg` | Browser favicon |
| `assets/imago-mark.svg` | Bare mark |
| `assets/imago-icon.svg` | App icon |
| `assets/imago-logo.svg` | Mark plus wordmark |
| `assets/amigo-mascot.svg` | Mascot |
| `brand/identity.html` | Brand board |
| `brand/og.html` | Social image source |
| `og.png` | Generated social image |
| `styles.css` | Brand tokens and header comment |
| `docs/BRAND-SYSTEM.md` | Brand rules |
| `docs/BRAND-BRIEF.md` | Narrative handoff |
| `DESIGN.md` | Agent handoff |

Nothing keeps these synchronized automatically.

## CSS Tokens

The brand tile colours live in `styles.css`:

```css
--mark-tile: #1b1b19;
--mark-ink:  #ffffff;
```

Change those tokens instead of hard-coding new colours inside the SVG.

## Social Image

`og.png` is generated from `brand/og.html`.

```bash
SHOOT_URL="file://$(pwd)/brand/og.html" \
SHOOT_OUT="$(pwd)/og.png" \
SHOOT_W=1200 SHOOT_H=630 SHOOT_SCALE=1 SHOOT_FULL=0 \
node .context/test/shoot.js
```

Then verify:

```bash
file og.png
```

It should report `1200 x 630`.

## Publish

`publish.sh` must include all public brand assets:

```bash
cp index.html styles.css app.js og.png favicon.svg dist/
cp -R assets dist/assets
```

If a future agent adds a new referenced file, it must be copied there too.

## Verification

Run the local checks after brand wiring changes:

```bash
node .context/test/logic.test.js
node .context/test/browser.test.js
node .context/test/realsize.check.js
./publish.sh
```

Useful additional checks:

```bash
git diff --check
file og.png
```

If `.context/test` is missing on a fresh clone, ask for the local test harness or
use browser smoke testing against the app manually.

## Change Checklist

Use this only if the identity changes again.

- [ ] `index.html` sprite updated.
- [ ] `favicon.svg` updated.
- [ ] `assets/imago-mark.svg` updated.
- [ ] `assets/imago-icon.svg` updated.
- [ ] `assets/imago-logo.svg` updated.
- [ ] `assets/amigo-mascot.svg` updated if mascot changes.
- [ ] `brand/identity.html` updated.
- [ ] `brand/og.html` updated.
- [ ] `og.png` regenerated.
- [ ] `styles.css` brand header and tokens still agree.
- [ ] `docs/BRAND-SYSTEM.md` updated.
- [ ] `docs/BRAND-BRIEF.md` updated.
- [ ] `DESIGN.md` updated.
- [ ] Tests and smoke checks pass.
