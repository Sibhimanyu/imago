// Minimal headless-Chrome driver over the DevTools protocol (no deps).
// Mirrors scripts/design-shots.mjs; used to capture real Imago screens for the reels.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch() {
  const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p));
  const dir = await mkdtemp(join(tmpdir(), 'imago-reel-'));
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + dir,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const ws = await new Promise((resolve, reject) => {
    let buf = '';
    proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) resolve(m[1]); });
    proc.on('exit', () => reject(new Error('Chrome exited: ' + buf.slice(-400))));
  });
  const port = new URL(ws).port;
  return {
    port,
    async page() {
      const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
      return connect(t.webSocketDebuggerUrl);
    },
    async close() { proc.kill(); await rm(dir, { recursive: true, force: true }).catch(() => {}); }
  };
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails; errors.push((d.exception && d.exception.description) || d.text);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params }));
  });
  const page = {
    send, errors,
    async eval(expr) {
      const res = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (res.exceptionDetails) throw new Error(expr.slice(0, 80) + ' → ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text));
      return res.result.value;
    },
    async setup({ width, height, dpr = 3, mobile = true }) {
      await send('Page.enable'); await send('Runtime.enable');
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile });
      await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
      page.view = { width, height, dpr };
    },
    async onboarded() {
      await send('Page.addScriptToEvaluateOnNewDocument', {
        source: "try { localStorage.setItem('imago.preferences', JSON.stringify({ onboarded: true })); } catch (e) {}"
      });
    },
    async goto(u) {
      await send('Page.navigate', { url: u });
      await sleep(300);
      for (let i = 0; i < 120; i++) {
        try { if (await page.eval("document.readyState !== 'loading' && !!window.__imago")) break; } catch {}
        await sleep(125);
      }
      await page.eval('Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 4000); })]).then(function () { return 1; })');
    },
    async waitData(ms = 20000) {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        if (await page.eval('!__imago.state.inFlight && !!__imago.state.data')) return true;
        await sleep(200);
      }
      return false;
    },
    async type(text, perChar, each) {
      for (let i = 0; i < text.length; i++) {
        await send('Input.insertText', { text: text[i] });
        if (each) await each(i);
        if (perChar) await sleep(perChar);
      }
    },
    async shot(path, { full = false, clip } = {}) {
      const { width, height } = page.view;
      let h = height;
      if (full) h = Math.ceil(await page.eval('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)'));
      const { data } = await send('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: !!full,
        clip: clip || { x: 0, y: 0, width, height: h, scale: 1 }
      });
      await writeFile(path, Buffer.from(data, 'base64'));
      return { path, width, height: h };
    },
    close() { ws.close(); }
  };
  return new Promise((r) => { ws.onopen = () => r(page); });
}
