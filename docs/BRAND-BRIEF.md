# Imago — brand & logo brief

**This document is self-contained.** You can be handed only this file and have
everything you need. Nothing here assumes you can see the codebase.

---

## 1. What Imago is

Imago is a browser-only API playground, live at
<https://imago-gxabbdoh.onslate.in>.

You paste a GET endpoint. It fetches the JSON, works out the *shape* of the
response, asks an LLM to design an interface for that shape, and renders it with
its own components. It remembers every interpretation it makes, and it watches
endpoints change over time.

Most API tools stop at pretty-printed JSON. Imago reads the JSON and builds the
view the data deserves — a Pokémon becomes a profile with stat bars and type
badges; a weather endpoint becomes metrics and a temperature chart; a book search
becomes a table.

The three things it does:

| | |
|---|---|
| **Explore** | Fetches any public GET endpoint |
| **Remember** | Caches how it interpreted each response shape, so the same structure is never re-analysed |
| **Watch** | Auto-refreshes and highlights exactly which values changed since the last fetch |

Tagline in use: **"APIs become interfaces."**

### What the name means

*Imago* — Latin for **image**; in entomology, the **final, fully-formed adult
stage** an insect reaches after metamorphosis. Raw JSON goes in; its finished
form comes out. The name was chosen over "Morph" (too crowded in AI dev tooling)
and "Depict" (clear but plain).

The name carries a transformation idea, but note the emphasis: an imago is the
**arrival**, not the process. It is the butterfly, not the chrysalis.

### Audience

Developers, and the people grading this as a coursework submission. It should
read as a real product, not a student project. Confident and quiet, not loud.

---

## 2. The job to be done

Deliver an identity for Imago. You may refine the current mark or replace it
entirely — the current one is a considered starting point, not a constraint.

**Deliverables**

1. **Primary mark** — as SVG, on a `0 0 32 32` viewBox, single colour, using
   `fill="currentColor"` (see §5 for why this matters).
2. **App-icon lockup** — the mark on a dark rounded tile (`rx="8"` on the same
   32×32 grid), mark in white.
3. **Wordmark treatment** — typeface, weight, tracking. See §4 for the
   constraint that rules out custom lettering in the product UI.
4. **Three lockups** — icon+wordmark on light; mark+wordmark on ink; wordmark
   alone.
5. **Rationale** — one paragraph. Why this mark, for this product, with this name.
6. **Rejection notes** — what you tried and discarded, so the next person doesn't
   repeat it.

**Optional, if it strengthens the system**

- Refined colour roles (current ones in `BRAND-SYSTEM.md` are functional, not sacred)
- A social/OG image direction (1200×630)
- Illustration or motif language for empty states

---

## 3. Hard constraints

These are not preferences. Breaking any of them breaks the product.

1. **Must survive 16px.** The favicon is a real surface. If detail dies at 16px,
   the mark dies. Test at 96 / 40 / 24 / 16 before falling in love with it.
2. **SVG only, hand-authorable.** The app ships with **zero external
   dependencies** — no icon fonts, no image CDN, no webfont request. The mark is
   inlined into the HTML as an SVG symbol. A raster logo cannot be used as the
   primary mark. (A PNG is fine for the OG social image only.)
3. **Single colour, inheriting `currentColor`.** The same mark is drawn in ink on
   paper, in white on ink, and inside a dark tile. No gradients, no multi-colour
   fills, no effects that assume a background.
4. **Light-first.** The product is a warm-paper light theme (`#f6f5f1`). There is
   no dark mode. Do not design a mark that only works glowing on black.
5. **Geometry on a 32-unit grid**, so it stays crisp at 16px and 32px. Avoid
   sub-pixel strokes; prefer filled shapes over thin strokes — strokes below
   ~2.2 units disappear at small sizes.
6. **No emoji, no mascots, no gradients-as-personality.** See the voice rules in
   `BRAND-SYSTEM.md`.

---

## 4. Typography constraint

The product uses **one family only**: Inter, falling back to the system UI stack
(`-apple-system`, `Segoe UI`, `Roboto`). There is deliberately **no webfont
request** — the first paint must never be blocked.

This means:

- The **wordmark in the product UI** must be settable in Inter/system. It is live
  text, not an image.
- You may design a **custom or drawn wordmark for marketing surfaces** (OG image,
  slides, print), but it cannot be the in-app wordmark unless it can be
  reproduced with a system-available family.

Current wordmark: Inter Semibold (600), `letter-spacing: -0.021em`, sentence case
— "Imago".

---

## 5. Where the identity lives in the code

You do not need to edit code — but knowing this shapes what is cheap to change
and what is expensive.

The mark is defined **once** in `index.html` as two SVG symbols, and every logo on
every page is a `<use>` reference to them:

```html
<svg width="0" height="0" aria-hidden="true" style="position:absolute">
  <symbol id="imagoMark" viewBox="0 0 32 32" fill="currentColor">
    <!-- bare mark: inherits colour from CSS -->
  </symbol>
  <symbol id="imagoIcon" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="8" fill="var(--mark-tile, #1b1b19)"/>
    <g fill="var(--mark-ink, #fff)"
       transform="translate(16 16) scale(.78) translate(-16 -16)">
      <!-- same mark, scaled to sit inside the tile -->
    </g>
  </symbol>
</svg>
```

**Consequence:** every logo *inside the app* updates from this one block.
Supplying the new mark as raw SVG children on a 32×32 viewBox is all that is
needed for it. Anything that cannot be expressed that way (raster, multi-layer,
gradient) is expensive or impossible.

The geometry is additionally duplicated in four standalone files that nothing
keeps in sync — `favicon.svg`, `assets/imago-mark.svg`, `assets/imago-icon.svg`,
`assets/imago-logo.svg` — plus `brand/og.html` for the social image. So a new
mark is **one block plus five copies**. There is no build step to deduplicate
them, because the project ships with zero dependencies by design.

Full wiring instructions and a checklist: `CODE-INTEGRATION.md`.

---

## 6. What has already been tried — and why it was rejected

Four concepts were designed as real SVG and tested at 96/40/24/16px. **Do not
re-run these dead ends.** Rendered comparison sheets are in `brand/marks.html`
and `brand/round2.html` (open in a browser).

### A · Braces `{ ▪ }` — rejected: not ownable
JSON braces holding a solid formed block. Says "data becomes interface"
literally. First pass used organic curved braces which collapsed into a blob at
16px; a geometric second pass (`A2`) fixed legibility completely.

**Why it lost:** braces are the single most-used metaphor in developer tooling.
It reads well and means the right thing, but it could belong to any of a hundred
products. Legible, not ownable.

### B · Emergence — **currently shipping**

Three loose rows on the left resolving into one solid pane on the right. Rows grow
toward the pane so the eye travels left→right, in the direction of the
transformation. The pane carries a knocked-out **aperture**, so it reads as a
rendered view containing an image rather than a blank block.

```svg
<rect x="5.4" y="8.55" width="4.7" height="2.7" rx="1.35"/>
<rect x="5.4" y="14.2" width="6.8" height="2.7" rx="1.35"/>
<rect x="5.4" y="19.85" width="9.1" height="2.7" rx="1.35"/>
<path fill-rule="evenodd" d="M21.9 7.1h1.35a3.65 3.65 0 0 1 3.65 3.65v10.5a3.65 3.65 0 0 1-3.65 3.65H21.9a3.65 3.65 0 0 1-3.65-3.65v-10.5A3.65 3.65 0 0 1 21.9 7.1Zm.35 6.55h1.35c.72 0 1.3.58 1.3 1.3v3.1c0 .72-.58 1.3-1.3 1.3h-1.35c-.72 0-1.3-.58-1.3-1.3v-3.1c0-.72.58-1.3 1.3-1.3Z"/>
```

**Why it won:** the only candidate that depicts what the product actually does,
it is asymmetric (more memorable than a brace pair or a rectangle), and it holds
at 16px.

**Where it still might be beaten:** it can read as a generic "list view" or
"layout" icon. The aperture was added specifically to answer the criticism that
the first version depicted the *process* (rows → block) while the name means the
*arrival* — the aperture is the finished image. Judge whether that fully lands.
A mark that captures arrival more directly would still be a win.

An earlier variant hollowed the whole block with a large knockout; it closed up
below 24px and just became muddier. The current aperture is smaller and offset,
which survives better — verify any knockout at 16px.

### C · Wings — rejected: failed outright
Two wings either side of a body, doubling as angle brackets `< >`. The most
on-name concept.

**Why it failed:** it does not read as wings. At 96px it is a split circle; below
24px it collapses to a featureless blob. An opacity difference between the wings
also looked washed out and broke the single-colour rule. **The butterfly idea is
right for the name — this execution was wrong. It is worth another attempt by
someone better at it, but naive wing shapes do not survive small sizes.**

### D · Frame — rejected: reads as UI chrome
A rounded window, left pane empty, right pane filled — "half raw, half rendered".
The most refined and most legible at small sizes.

**Why it lost:** it is very close to the macOS "show sidebar" icon. Adding rows to
the empty pane (`D2`) to differentiate it just made it cluttered at 16px. It
reads as a UI control, not a brand.

---

## 7. Acceptance criteria

A proposal is done when:

1. The mark is supplied as SVG children on a `0 0 32 32` viewBox.
2. It is legible and distinct at **16px** — shown, not asserted.
3. It works in one colour: ink on paper, white on ink, and inside a dark tile.
4. It does not read as a generic list, layout, sidebar, or settings icon.
5. It is not a brace pair, unless the rationale beats §6A.
6. The wordmark is settable in Inter/system, or is clearly scoped to marketing
   surfaces only.
7. It carries some relationship to *arrival at a finished form* — the meaning of
   the name — or makes an argued case for a different idea.
8. Rationale and rejection notes are included.

## 8. Useful context files

| File | What it is |
|---|---|
| `docs/BRAND-SYSTEM.md` | Current colour, type, voice and motion rules — the system a new mark must live inside |
| `docs/CODE-INTEGRATION.md` | Exactly how to wire a new mark into the product |
| `brand/marks.html` | Round 1 candidates, rendered at all sizes — open in a browser |
| `brand/round2.html` | Round 2 refinements |
| `brand/system.html` | The current brand board |
| `brand/og.html` | Source for the 1200×630 social image |
