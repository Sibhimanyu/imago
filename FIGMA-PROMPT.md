# Imago — Complete UI/UX Design Brief for Figma

> **Paste this whole file into Figma (Figma Make / First Draft / a design-generation prompt).**
> It is the complete, self-contained specification. Do not invent product features that are
> not described here. Do not invent colours, fonts, or a second brand hue.

---

## 0. What to produce

Design **every screen listed in Section 5**, in **two frame sets**:

| Set | Frame width | Notes |
|---|---|---|
| **Desktop (web)** | 1440 × auto height | Content max-width 1180px, centred. Some screens go full-bleed — marked. |
| **Mobile (responsive web, not native)** | 390 × auto height | This is a *browser* on a phone, not an iOS/Android app. No native tab bars, no iOS status-bar chrome, no hamburger drawer unless specified. |

Also produce:

1. A **cover / title frame** for the file.
2. A **design-token page**: colour swatches, type scale, spacing scale, radius scale, shadow scale, icon set.
3. A **component library page**: every component in Section 4, in every state.
4. Screens grouped on pages named: `01 Landing`, `02 Onboarding`, `03 Playground`,
   `04 Generated Page`, `05 Saved`, `06 Settings`, `07 States & Edge Cases`, `08 Components`, `09 Tokens`.

Use **Auto Layout everywhere**, **Figma variables** for all colours/spacing/radii, and
**component variants** for every interactive element state. Name layers semantically
(`playground/request-bar`, not `Group 42`).

---

## 1. The product, in one paragraph

**Imago** is a browser-only API playground. Tagline: **"APIs become interfaces."**
You give it a public GET endpoint. It fetches the JSON, works out what *shape* the
response is, asks a language model to design an interface for that shape, and renders
that design with its own components — a Pokémon endpoint becomes a profile page with
stat bars and type badges; a weather endpoint becomes metrics and a temperature chart;
a book search becomes a table. It **remembers** every shape it has already interpreted
(so it never pays for the same design twice) and it **watches endpoints over time**,
highlighting exactly which values changed. Memory and time are the product.

*imago* (n.) — Latin for *image*; in entomology, the final, fully-formed adult stage an
insect reaches after metamorphosis. Raw JSON goes in; its finished form comes out.

**Who uses it:** developers, API-curious students, people evaluating an unfamiliar endpoint.
**Where it runs:** a browser tab. No backend, no accounts, no sign-in. Everything lives
in the browser's local storage.

---

## 2. Brand & design principles

### 2.1 Feel

The UI must feel: **precise · warm · technical · calm · browser-native · useful before decorative.**

### 2.2 Hard prohibitions — a design that breaks any of these is rejected

- ❌ **No purple/violet AI gradients.** None. Not in a hero, not in a button, not in an icon.
- ❌ **No brand hue.** There is no "Imago blue" or "Imago green". The interface is **ink on paper**.
- ❌ **No decorative colour.** Every colour in the UI carries a meaning (Section 3.1). If a colour
  does not mean something, it is not allowed.
- ❌ No hype language ("supercharge", "magical", "AI-powered", "10x"). No exclamation marks.
- ❌ No mascots, no illustrations of robots, no 3D blobs, no glassmorphism.
- ❌ No oversized marketing sections *inside* the app (marketing lives only on the landing page).
- ❌ No pure white `#ffffff` page background and no pure black `#000000` text.
- ❌ No second type family beyond the two specified. No display/script fonts.
- ❌ No drop shadows heavier than the defined scale. No neon glows.

### 2.3 Voice

Plain and precise. State what happened, not how clever it was.
Good: *"Schema already known — reused cached interface."*
Bad: *"✨ Imago magically remembered this endpoint!"*

All UI copy in this document is **final copy** — use it verbatim in the designs.

### 2.4 The logo — "Reveal"

Meaning: *incoming API fields become a proper window.* The mark has **two horizontal
response fields on the left** that connect into **a single rounded body**, with **a small
internal vertical aperture on the right** — the usable interface revealed inside the response.

Draw it on a 32-unit grid with this exact geometry:

```
<rect x="4.2" y="6.4" width="12.8" height="6" rx="3"/>
<rect x="3"   y="14.3" width="11.5" height="6" rx="3"/>
<path fill-rule="evenodd" d="M13.6 6.4h8c4.4 0 7 2.9 7 7.3v7.1c0 4.2-2.7 6.8-6.9 6.8h-8.1c-3.8 0-6-2.3-6-6.1v-9c0-3.8 2.2-6.1 6-6.1Zm7.8 6.2c-1.4 0-2.3.9-2.3 2.3v4.4c0 1.4.9 2.3 2.3 2.3h.7c1.4 0 2.3-.9 2.3-2.3v-4.4c0-1.4-.9-2.3-2.3-2.3h-.7Z"/>
```

**App icon / brand-mark lockup:** the glyph in white `#ffffff` on a rounded-square ink tile
`#1b1b19`, radius ≈ 26% of the tile. Sizes used in product: 26px (landing bar), 24px (app bar),
44px (onboarding card).

**Wordmark:** the word `Imago`, sans family, weight 600, letter-spacing −0.02em, ink colour,
set beside the tile with 9px gap. On mobile the wordmark is **hidden** in the app bar; only the
tile shows.

Do not redraw, restyle, gradient, outline, or animate the mark. Do not place it on a coloured
background other than the ink tile or paper.

---

## 3. Design system (use these exact values)

### 3.1 Colour — every token, and what it means

Create these as Figma variables in a collection named `imago`.

**Surface & ink**

| Token | Hex | Meaning / use |
|---|---|---|
| `bg` | `#f6f5f1` | Page background. Warm paper, never white — this is a *reading* surface and warm grey keeps a screen of JSON from glaring. |
| `bg-sink` | `#f1efe9` | Recessed areas: code wells, inset panels, scroll containers. |
| `card` | `#ffffff` | Card surfaces only (allowed white — it sits *on* paper). |
| `card-2` | `#faf9f6` | Secondary card fill: chat log, nested cards, table header rows. |
| `line` | `#e7e5df` | Default 1px border. |
| `line-soft` | `#efede8` | Internal dividers inside a card. |
| `ink` | `#1b1b19` | Primary text, primary button fill, focus ring. Near-black, never `#000`. |
| `ink-2` | `#45443f` | Secondary text, body copy in dense areas. |
| `muted` | `#66655f` | Captions, labels, metadata. 5.4:1 on paper. |
| `muted-2` | `#6f6e67` | Smallest metadata. 4.7:1 on paper. **The step down is size, not lightness.** |

**Semantic — the only colours allowed, each carries one meaning**

| Token | Hex | Meaning — never use for anything else |
|---|---|---|
| `yellow` | `#f5ce47` | **Something changed.** The only decorative-looking accent; it always means a value moved since the last fetch. |
| `yellow-bg` | `#fdf3cd` | Fill behind a changed value / CHANGED flag. |
| `yellow-ink` | `#6f570b` | Text on `yellow-bg`. 6.2:1. |
| `yellow-line` | `#efe0a8` | Border of a changed element. |
| `green` | `#4fa96a` | **Live.** Auto-refresh is on; a connection test passed; a key is set. |
| `green-bg` | `#e4f4e8` | Fill behind a live/OK pill. |
| `red` | `#d9534f` | **Failed.** Request error, rejected key, destructive action. |
| `red-bg` | `#fbeaea` | Fill behind an error banner. |
| `red-ink` | `#a83e3a` | Text on `red-bg`. 5.3:1. |
| `link` | `#3f6fb5` | The one link blue. 5.1:1 on white. Hyperlinks only. |
| `mark-tile` | `#1b1b19` | Logo tile. |
| `mark-ink` | `#ffffff` | Logo glyph. |

There is **no** other colour. If you need to differentiate two things, use weight, size,
spacing, or a border — not hue.

**Accessibility:** every text/background pair must clear **4.5:1**; UI borders and icons **3:1**.
The ratios above are already verified — do not lighten them.

### 3.2 Typography

Two families only:

- **Sans:** `Inter` (fallbacks: SF Pro Text, system-ui). Used for everything human-readable.
- **Mono:** `JetBrains Mono` (fallbacks: ui-monospace, SF Mono, Menlo). Used for URLs, JSON,
  schema, hashes, key placeholders, model names, code, and any raw API value.

**Rule: one family does the talking. Weight and size do the work, not colour.**

Base body size is **14px / 1.55**. Headings are weight 600, letter-spacing −0.015em, margin 0.

| Style name | Size / line / weight | Use |
|---|---|---|
| `display/landing` | 62px / 1.05 / 600, ls −0.035em | Landing hero "APIs become interfaces." (mobile: 40px) |
| `heading/stage` | 32px / 1.15 / 600, ls −0.025em | Generated page title (mobile: 26px) |
| `heading/pane` | 26px / 1.2 / 600 | "Saved", "Settings" pane titles (mobile: 22px) |
| `heading/card` | 15px / 1.35 / 600 | Card titles, settings sub-heads |
| `heading/section` | 12px / 1.3 / 600, ls +0.07em, UPPERCASE, `muted` | Section dividers inside a generated page |
| `body` | 14px / 1.55 / 400 | Default |
| `body/strong` | 14px / 1.55 / 500 | Emphasis |
| `label` | 13px / 1.4 / 500, `muted` | Field labels, control labels |
| `caption` | 12.5px / 1.45 / 400, `muted` | Helper notes under fields |
| `micro` | 11.5px / 1.4 / 500, `muted-2` | Chips, timestamps, hashes |
| `button` | 13.5px / 1 / 500 | All buttons |
| `mono/code` | 12.5px / 1.65 | JSON, schema, headers textarea |
| `mono/inline` | 12px / 1.6 | URLs in lists, diff paths, hash chips |
| `metric/hero` | 44px / 1 / 600, ls −0.03em | The one headline number on a generated page |
| `metric` | 26px / 1.1 / 600 | Standard metric card value |

### 3.3 Spacing, radius, elevation

**Spacing scale (px):** 2, 4, 6, 8, 10, 12, 14, 16, 20, 22, 26, 32, 40, 50, 60.
Card padding 18–22px desktop, 16px mobile. Grid gutter 14px.

**Radius:** `r-2xs 4` · `r-xs 7` · `r-sm 9` · `r 12` · `r-lg 16`.
Buttons and inputs use `r-sm`. Cards use `r`. Large containers (setup card, request bar) use `r-lg`.
Pills and chips are fully rounded (999px).

**Shadow:**

| Token | Value |
|---|---|
| `sh-xs` | `0 1px 2px rgba(27,27,25,.05)` |
| `sh-sm` | `0 1px 2px rgba(27,27,25,.05), 0 2px 6px -2px rgba(27,27,25,.06)` |
| `sh` | `0 1px 3px rgba(27,27,25,.05), 0 8px 20px -10px rgba(27,27,25,.12)` |
| `sh-lg` | `0 2px 6px rgba(27,27,25,.04), 0 18px 46px -16px rgba(27,27,25,.20)` |

Cards use `sh-sm` at rest, `sh` on hover. `sh-lg` only for the onboarding card and the landing
specimen frame. Nothing heavier exists.

### 3.4 Motion (annotate in Figma; build as Smart Animate prototypes where useful)

- Duration **120–220ms**, `ease-out`. Motion **confirms an action; it never performs.**
- Allowed: fade+2px rise for a pane change, 100ms button press scale to 0.98, toast slide-up,
  live-dot pulse (1.6s, opacity 1 → 0.35 → 1), spinner rotate.
- Everything collapses under `prefers-reduced-motion` — design a reduced-motion note in the spec page.
- No parallax, no scroll-jacking, no entrance animations on data.

### 3.5 Iconography

**Stroke icons, 1.6px stroke, round caps and joins, 24×24 grid, `currentColor`.** Rendered at
14–22px. No filled icons, no duotone, no emoji in the UI, no icon libraries with a different
personality (no rounded-cartoon sets). Icons needed:

arrow-right · save (floppy) · plus · play (run) · trash · key · globe · grid (2×2) · clock ·
sparkle (generate) · chevron-left (back) · chevron-down (select) · copy · refresh · eye/raw ·
external-link · search · check · alert-triangle · x.

### 3.6 Touch & responsive rules

- On coarse pointers, every interactive target is **≥44px tall**. On desktop keep the dense
  38px sizing.
- Breakpoints: **≤720px** = mobile, **721–960px** = tablet (tighten grids, keep desktop chrome),
  **≥961px** = desktop.
- Keyboard focus is a **2px `ink` outline with 2px offset** — never a coloured glow. Show the
  focus state on at least one component per screen family in the component page.

---

## 4. Component library (design every variant)

### 4.1 Buttons — height 38px desktop / 44px touch, radius `r-sm`, 0 14px padding, gap 7px

| Variant | Rest | Hover | Active | Disabled |
|---|---|---|---|---|
| `dark` (primary) | fill `ink`, text `card` | fill lightens ~6% | scale .98 | 45% opacity |
| `default` | fill `card`, 1px `line`, text `ink` | fill `card-2` | — | 45% opacity |
| `ghost` | transparent, 1px `line`, text `ink-2` | fill `card-2` | — | 45% opacity |
| `danger` | ghost but text `red`, border `red` at 40% | fill `red-bg` | — | — |

Sizes: `lg` (46px, 15px text — landing and onboarding CTAs), default (38px), `xs` (28px, 12.5px —
inline Test/Copy/Clear buttons). `block` = full width. Icon-only = square `icon-btn`, 32px,
radius `r-xs`.

### 4.2 Inputs

- **Text / password input:** height 38px, `card` fill, 1px `line`, radius `r-sm`, 12px padding.
  Focus: border `ink`, plus the ink focus ring. Password and URL inputs use **mono**.
  Placeholder colour `muted-2`.
- **Key field:** an input with a leading 16px key icon in a 34px slot, divider optional.
- **Textarea (headers):** mono 12.5px, 5 rows, vertical resize, `bg-sink` fill.
- **Select (`mini-select`):** 30px tall, `card` fill, 1px `line`, radius `r-xs`, mono-ish label,
  chevron-down at 10px.
- **Switch:** 36×20 track, radius 999. Off: `line` track, `card` knob. On: `ink` track, `card`
  knob translated right. 16px knob, 2px inset.
- **Segmented control (`seg-btn`):** two or more buttons in a 1px `line` shell, radius `r-xs`.
  Active segment = `ink` fill, `card` text. Inactive = transparent, `muted` text.

### 4.3 Chips & pills

| Component | Look | States |
|---|---|---|
| `method-chip` | `GET` — mono 11px, uppercase, `ink` fill, `card` text, radius `r-xs`, 8px 9px padding | single |
| `meta-chip` | `card` fill, 1px `line`, radius 999, 11.5px, label in `muted` + value in `ink` weight 600 | default; **changed** = `yellow-bg` fill, `yellow-line` border, `yellow-ink` text |
| `badge-chip` | provenance badge: `Generated` / `From schema cache` / `Fallback` — 11.5px, `card-2` fill, 1px `line`, `muted` text | three label variants |
| `live-pill` | green dot (6px, pulsing) + `Live` + countdown — `green-bg` fill, `green` dot, `ink-2` text | idle / live |
| `key-pill` | header key status: `Google Gemini ready` / `No Groq key` / `No keys` | ready = green dot + `green-bg`; missing = `muted` text + `line` border; error = `red-bg` |
| `key-status` | inline status beside a key field: `Not set` / `Set` / `Not tested` / `OK` / `Rejected the API key` / `Unreachable` | missing (muted) · ok (green) · error (red) · pending (muted + spinner) |
| `hash-chip` | mono 11.5px `muted`, e.g. `a3f9c1e0` | single |

### 4.4 Cards & containers

- **Card:** `card` fill, 1px `line`, radius `r`, `sh-sm`, padding 18–22px. Optional `card-head`
  row (title left, badge right, 1px `line-soft` bottom border).
- **Code well:** header strip (label left in `micro` uppercase, actions right) over a `bg-sink`
  body with mono 12.5px, scrollable, radius `r-sm`.
- **Empty state:** centred, 60px vertical padding — 22px stroke icon in a 44px `bg-sink`
  rounded square, then `empty-title` (15px/600), then `empty-body` (13.5px `muted`, max 380px,
  centred), then an optional control.
- **Alert / banner:** full-width inside a pane, `red-bg` (error) or `yellow-bg` (notice), 1px
  matching line, radius `r-sm`, 14px padding, alert icon + bold title + body + optional inline link.
- **Toast:** bottom-centre (desktop) / bottom-full-width-with-16px-inset (mobile), `ink` fill,
  `card` text, radius `r-sm`, `sh-lg`, 13.5px, auto-dismiss.
- **Loading:** 18px ink spinner + 13.5px `muted` message, centred.
- **Skeleton:** `bg-sink` blocks, radius `r-xs`, subtle shimmer — used while a request is in flight.

### 4.5 Data-render components (used by the generated page — Section 5.6)

Design each of these as a Figma component. These are Imago's own renderer components; the
model only chooses *which* to use:

`title` · `text` · `metric` (+ `hero` and `quiet` emphasis) · `image` · `badges` · `list` ·
`table` · `keyValue` · `gauge` · `timeline` · `statBars` · `chart` (line/bar) · `link` ·
`jsonBlock` · `section`.

Specifics:

- **metric** — label in `label` style above, value in `metric` style, optional unit in `muted`
  trailing, optional sub-line. `hero` variant uses `metric/hero` and spans wider. `quiet` variant
  is `caption`-sized and sits in the fact sheet.
- **statBars** — row of `label · track · value`; track is `bg-sink` 8px tall radius 999, fill is
  `ink` (never coloured). Value right-aligned mono.
- **badges** — wrapped row of pills: `card-2` fill, 1px `line`, 12px, radius 999.
- **table** — header row `card-2` with `micro` uppercase labels, 1px `line-soft` row dividers,
  mono for values that are raw, sans for names. Horizontal scroll on mobile with a right-edge
  fade mask.
- **gauge** — horizontal meter, `bg-sink` track, `ink` fill, percentage label.
- **timeline** — vertical rail on mobile / horizontal rail on desktop, 132px tall, dot + time +
  label per event.
- **chart** — line or bar, ink strokes, `muted-2` mono 9.5px axis labels, no gridline clutter,
  no colour fills beyond a 6% ink tint.
- **jsonBlock** — a code well.
- **A changed value** in any of these gets the `yellow-bg` / `yellow-line` treatment plus a small
  `CHANGED` tag. Show this on at least one component per type.

### 4.6 Action buttons (on a generated page)

A row of pill buttons beneath the page title: `Follow →` (uses the link's label, e.g. "Species",
"Next page"), `Watch`, `Refresh`, `Raw JSON`. `card` fill, 1px `line`, radius 999, 34px tall,
13px. `Watch` toggles to an active state with the green live dot.

---

## 5. The pages — design each one for desktop **and** mobile

There are **6 primary pages** plus their states. Navigation model:

```
Landing  →  Onboarding (skippable)  →  App shell
                                        ├── Playground   (default)
                                        ├── Saved
                                        └── Settings
                                              ↓
                                   Generated Page (takes over the whole screen)
```

---

### 5.1 PAGE 1 — Landing

**Purpose:** explain the product in five seconds and get the visitor into the app. This is the
only marketing surface in the product. Full-bleed, no app chrome.

**The idea: the hero is the transformation itself.** No illustration. The visitor sees one real
API response turn into one real interface, side by side, the way Imago actually does it. The
name means metamorphosis: raw JSON on one side, its finished form on the other. That is the
whole pitch, and nothing else needs to be drawn.

**Banned on this page:** floating or tilted preview cards, a collage of unrelated widgets
(weather + Pokémon + GitHub), third-party logos, stock illustration, abstract shapes, blobs,
glows, device mockups, fake browser chrome with traffic-light dots. If a visual element isn't
real Imago output, cut it.

#### Top bar
18px 24px padding, no border, max-width 1180px:
- Left: logo tile (26px) + wordmark `Imago`.
- Right: text link `About` (13.5px, `ink-2`), then a `default` button **"Open app"**.
  *`About` shows a toast reading:* "Imago turns an API response into an interface, remembers the
  shape, and watches it change." Design that toast state.

#### Section A: headline (centred, desktop)
- 96px top padding.
- H1 `display/landing` (62px), centred, one line on desktop: **"APIs become interfaces."**
- Sub, 17px/1.55 `muted`, centred, max-width 560px: **"Paste a GET endpoint. Imago reads the
  response, designs a view that fits its shape, and remembers it."**
- CTA row, centred, 12px gap: `dark lg` **"Get started"** + arrow-right, and `ghost lg`
  **"Try an example"** (drops the visitor straight into the Playground with Pikachu loaded).
- A `caption` line beneath, `muted-2`: **"Runs in your browser. No account. Bring your own
  Gemini or Groq key, or use none."**

#### Section B: the specimen (the hero visual)
One wide frame, 1180px, 56px below the CTAs. `card` fill, 1px `line`, radius `r-lg`, `sh-lg`.
It has a slim header strip and two panes.

**Header strip** (44px, 1px `line-soft` bottom, 0 16px padding):
- Left: `GET` method chip + the URL in mono 12.5px `ink-2`:
  `https://pokeapi.co/api/v2/pokemon/pikachu`
- Right: an example switcher, a small segmented control: **`Pokémon` | `Weather` | `Library`**.
  Each segment swaps both panes (design all three states, see below).

**Left pane: "Response"** (40% width, `bg-sink` fill, 20px padding):
- `micro` uppercase label **"RESPONSE · 284 KB"**.
- ~22 lines of real, monochrome JSON in `mono/code`: keys in `ink-2`, punctuation in `muted-2`,
  values in `ink`. No syntax rainbow.
- Four of those lines carry a thin 2px `ink` left rule and a faint 4% ink tint. These are the
  fields the interface uses (`name`, `height`, `types[0].type.name`, `stats[0].base_stat`).
  The rest of the JSON stays quiet, which shows at a glance what Imago "read".
- The bottom 60px fades into `bg-sink` to say the response continues.

**Seam** (between the panes, 1px `line` vertical rule):
- Centred on the rule, a 28px circular `card` chip with 1px `line` holding the Imago mark at
  14px in `ink`. This is the only place the mark appears in the hero. It marks the point where
  the response becomes an interface.

**Right pane: "Interface"** (60% width, `card` fill, 24px padding). This is real rendered
Imago output using the components from §4.5, not a sketch:
- `micro` label **"INTERFACE"** + a `badge-chip` **"From schema cache"**.
- Title **"Pikachu"** (28px/600).
- Hero tier: sprite image (96px, on a `bg-sink` rounded square) beside two hero metrics:
  **Height 0.4 m** and **Weight 6.0 kg**.
- Badges: `Electric`.
- Section divider `BASE STATS`, then a 6-row `statBars` block (HP 35, Attack 55, Defense 40,
  Sp. Atk 50, Sp. Def 50, Speed 90; max 255). Ink fills only.

Each highlighted JSON line on the left corresponds to exactly one element on the right.
Annotate the mapping in the Figma file with a hairline connector for the prototype hover state
(hovering a highlighted line outlines its component on the right). The connectors are not
visible at rest.

**The three example states** of the specimen (same frame, swap content):
1. **Pokémon**, as above. Layout `profile`.
2. **Weather, "Chennai"**. Layout `dashboard`: hero `31°C`, fact strip (Humidity 72%, Wind
   11 km/h, Updated **08:03**), a 24-point ink line chart. One value (temperature) shows the
   yellow `CHANGED` flag with `was 30°C`, the only use of colour in the hero, and it means what
   it always means.
3. **Library, "the hobbit"**. Layout `table`: four rows, Title / Author / First published.

**Motion (prototype, respects reduced-motion):** on load, the right pane's components appear in
tier order (hero, facts, structures), 60ms apart, 180ms fade + 4px rise each. Switching
examples crossfades both panes in 200ms. Nothing loops, nothing moves on its own after that.

#### Section C: three proofs (replaces the old icon-feature row)
Three columns, 1180px, 72px below the specimen, 32px gap. No icons. Each column is a short
`heading/card` title, a two-line `body` explanation in `ink-2`, and one small real UI element as
proof, taken from the component library:

| Title | Body | Proof element |
|---|---|---|
| **Reads the shape** | "Values become types, types become a fingerprint. Two responses with the same structure share one design." | a `hash-chip` `a3f9c1e0` beside a two-line mono schema snippet `{ "temperature": "number" }` |
| **Remembers it** | "A shape it has seen before costs no model call. Refresh an endpoint for an hour and pay for one design." | the `badge-chip` **"From schema cache"** + a `meta-chip` `Schema Cached` |
| **Watches it change** | "Auto-refresh every 10, 30 or 60 seconds. The values that moved are marked, not buried." | the green `live-pill` `● Live 24s` + a yellow `meta-chip` `Changed 3` |

A 1px `line` rule above the row. This section is where "memory and time are the product" gets
said, in the product's own components.

#### Section D: footer
A single quiet row, 48px padding, 1px `line` top: logo tile 20px + `Imago` left; right, `caption`
text: **"imago (n.): the final, fully formed stage after metamorphosis."** No link farm.

#### Mobile (390)
- Top bar 16px 20px padding; `About` as a text link, `Open app` as an `xs` default button.
- Section A: 48px top padding, H1 **40px, left-aligned, two lines** ("APIs become /
  interfaces."), sub left-aligned 16px, CTAs **stacked full-width** (Get started above Try an
  example), 20px page inset.
- Section B: the specimen **stacks vertically** and stays one card:
  - Header strip: URL truncates with ellipsis; the example switcher moves to its own row beneath
    the URL as a full-width 3-segment control (44px tall).
  - Response pane first, **capped at 9 visible lines** with the bottom fade, highlighted lines
    kept inside those 9.
  - The seam becomes horizontal: a 1px rule with the 28px mark chip centred on it.
  - Interface pane below, single column: sprite + title row, two hero metrics side by side,
    badges, stat bars full-width.
- Section C: the three proofs stack, 32px apart, each proof element under its text.
- Footer stacks, centred.
- The page must not scroll horizontally at 360px.

---

### 5.2 PAGE 2 — Onboarding / API key setup

**Purpose:** collect a Gemini or Groq key before first use — and make skipping it feel fine,
because Imago works without one.

A single centred card on a `bg` page, no app chrome. Card: `card` fill, radius `r-lg`, `sh-lg`,
max-width 440px, padding 40px 36px 30px (mobile 32px 24px 26px).

Contents, top to bottom, all centred:
1. Logo tile at 44px.
2. H2 **"Let's get started"** (`heading/pane` scaled to 22px).
3. Sub, 14px `muted`: **"Add a Gemini or Groq API key to generate interfaces. Either one works."**
4. Key field 1 — key icon, mono placeholder **`Gemini key (AIza…)`**, type password.
5. Key field 2 — key icon, mono placeholder **`Groq key (gsk_…)`**, type password.
6. Note, `caption`: **"Keys are kept in this browser's local storage, so they survive a restart.
   Anyone with this browser profile can read them."**
7. Primary `dark lg block` button: **"Continue"** + arrow-right.
8. Text link beneath: **"I'll add it later"** (`muted`, underline on hover).
9. Footer hint, `caption` with mono spans: **"Free keys: `aistudio.google.com/apikey` or
   `console.groq.com/keys`"**

**States to design:** empty · one key filled (dots + a green `Set` marker appearing) · focused
field · both empty and "Continue" pressed (no error — it just proceeds, same as "later").

**Mobile:** the card becomes near-full-width (16px page inset), vertically centred with 32px
minimum top padding, and scrolls if the keyboard is up. Show one mobile frame with an on-screen
keyboard raised and the field focused.

---

### 5.3 PAGE 3 — The app shell (chrome shared by Playground / Saved / Settings)

**App bar** — sticky, 60px tall desktop / 56px mobile, `card` fill, 1px `line` bottom, 0 24px
padding (16px mobile):

- **Left:** logo tile 24px + wordmark `Imago`. Clickable (returns home). **On mobile the wordmark
  is hidden** — tile only.
- **Centre-left:** tab nav, `role=tablist`, three tabs: **Playground · Saved · Settings**.
  13.5px. Active = `ink` text with a 2px `ink` underline flush to the bar's bottom border.
  Inactive = `muted`, hover `ink-2`. Mobile: 13px, 7/9 padding, horizontally scrollable if needed.
- **Right:** the `key-pill` (e.g. `Google Gemini ready` / `No Groq key` / `No keys`) — clicking it
  opens Settings — then a 28px circular avatar in `bg-sink` with a single ink initial `S`.
  **On mobile the key-pill is hidden**; the avatar stays.

**Main area:** max-width 1180px, centred, padding 32px 24px 80px desktop / 22px 16px 60px mobile.

Design the app bar as a component with variants: `playground-active`, `saved-active`,
`settings-active`, and `mobile`.

---

### 5.4 PAGE 4 — Playground (the default page)

This is the working surface: a request bar, controls, run metadata, and a five-tab response area.

**A. Request bar** — a single `card`-filled row, 1px `line`, radius `r-lg`, `sh-sm`, 7px padding:
`[GET chip] [URL input — mono, flex-1] [dark square arrow button]`.
URL placeholder: **"Enter an API URL (e.g. https://pokeapi.co/api/v2/pokemon/pikachu)"**.
Mobile: keep all three inline (they fit at 360px) — gap 7px, URL text 12.5px, GET chip 11px.

**B. Request tools row** — beneath, wrapped, 14px gap:
- `ghost` button **"Save"** with the floppy icon.
- Group: label **"Build"** + segmented control **`Structured` | `HTML`**
  (tooltips: *"Structured plan: the model returns JSON, Imago renders it"* /
  *"Full HTML: the model writes the whole page, shown sandboxed"*).
- Group: label **"Examples"** + a `mini-select`.
- Group: label **"Auto-refresh"** + switch + a `mini-select` with `10s / 30s / 60s`
  (disabled until the switch is on).
- A `live-pill` at the end, hidden until auto-refresh is on: `● Live 24s`.

Mobile: this row wraps to two or three lines, 10px gap; each group stays intact.

**C. Run metadata strip** — a row of `meta-chip`s, hidden before the first request:
`Last checked 12s ago` · `Size 4.2 KB` · `Schema Cached` · `Changed 3` · `Next in 18s`.
The **Changed** chip turns yellow when the count is > 0. The **Next in** chip only appears when
auto-refresh is running. Mobile: horizontally scrollable, no wrap.

**D. Tab strip** — five tabs: **Interface · Response · Schema · Changes · Headers**.
13.5px, 2px active underline in `ink`, inactive `muted`. Hidden until a request has run.
**Mobile:** the strip scrolls horizontally with the scrollbar hidden and a **22px right-edge fade
mask** so the fifth tab is visibly reachable. Design that mask.

**E. Tab panes** — each is a `card`:

1. **Interface** — the generated view, with a `card-head` showing the interface title and a
   `badge-chip` reading `Generated`, `From schema cache`, or `Fallback`.
2. **Response** — code well, header label **"Raw response"**, an `xs` **Copy** button, mono JSON,
   syntax kept monochrome (no rainbow highlighting; use weight and `muted` for punctuation/keys).
3. **Schema** — code well, header label **"Structural schema"** + a `hash-chip` with the
   fingerprint. Body shows values replaced by their types, e.g.
   `{ "temperature": "number", "humidity": "number" }`.
4. **Changes** — a list of changed paths. Each row: mono path (left, wraps) + `old → new` values
   (right, mono, `yellow-ink` on `yellow-bg` for the new value). Beneath, a **"Snapshots"**
   sub-section listing up to 10 stored snapshots with a relative time and size; only the newest
   shows a body indicator. Mobile: each diff row stacks vertically, 4px gap.
5. **Headers** — a label, then a mono textarea, placeholder:
   ```
   Authorization: Bearer ...
   X-Example: value
   ```
   plus a `caption` explaining: *"One `Name: value` per line. Credential headers are kept only for
   this tab and are dropped when you save a request."*

**Playground states to design (each as its own frame, desktop + mobile):**

| State | What it shows |
|---|---|
| **P-1 Empty (first run)** | Request bar empty, tools row visible, no metadata, no tabs. Interface card holds an empty state: a 22px window/table stroke icon; title **"Explore any API"**; body **"Enter an API endpoint and Imago will turn the response into a readable interface."**; a `micro` uppercase label **"Try an example"**; and an examples `select`. |
| **P-2 Loading** | Spinner + message (e.g. "Fetching response…", "Designing the interface…"). |
| **P-3 Ready to generate** (new schema — a real model call would be spent) | Centred: a sparkle icon, title **"Ready to generate"**, body **"Imago will read this response and design an interface that fits it. This shape is new, so it takes one model call — after that it is remembered."**, then a `dark lg` button **"Generate interface"**. |
| **P-4 Rendered — cached** | A full interface with the `From schema cache` badge and the metadata strip populated. |
| **P-5 Rendered — live/watching** | Auto-refresh on: green live pill in the tools row, `Next in 18s` chip counting down, two or three values flagged `CHANGED` in yellow. |
| **P-6 No-key fallback** | A `yellow-bg` banner above the interface: title **"No API key — showing a basic interface"**, body naming where to paste a key and that free keys exist, with an inline link **"Open Settings"**. Below it, a simplified heuristic interface (title field + primary image + a handful of scalars). |
| **P-7 Request failed (CORS)** | `red-bg` alert: **"This endpoint can't be reached from a browser"**, body explaining it doesn't send CORS headers and that no browser-only app can read it. The request bar shows a red focus border. |
| **P-8 Request failed (HTTP error)** | `red-bg` alert with the status, e.g. **"404 — the endpoint returned no data"**. |

**Examples in the dropdown** (use these real entries in the design):
Pokémon · Weather · Dictionary · Currency · Trivia · Library · Thirukkural · Wikipedia ·
Sunrise & Sunset · Charizard.

---

### 5.5 PAGE 5 — Saved

**Purpose:** the small library of requests the user kept.

**Pane head:** H2 **"Saved"** (`heading/pane`) on the left; a `dark` button **"New request"**
with a plus icon on the right.

**List:** each row is a `card`-like `li`, 1px `line`, radius `r`, 14px 16px padding, 10px between rows:

```
[avatar]  [name (14px/600)            ]  [Last used ]  [▶] [🗑]
          [url  (mono 12px, muted,    ]  [2h ago    ]
           truncated with ellipsis)   ]
```

- **avatar** — 32px rounded square, `bg-sink`, one ink initial from the name.
- **actions** — two 32px `icon-btn`s: play (tooltip *"Run this request"*) and trash
  (tooltip *"Delete"*, `danger` variant, `red` on hover).
- Hover: row lifts to `sh`, border darkens slightly.

**Mobile layout** — the row wraps into three lines:
line 1 = avatar + name (name takes `calc(100% − 52px)`), line 2 = the URL, line 3 = "Last used
2h ago" **left-aligned** on its own full-width line, with the two action buttons pushed to the
right of that line. Design this exactly — it is the specified mobile behaviour.

**Empty state:** title **"Nothing saved yet"**, body **"Run a request in the Playground and press
Save to keep it here."**

**Extra states:** delete-confirmation toast (**"Deleted. Undo"**) · a long list (8+ rows, showing
scroll) · a very long URL truncating.

---

### 5.6 PAGE 6 — The generated page ("the stage")

**This is the product's payoff screen and the most important thing to design well.**

When an interface renders and the user opens it, it **takes over the entire screen**. The request
bar, tabs, metadata chips and app navigation all step aside. What remains is the generated page
and a single **Back** control.

**Stage bar** — sticky, 52px, `card` fill, 1px `line` bottom, 0 20px padding (12px mobile):
- Left: a 34px `icon-btn` **Back** (chevron-left), `aria-label="Back"`.
- Centre-left: **crumb** — mono 12.5px `muted`, e.g. `pokeapi.co / pokemon / pikachu`, ellipsised.
  **On mobile this crumb must NOT be hidden** — it is the only thing naming the host and the depth.
  Let it shrink and ellipsise instead (`flex: 1 1 auto; min-width: 0`).
- Right: optional `live-pill` (when watching) and the provenance `badge-chip`.

**Page body** — max-width 1180px (narrower, 820px, for the `article` layout), padding 34px 24px 80px.

- **Page title** — `heading/stage`, the interface's own title (e.g. "Pikachu", "Chennai weather").
- **Action row** — the pill buttons from §4.6: `Species →`, `Next page →`, `Watch`, `Refresh`,
  `Raw JSON`. (A follow action whose link isn't present at render time is simply absent.)
- **Content** — a 12-column grid, 14px gutter, split into **three tiers separated by
  `heading/section` dividers**:
  1. **Headline** — one or two hero values (`metric/hero`), spanning wide.
  2. **Fact sheet** — a dense `keyValue` / small-metric strip, 4 across desktop, **2 across mobile**.
  3. **Structures** — the wide things: tables, charts, timelines, stat bars, `jsonBlock`.

  **A page of identically sized cards is not an interface.** The tiers must be visibly different
  in weight and size. On mobile every component spans all 12 columns.

**Design these seven layout variants** (each is a `layout` the model can choose) — desktop + mobile:

| Layout | Design as |
|---|---|
| `profile` | **Pokémon — "Pikachu".** Sprite image left, hero metrics (Height 0.4 m / Weight 6.0 kg), type badges (`Electric`), and a 6-row statBars block (HP, Attack, Defense, Sp. Atk, Sp. Def, Speed, max 255). Actions: `Species →`, `Refresh`, `Raw JSON`. Mobile: sprite full-width on top, one column. |
| `dashboard` | **Weather — "Chennai".** Hero metric `31°C`, fact strip (Humidity 72%, Wind 11 km/h, Feels like 34°C, Updated 08:03), and a wide 24-point temperature line chart. Show a `CHANGED` yellow flag on the temperature. |
| `table` | **Library search — "the hobbit".** A 5-row table: Title / Author / First published / Edition count. Mobile: horizontal scroll with the right fade mask. |
| `list` | **Trivia — 5 questions.** Numbered list cards, each with the question in `body/strong` and the category as a quiet badge. |
| `article` | **Wikipedia summary — "Chennai".** Narrower 820px column, a lead image, a title, and readable prose at 16px/1.7. This is the one place where reading measure beats density. |
| `timeline` | **Sunrise & Sunset.** A rail with dawn / sunrise / solar noon / sunset / dusk, each showing the humanised time (`06:12`) with the date beneath. |
| `raw` | Fallback: the whole response as one `jsonBlock` with a short heuristic header. |

**Humanised values — show this off in the designs.** Imago rewrites raw values for humans, and
keeps the untouched value one hover away (design the tooltip):
- `2026-09-20T08:03:52+02:00` → **08:03** with the date beneath in `muted`.
- `44036` under `day_length` → **12h 13m**.
- `64.51` under `moon_illumination` → **64.51%** with a meter beneath it.

**Generated-page states:** at rest · watching (live pill + a countdown + 2 changed values in
yellow) · followed two levels deep (crumb shows the depth) · `Raw JSON` revealed at the page
bottom · the HTML-builder variant (the model wrote the whole page, shown in a visibly sandboxed
frame with a `caption` note: *"Rendered sandboxed — scripts disabled."*).

---

### 5.7 PAGE 7 — Settings

**Pane head:** H2 **"Settings"**.

**Layout:** a responsive card grid — **2 columns on desktop** (auto-fit, min 380px, 16px gap),
**1 column on mobile**. Five cards:

**Card 1 — "Model provider"**
- A full-width select: `Google Gemini` / `Groq`.
- Hint `caption`: *"Get a free key at `aistudio.google.com/apikey`. Pasting a key below switches
  this automatically."*
- Label "Model" + a text input (`gemini-2.5-flash-lite`, or `openai/gpt-oss-20b` for Groq), and a
  note: *"If this model is unavailable, try `gemini-3.5-flash`."*

**Card 2 — "API keys"** — two blocks:
- **Google Gemini `AIza…`** + inline `key-status` (`Not set` / `Set`), a key-icon password field
  (placeholder "Paste your Gemini API key"), then a row with an `xs` **Test** button and a
  `key-status` (`Not tested` / `OK` / `Rejected the API key`).
- **Groq `gsk_…`** — identical shape, placeholder "Paste your Groq API key".
- Footer note: *"Saved in this browser only — anyone with this profile can read them. Typing
  selects that provider."*
- A `ghost` button **"Clear all keys"**.

**Card 3 — "Try it"** (a small chat console proving the provider answers)
- Note: *"Send a message to the provider you have selected. Same key, same model, same code path
  the interface builder uses — so if this answers, generating works."*
- Meta row: a `key-status` naming the target (`Google Gemini · gemini-2.5-flash-lite` / `No
  provider`) with an `xs` **Clear** button pushed right.
- **Chat log**: `card-2` fill, 1px `line`, radius `r-sm`, 10px 12px padding, **max-height 260px,
  scrolls internally**. Empty text: *"Nothing sent yet."*
  Each turn: a 12px/600 `muted` role line (`You` / `Gemini` / `Error`) then the text at
  13.5px/1.5, pre-wrapped. Error turns use `red-ink` for both lines.
  A **reasoning-model turn** has an extra collapsible `▸ Thinking` disclosure whose body is
  12.5px `muted` with a 2px `line` left border and 8px left padding. Design collapsed + expanded.
- **Chat form:** a flex row — text input (placeholder "Ask it something…") + a **Send** button.

**Card 4 — "Interface"**
- A select: `Structured plan (default)` / `Full HTML page`.
- Note: *"Full HTML renders sandboxed with scripts disabled. Applies to the next request."*

**Card 5 — "Stored data"**
- A `caption` summary line: *"12 saved requests · 8 interfaces · 34 snapshots · about 284 KB"*.
- A `ghost danger` button **"Clear all saved data"**, plus a confirmation state.

**Mobile:** single column, cards full-width, 16px page inset, the chat log capped at 220px.

---

### 5.8 PAGE 8 — States, edge cases & system feedback (one frame set)

Design these as a gallery, desktop and mobile:

1. Toast — neutral, success, and the landing "About" toast.
2. Error alert — CORS, HTTP 4xx/5xx, invalid URL, model refused/returned bad JSON
   (*"The model's reply didn't match the interface format. Retrying in plain JSON mode."*).
3. The no-key fallback banner.
4. Loading — spinner and the skeleton interface.
5. Focus-visible ring on: a button, an input, a tab, a select.
6. Disabled states: the refresh-interval select before the switch is on; the "Generate interface"
   button mid-call.
7. A 284 KB JSON response in the Response tab (showing the scroll container hold up).
8. A very long URL in the request bar and in a Saved row.
9. `prefers-reduced-motion` annotation.
10. Keyboard map annotation: **Esc** = Back from a generated page; browser Back does the same;
    **⌘/Ctrl + Enter** sends the request; tab order runs URL → Send → tools → tabs → content.

---

## 6. Content & copy to use verbatim

Use real endpoints and real-looking data in every frame. Never use "Lorem ipsum",
never use `example.com`, never use fake stat placeholders like `XX`.

| | URL |
|---|---|
| Pokémon | `https://pokeapi.co/api/v2/pokemon/pikachu` |
| Weather | `https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1` |
| Dictionary | `https://api.dictionaryapi.dev/api/v2/entries/en/hello` |
| Currency | `https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,INR` |
| Trivia | `https://opentdb.com/api.php?amount=5` |
| Library | `https://openlibrary.org/search.json?title=the+hobbit&limit=5` |
| Thirukkural | `https://tamil-kural-api.vercel.app/api/kural/1` |
| Wikipedia | `https://en.wikipedia.org/api/rest_v1/page/summary/Chennai` |
| Sunrise & Sunset | `https://api.sunrise-sunset.org/json?lat=13.0827&lng=80.2707&formatted=0` |
| Charizard | `https://pokeapi.co/api/v2/pokemon/charizard` |

---

## 7. Acceptance checklist

Before considering the file done, verify:

- [ ] Every screen in Section 5 exists at **1440** and at **390**.
- [ ] The landing hero is the JSON → interface specimen. No floating cards, no illustration, no
      third-party logos, no device or browser mockup.
- [ ] No purple, no gradient, no colour outside Section 3.1.
- [ ] Page background is `#f6f5f1`, not white. Text is `#1b1b19`, not black.
- [ ] Only `Inter` and `JetBrains Mono` appear. Every raw API value is mono.
- [ ] Yellow appears **only** where something changed; green **only** for live/OK; red **only**
      for failure.
- [ ] Every interactive component has rest / hover / active / focus / disabled variants.
- [ ] Touch targets on the 390px frames are ≥44px.
- [ ] The generated page has three visibly distinct tiers, not a uniform card wall.
- [ ] The mobile Saved row wraps to three lines as specified.
- [ ] The mobile tab strip has the right-edge fade mask.
- [ ] The mobile stage crumb is present, not hidden.
- [ ] All copy matches this document word for word.
- [ ] Every colour, size, radius and shadow is bound to a Figma variable, not hard-coded.
