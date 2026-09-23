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
the app is native ES modules in `js/` (entry `js/main.js`), which the harness
bundles for jsdom and reaches through a `window.__imago` test seam, `boot()`
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

`js/` ships unbundled, so a syntax error or a missing import is a blank page,
not a build error. CI runs `npm run check` (bundles `js/main.js` and checks every
cross-module name is imported) and `./publish.sh` alongside the suite. A new
top-level function another module uses must be added to its module's `export`
list and imported where it is used; a helper the tests need goes on the seam in
`js/main.js`.

## Figma stays in sync

The code is the source of truth and the Figma file mirrors it. CI runs
`npm run design:check`, which fails when `index.html`, `styles.css` or the
tokens changed since the last Figma sync. Any change to what renders (including
DOM built in `js/`) must be carried into Figma in the same branch, using the
steps in **DESIGN.md → Figma sync**: `design:tokens`, `design:shots`,
`design:figma` → `use_figma` + `upload_assets`, then `design:stamp`. Never
stamp without actually updating Figma.
