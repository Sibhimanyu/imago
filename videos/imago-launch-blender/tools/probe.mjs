// probe.mjs — runs one HyperFrames scene in headless Chromium and dumps what the
// Blender importer needs: the untransformed layout of every element, every GSAP
// tween, and per-frame samples of everything that moves (the ground truth the
// importer checks its keyframes against).
//
//   node probe.mjs <composition.html> <out.json> [--fps 30]
//
// Coordinates are CSS px in the 1920x1080 stage, y down.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const compPath = path.resolve(args[0]);
const outPath = path.resolve(args[1]);
const FPS = Number(args[args.indexOf("--fps") + 1] || 30) || 30;
const HERE = path.dirname(new URL(import.meta.url).pathname);
// The composition's project root (where assets/ lives): two levels above compositions/frames/x.html.
const ROOT = path.resolve(path.dirname(compPath), "../..");
const GSAP = fs.readFileSync(path.join(HERE, "node_modules/gsap/dist/gsap.min.js"), "utf8");
const CHROME = [
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
].find((p) => fs.existsSync(p));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".otf": "font/otf", ".ttf": "font/ttf", ".png": "image/png", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".json": "application/json", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (u === "/__harness.html") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(`<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:1920px;height:1080px;overflow:hidden;background:#000}#stage{position:relative;width:1920px;height:1080px;overflow:hidden;background:#F6F5F1}</style><script>${GSAP}</script></head><body><div id="stage"></div></body></html>`);
  }
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error") console.error("[page]", m.text()); });
page.on("pageerror", (e) => console.error("[pageerror]", e.message));
// Every CDN gsap is already on the harness page.
await page.route(/cdn\.jsdelivr\.net\/npm\/gsap/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
await page.goto(`http://localhost:${port}/__harness.html`);

const rel = path.relative(ROOT, compPath).split(path.sep).join("/");
const result = await page.evaluate(async ({ rel, FPS }) => {
  // ---------- mount the composition's <template> and run its scripts ----------
  const html = await (await fetch("/" + rel)).text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tpl = doc.querySelector("template");
  const content = tpl ? tpl.content : doc.body;
  const stage = document.getElementById("stage");
  const scripts = [];
  for (const n of [...content.childNodes]) stage.appendChild(document.importNode(n, true));
  stage.querySelectorAll("script").forEach((s) => { scripts.push(s); });
  for (const s of scripts) {
    if (s.src) { s.remove(); continue; }
    const ns = document.createElement("script"); ns.textContent = s.textContent; s.replaceWith(ns);
  }
  // load every declared face, not only the ones visible at t=0 (typed text starts empty)
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => 0)));
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
  const root = stage.querySelector("[data-composition-id]") || stage.firstElementChild;
  const ID = root.getAttribute("data-composition-id");
  const tl = window.__timelines && window.__timelines[ID];
  if (!tl) throw new Error("no timeline for " + ID);
  const DUR = Number(root.getAttribute("data-duration")) || tl.duration();
  // Clips are only visible inside their data-start/data-duration window.
  const clipWin = (el) => { const s = el.getAttribute("data-start"); if (s == null) return null; return [Number(s), Number(s) + Number(el.getAttribute("data-duration") || 1e9)]; };

  // ---------- ids for every element ----------
  let uid = 0; const elId = new Map(); const all = [];
  const walk = (el) => { if (el.nodeType !== 1 || el.tagName === "SCRIPT" || el.tagName === "STYLE") return; const id = el.id || el.getAttribute("data-hf-id") || ("e" + uid); elId.set(el, `${id}#${uid++}`); all.push(el); [...el.children].forEach(walk); };
  walk(root);
  const idOf = (el) => elId.get(el);

  // ---------- tweens ----------
  tl.seek(0, false);
  const RESERVED = new Set("duration ease delay onUpdate onComplete onStart onRepeat onUpdateParams onCompleteParams immediateRender overwrite startAt stagger repeat yoyo repeatDelay id callbackScope runBackwards data lazy paused keyframes inherit parent reversed yoyoEase autoRound modifiers".split(" "));
  const tweens = [];
  const globalStart = (t) => { let s = t.startTime(), p = t.parent; while (p && p !== tl) { s = p.startTime() + s / (p.timeScale() || 1); p = p.parent; } return s; };
  for (const tw of tl.getChildren(true, true, false)) {
    const targets = tw.targets().filter((t) => t instanceof Element && elId.has(t));
    if (!targets.length) continue;
    const v = tw.vars; const props = [];
    for (const k of Object.keys(v)) {
      if (RESERVED.has(k)) continue;
      if (k === "attr" && typeof v.attr === "object") { for (const a of Object.keys(v.attr)) props.push("attr:" + a); continue; }
      if (k === "css" && typeof v.css === "object") { for (const a of Object.keys(v.css)) props.push(a); continue; }
      props.push(k);
    }
    const ease = typeof v.ease === "string" ? v.ease : (v.ease ? "custom" : (tw.duration() === 0 ? "none" : "power1.out"));
    tweens.push({ start: globalStart(tw), dur: tw.duration(), ease, props, targets: targets.map(idOf), from: !!v.runBackwards, fromTo: !!v.startAt });
  }

  // ---------- readers ----------
  const TF = ["x", "y", "z", "rotation", "rotationX", "rotationY", "scaleX", "scaleY", "skewX", "skewY"];
  const read = (el, p) => {
    if (p.startsWith("attr:")) { const a = p.slice(5); const val = el.getAttribute(a); const n = parseFloat(val); return isNaN(n) ? val : n; }
    if (TF.includes(p) || p === "opacity") return Number(gsap.getProperty(el, p)) || 0;
    if (p === "scale") return Number(gsap.getProperty(el, "scaleX"));
    if (p === "rotate") return Number(gsap.getProperty(el, "rotation"));
    const cs = getComputedStyle(el);
    if (p === "autoAlpha") return Number(cs.opacity);
    const css = p.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    const val = cs.getPropertyValue(css);
    const n = parseFloat(val); return /^-?[\d.]+(px)?$/.test(val.trim()) ? n : val;
  };
  const expand = (p) => p === "scale" ? ["scaleX", "scaleY"] : p === "rotate" ? ["rotation"] : p === "autoAlpha" ? ["opacity", "visibility"] : p === "transformOrigin" ? [] : [p];

  // Channels to sample: every tweened (element, prop), plus transforms/opacity of everything tweened.
  const chan = new Map();
  for (const t of tweens) for (const tid of t.targets) for (const p of t.props) for (const q of expand(p)) { const k = tid + "|" + q; chan.set(k, { el: all.find((e) => idOf(e) === tid), p: q }); }

  // Each tween's own start/end values, read by seeking (validated against the samples in Blender).
  for (const t of tweens) {
    t.values = {};
    for (const tid of t.targets) { const el = all.find((e) => idOf(e) === tid); const o = {};
      for (const p of t.props) for (const q of expand(p)) {
        tl.seek(t.start + 1e-5, false); const a = read(el, q);
        tl.seek(t.start + t.dur + (t.dur ? 0 : 1e-5), false); const b = read(el, q); o[q] = [a, b]; }
      t.values[tid] = o; }
  }
  tl.seek(0, false);

  // ---------- sampling: every frame ----------
  // GSAP channels, plus whatever scene code writes directly (onUpdate): inline transforms,
  // opacity, top/left/width/height, display, text/innerHTML and SVG attributes.
  const N = Math.round(DUR * FPS);
  const samples = {}; for (const k of chan.keys()) samples[k] = [];
  const texts = {}, paints = {}, vis = {}, direct = {}, attrs = {};
  const gsapHas = new Set([...chan.keys()]);
  const renderables = all.filter((e) => e instanceof SVGElement ? ["rect", "path", "circle", "ellipse", "line", "polygon", "polyline", "text"].includes(e.tagName) : true);
  const isShape = (e) => e instanceof SVGElement && e.tagName !== "svg";
  const paintOf = (e) => { const cs = getComputedStyle(e); return e instanceof SVGElement ? cs.fill + "|" + cs.stroke : cs.color + "|" + cs.backgroundColor + "|" + cs.borderTopColor; };
  const push = (o, k, v) => { (o[k] ||= []).push(v); };
  for (let f = 0; f <= N; f++) {
    // just after the frame time, as forward playback sees it (a set exactly at t has applied)
    tl.seek(f / FPS + 1e-6, false);
    for (const [k, c] of chan) samples[k].push(read(c.el, c.p));
    for (const e of all) {
      const id = idOf(e); const on = e.isConnected; const cs = on ? getComputedStyle(e) : null;
      push(vis, id, !on ? 0 : cs.display === "none" ? 0 : cs.visibility === "hidden" ? 0 : 1);
      push(texts, id, on ? e.textContent : "");
      if (renderables.includes(e)) push(paints, id, on ? paintOf(e) : "");
      if (!on) continue;
      if (isShape(e)) { for (const a of ["d", "x", "y", "width", "height", "rx", "cx", "cy", "r", "x1", "x2", "y1", "y2"]) if (e.hasAttribute(a)) push(attrs, id + "|" + a, e.getAttribute(a)); continue; }
      if (!gsapHas.has(id + "|x") && !gsapHas.has(id + "|y") && !gsapHas.has(id + "|rotation") && !gsapHas.has(id + "|scaleX")) push(direct, id + "|transform", cs.transform);
      if (!gsapHas.has(id + "|opacity")) push(direct, id + "|opacity", cs.opacity);
      for (const k of ["width", "height"]) if (!gsapHas.has(id + "|" + k)) push(direct, id + "|" + k, cs[k]);
      // layout position (reflow, or top/left written by code): offset within the offset parent
      if (e instanceof HTMLElement) { push(direct, id + "|left", e.offsetLeft + "px"); push(direct, id + "|top", e.offsetTop + "px"); }
      push(direct, id + "|filter", cs.filter);
    }
  }
  const constant = (a) => a.every((x) => x === a[0]);
  for (const o of [paints, vis, texts, direct, attrs]) for (const k of Object.keys(o)) if (o[k].length !== N + 1 || constant(o[k])) delete o[k];
  // Text: keep the lowest elements whose text changes (a container's text changes with its children's).
  for (const id of Object.keys(texts)) {
    const e = all.find((x) => idOf(x) === id);
    if ([...e.children].some((c) => elId.has(c) && texts[idOf(c)] !== undefined && c.isConnected)) delete texts[id];
  }
  // Rich text: per frame, the coloured runs of every text node below the element.
  const runsOf = (e) => { const out = []; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.textContent.length) continue; const c = getComputedStyle(n.parentElement).color; if (out.length && out[out.length - 1][1] === c) out[out.length - 1][0] += n.textContent; else out.push([n.textContent, c]); } return out; };
  const rich = {};
  const richIds = Object.keys(texts).filter((id) => { const e = all.find((x) => idOf(x) === id); return e.querySelector("*") || true; });
  for (const id of richIds) rich[id] = [];
  for (let f = 0; f <= N; f++) { tl.seek(f / FPS + 1e-6, false); for (const id of richIds) { const e = all.find((x) => idOf(x) === id); rich[id].push(e.isConnected ? runsOf(e) : []); } }
  for (const id of richIds) { const cols = new Set(rich[id].flat().map((r) => r[1])); if (cols.size <= 1) delete rich[id]; }

  // ---------- static layout at t=0, with every transform switched off ----------
  tl.seek(0, false);
  const state0 = new Map(all.map((e) => [e, { x: +gsap.getProperty(e, "x") || 0, y: +gsap.getProperty(e, "y") || 0, z: +gsap.getProperty(e, "z") || 0, rotation: +gsap.getProperty(e, "rotation") || 0, rotationX: +gsap.getProperty(e, "rotationX") || 0, rotationY: +gsap.getProperty(e, "rotationY") || 0, scaleX: +gsap.getProperty(e, "scaleX"), scaleY: +gsap.getProperty(e, "scaleY"), skewX: +gsap.getProperty(e, "skewX") || 0, opacity: +getComputedStyle(e).opacity, transform: getComputedStyle(e).transform, perspective: getComputedStyle(e).perspective, transformPerspective: +gsap.getProperty(e, "transformPerspective") || 0 }]));
  const styleT0 = new Map(all.map((e) => [e, getComputedStyle(e)]));
  const snap = new Map();
  for (const e of all) { const cs = getComputedStyle(e); const o = {}; for (const k of ["display", "visibility", "position", "color", "backgroundColor", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius", "borderTopWidth", "borderTopColor", "borderTopStyle", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderLeftColor", "boxShadow", "overflow", "overflowX", "overflowY", "fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight", "textAlign", "whiteSpace", "transformOrigin", "filter", "mixBlendMode", "objectFit", "objectPosition", "fill", "stroke", "strokeWidth", "fillOpacity", "textTransform", "zIndex", "perspectiveOrigin", "transformStyle", "backfaceVisibility", "backgroundImage", "clipPath", "maskImage", "textShadow", "fontVariantNumeric", "fontFeatureSettings"]) o[k] = cs[k]; snap.set(e, o); }
  const kill = document.createElement("style");
  kill.textContent = "#stage *{transform:none!important;translate:none!important;rotate:none!important;scale:none!important;transition:none!important;animation:none!important}";
  document.head.appendChild(kill);
  const sb = stage.getBoundingClientRect();
  const box = (r) => ({ x: r.left - sb.left, y: r.top - sb.top, w: r.width, h: r.height });
  const ctx = document.createElement("canvas").getContext("2d");
  const nodes = [];
  for (const e of all) {
    if (!e.isConnected) continue;
    const st = snap.get(e); const s0 = state0.get(e);
    let pe = e.parentElement; while (pe && pe !== root && !elId.has(pe)) pe = pe.parentElement;
    const n = { id: idOf(e), tag: e.tagName.toLowerCase(), cls: e.getAttribute("class") || "", parent: e === root ? null : (pe ? idOf(pe) : idOf(root)), box: box(e.getBoundingClientRect()), style: st, t0: s0, clip: clipWin(e) };
    if (e.tagName === "IMG") { n.src = e.getAttribute("src"); n.natural = [e.naturalWidth, e.naturalHeight]; }
    if (e instanceof SVGElement) {
      n.svg = {}; for (const a of e.getAttributeNames()) n.svg[a] = e.getAttribute(a);
      if (e.tagName === "svg") { const vb = e.viewBox.baseVal; n.viewBox = vb ? [vb.x, vb.y, vb.width, vb.height] : null; }
      if (e.getCTM && e.tagName !== "svg") { const m = e.getCTM(); const svgEl = e.ownerSVGElement; const sm = svgEl.getScreenCTM(); const om = e.getScreenCTM(); n.ctm = om ? [om.a, om.b, om.c, om.d, om.e - sb.left, om.f - sb.top] : null; }
    }
    // Text runs: this element's own text nodes, split into lines by their rendered boxes.
    const runs = [];
    for (const tn of e.childNodes) {
      if (tn.nodeType !== 3 || !tn.textContent.length) continue;
      const txt = tn.textContent; const rg = document.createRange(); let line = null;
      for (let i = 0; i < txt.length; i++) {
        rg.setStart(tn, i); rg.setEnd(tn, i + 1); const rs = rg.getClientRects(); if (!rs.length) continue; const r = rs[0];
        const top = Math.round(r.top);
        if (!line || Math.abs(top - line.top) > 2) { if (line) runs.push(line); line = { top, text: "", x: r.left - sb.left, y: r.top - sb.top, h: r.height, right: r.right - sb.left }; }
        line.text += txt[i]; line.right = Math.max(line.right, r.right - sb.left);
      }
      if (line) runs.push(line);
    }
    if (runs.length) {
      ctx.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
      const m = ctx.measureText("Hxg");
      ctx.letterSpacing = st.letterSpacing === "normal" ? "0px" : st.letterSpacing; ctx.fontKerning = "normal";
      const H = ctx.measureText("H");
      n.capRatio = H.actualBoundingBoxAscent / parseFloat(st.fontSize);
      n.text = runs.map((r) => { const t = r.text.replace(/\s+$/, ""); const mm = ctx.measureText(t); return { text: t, raw: r.text, x: r.x, top: r.y, h: r.h, w: r.right - r.x, inkL: -mm.actualBoundingBoxLeft, inkR: mm.actualBoundingBoxRight, baseline: r.y + (r.h - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent }; });
      n.fontAscent = m.fontBoundingBoxAscent; n.fontDescent = m.fontBoundingBoxDescent;
    }
    if (e.tagName === "CANVAS") n.canvas = e.toDataURL("image/png");
    nodes.push(n);
  }
  // Elements whose text changes: lay out their longest state too (typed text is empty at t=0).
  const textLayout = {};
  for (const id of Object.keys(texts)) {
    const arr = texts[id]; const e = all.find((x) => idOf(x) === id);
    const order = [...arr.keys()].sort((a, b) => arr[b].length - arr[a].length);
    let best = order[0];
    for (const f of order.slice(0, 60)) { kill.remove(); tl.seek(f / FPS + 1e-6, false); if (e.isConnected && e.getClientRects().length && e.textContent.trim()) { best = f; break; } }
    kill.remove(); tl.seek(best / FPS + 1e-6, false); document.head.appendChild(kill);
    const st = getComputedStyle(e);
    const runs = []; const tw_ = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); const tns = []; let tn_; while ((tn_ = tw_.nextNode())) tns.push(tn_);
    let line = null;
    for (const tn of tns) { const txt = tn.textContent; const rg = document.createRange();
      for (let i = 0; i < txt.length; i++) { rg.setStart(tn, i); rg.setEnd(tn, i + 1); const rs = rg.getClientRects(); if (!rs.length) continue; const r = rs[0]; const top = Math.round(r.top);
        if (!line || Math.abs(top - line.top) > 2) { if (line) runs.push(line); line = { top, text: "", x: r.left - sb.left, y: r.top - sb.top, h: r.height, right: r.right - sb.left }; }
        line.text += txt[i]; line.right = Math.max(line.right, r.right - sb.left); } }
    if (line) runs.push(line);
    ctx.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`; ctx.letterSpacing = st.letterSpacing === "normal" ? "0px" : st.letterSpacing;
    const m = ctx.measureText("Hxg"); const H = ctx.measureText("H");
    textLayout[id] = { frame: best, box: box(e.getBoundingClientRect()), capRatio: H.actualBoundingBoxAscent / parseFloat(st.fontSize), fontAscent: m.fontBoundingBoxAscent,
      lines: runs.map((r) => { const t = r.text.replace(/\s+$/, ""); const mm = ctx.measureText(t); return { text: t, x: r.x, top: r.y, h: r.h, w: r.right - r.x, inkL: -mm.actualBoundingBoxLeft, inkR: mm.actualBoundingBoxRight, baseline: r.y + (r.h - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent }; }),
      style: { fontFamily: st.fontFamily, fontSize: st.fontSize, fontWeight: st.fontWeight, letterSpacing: st.letterSpacing, lineHeight: st.lineHeight, textAlign: st.textAlign, whiteSpace: st.whiteSpace, textTransform: st.textTransform } };
  }
  kill.remove();
  return { textLayout, direct, attrs, rich, id: ID, duration: DUR, fps: FPS, frames: N, nodes, tweens, samples, texts, paints, vis, chanKeys: [...chan.keys()] };
}, { rel, FPS });

fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`${result.id}: ${result.nodes.length} nodes, ${result.tweens.length} tweens, ${result.chanKeys.length} channels, ${result.frames + 1} frames -> ${outPath}`);
await browser.close(); server.close();
