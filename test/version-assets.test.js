/* scripts/version-assets.mjs: Slate caches every file for a year, so publish
   gives each deploy's CSS and JS new URLs. These run it on temp trees. */
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { versionHtml, versionModule, versionAssets } from '../scripts/version-assets.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'imago-version-'));
afterAll(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

function tree(name, files) {
  const dir = path.join(tmp, name);
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

describe('versionHtml', () => {
  it('stamps local stylesheets and scripts, and nothing else', () => {
    const html = '<link rel="stylesheet" href="styles.css"><link rel="modulepreload" href="js/main.js">' +
      '<link rel="stylesheet" href="/assets/gallery/gallery.css"><script src="../x.js"></script>' +
      '<script async src="https://cdn-in.pagesense.io/js/a/b.js"></script><script src="//cdn.example/y.js"></script>' +
      '<link rel="icon" href="favicon.svg"><a href="/apis/">x</a><use href="#imagoIcon"/><script src="done.js?v=1"></script>';
    expect(versionHtml(html, 'abc')).toBe(
      '<link rel="stylesheet" href="styles.css?v=abc"><link rel="modulepreload" href="js/main.js?v=abc">' +
      '<link rel="stylesheet" href="/assets/gallery/gallery.css?v=abc"><script src="../x.js?v=abc"></script>' +
      '<script async src="https://cdn-in.pagesense.io/js/a/b.js"></script><script src="//cdn.example/y.js"></script>' +
      '<link rel="icon" href="favicon.svg"><a href="/apis/">x</a><use href="#imagoIcon"/><script src="done.js?v=1"></script>');
  });
});

describe('versionModule', () => {
  it('stamps relative static and dynamic imports, not packages or URLs', () => {
    const src = "import { a } from './config.js';\nimport b from \"../lib/b.js\";\nimport { c } from 'pkg';\n" +
      "const d = await import('./late.js');\nimport e from 'https://esm.example/e.js';\n";
    expect(versionModule(src, 'abc')).toBe(
      "import { a } from './config.js?v=abc';\nimport b from \"../lib/b.js?v=abc\";\nimport { c } from 'pkg';\n" +
      "const d = await import('./late.js?v=abc');\nimport e from 'https://esm.example/e.js';\n");
  });
});

describe('versionAssets', () => {
  const files = {
    'index.html': '<link rel="stylesheet" href="styles.css"><script type="module" src="js/main.js"></script>',
    'styles.css': 'body { color: red; }',
    'js/main.js': "import { x } from './config.js';\n",
    'js/config.js': 'export var x = 1;\n',
    'apis/index.html': '<link rel="stylesheet" href="/styles.css">',
    '.catalyst/slate-config.toml': 'framework = "static"\n'
  };

  it('puts one version on every reference, in HTML and in modules', () => {
    const dir = tree('a', files);
    const v = versionAssets(dir);
    expect(v).toMatch(/^[0-9a-f]{10}$/);
    const read = (rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
    expect(read('index.html')).toBe('<link rel="stylesheet" href="styles.css?v=' + v + '"><script type="module" src="js/main.js?v=' + v + '"></script>');
    expect(read('js/main.js')).toBe("import { x } from './config.js?v=" + v + "';\n");
    expect(read('apis/index.html')).toBe('<link rel="stylesheet" href="/styles.css?v=' + v + '">');
    expect(read('styles.css')).toBe(files['styles.css']);
    expect(read('.catalyst/slate-config.toml')).toBe(files['.catalyst/slate-config.toml']);
  });

  it('is the same for the same files, and moves when any CSS or JS changes', () => {
    const same = versionAssets(tree('b', files));
    expect(versionAssets(tree('c', files))).toBe(same);
    expect(versionAssets(tree('d', { ...files, 'styles.css': 'body { color: blue; }' }))).not.toBe(same);
    expect(versionAssets(tree('e', { ...files, 'js/config.js': 'export var x = 2;\n' }))).not.toBe(same);
  });
});
