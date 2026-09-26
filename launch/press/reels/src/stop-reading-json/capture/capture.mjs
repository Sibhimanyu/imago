// Captures the real Imago screens used in stop-reading-json.
// node capture/capture.mjs  → assets/cap/*.png   (live site: https://imago.onslate.in)
import { launch, sleep } from './cdp.mjs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'cap');
const APP = 'https://imago.onslate.in/#app';
const W = 432, H = 768, DPR = 3;
const PIKA = 'pokeapi.co/api/v2/pokemon/pikachu';
const hideToast = "var t=document.getElementById('toast'); if (t) t.style.visibility='hidden'; 1";
const only = process.argv[2];

async function fresh(b) {
  const p = await b.page();
  await p.setup({ width: W, height: H, dpr: DPR });
  await p.onboarded();
  await p.goto(APP);
  await sleep(600);
  return p;
}
async function tall(p, h, dpr = DPR) {
  await p.send('Emulation.setDeviceMetricsOverride', { width: W, height: h, deviceScaleFactor: dpr, mobile: true });
  p.view = { width: W, height: h, dpr };
  await sleep(900);
}
async function waitImages(p) {
  await p.eval("Promise.race([Promise.all([...document.images].filter(i=>!i.complete).map(i=>new Promise(r=>{i.onload=i.onerror=r}))), new Promise(r=>setTimeout(r,6000))]).then(()=>1)");
}

await mkdir(OUT, { recursive: true });
const b = await launch();
try {
  if (!only || only === 'pika') {
    const p = await fresh(b);
    await p.shot(join(OUT, 'empty.png'));
    const bar = { x: 0, y: 700, width: W, height: 68, scale: 1 };
    await p.eval("document.getElementById('urlInput').focus(); 1");
    await sleep(200);
    await p.shot(join(OUT, 'type-00.png'), { clip: bar });
    await p.type(PIKA, 0, async (i) => {
      await sleep(40);
      await p.shot(join(OUT, `type-${String(i + 1).padStart(2, '0')}.png`), { clip: bar });
    });
    await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await sleep(120);
    await p.shot(join(OUT, 'loading.png'));
    console.log('data', await p.waitData());
    await waitImages(p); await sleep(800);
    await p.eval(hideToast);
    await p.eval("document.activeElement && document.activeElement.blur(); 1");
    await sleep(300);
    await p.shot(join(OUT, 'pika-page.png'));
    await tall(p, 2300);
    await waitImages(p); await sleep(500);
    await p.shot(join(OUT, 'pika-tall.png'));
    // the raw response, as Imago's inspector shows it
    await p.eval("__imago.setActiveTab('raw'); 1");
    await tall(p, 2400, 2);
    await sleep(800);
    await p.shot(join(OUT, 'raw-tall.png'));
    await tall(p, H, DPR);
    const lines = await p.eval(`(function(){
      var els=[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+50 && getComputedStyle(e).overflowY!='visible');
      els.sort((a,b)=>b.scrollHeight-a.scrollHeight); var el=els[0]; if(!el) return 'none';
      el.scrollTop=el.scrollHeight; return el.id+'.'+el.className+' '+el.scrollHeight; })()`);
    console.log('scroll', lines);
    await sleep(700);
    await p.shot(join(OUT, 'raw-end.png'));
    console.log('errors', p.errors);
    p.close();
  }
  const others = {
    library: 'https://openlibrary.org/search.json?title=the+hobbit&limit=5',
    weather: 'https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1',
    kural: 'https://tamil-kural-api.vercel.app/api/kural/1',
    iss: 'https://api.wheretheiss.at/v1/satellites/25544'
  };
  for (const [id, url] of Object.entries(others)) {
    if (only && only !== id && only !== 'others') continue;
    const p = await fresh(b);
    await p.eval(`__imago.navigateTo(${JSON.stringify(url)}, ''); 1`);
    console.log(id, await p.waitData());
    await waitImages(p); await sleep(1200);
    await p.eval(hideToast);
    await p.shot(join(OUT, `${id}.png`));
    await tall(p, 1900);
    await p.shot(join(OUT, `${id}-tall.png`));
    console.log('errors', p.errors);
    p.close();
  }
} finally { await b.close(); }
