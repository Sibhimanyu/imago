// Captures Imago's raw Response pane for pikachu as tall strips (scrolling the real pane).
import { launch, sleep } from './cdp.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'cap');
const TMP = '/tmp/imago-strip'; await rm(TMP, { recursive: true, force: true }); await mkdir(TMP, { recursive: true });
const b = await launch();
try {
  const p = await b.page();
  await p.setup({ width: 432, height: 768, dpr: 3 });
  await p.onboarded();
  await p.goto('https://imago.onslate.in/#app');
  await sleep(500);
  await p.eval(`__imago.navigateTo('https://pokeapi.co/api/v2/pokemon/pikachu', ''); 1`);
  await p.waitData(); await sleep(800);
  await p.eval("var t=document.getElementById('toast'); if (t) t.style.visibility='hidden'; __imago.setActiveTab('raw'); 1");
  await sleep(900);
  await p.shot(join(OUT, 'raw-top.png'));
  const r = JSON.parse(await p.eval(`(function(){var el=document.querySelector('.code-wrap');var b=el.getBoundingClientRect();return JSON.stringify({x:b.left,y:b.top,w:b.width,h:b.height,ch:el.clientHeight})})()`));
  console.log(r);
  const step = Math.floor(r.h) - 4;
  const n = 30;
  for (let i = 0; i < n; i++) {
    await p.eval(`document.querySelector('.code-wrap').scrollTop=${i * step}; 1`);
    await sleep(120);
    await p.shot(`${TMP}/s${String(i).padStart(2, '0')}.png`, { clip: { x: r.x, y: r.y, width: r.w, height: step, scale: 1 } });
  }
  // three strips of 10 screens each
  for (let k = 0; k < 3; k++) {
    const inputs = []; for (let i = k * 10; i < k * 10 + 10; i++) inputs.push('-i', `${TMP}/s${String(i).padStart(2, '0')}.png`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `vstack=inputs=10`, join(OUT, `raw-strip-${k + 1}.png`)]);
  }
} finally { await b.close(); }
