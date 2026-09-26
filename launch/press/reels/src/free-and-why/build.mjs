// Builds index.html from scenes.mjs. Run: node build.mjs
// Everything is laid out in 1080x1920 frame pixels. Screenshots are 432x768 CSS
// captures at 3x, shown at 1080x1920, so 1 CSS px = 2.5 frame px.
import { readFileSync, writeFileSync } from 'node:fs';
import reel from './scenes.mjs';

const W = 1080, H = 1920;
const r3 = (n) => Math.round(n * 1000) / 1000;
const svg = (f) => readFileSync(new URL(f, import.meta.url), 'utf8')
  .replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '').trim();

// Offsets so an SFX's audible hit lands on its cue, not its file start.
const SFX = {
  click: { lead: 0.0, vol: 1.0 },
  'click-soft': { lead: 0.0, vol: 0.85 },
  'key-press': { lead: 0.0, vol: 1.0 },
  ping: { lead: 0.28, vol: 1.0 },
  pop: { lead: 0.08, vol: 0.9 },
  whoosh: { lead: 0.1, vol: 0.6 },
  'whoosh-short': { lead: 0.1, vol: 0.55 },
  'impact-bass-1': { lead: 0.0, vol: 0.5, dur: 1.2 },
  sparkle: { lead: 0.05, vol: 0.4 },
  notification: { lead: 0.05, vol: 0.5 },
  chime: { lead: 0.05, vol: 0.45 },
  // The riser peaks 3.0 s into the file; start 1.6 s in so it peaks 1.4 s after it starts.
  riser: { lead: 1.4, vol: 0.35, mediaStart: 1.6, dur: 1.5 },
};

const html = [];
const js = [];

// ── Shots: full-bleed screenshots under a camera ────────────────────────────
for (const s of reel.shots) {
  const dur = r3(s.end - s.start);
  const rings = (s.rings || []).map((r, i) =>
    `<div class="ring" id="${s.id}-ring${i}" style="left:${r.x - 14}px;top:${r.y - 14}px;width:${r.w + 28}px;height:${r.h + 28}px"></div>`).join('');
  html.push(`<div class="clip shot" id="${s.id}" data-start="${r3(s.start)}" data-duration="${dur}" data-track-index="1">
  <div class="punch" id="${s.id}-punch"><div class="cam" id="${s.id}-cam"><img src="assets/img/${s.img}" alt="">${rings}</div></div>
</div>`);
  // Camera keyframes: [time, scale, centreX, centreY] in image frame pixels.
  // Clamped so the camera never shows past the screenshot's edges.
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const pose = ([, sc, cx, cy]) => {
    cx = clamp(cx, W / 2 / sc, W - W / 2 / sc); cy = clamp(cy, H / 2 / sc, H - H / 2 / sc);
    return { scale: sc, x: r3(W / 2 - cx * sc), y: r3(H / 2 - cy * sc) };
  };
  const k = s.cam || [[s.start, 1, W / 2, H / 2]];
  js.push(`tl.set('#${s.id}-cam', ${JSON.stringify(pose(k[0]))}, ${r3(s.start)});`);
  for (let i = 1; i < k.length; i++) {
    const [t, , , , ease] = k[i];
    js.push(`tl.to('#${s.id}-cam', { ...${JSON.stringify(pose(k[i]))}, duration: ${r3(t - k[i - 1][0])}, ease: '${ease || 'power3.inOut'}' }, ${r3(k[i - 1][0])});`);
  }
  if (s.enter === 'punch') js.push(`tl.fromTo('#${s.id}-punch', { scale: 1.12 }, { scale: 1, duration: 0.32, ease: 'expo.out' }, ${r3(s.start)});`);
  if (s.enter === 'whip') js.push(`tl.fromTo('#${s.id}-punch', { xPercent: 100, rotation: 4 }, { xPercent: 0, rotation: 0, duration: 0.26, ease: 'expo.out' }, ${r3(s.start)});`);
  if (s.enter === 'whipup') js.push(`tl.fromTo('#${s.id}-punch', { yPercent: 60, scale: 0.9 }, { yPercent: 0, scale: 1, duration: 0.28, ease: 'expo.out' }, ${r3(s.start)});`);
  (s.rings || []).forEach((r, i) => {
    js.push(`tl.fromTo('#${s.id}-ring${i}', { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.22, ease: 'back.out(2)' }, ${r3(r.t)});`);
    js.push(`tl.to('#${s.id}-ring${i}', { opacity: 0, scale: 1.12, duration: 0.3, ease: 'power2.in' }, ${r3(r.t + (r.hold ?? 0.55))});`);
  });
}

// ── Captions: 2–5 words, ink blocks, words pop on the beat ──────────────────
reel.captions.forEach((c, ci) => {
  const id = `cap${ci}`;
  const lines = c.lines.map((line, li) => {
    const words = line.split(' ').map((w, wi) => `<span class="w" id="${id}-l${li}w${wi}">${w}</span>`).join(' ');
    return `<div class="line${c.small ? ' small' : ''}${c.hook ? ' hook' : ''}${c.light ? ' light' : ''}" id="${id}-l${li}">${words}</div>`;
  }).join('');
  html.push(`<div class="clip cap" id="${id}" data-start="${r3(c.start)}" data-duration="${r3(c.end - c.start)}" data-track-index="5" style="top:${c.y}px">${lines}</div>`);
  c.lines.forEach((line, li) => {
    const t = r3(c.lineTimes ? c.lineTimes[li] : c.start + li * 0.12);
    if (c.hook) {
      js.push(`tl.fromTo('#${id}-l${li}', { scale: 2.1, rotation: ${li % 2 ? 4 : -4}, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.24, ease: 'expo.out' }, ${t});`);
    } else {
      js.push(`tl.fromTo('#${id}-l${li}', { scale: 0.5, y: 40, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.28, ease: 'back.out(2.2)' }, ${t});`);
    }
    line.split(' ').forEach((w, wi) =>
      js.push(`tl.fromTo('#${id}-l${li}w${wi}', { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.2, ease: 'power3.out' }, ${r3(t + 0.04 + wi * 0.05)});`));
  });
  // Snap out on the next beat instead of fading.
  js.push(`tl.to('#${id}', { scale: 0.9, opacity: 0, duration: 0.1, ease: 'power2.in' }, ${r3(c.end - 0.1)});`);
});

// ── Data credits: shown on every frame where third-party data is visible ────
(reel.credits || []).forEach((c, i) => {
  html.push(`<div class="clip credit" id="credit${i}" data-start="${r3(c.start)}" data-duration="${r3(c.end - c.start)}" data-track-index="8"><span class="credit-text">${c.text}</span></div>`);
});

// ── Amigo, the guide ────────────────────────────────────────────────────────
const amigo = svg('./assets/img/amigo.svg');
reel.amigo.forEach((a, ai) => {
  const id = `amigo${ai}`;
  html.push(`<div class="clip amigo" id="${id}" data-start="${r3(a.start)}" data-duration="${r3(a.end - a.start)}" data-track-index="6" style="left:${a.x}px;top:${a.y}px;width:${a.size}px;height:${a.size}px">
  <div class="amigo-rig" id="${id}-rig">${amigo}</div>
</div>`);
  js.push(`tl.fromTo('#${id}-rig', { y: ${a.from ?? 420}, scale: 0.4, rotation: ${a.fromRot ?? -20} }, { y: 0, scale: 1, rotation: ${a.rot ?? 0}, duration: 0.42, ease: 'back.out(1.8)' }, ${r3(a.start)});`);
  for (const [t, kind] of a.acts || []) {
    if (kind === 'hop') js.push(`tl.to('#${id}-rig', { y: -90, duration: 0.16, ease: 'power2.out', yoyo: true, repeat: 1 }, ${r3(t)});`);
    if (kind === 'squash') js.push(`tl.fromTo('#${id}-rig', { scaleY: 0.8, scaleX: 1.15 }, { scaleY: 1, scaleX: 1, duration: 0.3, ease: 'elastic.out(1,0.4)' }, ${r3(t)});`);
    if (kind === 'lean') js.push(`tl.to('#${id}-rig', { rotation: ${a.lean ?? -14}, duration: 0.25, ease: 'back.out(2)' }, ${r3(t)});`);
    if (kind === 'wiggle') js.push(`tl.to('#${id}-rig', { rotation: 10, duration: 0.09, ease: 'sine.inOut', yoyo: true, repeat: 3 }, ${r3(t)});`);
    if (kind === 'out') js.push(`tl.to('#${id}-rig', { y: ${a.outY ?? 500}, rotation: 15, duration: 0.25, ease: 'power3.in' }, ${r3(t)});`);
  }
});

// ── End card ────────────────────────────────────────────────────────────────
const e = reel.endcard;
html.push(`<div class="clip end" id="end" data-start="${r3(e.start)}" data-duration="${r3(reel.duration - e.start)}" data-track-index="7">
  <div class="end-logo" id="end-logo">${svg('./assets/img/logo-primary.svg')}</div>
  <div class="end-url" id="end-url">imago.onslate.in</div>
  <div class="end-tag" id="end-tag">Free · Open source</div>
  <div class="end-amigo" id="end-amigo">${svg('./assets/img/amigo-resting.svg')}</div>
</div>`);
js.push(`tl.fromTo('#end-logo', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }, ${r3(e.start)});`);
js.push(`tl.fromTo('#end-url', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'expo.out' }, ${r3(e.start + e.beat)});`);
js.push(`tl.fromTo('#end-tag', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'expo.out' }, ${r3(e.start + e.beat * 2)});`);
js.push(`tl.fromTo('#end-amigo', { y: 300, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'back.out(1.6)' }, ${r3(e.start + e.beat * 3)});`);
js.push(`tl.to('#end-amigo', { y: -14, duration: ${r3(e.beat)}, ease: 'sine.inOut', yoyo: true, repeat: 3 }, ${r3(e.start + e.beat * 4)});`);

// ── Audio: music bed ducked under every SFX hit, then the SFX ───────────────
const hits = reel.sfx.map(([, t]) => t).sort((a, b) => a - b);
const pts = [{ t: 0, v: reel.music.vol }];
for (const t of hits) {
  const last = pts[pts.length - 1];
  if (t - 0.04 > last.t) pts.push({ t: r3(t - 0.04), v: reel.music.vol });
  pts.push({ t: r3(Math.max(t, last.t + 0.01)), v: reel.music.duck });
  pts.push({ t: r3(Math.max(t, last.t + 0.01) + 0.3), v: reel.music.vol });
}
const fadeAt = reel.duration - 0.45;
const clean = pts.filter((p) => p.t < fadeAt - 0.02);
clean.push({ t: r3(fadeAt), v: reel.music.vol }, { t: r3(reel.duration), v: 0 });
const music = { version: 1, lanes: [{ target: 'volume', points: clean }] };
html.push(`<audio id="music" src="assets/audio/music.mp3" data-start="0" data-duration="${reel.duration}" data-media-start="${reel.music.from || 0}" data-volume="1" data-track-index="10" data-timeline-role="music" data-automation='${JSON.stringify(music)}'></audio>`);
// File lengths (ffprobe), so a clip never runs past its sound.
const LEN = { click: 0.36, 'click-soft': 0.36, 'key-press': 0.4, ping: 1.32, pop: 0.72, whoosh: 0.57, 'whoosh-short': 0.57,
  'impact-bass-1': 2.1, sparkle: 1.8, notification: 2.46, chime: 2.5, riser: 10 };
const lanes = []; // end time per SFX lane, so no two clips share a lane at once
reel.sfx.slice().sort((a, b) => a[1] - b[1]).forEach(([name, t, vol], i) => {
  const d = SFX[name];
  const start = Math.max(0, t - d.lead);
  if (start >= reel.duration) return;
  const dur = Math.min(d.dur || LEN[name] - (d.mediaStart || 0), reel.duration - start);
  let lane = lanes.findIndex((end) => end <= start);
  if (lane < 0) { lane = lanes.length; lanes.push(0); }
  lanes[lane] = start + dur + 0.01;
  html.push(`<audio id="sfx${i}-${name}" src="assets/sfx/${name}.mp3" data-start="${r3(start)}" data-duration="${r3(dur)}"${d.mediaStart ? ` data-media-start="${d.mediaStart}"` : ''} data-volume="${vol ?? d.vol}" data-track-index="${11 + lane}"></audio>`);
});

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${W}, height=${H}">
<!-- Generated by build.mjs from scenes.mjs. Edit those, not this file. -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
@font-face { font-family: 'Inter Display'; src: url('assets/fonts/InterDisplay-SemiBold.otf'); font-weight: 600; }
@font-face { font-family: 'Inter'; src: url('assets/fonts/Inter-Medium.otf'); font-weight: 500; }
@font-face { font-family: 'JetBrains Mono'; src: url('assets/fonts/JetBrainsMono-Medium.ttf'); font-weight: 500; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #f6f5f1; }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #f6f5f1; font-family: 'Inter', sans-serif; }
.shot { position: absolute; inset: 0; overflow: hidden; background: #f6f5f1; }
.punch { position: absolute; inset: 0; }
.cam { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; transform-origin: 0 0; }
.cam img { display: block; width: ${W}px; height: ${H}px; }
.ring { position: absolute; border: 9px solid #f5ce47; border-radius: 22px; box-shadow: 0 0 0 6px rgba(245,206,71,.28); }
.cap { position: absolute; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.line { display: block; font-family: 'Inter Display', sans-serif; font-weight: 600; font-size: 118px; line-height: 1.02; letter-spacing: -0.035em; color: #f6f5f1; background: #1b1b19; padding: 14px 34px 22px; border-radius: 26px; white-space: nowrap; }
.line.small { font-size: 84px; padding: 12px 28px 18px; }
.line.hook { font-size: 150px; padding: 16px 40px 26px; }
.line.light { background: #f6f5f1; color: #1b1b19; }
.w { display: inline-block; }
.credit { position: absolute; left: 0; right: 0; top: 1822px; display: flex; justify-content: center; }
.credit-text { font-family: 'JetBrains Mono', monospace; font-weight: 500; font-size: 30px; color: #57564f; background: #f6f5f1; padding: 8px 18px; border-radius: 12px; }
.amigo { position: absolute; }
.amigo-rig { width: 100%; height: 100%; transform-origin: 50% 90%; }
.amigo-rig svg, .end-logo svg, .end-amigo svg { display: block; width: 100%; height: 100%; }
.end { position: absolute; inset: 0; background: #f6f5f1; }
.end-logo { position: absolute; left: -260px; top: 420px; width: 1600px; height: 600px; }
.end-url { position: absolute; left: 0; right: 0; top: 1010px; text-align: center; font-family: 'JetBrains Mono', monospace; font-weight: 500; font-size: 74px; color: #1b1b19; letter-spacing: -0.01em; }
.end-tag { position: absolute; left: 0; right: 0; top: 1130px; text-align: center; font-family: 'Inter', sans-serif; font-weight: 500; font-size: 60px; color: #57564f; }
.end-amigo { position: absolute; left: 365px; top: 1320px; width: 350px; height: 280px; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${reel.duration}" data-width="${W}" data-height="${H}">
${html.join('\n')}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${js.join('\n')}
window.__timelines["main"] = tl;
</script>
</body>
</html>
`;
writeFileSync(new URL('./index.html', import.meta.url), page);
console.log('index.html written:', reel.shots.length, 'shots,', reel.captions.length, 'captions,', reel.sfx.length, 'sfx');
