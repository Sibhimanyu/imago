# Imago Design Handoff

This file is for the next agent. Treat it as the short source of truth for the
current product design and brand direction.

Visual brand board: `brand/identity.html`

Tagline: **APIs become interfaces.**

## Product Feel

Imago is a quiet developer tool, not a marketing toy. It helps users turn API
responses into usable browser interfaces.

The UI should feel:

- precise
- warm
- technical
- calm
- browser-native
- useful before decorative

Avoid:

- hype language
- purple AI gradients
- oversized marketing sections inside the app
- decorative mascots in dense workflows
- colours that do not carry meaning

## Brand System

The accepted logo is **Reveal**.

Meaning:

> Incoming API fields become a proper window.

The mark has two horizontal response fields on the left. They connect into a
single rounded body. A small internal aperture on the right represents the
usable interface revealed inside the response.

Kept by explicit preference on 21 Sep 2026 after a counterform alternative was
built and rejected. Known tradeoff, recorded so it is not re-raised: at large
sizes the two left fields plus the tall aperture can read as a padlock, and below
24px the fields merge into the body. The decision is to accept that.

Geometry, on the 32-unit grid:

```
<rect x="4.2" y="6.4" width="12.8" height="6" rx="3"/>
<rect x="3" y="14.3" width="11.5" height="6" rx="3"/>

M13.6 6.4h8c4.4 0 7 2.9 7 7.3v7.1c0 4.2-2.7 6.8-6.9 6.8h-8.1c-3.8 0-6-2.3-6-6.1v-9c0-3.8 2.2-6.1 6-6.1Zm7.8 6.2c-1.4 0-2.3.9-2.3 2.3v4.4c0 1.4.9 2.3 2.3 2.3h.7c1.4 0 2.3-.9 2.3-2.3v-4.4c0-1.4-.9-2.3-2.3-2.3h-.7Z
```


## Figma sync

The code is the source of truth. The Figma file
([Imago UI](https://www.figma.com/design/g6e4FgSFY7xnAXdZnsMZop)) mirrors it,
and CI keeps it that way: `npm run design:check` fails when the UI changed
since Figma was last synced.

What is mirrored:

- **Tokens.** Every custom property in the `:root` block of `styles.css` is
  extracted to `design/tokens.json` and written to the Figma `imago` variable
  collection (`color/*`, `radius/*`). A new kind of token fails the extractor
  until it is given a group.
  The `:root[data-theme="dark"]` block is the dark theme: its colours land in
  `tokens.json` under `dark` and become the **Dark** mode of the same
  variables (the first mode is **Light**). A colour a dark theme needs to
  restate must be a token, never a literal in a rule.
- **Screens.** Page **00 Shipped** holds a screenshot of every screen as it
  ships, desktop (1440) and mobile (390): landing, empty page, a page, the
  inspector, the Settings sheet and the Endpoints sheet. The `*-dark` shots are
  the landing, a page and Settings from a dark system. They are captured
  from the real app, so they cannot drift from it. Never edit them by hand.
- **The stamp.** `design/figma-sync.json` records a hash of the UI surface
  (`index.html` + `styles.css`) at the last sync, plus the Figma node ids.
  `js/` is not hashed (most of it is not UI); when a change to it alters
  what renders, sync anyway.

After any UI change, before merging:

```bash
npm run design:tokens   # if styles.css :root changed
npm run design:shots    # headless Chrome → design/shots/*.png
npm run design:figma    # prints the use_figma script
```

Then, through the Figma MCP: run the printed script with `use_figma` (it
upserts tokens and sizes the frames, and returns their ids), upload each
`design/shots/<id>.png` with `upload_assets` onto its frame id, and update any
editable design frames on the other pages that the change affects. Finish with
`npm run design:stamp` and commit the stamp with the change.

Design work goes the other way: explore in Figma on the editable pages, build
it, and the next sync makes **00 Shipped** match. Pages marked **Archive** are
the pre-redesign screens, kept for reference.
