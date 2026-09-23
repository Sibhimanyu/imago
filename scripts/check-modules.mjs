#!/usr/bin/env node
/* The app ships as native ES modules with no build step, so nothing but the
   browser would notice a module that uses a name it never imported: that is
   a ReferenceError, and a blank page or a dead button. This check runs in CI
   instead of `node --check`:

   1. esbuild bundles js/main.js: syntax errors, bad import paths and imports
      of names a module does not export all fail here.
   2. Every module is scanned for names that another module declares at top
      level. Using one without importing it fails, as does assigning to an
      imported binding (imports are read-only).
   3. Every module must be reachable from js/main.js.

   The scan is lexical, not a full parse: a local variable that happens to
   share a name with another module's export is reported too. Import it or
   rename the local; either is fine. */
import { buildSync } from 'esbuild';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'js');

const DECL = /^(?:export\s+)?(?:function\s+([A-Za-z_$][\w$]*)|var\s+([A-Za-z_$][\w$]*)|(?:let|const)\s+([A-Za-z_$][\w$]*))/;
const IMPORT = /^import\s*\{([^}]*)\}\s*from\s*'\.\/([\w-]+)\.js';/;
const IDENT = /(?<![\w$.])([A-Za-z_$][\w$]*)/g;

// Comments and string contents would otherwise count as uses.
function code(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
    .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g, "''");
}

export function scan(files) {
  const mods = {};
  for (const [name, text] of Object.entries(files)) {
    const decls = new Map();
    const imports = new Map();
    for (const line of text.split('\n')) {
      const d = DECL.exec(line);
      if (d) decls.set(d[1] || d[2] || d[3], d[1] ? 'function' : 'binding');
      const im = IMPORT.exec(line);
      if (im) for (const n of im[1].split(',').map((x) => x.trim()).filter(Boolean)) imports.set(n, im[2]);
    }
    mods[name] = { text, decls, imports };
  }
  const owner = new Map();
  const problems = [];
  for (const [name, m] of Object.entries(mods)) {
    for (const n of m.decls.keys()) {
      if (owner.has(n)) problems.push(`${n} is declared in both ${owner.get(n)}.js and ${name}.js`);
      else owner.set(n, name);
    }
  }
  for (const [name, m] of Object.entries(mods)) {
    const body = code(m.text.split('\n').filter((l) => !IMPORT.test(l) && !/^export\s*\{/.test(l)).join('\n'));
    const used = new Set([...body.matchAll(IDENT)].map((x) => x[1]));
    for (const n of used) {
      const from = owner.get(n);
      if (!from || from === name || m.imports.has(n) || m.decls.has(n)) continue;
      problems.push(`${name}.js uses ${n} from ${from}.js without importing it`);
    }
    for (const [n, from] of m.imports) {
      if (m.decls.has(n)) problems.push(`${name}.js imports ${n} and also declares it`);
      if (mods[from] && mods[from].decls.get(n) === 'binding' &&
          new RegExp('(?<![\\w$.])' + n.replace(/\$/g, '\\$') + '\\s*(=(?!=)|\\+=|-=|\\+\\+|--)').test(body)) {
        problems.push(`${name}.js assigns to ${n}, which is imported from ${from}.js (imports are read-only)`);
      }
    }
  }
  // Reachability from main.
  const seen = new Set();
  const walk = (n) => { if (seen.has(n) || !mods[n]) return; seen.add(n); for (const f of mods[n].imports.values()) walk(f); };
  walk('main');
  for (const n of Object.keys(mods)) if (!seen.has(n)) problems.push(`${n}.js is not imported by anything reachable from main.js`);
  return problems;
}

function main() {
  const problems = [];
  try {
    buildSync({ entryPoints: [join(DIR, 'main.js')], bundle: true, write: false, format: 'iife', logLevel: 'silent' });
  } catch (e) {
    for (const err of e.errors || [{ text: e.message }]) {
      problems.push((err.location ? `${err.location.file}:${err.location.line}: ` : '') + err.text);
    }
  }
  const files = {};
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.js'))) files[f.replace(/\.js$/, '')] = readFileSync(join(DIR, f), 'utf8');
  problems.push(...scan(files));
  if (problems.length) {
    console.error('Module check failed:\n\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log('Modules OK (' + Object.keys(files).length + ' files)');
}

import { realpathSync } from 'node:fs';
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main();
