#!/usr/bin/env node
/* Screenshots of the real app, one per screen the Figma "00 Shipped" page
   mirrors. No dependencies: a tiny static server plus headless Chrome driven
   over the DevTools protocol with Node's built-in WebSocket.

   Output: design/shots/<id>.png (2x) and design/shots/index.json with each
   shot's CSS-pixel size, which the Figma frames are sized to.

     node scripts/design-shots.mjs            # all shots
     node scripts/design-shots.mjs landing-*  # a subset (glob on id)

   The pages fetch the live demo APIs, so values (a temperature, a sprite)
   differ run to run. The layout is what is being mirrored. */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync, realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'design/shots');

const DESKTOP = { width: 1440, height: 900, mobile: false };
const MOBILE = { width: 390, height: 844, mobile: true };

// setup runs in the page after load. `onboarded` opens the app (/app/) instead of the landing page.
const WEATHER = "__imago.DEMOS.find(function (d) { return d.name === 'Weather'; }).url";
export const SHOTS = [
  { id: 'landing-desktop', title: 'Landing', view: DESKTOP, full: true },
  { id: 'landing-mobile', title: 'Landing', view: MOBILE, full: true },
  { id: 'empty-desktop', title: 'Empty page', view: DESKTOP, onboarded: true },
  { id: 'page-desktop', title: 'Page · weather', view: DESKTOP, onboarded: true, setup: `__imago.navigateTo(${WEATHER}, '')`, waitData: true },
  { id: 'inspector-desktop', title: 'Inspector · Response', view: DESKTOP, onboarded: true, setup: `__imago.navigateTo(${WEATHER}, '')`, waitData: true, after: "__imago.setActiveTab('raw')" },
  { id: 'settings-desktop', title: 'Settings sheet', view: DESKTOP, onboarded: true, setup: `__imago.navigateTo(${WEATHER}, '')`, waitData: true, after: "__imago.setAppPane('settings')" },
  { id: 'empty-mobile', title: 'Empty page', view: MOBILE, onboarded: true },
  { id: 'page-mobile', title: 'Page · weather', view: MOBILE, onboarded: true, setup: `__imago.navigateTo(${WEATHER}, '')`, waitData: true },
  { id: 'endpoints-mobile', title: 'Endpoints sheet', view: MOBILE, onboarded: true, setup: `__imago.navigateTo(${WEATHER}, '')`, waitData: true, after: "__imago.setAppPane('saved')" },
  { id: 'settings-mobile', title: 'Settings sheet', view: MOBILE, onboarded: true, setup: `__imago.navigateTo(${WEATHER}, '')`, waitData: true, after: "__imago.setAppPane('settings')" },
  { id: 'landing-desktop-dark', title: 'Landing · dark', view: DESKTOP, full: true, dark: true },
  { id: 'page-desktop-dark', title: 'Page · weather · dark', view: DESKTOP, onboarded: true, setup: `__imago.navigateTo(${WEATHER}, '')`, waitData: true, dark: true },
  { id: 'settings-desktop-dark', title: 'Settings sheet · dark', view: DESKTOP, onboarded: true, setup: `__imago.navigateTo(${WEATHER}, '')`, waitData: true, after: "__imago.setAppPane('settings')", dark: true },
  { id: 'page-mobile-dark', title: 'Page · weather · dark', view: MOBILE, onboarded: true, setup: `__imago.navigateTo(${WEATHER}, '')`, waitData: true, dark: true }
];

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };

function serve() {
  const server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    if (path === '/' || path === '/app/') path = '/index.html';
    try {
      const body = await readFile(join(ROOT, path));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

function findChrome() {
  const c = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const hit = c.find((p) => existsSync(p));
  if (!hit) throw new Error('No Chrome found. Set CHROME=/path/to/chrome.');
  return hit;
}

async function launch() {
  const dir = await mkdtemp(join(tmpdir(), 'imago-shots-'));
  const proc = spawn(findChrome(), ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + dir,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) resolve(m[1]); });
    proc.on('exit', () => reject(new Error('Chrome exited: ' + buf.slice(-400))));
  });
  return { proc, dir, port: new URL(wsUrl).port };
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const errors = [];   // uncaught exceptions in the page: a shot of a broken app is not a mirror
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push((d.exception && d.exception.description) || d.text);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    debug('→', method);
    const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params }));
  });
  return new Promise((r) => { ws.onopen = () => r({ send, errors, close: () => ws.close() }); });
}

const debug = (...a) => { if (process.env.DEBUG) console.error('[shots]', ...a); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function evaluate(page, expr) {
  const res = await page.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(expr + ' → ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text));
  return res.result.value;
}

// The load event waits on every remote sprite and font, and some demo hosts
// are slow. The app is usable once its script has run; poll for that.
async function ready(page) {
  await sleep(150); // let the navigation replace the old document first
  for (let i = 0; i < 80; i++) {
    try { if (await evaluate(page, "document.readyState !== 'loading' && !!window.__imago")) return; } catch { /* mid-navigation */ }
    await sleep(125);
  }
  let why = '';
  try { why = await evaluate(page, "location.href + ' ' + document.readyState + ' imago=' + typeof window.__imago"); } catch (e) { why = e.message; }
  throw new Error('page never became ready: ' + why);
}

// Each shot gets a fresh tab: sessionStorage is per tab, and the app writes
// its state back to storage on unload, so reusing a tab (or clearing and
// reloading) let one shot's URL leak into the next.
async function capture(chromePort, base, shot) {
  const target = await (await fetch(`http://127.0.0.1:${chromePort}/json/new?about:blank`, { method: 'PUT' })).json();
  const page = await connect(target.webSocketDebuggerUrl);
  try {
    return await shoot(page, base, shot);
  } finally {
    page.close();
    await fetch(`http://127.0.0.1:${chromePort}/json/close/${target.id}`).catch(() => {});
  }
}

async function shoot(page, base, shot) {
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  const { width, height, mobile } = shot.view;
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile });
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  // `dark` shots come from a dark system with the theme left on System, so
  // they go through the same boot path a dark-mode reader does.
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: shot.dark ? 'dark' : 'light' }] });
  await page.send('Storage.clearDataForOrigin', { origin: base, storageTypes: 'all' });
  if (shot.onboarded) {
    // Runs before the app's modules, so it boots straight into the app view.
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: "try { localStorage.setItem('imago.preferences', JSON.stringify({ onboarded: true })); } catch (e) {}"
    });
  }
  // The app lives at /app/; the bare URL is always the landing page.
  const nav = await page.send('Page.navigate', { url: base + (shot.onboarded ? '/app/' : '/') });
  if (nav.errorText) throw new Error('navigate ' + base + ': ' + nav.errorText);
  await ready(page);
  await evaluate(page, 'Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 4000); })]).then(function () { return 1; })');
  if (shot.setup) await evaluate(page, shot.setup + '; 1');
  if (shot.waitData) {
    for (let i = 0; i < 60; i++) {
      if (await evaluate(page, '!__imago.state.inFlight && !!__imago.state.data')) break;
      await sleep(250);
    }
  }
  // The landing demo fetches its example live; wait until it has drawn.
  if (!shot.onboarded) {
    for (let i = 0; i < 60; i++) {
      if (await evaluate(page, "document.getElementById('specimenPane').getAttribute('aria-busy') === 'false'")) break;
      await sleep(250);
    }
  }
  if (shot.after) await evaluate(page, shot.after + '; 1');
  if (shot.wait) await sleep(shot.wait);   // e.g. for a failure path that has no data to wait on
  await sleep(600); // sheet and drawer transitions
  // Toasts are transient; a design mirror should not freeze one in place.
  await evaluate(page, "var t = document.getElementById('toast'); if (t) t.style.visibility = 'hidden'; 1");
  let h = height;
  if (shot.full) h = Math.ceil(await evaluate(page, 'document.documentElement.scrollHeight'));
  const { data } = await page.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: !!shot.full,
    clip: { x: 0, y: 0, width, height: h, scale: 1 }
  });
  if (page.errors.length) throw new Error(shot.id + ': the page threw: ' + page.errors[0]);
  await writeFile(join(OUT, shot.id + '.png'), Buffer.from(data, 'base64'));
  return { id: shot.id, title: shot.title, width, height: h, mobile };
}

async function main() {
  const pattern = process.argv[2] ? new RegExp('^' + process.argv[2].replace(/\*/g, '.*') + '$') : null;
  const shots = SHOTS.filter((s) => !pattern || pattern.test(s.id));
  await mkdir(OUT, { recursive: true });
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const chrome = await launch();
  try {
    const indexPath = join(OUT, 'index.json');
    const index = existsSync(indexPath) ? JSON.parse(await readFile(indexPath, 'utf8')) : {};
    for (const shot of shots) {
      const meta = await capture(chrome.port, base, shot);
      index[shot.id] = meta;
      console.log(`${shot.id}  ${meta.width}x${meta.height}`);
    }
    await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n');
  } finally {
    chrome.proc.kill();
    server.close();
    await rm(chrome.dir, { recursive: true, force: true }).catch(() => {});
  }
}

// realpath both sides: through a symlinked dir (macOS /tmp, /var) argv[1] and
// import.meta.url name the same file differently, and the command would
// silently do nothing and exit 0.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
