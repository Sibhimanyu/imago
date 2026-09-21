# Imago — brand system

The current system of record. A new identity must either live inside these rules
or explicitly argue for changing them.

Source of truth in code: the header comment and `:root` block of `styles.css`.
If you change something here, change it there too — they are meant to agree.

---

## Mark

**"Emergence"** — three loose rows resolving into one solid form. Read left to
right it is the product: raw data becoming a rendered interface. The rows grow
toward the block so the eye travels in the direction of the transformation.

Geometry, on a `0 0 32 32` viewBox:

```svg
<rect x="5.4" y="8.55" width="4.7" height="2.7" rx="1.35"/>
<rect x="5.4" y="14.2" width="6.8" height="2.7" rx="1.35"/>
<rect x="5.4" y="19.85" width="9.1" height="2.7" rx="1.35"/>
<path fill-rule="evenodd" d="M21.9 7.1h1.35a3.65 3.65 0 0 1 3.65 3.65v10.5a3.65 3.65 0 0 1-3.65 3.65H21.9a3.65 3.65 0 0 1-3.65-3.65v-10.5A3.65 3.65 0 0 1 21.9 7.1Zm.35 6.55h1.35c.72 0 1.3.58 1.3 1.3v3.1c0 .72-.58 1.3-1.3 1.3h-1.35c-.72 0-1.3-.58-1.3-1.3v-3.1c0-.72.58-1.3 1.3-1.3Z"/>
```

The three rows grow toward the pane. The pane itself carries an **aperture** — a
knocked-out rounded rect, cut with `fill-rule="evenodd"` — so the block reads as a
rendered view with an image in it, not a blank slab. That aperture is what makes
the mark about *arrival at a finished image* rather than about the process of
transforming.

**App icon** — the mark on a `#1b1b19` tile, `rx="8"`, mark in white, scaled to
`.82` about the centre so it sits inside the tile with even breathing room.

### Rules

| | |
|---|---|
| **Clear space** | One block-width (the tall form) on every side |
| **Minimum size** | 16px. Below that, use the app icon, never the bare mark |
| **Colour** | Single colour, always. Inherits `currentColor` |
| **On ink** | Mark goes white and the tile is dropped — never a tile on ink |
| **Never** | Gradient, outline, rotate, stretch, recolour, or place on a photograph |

---

## Colour — every value carries a meaning

The rule that matters: **never introduce a colour that doesn't mean something.**
Decoration is not a reason.

### Surfaces

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#f6f5f1` | The page. Warm grey, **never white** — this is a reading surface for dense JSON, and white glares |
| `--bg-sink` | `#f1efe9` | Recessed areas: tracks, wells, the method chip |
| `--card` | `#ffffff` | Raised cards. White earns its place only by contrast with paper |
| `--card-2` | `#faf9f6` | Nested cards inside cards |
| `--line` | `#e7e5df` | Borders and rules |
| `--line-soft` | `#efede8` | Internal dividers |

### Text

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#1b1b19` | Primary text, the mark, primary buttons. Near-black, **never `#000`** |
| `--ink-2` | `#45443f` | Body copy and values |
| `--muted` | `#8a8981` | Labels, secondary text |
| `--muted-2` | `#a8a79f` | Placeholders, disabled |

### Semantic — these are the only accents

| Token | Hex | Means |
|---|---|---|
| `--yellow` | `#f5ce47` | **A value changed.** The only decorative-looking colour in the system, and it is never used decoratively |
| `--green` | `#4fa96a` | Live, generated, succeeded. The auto-refresh pulse |
| `--red` | `#d9534f` | Failed. Errors and destructive actions only |
| `--blue` | `#4f86c6` | Links, and numeric tokens in syntax-highlighted JSON |

Tinted backgrounds pair with each: `--yellow-bg #fdf3cd`, `--green-bg #e4f4e8`,
`--red-bg #fbeaea`, `--blue-bg #e8f0fa`. Amber also has a darker ink for text on
its tint: `--yellow-ink #8a6d12`.

### The one exception

Stat bars run a six-step spectrum so ranked values can be compared at a glance:

```
#ef6b6b  #f5a623  #f5ce47  #5b9bd5  #6aa9e0  #4fa96a
```

This is the only place colour is positional rather than semantic. Outside charts,
the rule holds.

---

## Type — one family, weight does the work

```
Inter, "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```

**No webfont request.** First paint must never be blocked by a font download.
Inter is used if the user happens to have it; otherwise the system face carries
it, and the design must not fall apart when it does.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Display (landing hero) | `clamp(38px, 5.4vw, 60px)` | 600 | `-0.035em` |
| Page title | 26px | 600 | `-0.025em` |
| Metric value | 27px | 600 | `-0.03em` |
| Section heading | 21px | 600 | `-0.02em` |
| Body | 14px | 400 | — |
| Small / notes | 12.5px | 400 | — |
| Label | 11.5px | 600 | — |
| Wordmark | 15.5px | 600 | `-0.021em` |

### Monospace

```
"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace
```

**The rule: if a machine produced it, it is monospace.** URLs, schema hashes,
JSON, headers, byte counts. If a human wrote it, it is sans. This is what makes
`sch_1a2g7a2` read as a system artefact rather than a word.

---

## Shape and depth

| Token | Value | Used for |
|---|---|---|
| `--r-lg` | 16px | Floating hero cards |
| `--r` | 12px | Cards, request bar |
| `--r-sm` | 9px | Buttons, inputs |
| `--r-xs` | 7px | Chips, small controls |

Structure comes from **lines, not shadows**. Shadows are near-invisible and exist
only to lift a card off paper — never to create drama:

```css
--sh-xs: 0 1px 2px rgba(27,27,25,.05);
--sh-sm: 0 1px 2px rgba(27,27,25,.05), 0 2px 6px -2px rgba(27,27,25,.06);
--sh:    0 1px 3px rgba(27,27,25,.05), 0 8px 20px -10px rgba(27,27,25,.12);
--sh-lg: 0 2px 6px rgba(27,27,25,.04), 0 18px 46px -16px rgba(27,27,25,.20);
```

---

## Motion

120–220ms, ease-out. **Motion confirms an action; it never performs.**

Permitted: tab fade-in (220ms), stat bars growing to width (450ms), the live dot
pulsing (this one is informational — it means polling is active), toast rise.

Not permitted: entrance animations on page load, parallax, anything that delays
the user reading the data.

Everything collapses under `prefers-reduced-motion: reduce`.

---

## Voice

Say what happened and what it means for the user. Name the real cause —
**including when the cause is us.**

✅ "Schema already known — reused cached interface, no Gemini call."
✅ "The browser could not reach this endpoint. It may not send CORS headers that allow browser access."
✅ "Large response (284.1 KB) — only a compact sample goes to Gemini."

❌ "Awesome! We've magically supercharged your API! 🚀"
❌ "Oops! Something went wrong."
❌ "Loading your amazing data…"

**Rules**

- No exclamation marks. No emoji.
- Never congratulate the user for clicking a button.
- Errors state the likely cause and what to try, not just that something broke.
- Numbers are specific. "284.1 KB", not "large".
- Lowercase the tagline in UI chrome (`apis become interfaces`); sentence case in
  prose and headlines ("APIs become interfaces.").

---

## Don'ts

1. Recolour the mark, outline it, or place it on a busy photograph.
2. Use amber for emphasis. Amber means a value changed.
3. Add a second typeface, or set body copy in monospace.
4. Animate for delight. Motion confirms an action or it does not ship.
5. Put the tile behind the mark when it already sits on ink.
6. Introduce pure white as a page background, or pure black as text.
