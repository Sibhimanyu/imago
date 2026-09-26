/* Figma sync: the code is the source of truth and the Figma file mirrors it.
   These cover the pieces the CI gate (`npm run design:check`) relies on. */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRootTokens, parseDarkTokens, groupTokens, tokensJson, surfaceHash, figmaScript, SURFACE } from '../scripts/design-sync.mjs';
import { SHOTS } from '../scripts/design-shots.mjs';

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

describe('tokens', () => {
  it('reads the first :root block, skipping comments and later blocks', () => {
    const css = ':root {\n  --bg: #FFF000; /* note: --fake: 1; */\n  --r-sm:  9px;\n}\n.x { --later: #000; }';
    expect(parseRootTokens(css)).toEqual([['bg', '#FFF000'], ['r-sm', '9px']]);
  });

  it('refuses a stylesheet with no :root', () => {
    expect(() => parseRootTokens('.a { color: red; }')).toThrow(/no :root/);
  });

  it('groups colours, radii, shadows and fonts the way the Figma collection names them', () => {
    const t = groupTokens([['ink', '#1B1B19'], ['r', '12px'], ['sh-xs', '0 1px 2px rgba(0,0,0,.05)'], ['mono', '"JetBrains Mono", monospace']]);
    expect(t).toEqual({ color: { ink: '#1b1b19' }, radius: { r: 12 }, shadow: { 'sh-xs': '0 1px 2px rgba(0,0,0,.05)' }, font: { mono: 'JetBrains Mono' } });
  });

  // A new kind of token must get a home in Figma, not vanish from the sync.
  it('fails loudly on a token it cannot classify', () => {
    expect(() => groupTokens([['space-4', '16px']])).toThrow(/Unclassified token --space-4/);
  });

});

describe('surface hash', () => {
  it('changes when any surface file changes, and only then', () => {
    const files = { 'index.html': '<p>a</p>', 'styles.css': 'a{}' };
    const base = surfaceHash((f) => files[f]);
    expect(surfaceHash((f) => files[f])).toBe(base);
    for (const f of SURFACE) {
      expect(surfaceHash((g) => (g === f ? files[g] + ' ' : files[g]))).not.toBe(base);
    }
  });

});

// The gate CI runs. A copy of the repo's surface in a temp dir, so the real
// files are never touched.
describe('design:check', () => {
  function sandbox(edit) {
    const dir = mkdtempSync(join(tmpdir(), 'imago-sync-'));
    mkdirSync(join(dir, 'scripts')); mkdirSync(join(dir, 'design'));
    for (const f of ['scripts/design-sync.mjs', 'index.html', 'styles.css', 'design/tokens.json', 'design/figma-sync.json']) {
      writeFileSync(join(dir, f), read(f));
    }
    // Stamp the copy first: the test is about the gate, not about whether the
    // working tree happens to be synced right now (CI checks that directly).
    execFileSync(process.execPath, [join(dir, 'scripts/design-sync.mjs'), 'tokens'], { stdio: 'pipe' });
    execFileSync(process.execPath, [join(dir, 'scripts/design-sync.mjs'), 'stamp'], { stdio: 'pipe' });
    if (edit) edit(dir);
    try {
      return { code: 0, out: execFileSync(process.execPath, [join(dir, 'scripts/design-sync.mjs'), 'check'], { stdio: 'pipe' }).toString() };
    } catch (e) {
      return { code: e.status, out: String(e.stderr) };
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }

  it('passes right after a stamp', () => {
    expect(sandbox()).toEqual({ code: 0, out: 'Figma sync OK\n' });
  });

  it('fails when the UI changes without a Figma sync', () => {
    const r = sandbox((d) => writeFileSync(join(d, 'index.html'), read('index.html') + '<!-- new -->'));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/UI changed since Figma was last synced/);
  });

  it('fails when a token changes without regenerating tokens.json', () => {
    const r = sandbox((d) => writeFileSync(join(d, 'styles.css'), read('styles.css').replace('--ink:        #1b1b19', '--ink:        #000000')));
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/tokens\.json is stale/);
  });
});

describe('dark tokens', () => {
  const css = ':root { --bg: #FFFFFF; --r: 12px; } :root[data-theme="dark"] { color-scheme: dark; /* x */ --bg: #161614; --sh: 0 1px 2px rgba(0,0,0,.3); }';
  it('reads the hex colours of the dark block only', () => {
    expect(parseDarkTokens(css)).toEqual([['bg', '#161614']]);
  });
  it('is empty without a dark block, and tokens.json then has no dark key', () => {
    expect(parseDarkTokens(':root { --bg: #fff; }')).toEqual([]);
    expect(JSON.parse(tokensJson(':root { --bg: #ffffff; }')).dark).toBeUndefined();
  });
  it('lands in tokens.json as a second colour set', () => {
    expect(JSON.parse(tokensJson(css)).dark).toEqual({ color: { bg: '#161614' } });
  });
});

describe('Figma manifest', () => {
  const manifest = JSON.parse(read('design/figma-sync.json'));

  it('has a Figma frame for every screenshot and no orphans', () => {
    expect(Object.keys(manifest.frames).sort()).toEqual(SHOTS.map((s) => s.id).sort());
  });

  it('the generated use_figma script carries the tokens, the shots and the stamp', () => {
    const tokens = JSON.parse(read('design/tokens.json'));
    const shots = { a: { id: 'a', title: 'A', width: 10, height: 20, mobile: false } };
    const js = figmaScript(tokens, shots, 'stamp text');
    expect(js).toContain(JSON.stringify(tokens));
    expect(js).toContain('"id":"a"');
    expect(js).toContain('"stamp text"');
    expect(js).toContain("'00 Shipped'");
    // Parses as the body of an async function, which is how use_figma runs it.
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    expect(() => new AsyncFunction('figma', js)).not.toThrow();
  });
});
