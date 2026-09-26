/* The module check CI runs in place of `node --check app.js`. With native ES
   modules and no build step, a name used without being imported is a runtime
   ReferenceError (a blank page); this is the gate that catches it first. */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { CLASSIC, scan } from '../scripts/check-modules.mjs';

const ok = {
  main: "import { helper, LIMIT } from './util.js';\nfunction init() { return helper(LIMIT); }\nexport { init };\n",
  util: "var LIMIT = 3;\nfunction helper(n) { return n; }\nexport { LIMIT, helper };\n"
};

describe('module check', () => {
  it('passes a clean pair of modules', () => {
    expect(scan(ok)).toEqual([]);
  });

  it('catches a name used without an import', () => {
    const files = { ...ok, main: "import { LIMIT } from './util.js';\nfunction init() { return helper(LIMIT); }\n" };
    expect(scan(files)).toEqual(['main.js uses helper from util.js without importing it']);
  });

  it('ignores mentions in comments and strings', () => {
    // main never imports helper; it only mentions it.
    const files = { ...ok, main: "import { LIMIT } from './util.js';\n// helper is great\n/* see helper()\n   for more */\nvar s = 'helper' + \"helper\";\nfunction init() { return LIMIT; }\nexport { init };\n" };
    expect(scan(files)).toEqual([]);
  });

  it('catches an assignment to an imported binding', () => {
    const files = { ...ok, main: "import { helper, LIMIT } from './util.js';\nfunction init() { LIMIT = 4; return helper(LIMIT); }\n" };
    expect(scan(files)).toEqual(['main.js assigns to LIMIT, which is imported from util.js (imports are read-only)']);
  });

  it('allows calling an imported function, which is not an assignment', () => {
    const files = { ...ok, main: "import { helper, LIMIT } from './util.js';\nfunction init() { var x = helper(LIMIT) === 3; return x; }\n" };
    expect(scan(files)).toEqual([]);
  });

  it('catches a name declared in two modules, and a module nothing reaches', () => {
    const files = { ...ok, extra: 'function helper() {}\n' };
    const problems = scan(files);
    expect(problems).toContain('helper is declared in both util.js and extra.js');
    expect(problems).toContain('extra.js is not imported by anything reachable from main.js');
  });

  it('the shipped modules pass', () => {
    const dir = new URL('../js/', import.meta.url);
    const files = {};
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.js') && !CLASSIC.has(x))) files[f.replace(/\.js$/, '')] = readFileSync(new URL(f, dir), 'utf8');
    expect(Object.keys(files).length).toBeGreaterThan(10);
    expect(scan(files)).toEqual([]);
  });
});
