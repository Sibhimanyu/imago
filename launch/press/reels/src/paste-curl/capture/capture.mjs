// Captures the real Imago curl-paste behaviour for paste-curl (live site).
// node capture/capture.mjs → assets/cap/*.png
import { launch, sleep } from '../../stop-reading-json/capture/cdp.mjs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'cap');
const W = 432, H = 768, DPR = 3;
export const CURL_PIKA = "curl 'https://pokeapi.co/api/v2/pokemon/pikachu' -H 'Accept: application/json' -H 'X-Demo: imago'";
export const CURL_AUTH = "curl 'https://httpbin.org/basic-auth/imago/demo' -u imago:demo";
const paste = (t) => `(function(){var i=document.getElementById('urlInput');i.focus();var dt=new DataTransfer();dt.setData('text/plain',${JSON.stringify(t)});i.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));return 1})()`;
const toast = (v) => `var t=document.getElementById('toast'); if (t) t.style.visibility='${v}'; 1`;
async function imgs(p) { await p.eval("Promise.race([Promise.all([...document.images].filter(i=>!i.complete).map(i=>new Promise(r=>{i.onload=i.onerror=r}))), new Promise(r=>setTimeout(r,6000))]).then(()=>1)"); }
async function tall(p, h) { await p.send('Emulation.setDeviceMetricsOverride', { width: W, height: h, deviceScaleFactor: DPR, mobile: true }); p.view = { width: W, height: h, dpr: DPR }; await sleep(900); }

await mkdir(OUT, { recursive: true });
for (const [id, curl] of [['pika', CURL_PIKA], ['auth', CURL_AUTH]]) {
  if (process.argv[2] && process.argv[2] !== id) continue;
  const b = await launch();
  try {
    const p = await b.page();
    await p.setup({ width: W, height: H, dpr: DPR });
    await p.onboarded();
    await p.goto('https://imago.onslate.in/#app');
    await sleep(600);
    await p.eval("document.getElementById('urlInput').focus(); 1");
    await sleep(200);
    await p.shot(join(OUT, `${id}-empty.png`));
    await p.eval(paste(curl));
    await sleep(120);
    await p.shot(join(OUT, `${id}-pasted.png`));
    console.log(id, await p.waitData());
    await imgs(p); await sleep(500);
    await p.eval("document.activeElement && document.activeElement.blur(); 1");
    await p.shot(join(OUT, `${id}-page-toast.png`));
    await p.eval(toast('hidden'));
    await sleep(200);
    await p.shot(join(OUT, `${id}-page.png`));
    await p.eval("document.getElementById('headersChip').click(); 1");
    await sleep(900);
    await p.shot(join(OUT, `${id}-headers.png`));
    console.log(await p.eval("document.getElementById('headersInput').value"));
    await p.eval("__imago.setActiveTab('interface'); 1");
    await tall(p, 2300);
    await imgs(p); await sleep(400);
    await p.shot(join(OUT, `${id}-tall.png`));
    console.log('errors', p.errors);
    p.close();
  } finally { await b.close(); }
}
