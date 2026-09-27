#!/usr/bin/env node
/* Stamp every local stylesheet and script URL in dist/ with ?v=<hash>.

     node scripts/version-assets.mjs [dist]

   Slate serves every file with Cache-Control: max-age=31536000 and the project
   cannot change that header, so a browser that has styles.css or a module
   keeps using it for a year after a deploy. Worse, a fresh page could run the
   new main.js against modules cached from an older deploy. One version, a hash
   of every .css and .js in dist/, goes on each reference: in the HTML (src,
   href, modulepreload) and in the modules' own `from './x.js'` imports, so any
   change moves the whole set to new URLs together. Run by ./publish.sh; the
   source files in the repo are never touched. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

// A local .css or .js reference: no scheme, no protocol-relative //, no query yet.
const LOCAL = /^(?![a-z][\w+.-]*:|\/\/)[^?#"']+\.(?:css|js)$/i;

export function versionHtml(html, v) {
  return html.replace(/\b(src|href)="([^"]+)"/g, (m, attr, url) => (LOCAL.test(url) ? attr + '="' + url + '?v=' + v + '"' : m));
}

export function versionModule(source, v) {
  return source
    .replace(/(\bfrom\s*)(['"])(\.{1,2}\/[^'"?]+\.js)\2/g, (m, from, q, url) => from + q + url + '?v=' + v + q)
    .replace(/(\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"?]+\.js)\2/g, (m, imp, q, url) => imp + q + url + '?v=' + v + q);
}

export function versionAssets(dist) {
  const files = walk(dist).sort();
  const hash = crypto.createHash('sha256');
  for (const f of files.filter((f) => /\.(css|js)$/.test(f))) hash.update(path.relative(dist, f)).update(fs.readFileSync(f));
  const v = hash.digest('hex').slice(0, 10);
  for (const f of files) {
    if (f.endsWith('.html')) fs.writeFileSync(f, versionHtml(fs.readFileSync(f, 'utf8'), v));
    else if (f.endsWith('.js')) fs.writeFileSync(f, versionModule(fs.readFileSync(f, 'utf8'), v));
  }
  return v;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const dist = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist'));
  console.log('assets versioned: ?v=' + versionAssets(dist));
}
