# Imago brand handoff

This is the branding handoff for the current accepted identity. It is written
for another agent or designer who needs to continue the product without
reopening the logo exploration.

Visual source of truth: `brand/identity.html`

Current preview: `http://127.0.0.1:5275/brand/identity.html` when the local
server is running from this repo.

Tagline: **APIs become interfaces.**

## Product

Imago is a browser-only API playground. A user pastes a public GET endpoint,
Imago fetches the JSON, understands the response shape, asks an LLM to design
the right interface for that shape, and renders the result in the browser.

Most API tools stop at formatted JSON. Imago tries to show the interface already
latent inside the response: a Pokemon endpoint becomes a profile with stats, a
weather endpoint becomes metrics and a chart, a book search becomes a table.

The three product ideas:

| Idea | Meaning |
|---|---|
| Explore | Fetch any public GET endpoint in the browser |
| Remember | Cache the interpretation of a response shape |
| Watch | Refresh and highlight exact value changes |

## Name

Imago means image in Latin. In biology, an imago is the final adult form reached
after metamorphosis. That is the brand idea: raw API responses arrive at their
finished visible form.

Important nuance: Imago is about the final formed view, not generic motion. The
logo should feel like an interface has been revealed from the response, not like
data is simply flying across the screen.

## Accepted Identity

The accepted mark is called **Reveal**.

It has two roles in one abstract construction:

1. Incoming API fields enter from the left.
2. Those fields become one rounded interface body.
3. A precise aperture is cut from the body, representing the usable window or
   view found inside the response.

The mark is intentionally abstract. Do not literalize it with braces, brackets,
screens, stars, arrows, eyes, or gradients.

### Imago Mark SVG

Use this geometry for the product mark on a `0 0 32 32` viewBox:

```svg
<rect x="4.2" y="6.4" width="12.8" height="6" rx="3"/><rect x="3" y="14.3" width="11.5" height="6" rx="3"/><path fill-rule="evenodd" d="M13.6 6.4h8c4.4 0 7 2.9 7 7.3v7.1c0 4.2-2.7 6.8-6.9 6.8h-8.1c-3.8 0-6-2.3-6-6.1v-9c0-3.8 2.2-6.1 6-6.1Zm7.8 6.2c-1.4 0-2.3.9-2.3 2.3v4.4c0 1.4.9 2.3 2.3 2.3h.7c1.4 0 2.3-.9 2.3-2.3v-4.4c0-1.4-.9-2.3-2.3-2.3h-.7Z"/>
```

### Meaning

The two horizontal fields are API response fields. Their overlap with the larger
rounded body makes the mark feel like one connected transformation, not separate
decorative lines. The aperture on the right is the interface window. It is a
knockout, not a drawn panel, because the product is revealing a view already
contained inside the data.

Use this explanation in human-facing brand copy:

> Imago turns incoming API structure into a usable window. The mark shows the
> response entering as fields, joining into one interface body, and revealing the
> view inside.

Keep the phrasing plain. Do not over-explain the logo in the UI.

## Mascot: Amigo

The mascot is **Amigo**.

Amigo is not a separate cartoon character and not a rotated Imago mark. It is a
controlled derivation of the same design DNA:

- same rounded body logic
- same internal aperture
- same soft, abstract geometry
- incoming fields from Imago become centered legs

Amigo stands for help, companionship, and system guidance. It can appear in
loading, empty, onboarding, success, and error states. It should not replace the
Imago logo in navigation, favicons, app icons, or product identification.

### Amigo SVG

Use this geometry for the mascot on a `0 0 32 32` viewBox:

```svg
<g fill="currentColor">
  <rect x="9" y="21.5" width="6" height="8.5" rx="3"/>
  <rect x="17" y="21.5" width="6" height="8.5" rx="3"/>
  <path fill-rule="evenodd" d="M13 3h6c4.4 0 7 2.9 7 7.3v9c0 4.2-2.7 6.7-6.9 6.7h-6.2C8.7 26 6 23.5 6 19.3v-9C6 5.9 8.6 3 13 3Zm.2 6c-1.4 0-2.3.9-2.3 2.3v.7c0 1.4.9 2.3 2.3 2.3h5.6c1.4 0 2.3-.9 2.3-2.3v-.7c0-1.4-.9-2.3-2.3-2.3h-5.6Z"/>
</g>
```

### Mascot Description

Use this description when handing the mascot to another agent:

> Amigo is the Imago system standing up to help. The product mark shows API
> fields entering from the side and becoming a window. The mascot takes that
> same body and aperture, then centers the fields into two legs so the abstract
> form can behave like a companion without becoming a cartoon.

Rules:

- No eyes, mouth, arms, hands, shoes, hats, speech bubbles, or facial features.
- No animal, robot, or human body. It must stay abstract.
- No extra colours. Amigo inherits `currentColor`.
- No rotation of the Imago mark as a shortcut.
- No mascot in the product wordmark.
- Use Amigo sparingly, mostly where the app is explaining, waiting, or recovering.

If a reclining or horizontal Amigo pose is ever needed, the rationale is:

> Amigo rests in the same horizontal flow as the incoming API stream, then stands
> when the app has something useful to show.

That pose is optional. The current accepted mascot is the upright, centered-leg
version.

## Voice

Plain, precise, and calm.

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
- Use exact numbers when available.
- Admit browser/API/LLM limits directly.
- Lowercase the tagline only in compact chrome: `apis become interfaces`.
- Use sentence case in prose and headlines: "APIs become interfaces."

## What Not To Reopen

These directions were explored and rejected:

- Braces or JSON brackets: meaningful but too generic for developer tools.
- Butterfly wings: on-name, but naive wing geometry collapses at small sizes.
- Literal browser frame: readable, but too close to sidebar/layout icons.
- Loose rows plus pane: good product story, but less ownable than Reveal.
- Over-refined row/window variants: they made the mark more literal and less
  distinctive. Keep the current `brand/identity.html` version.

## Files

| File | Purpose |
|---|---|
| `brand/identity.html` | Visual source of truth for logo, mascot, sizes, lockups |
| `assets/imago-mark.svg` | Bare Imago mark |
| `assets/imago-icon.svg` | Imago mark on dark rounded tile |
| `assets/imago-logo.svg` | Mark plus wordmark export |
| `assets/amigo-mascot.svg` | Amigo mascot export |
| `favicon.svg` | Browser favicon |
| `brand/og.html` | Source for `og.png` |
| `docs/BRAND-SYSTEM.md` | Brand rules |
| `docs/CODE-INTEGRATION.md` | How to update the code if the identity changes |
| `DESIGN.md` | Agent-facing design handoff |

## Acceptance Standard

Future brand work should preserve:

1. The Reveal mark as the Imago product identity.
2. The Amigo mascot as a derived companion, not a separate illustration style.
3. One-colour SVG geometry using `currentColor`.
4. Legibility at 16px.
5. Warm-paper product UI, quiet typography, and semantic colour.
6. The core story: APIs become interfaces.
