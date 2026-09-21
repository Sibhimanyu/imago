# Imago — wiring a new mark into the product

Replacing the identity touches **six** places. Five are mechanical; the sixth is
regenerating the social image.

Everything below is verified against the code as it stands.

---

## 1. The symbol sprite — `index.html`

This is the important one. The mark is defined **once** here, and every logo on
every page is a `<use>` reference to it. Replace the children of the two symbols
and the whole product updates.

```html
<!-- Brand marks. Defined once; every logo on the page is a <use> of these,
     so changing the identity means editing this block and nothing else. -->
<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
  <symbol id="imagoMark" viewBox="0 0 32 32" fill="currentColor"><rect x="5.4" y="8.55" width="4.7" height="2.7" rx="1.35"/><rect x="5.4" y="14.2" width="6.8" height="2.7" rx="1.35"/><rect x="5.4" y="19.85" width="9.1" height="2.7" rx="1.35"/><path fill-rule="evenodd" d="M21.9 7.1h1.35a3.65 3.65 0 0 1 3.65 3.65v10.5a3.65 3.65 0 0 1-3.65 3.65H21.9a3.65 3.65 0 0 1-3.65-3.65v-10.5A3.65 3.65 0 0 1 21.9 7.1Zm.35 6.55h1.35c.72 0 1.3.58 1.3 1.3v3.1c0 .72-.58 1.3-1.3 1.3h-1.35c-.72 0-1.3-.58-1.3-1.3v-3.1c0-.72.58-1.3 1.3-1.3Z"/></symbol>
  <symbol id="imagoIcon" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="8" fill="var(--mark-tile, #1b1b19)"/>
    <g fill="var(--mark-ink, #fff)" transform="translate(16 16) scale(.82) translate(-16 -16)"><rect x="5.4" y="8.55" width="4.7" height="2.7" rx="1.35"/><rect x="5.4" y="14.2" width="6.8" height="2.7" rx="1.35"/><rect x="5.4" y="19.85" width="9.1" height="2.7" rx="1.35"/><path fill-rule="evenodd" d="M21.9 7.1h1.35a3.65 3.65 0 0 1 3.65 3.65v10.5a3.65 3.65 0 0 1-3.65 3.65H21.9a3.65 3.65 0 0 1-3.65-3.65v-10.5A3.65 3.65 0 0 1 21.9 7.1Zm.35 6.55h1.35c.72 0 1.3.58 1.3 1.3v3.1c0 .72-.58 1.3-1.3 1.3h-1.35c-.72 0-1.3-.58-1.3-1.3v-3.1c0-.72.58-1.3 1.3-1.3Z"/></g>
  </symbol>
</svg>
```

**What to supply:** SVG children on a `0 0 32 32` viewBox.

- `#imagoMark` — the bare mark. Leave `fill="currentColor"` on the symbol so it
  inherits whatever colour its context sets.
- `#imagoIcon` — the same mark inside a dark tile. The `scale(.78)` fits a mark
  whose bounding box is roughly 22.8 units wide. **If your mark has a different
  bounding box, recalculate this scale** — aim for the mark occupying ~62% of the
  32-unit tile, with the `translate(16 16) … translate(-16 -16)` pair keeping it
  centred.

Do not hard-code `#1b1b19` or `#fff` inside the tile — keep the
`var(--mark-tile, …)` / `var(--mark-ink, …)` indirection so themes can override.

---

## 2. Icon files — `favicon.svg`, `assets/`

The favicon is a **standalone file**, not an inlined data-URI, so it can be
edited on its own:

```html
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/imago-icon.svg">
```

Alongside it, `assets/` holds standalone exports for use outside the app
(slides, README, README badges, anywhere that can't reference the sprite):

| File | What |
|---|---|
| `assets/imago-mark.svg` | Bare mark, single colour |
| `assets/imago-icon.svg` | Mark on the dark tile |
| `assets/imago-logo.svg` | Mark + wordmark lockup |

**These are separate copies of the geometry — nothing keeps them in sync.** When
the mark changes, update all of them plus the sprite in `index.html` plus
`brand/og.html`. That is five copies; there is no build step that would let you
avoid it without adding a dependency, which the project deliberately does not have.

**`publish.sh` must copy them.** It does now:

```bash
cp index.html styles.css app.js og.png favicon.svg dist/
cp -R assets dist/assets
```

This was a real bug: when the icons were first moved out to files, `publish.sh`
still copied only four files, so the next deploy would have 404'd on both
`favicon.svg` and `assets/imago-icon.svg`. If you add any new referenced file,
add it here too and re-run the check in §7.

## 3. The `<use>` references — `index.html`

Three, one per surface. These usually need **no change** — only the sizes, if
your mark has a different optical weight.

- line ~43: `<svg width="26" height="26"><use href="#imagoIcon"/></svg>`
- line ~109: `<svg width="44" height="44"><use href="#imagoIcon"/></svg>`
- line ~137: `<svg width="24" height="24"><use href="#imagoIcon"/></svg>`

Sizes are the rendered box, not the mark: landing bar 26px, setup card 44px,
app bar 24px.

---

## 4. Tile colours — `styles.css`

Near the top of `:root`:

```css
/* brand */
--mark-tile: #1b1b19;
--mark-ink:  #ffffff;
```

Change these rather than editing colours inside the symbol.

---

## 5. Brand documentation — `styles.css` header

There is a `BRAND SYSTEM` comment block at the top of `styles.css` summarising
mark, voice, colour, type and motion. It exists so the rules sit next to the code
that implements them. **Update it when the identity changes**, and keep it in
agreement with `docs/BRAND-SYSTEM.md`.

---

## 6. The social image — `brand/og.html` → `og.png`

`og.png` (1200×630) is generated from `brand/og.html`, not hand-drawn, so it can
be regenerated whenever the brand changes.

```bash
# from the repo root, with a local server NOT required (it reads file://)
SHOOT_URL="file://$(pwd)/brand/og.html" \
SHOOT_OUT="$(pwd)/og.png" \
SHOOT_W=1200 SHOOT_H=630 SHOOT_SCALE=1 SHOOT_FULL=0 \
node .context/test/shoot.js
```

Then confirm the dimensions are exactly right — social platforms crop
unpredictably otherwise:

```bash
file og.png        # must say: PNG image data, 1200 x 630
```

The mark inside `brand/og.html` is a **third copy** of the geometry (it is a
standalone HTML file and cannot reference the app's sprite). Update it too.

The absolute URLs in the `og:image` / `twitter:image` meta tags in `index.html`
point at the deployed origin. If the deployment URL changes, update those.

---

## 7. Verify and ship

> **Note:** the test harness lives in `.context/test/`, which is **excluded from
> git** (`.git/info/exclude`) — it is local working scratch, not part of the
> repository. If you are picking this up on a fresh clone, those files will not
> be there and you will need them copied across.

```bash
# unit + integration suites
node .context/test/logic.test.js        # 73 assertions, pure logic
node .context/test/browser.test.js      # 86 assertions, real Chrome, real APIs
node .context/test/realsize.check.js    # layout at 390 / 834 / 1440

# assemble dist/ (only the files that should be public)
./publish.sh

# deploy
catalyst deploy slate imago -ni
```

`browser.test.js` includes a guard that **no text node may sit directly in
`<body>`** — this is what catches malformed markup from a botched favicon or
sprite edit. If it fails, you have leaked a fragment.

### Verify the live deploy actually changed

Catalyst can report success while serving a stale build. Do not trust the log:

```bash
URL=https://imago-gxabbdoh.onslate.in
for f in index.html styles.css app.js og.png; do
  r=$(curl -s "$URL/$f" | shasum -a 256 | cut -d' ' -f1)
  l=$(shasum -a 256 "dist/$f" | cut -d' ' -f1)
  [ "$r" = "$l" ] && echo "  $f identical" || echo "  $f MISMATCH"
done

# and run the suite against production
APP_URL=$URL/ node .context/test/browser.test.js
```

---

## Checklist

- [ ] `#imagoMark` children replaced
- [ ] `#imagoIcon` children replaced, `scale()` recalculated for the new bounding box
- [ ] Favicon data-URI updated, `#` percent-encoded as `%23`, no stray `">`
- [ ] `--mark-tile` / `--mark-ink` still correct
- [ ] `styles.css` BRAND SYSTEM comment updated
- [ ] `docs/BRAND-SYSTEM.md` updated
- [ ] `brand/og.html` mark updated, `og.png` regenerated at exactly 1200×630
- [ ] All three suites pass locally
- [ ] `./publish.sh`, deploy, checksums match live, suite passes against production
