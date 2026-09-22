# Imago brand system

This is the current system of record for Imago's visual identity, UI language,
and mascot. It should agree with `styles.css`, the standalone SVG assets, and
`brand/identity.html`.

Visual source of truth: `brand/identity.html`

Tagline: **APIs become interfaces.**

## Brand Idea

Imago reveals the interface already inside an API response.

Raw JSON is not treated as a final artifact. It is treated as structured
material that can arrive at a visible, usable form. The brand should feel
precise, calm, technical, and quietly helpful.

## Logo

The accepted Imago mark is **Reveal**.

Construction:

- Two incoming API fields enter from the left.
- The fields merge into one rounded body.
- A knocked-out aperture on the right becomes the finished window.

This keeps the mark abstract while giving it a real product story. It should not
be redesigned as a literal screen, a JSON brace, a butterfly, a robot, a spark,
or a generic layout icon.

Kept by explicit preference on 21 Sep 2026 over a counterform alternative.
Recorded tradeoff: the two left fields plus a tall aperture can read as a padlock
at large sizes, and the fields merge into the body below 24px. Accepted.

### Mark SVG

Use on a `0 0 32 32` viewBox:

```svg
<rect x="4.2" y="6.4" width="12.8" height="6" rx="3"/><rect x="3" y="14.3" width="11.5" height="6" rx="3"/><path fill-rule="evenodd" d="M13.6 6.4h8c4.4 0 7 2.9 7 7.3v7.1c0 4.2-2.7 6.8-6.9 6.8h-8.1c-3.8 0-6-2.3-6-6.1v-9c0-3.8 2.2-6.1 6-6.1Zm7.8 6.2c-1.4 0-2.3.9-2.3 2.3v4.4c0 1.4.9 2.3 2.3 2.3h.7c1.4 0 2.3-.9 2.3-2.3v-4.4c0-1.4-.9-2.3-2.3-2.3h-.7Z"/>
```

### App Icon

The app icon is the Imago mark in white on a dark rounded tile.

- ViewBox: `0 0 32 32`
- Tile: `rect width="32" height="32" rx="8" fill="#1b1b19"`
- Mark: white, centered, scaled to `.78` around the center

### Clear Space And Size

| Rule | Value |
|---|---|
| Clear space | At least one aperture width around the mark |
| Minimum bare mark | 16px, only when contrast is excellent |
| Preferred small use | App icon below 24px |
| Colour | Single colour, inherited through `currentColor` |

### Logo Don'ts

- Do not rotate, stretch, outline, or add shadow to the mark.
- Do not place the mark on busy photography.
- Do not make a gradient version.
- Do not add extra marks for separate features.
- Do not use Amigo as the main product logo.

## Mascot

The mascot is **Amigo**.

Amigo is the Imago system standing up to help. It is deliberately abstract and
constructed from the same design logic as the product mark.

Relationship to Imago:

- Imago: incoming API fields become a window.
- Amigo: the same body and aperture stand upright, and the fields become two
  centered legs.

Amigo can appear in:

- loading states
- empty states
- onboarding or setup guidance
- success confirmations
- recoverable error states
- small brand moments in docs or slides

Amigo must not appear in:

- the favicon
- the main navigation wordmark
- the app icon
- dense data views where it distracts from results
- places where a status icon is more precise

### Mascot SVG

Use on a `0 0 32 32` viewBox:

```svg
<g fill="currentColor">
  <rect x="9" y="21.5" width="6" height="8.5" rx="3"/>
  <rect x="17" y="21.5" width="6" height="8.5" rx="3"/>
  <path fill-rule="evenodd" d="M13 3h6c4.4 0 7 2.9 7 7.3v9c0 4.2-2.7 6.7-6.9 6.7h-6.2C8.7 26 6 23.5 6 19.3v-9C6 5.9 8.6 3 13 3Zm.2 6c-1.4 0-2.3.9-2.3 2.3v.7c0 1.4.9 2.3 2.3 2.3h5.6c1.4 0 2.3-.9 2.3-2.3v-.7c0-1.4-.9-2.3-2.3-2.3h-5.6Z"/>
</g>
```

### Mascot Rules

- Keep Amigo single-colour.
- Keep the body, aperture, and centered legs.
- Do not add eyes, mouth, arms, hands, clothes, accessories, or expressions.
- Do not convert Amigo into a robot, animal, or person.
- Do not use speech bubbles as part of the mascot artwork.
- Use surrounding UI copy for personality, not facial features.

## Typography

The product uses one family only:

```css
Inter, "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif
```

No webfont request. The design must work with the system fallback.

| Role | Size | Weight | Tracking |
|---|---:|---:|---:|
| Landing display | `clamp(38px, 5.4vw, 60px)` | 600 | `-0.035em` |
| Page title | 26px | 600 | `-0.025em` |
| Metric value | 27px | 600 | `-0.03em` |
| Section heading | 21px | 600 | `-0.02em` |
| Body | 14px | 400 | `0` |
| Small text | 12.5px | 400 | `0` |
| Label | 11.5px | 600 | `0` |
| Wordmark | 15.5px | 600 | `-0.021em` |

The wordmark is live text: `Imago`, Inter/system, semibold. Do not replace the
in-app wordmark with an image.

Monospace stack:

```css
"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace
```

Rule: if a machine produced it, it can be monospace. URLs, JSON, schema hashes,
headers, byte counts, and request metadata qualify. Human-facing prose does not.

## Colour

Never introduce a colour unless it carries meaning.

**Imago has no brand hue.** Ink and paper are the brand. Decided 21 Sep 2026, and
the reason is arithmetic rather than taste: the semantic set already occupies
amber 47 degrees, green 138, red 2 and blue 212. A full hue-wheel sweep found
clearance of 40 degrees or more only in purple and magenta, banned here as AI
slop, and a marginal lime at 90 degrees that sits badly on warm paper.

Measured on the three candidates that were actually built: clay #b8542f is 14.5
degrees from failed-red and fails AA as text on paper at 4.43; deep teal #0f6b5c
is 32 degrees from live-green, so the mark starts reading as a status; indigo
#3340a0 is 20.6 degrees from link-blue.

The warm paper #f6f5f1 is the signature surface instead of a hue. With nothing
else coloured, the amber changed chip and the green live pill carry real weight.
Colour means the user's data moved, never "us".

### Surfaces

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#f6f5f1` | Warm page background |
| `--bg-sink` | `#f1efe9` | Recessed wells and tracks |
| `--card` | `#ffffff` | Raised cards |
| `--card-2` | `#faf9f6` | Subtle nested surfaces |
| `--line` | `#e7e5df` | Borders |
| `--line-soft` | `#efede8` | Internal dividers |

### Text

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#1b1b19` | Primary text and mark |
| `--ink-2` | `#45443f` | Body copy and values |
| `--muted` | `#8a8981` | Labels and secondary text |
| `--muted-2` | `#a8a79f` | Placeholders and disabled text |

### Semantic Accents

| Token | Hex | Meaning |
|---|---|---|
| `--yellow` | `#f5ce47` | A value changed |
| `--green` | `#4fa96a` | Live, generated, succeeded |
| `--red` | `#d9534f` | Failed or destructive |
| `--blue` | `#4f86c6` | Links and numeric JSON tokens |

Tints:

| Token | Hex |
|---|---|
| `--yellow-bg` | `#fdf3cd` |
| `--yellow-ink` | `#8a6d12` |
| `--green-bg` | `#e4f4e8` |
| `--red-bg` | `#fbeaea` |
| `--blue-bg` | `#e8f0fa` |

Stat bars may use the established six-step comparison spectrum:

```text
#ef6b6b #f5a623 #f5ce47 #5b9bd5 #6aa9e0 #4fa96a
```

Outside charts, colour remains semantic.

## Shape And Depth

| Token | Value | Use |
|---|---:|---|
| `--r-lg` | 16px | Large hero cards |
| `--r` | 12px | Cards and request bar |
| `--r-sm` | 9px | Buttons and inputs |
| `--r-xs` | 7px | Chips and small controls |

Structure comes from borders and layout, not dramatic shadows.

```css
--sh-xs: 0 1px 2px rgba(27,27,25,.05);
--sh-sm: 0 1px 2px rgba(27,27,25,.05), 0 2px 6px -2px rgba(27,27,25,.06);
--sh:    0 1px 3px rgba(27,27,25,.05), 0 8px 20px -10px rgba(27,27,25,.12);
--sh-lg: 0 2px 6px rgba(27,27,25,.04), 0 18px 46px -16px rgba(27,27,25,.20);
```

## Motion

Motion should confirm state changes. It should never delay reading the data.

| Rule | Value |
|---|---|
| Standard duration | 120ms to 220ms |
| Ease | Ease-out |
| Longer data reveal | Up to 450ms for stat bars |
| Reduced motion | Collapse all nonessential animation |

Allowed:

- tab fade
- stat bar growth
- live polling pulse
- toast rise

Avoid:

- page-load entrance sequences
- parallax
- decorative loops
- animation that hides data until it completes

## Voice

Plain, precise, and accountable.

Good:

- "Schema already known: reused cached interface, no Gemini call."
- "The browser could not reach this endpoint. It may not send CORS headers."
- "Large response: only a compact sample goes to Gemini."

Bad:

- "Awesome, we magically transformed your API."
- "Oops, something went wrong."
- "Loading your amazing data."

Rules:

- No emoji.
- No exclamation marks.
- No hype.
- Explain likely cause and useful next step.
- Use exact numbers when available.

## Exported Assets

| File | Role |
|---|---|
| `assets/imago-mark.svg` | Bare mark |
| `assets/imago-icon.svg` | App icon tile |
| `assets/imago-logo.svg` | Mark and wordmark |
| `assets/amigo-mascot.svg` | Mascot |
| `favicon.svg` | Browser favicon |
| `brand/identity.html` | Brand board |
| `brand/og.html` | Social image source |
| `og.png` | Generated social image |
