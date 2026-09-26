#!/usr/bin/env node
/* Keeps the Figma file honest about what actually ships.

   The code is the source of truth; Figma mirrors it. Two things can drift:

   1. Tokens. design/tokens.json is generated from the :root block in
      styles.css, and the Figma `imago` variable collection is written from
      that JSON. `tokens` regenerates it; `check` fails when it is stale.

   2. Screens. design/figma-sync.json records a hash of the UI surface
      (index.html + styles.css) as it was the last time the Figma "00 Shipped"
      page was refreshed. `check` fails when the surface has changed since,
      so a UI change cannot merge without the Figma file being brought along.
      After updating Figma, `stamp` records the new hash.

   Usage:
     node scripts/design-sync.mjs tokens   # regenerate design/tokens.json
     node scripts/design-sync.mjs check    # CI: fail on any drift
     node scripts/design-sync.mjs stamp    # after Figma is updated
     node scripts/design-sync.mjs figma    # print the use_figma script that
                                           # pushes tokens and sizes the frames
*/
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SURFACE = ['index.html', 'styles.css'];
const TOKENS = join(ROOT, 'design/tokens.json');
const MANIFEST = join(ROOT, 'design/figma-sync.json');

/** The custom properties declared in the first :root block, in order. */
export function parseRootTokens(css) {
  const start = css.search(/:root\s*\{/);
  if (start < 0) throw new Error('styles.css has no :root block');
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body))) out.push([m[1].slice(2), m[2].trim().replace(/\s+/g, ' ')]);
  return out;
}

/** The colour overrides in the dark theme block, in order. Empty if none. */
export function parseDarkTokens(css) {
  const start = css.search(/:root\[data-theme="dark"\]\s*\{/);
  if (start < 0) return [];
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body))) if (/^#/.test(m[2].trim())) out.push([m[1].slice(2), m[2].trim().toLowerCase()]);
  return out;
}

/** Group tokens the way the Figma file does: color/, radius/, shadow/, font/. */
export function groupTokens(pairs) {
  const t = { color: {}, radius: {}, shadow: {}, font: {} };
  for (const [name, value] of pairs) {
    if (/^#|^rgba?\(/i.test(value)) t.color[name] = value.toLowerCase();
    else if (/^r(-|$)/.test(name)) t.radius[name] = parseFloat(value);
    else if (/^sh(-|$)/.test(name)) t.shadow[name] = value;
    else if (name === 'sans' || name === 'mono' || name === 'display') t.font[name] = value.split(',')[0].replace(/["']/g, '').trim();
    else throw new Error('Unclassified token --' + name + ': add a group for it in scripts/design-sync.mjs');
  }
  return t;
}

export function tokensJson(css) {
  const t = groupTokens(parseRootTokens(css));
  const dark = parseDarkTokens(css);
  if (dark.length) t.dark = { color: Object.fromEntries(dark) };
  return JSON.stringify(t, null, 2) + '\n';
}

export function surfaceHash(read) {
  const h = createHash('sha256');
  for (const f of SURFACE) h.update(f + '\0' + read(f) + '\0');
  return h.digest('hex').slice(0, 16);
}

const read = (f) => readFileSync(join(ROOT, f), 'utf8');

function check() {
  const problems = [];
  const want = tokensJson(read('styles.css'));
  if (!existsSync(TOKENS) || readFileSync(TOKENS, 'utf8') !== want) {
    problems.push('design/tokens.json is stale. Run `npm run design:tokens`, then push the tokens to the Figma `imago` collection.');
  }
  if (!existsSync(MANIFEST)) {
    problems.push('design/figma-sync.json is missing.');
  } else {
    const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    const now = surfaceHash(read);
    if (m.surfaceHash !== now) {
      problems.push(
        'The UI changed since Figma was last synced (' + (m.syncedCommit || '?') + ', ' + (m.syncedAt || '?') + ').\n' +
        '  Refresh Figma: `npm run design:shots`, upload them to the "00 Shipped" page, update the\n' +
        '  editable frames that changed, then `npm run design:stamp`. See DESIGN.md → Figma sync.'
      );
    }
  }
  if (problems.length) {
    console.error('Figma is out of sync with the code:\n\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log('Figma sync OK');
}

function stamp() {
  const m = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
  m.surfaceHash = surfaceHash(read);
  m.syncedAt = new Date().toISOString().slice(0, 10);
  try { m.syncedCommit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim(); } catch { /* not a checkout */ }
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
  console.log('Stamped ' + m.surfaceHash + ' (' + m.syncedAt + ')');
}

/* The Plugin API script the Figma MCP `use_figma` tool runs. Idempotent:
   upserts color/* and radius/* in the `imago` collection, makes sure page
   "00 Shipped" has one frame per screenshot (sized in CSS pixels), and
   returns { frames: { shotId: nodeId } } for `upload_assets` to fill. */
export function figmaScript(tokens, shots, stampText) {
  return `
const TOKENS = ${JSON.stringify(tokens)};
const SHOTS = ${JSON.stringify(Object.values(shots))};
const STAMP = ${JSON.stringify(stampText)};
const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const cols = await figma.variables.getLocalVariableCollectionsAsync();
let col = cols.find((c) => c.name === 'imago') || figma.variables.createVariableCollection('imago');
const mode = col.modes[0].modeId;
const existing = {};
for (const id of col.variableIds) { const v = await figma.variables.getVariableByIdAsync(id); existing[v.name] = v; }
const changed = [];
function upsert(name, type, value, scopes) {
  let v = existing[name];
  if (!v) { v = figma.variables.createVariable(name, col, type); v.scopes = scopes; changed.push('+' + name); }
  const cur = v.valuesByMode[mode];
  const same = type === 'COLOR' ? cur && ['r', 'g', 'b'].every((k) => Math.abs(cur[k] - value[k]) < 0.002) : cur === value;
  if (!same) { v.setValueForMode(mode, value); if (existing[name]) changed.push('~' + name); }
}
for (const [k, h] of Object.entries(TOKENS.color)) if (/^#[0-9a-f]{6}$/.test(h)) upsert('color/' + k, 'COLOR', hex(h), ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR']);
// The dark theme is a second mode of the same variables.
let darkMode = null, darkError = null;
if (TOKENS.dark) {
  try {
    darkMode = (col.modes.find((m) => m.name === 'Dark') || {}).modeId || col.addMode('Dark');
    const light = col.modes[0];
    if (light.name !== 'Light') col.renameMode(light.modeId, 'Light');
    const all = {};
    for (const id of col.variableIds) { const v = await figma.variables.getVariableByIdAsync(id); all[v.name] = v; }
    for (const [k, h] of Object.entries(TOKENS.dark.color)) {
      const v = all['color/' + k];
      if (v && /^#[0-9a-f]{6}$/.test(h)) v.setValueForMode(darkMode, hex(h));
    }
  } catch (e) { darkError = String(e && e.message || e); }
}
for (const [k, n] of Object.entries(TOKENS.radius)) upsert('radius/' + k, 'FLOAT', n, ['CORNER_RADIUS']);

let page = figma.root.children.find((p) => p.name === '00 Shipped');
if (!page) { page = figma.createPage(); page.name = '00 Shipped'; figma.root.insertChild(0, page); }
await figma.setCurrentPageAsync(page);
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
function label(name, text, x, y, size, style) {
  let t = page.children.find((n) => n.type === 'TEXT' && n.name === name);
  if (!t) { t = figma.createText(); t.name = name; page.appendChild(t); }
  t.fontName = { family: 'Inter', style }; t.fontSize = size; t.characters = text; t.x = x; t.y = y;
  t.fills = [{ type: 'SOLID', color: hex('#45443f') }];
  return t;
}
label('sync-stamp', STAMP, 0, -220, 20, 'Regular');
const frames = {};
const rows = { false: { x: 0, y: 0, h: 0 }, true: { x: 0, y: 0, h: 0 } };
const desktops = SHOTS.filter((s) => !s.mobile);
rows.true.y = Math.max(...desktops.map((s) => s.height)) + 240;
for (const s of SHOTS) {
  const row = rows[s.mobile];
  let f = page.children.find((n) => n.type === 'FRAME' && n.name === s.id);
  if (!f) { f = figma.createFrame(); f.name = s.id; page.appendChild(f); }
  f.resize(s.width, s.height);
  f.x = row.x; f.y = row.y;
  f.fills = [{ type: 'SOLID', color: hex('#f6f5f1') }];
  label('title/' + s.id, s.title + (s.mobile ? ' · 390' : ' · 1440'), row.x, row.y - 56, 28, 'Semi Bold');
  frames[s.id] = f.id;
  row.x += s.width + 120;
}
return { pageId: page.id, frames, tokensChanged: changed, darkMode, darkError };
`;
}

// realpath both sides: through a symlinked dir (macOS /tmp, /var) argv[1] and
// import.meta.url name the same file differently, and the command would
// silently do nothing and exit 0.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const cmd = process.argv[2];
  if (cmd === 'tokens') { writeFileSync(TOKENS, tokensJson(read('styles.css'))); console.log('Wrote design/tokens.json'); }
  else if (cmd === 'check') check();
  else if (cmd === 'stamp') stamp();
  else if (cmd === 'figma') {
    const shots = JSON.parse(read('design/shots/index.json'));
    let commit = '';
    try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim(); } catch { /* not a checkout */ }
    const stampText = 'Mirrors the shipped app, captured ' + new Date().toISOString().slice(0, 10) + (commit ? ' from ' + commit : '') +
      '. Regenerate with npm run design:shots; never edit these frames by hand — design in the other pages, then ship.';
    process.stdout.write(figmaScript(JSON.parse(read('design/tokens.json')), shots, stampText));
  }
  else { console.error('usage: design-sync.mjs tokens|check|stamp|figma'); process.exit(2); }
}
