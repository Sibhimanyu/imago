## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
_GS=""
for _D in "${GSTACK_ROOT:-}" "$HOME/.claude/skills/gstack" "$HOME/.codex/skills/gstack" "$HOME/.factory/skills/gstack" "$HOME/.kiro/skills/gstack" "$HOME/.config/opencode/skills/gstack" "$HOME/.slate/skills/gstack" "$HOME/.cursor/skills/gstack" "$HOME/.openclaw/skills/gstack" "$HOME/.hermes/skills/gstack" "$HOME/.gbrain/skills/gstack" "$HOME/.gstack/repos/gstack"; do
  [ -z "$_GS" ] && [ -n "$_D" ] && [ -d "$_D/bin" ] && _GS="$_D"
done
[ -n "$_GS" ] && echo "GSTACK_OK: $_GS" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing (Aside first, the bundled gstack browser as fallback).
Use the resolved install path above for gstack file paths
(default: ~/.claude/skills/gstack).

## Testing

```bash
npm test
```

Vitest + jsdom. Tests live in `test/`; read **TESTING.md** before adding any —
`app.js` is a single IIFE reached through a `window.__imago` test seam, `boot()`
is async and must be awaited, and jsdom has two traps (Storage is a Proxy, there
is no layout) that the harness documents.

Expectations:

- 100% coverage is the goal — tests are what make fast iteration safe here.
- New function → write a test for it.
- Bug fix → write a regression test that fails without the fix, then
  **mutation-check it**: break the fix on purpose and confirm the suite goes
  red. Three tests in this repo once passed regardless of what the source did.
- New conditional → test both paths. New error path → trigger it.
- Never commit code that makes an existing test fail.

`app.js` ships unbundled, so a syntax error is a blank page, not a build error.
CI runs `node --check app.js` and `./publish.sh` alongside the suite.

## Figma stays in sync

The code is the source of truth and the Figma file mirrors it. CI runs
`npm run design:check`, which fails when `index.html`, `styles.css` or the
tokens changed since the last Figma sync. Any change to what renders (including
DOM built in `app.js`) must be carried into Figma in the same branch, using the
steps in **DESIGN.md → Figma sync**: `design:tokens`, `design:shots`,
`design:figma` → `use_figma` + `upload_assets`, then `design:stamp`. Never
stamp without actually updating Figma.
