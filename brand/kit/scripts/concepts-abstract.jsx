// Logo exploration, round 2 — abstract. Same rules as Reveal: one colour, one fused
// silhouette, at most one counter, no literal UI (no rows, bars, braces, dots of accent).
// Each idea is still drawn from something Imago does. One artboard per idea, showing the
// mark large, as an app tile, and at 32 / 16 px so the small-size read is honest.
newDoc("imago-logo-abstract", 400, 460, false);
var bg = DOC.layers[0], art = layer("Marks"), notes = layer("Notes");
var BW = 400, BH = 460, GAP = 60, COLS = 4;

// ── Drawing in mark units (32-unit box at x, y, size s per unit) ──────────
var U = { x: 0, y: 0, s: 1, g: null };
function uR(x, y, w, h, r, c) { return rrect(U.x + x * U.s, U.y + y * U.s, w * U.s, h * U.s, r * U.s, c, U.g); }
function uC(cx, cy, r, c) { return circle(U.x + cx * U.s, U.y + cy * U.s, r * U.s, c, U.g); }
// Absolute M / L / C / Z path in mark units. Filled when c is given, stroked when w is.
function uP(d, c, sc, w) {
  var tok = d.match(/[MLCZ]|-?\d*\.?\d+/g), i = 0, cmd = "", pts = [], closed = false;
  function n() { return parseFloat(tok[i++]); }
  function at(px, py) { return [L(U.x + px * U.s), T(U.y + py * U.s)]; }
  while (i < tok.length) {
    if (/[A-Z]/.test(tok[i])) cmd = tok[i++];
    if (cmd == "Z") { closed = true; continue; }
    if (cmd == "C") {
      var c1 = at(n(), n()), c2 = at(n(), n()), a = at(n(), n());
      pts[pts.length - 1].r = c1; pts.push({ a: a, l: c2, r: a });
    } else { var p = at(n(), n()); pts.push({ a: p, l: p, r: p }); }
  }
  var path = U.g.pathItems.add(), arr = [];
  for (i = 0; i < pts.length; i++) arr.push(pts[i].a);
  path.setEntirePath(arr); path.closed = closed;
  for (i = 0; i < pts.length; i++) { path.pathPoints[i].leftDirection = pts[i].l; path.pathPoints[i].rightDirection = pts[i].r; }
  fill(path, c || null);
  if (sc) { stroke(path, sc, w * U.s); path.strokeCap = StrokeCap.ROUNDENDCAP; path.strokeJoin = StrokeJoin.ROUNDENDJOIN; }
  return path;
}
function uLine(x1, y1, x2, y2, c, w) { return uP("M" + x1 + " " + y1 + " L" + x2 + " " + y2, null, c, w); }
function uRing(x, y, w, h, r, c, sw) { var p = uR(x, y, w, h, r, null); stroke(p, c, sw * U.s); return p; }

// Rounded rect with per-corner radii [tl, tr, br, bl], in mark units.
function uRR(x, y, w, h, r, c) {
  var k = 0.5523, a = r[0], b = r[1], d = r[2], e = r[3];
  return uP("M" + (x + a) + " " + y + " L" + (x + w - b) + " " + y +
    " C" + (x + w - b + b * k) + " " + y + " " + (x + w) + " " + (y + b - b * k) + " " + (x + w) + " " + (y + b) +
    " L" + (x + w) + " " + (y + h - d) +
    " C" + (x + w) + " " + (y + h - d + d * k) + " " + (x + w - d + d * k) + " " + (y + h) + " " + (x + w - d) + " " + (y + h) +
    " L" + (x + e) + " " + (y + h) +
    " C" + (x + e - e * k) + " " + (y + h) + " " + x + " " + (y + h - e + e * k) + " " + x + " " + (y + h - e) +
    " L" + x + " " + (y + a) +
    " C" + x + " " + (y + a - a * k) + " " + (x + a - a * k) + " " + y + " " + (x + a) + " " + y + " Z", c);
}

// P: { ink, bg } — `bg` is used for knock-outs, so every idea works on paper and
// reversed on the ink tile. No accent colour this round.
var CONCEPTS = [
  { name: "Reveal", tag: "ACCEPTED · REFERENCE", meaning: "Two incoming fields fuse into one body; the single aperture is the interface revealed inside. The bar for this round.",
    draw: function (P) { mark(U.x, U.y, 32 * U.s, P.ink, U.g); } },

  { name: "Chrysalis", meaning: "A half-disc and a slab, split by one clean gap. The closed pod and the opened form of metamorphosis, side by side.",
    draw: function (P) {
      uP("M14.6 4 C8 4 4 9.4 4 16 C4 22.6 8 28 14.6 28 Z", P.ink);
      uR(17.4, 4, 10.6, 24, 4.5, P.ink);
    } },

  { name: "Wing", meaning: "Two mirrored leaves, each round on one diagonal and sharp on the other. Reads as a butterfly opening, the imago stage, without drawing one.",
    draw: function (P) {
      uRR(4, 6, 11.3, 20, [10, 1.6, 10, 1.6], P.ink);
      uRR(16.7, 6, 11.3, 20, [1.6, 10, 1.6, 10], P.ink);
    } },

  { name: "Socket", meaning: "A value seated in its structure: a round bite out of the body with the piece that fits it held just inside. Data arriving where it belongs.",
    draw: function (P) {
      uR(9, 5, 19, 22, 5.5, P.ink);
      uC(9, 16, 6.4, P.bg);
      uC(9, 16, 4, P.ink);
    } },

  { name: "Comet", meaning: "Three incoming fields stream into one round body. Reveal's idea pushed further: motion instead of a window.",
    draw: function (P) {
      uR(8, 7.4, 12, 4.2, 2.1, P.ink); uR(3, 13.9, 17, 4.2, 2.1, P.ink); uR(8, 20.4, 12, 4.2, 2.1, P.ink);
      uC(20, 16, 9, P.ink);
    } },

  { name: "Peel", meaning: "A page with its corner lifted clean away. What was underneath the response is now showing; the missing piece is the story.",
    draw: function (P) {
      uP("M9 4 L17.5 4 L28 14.5 L28 24 C28 26.2 26.2 28 24 28 L9 28 C6.8 28 5 26.2 5 24 L5 8 C5 5.8 6.8 4 9 4 Z", P.ink);
      uP("M20.8 4 L25 4 C26.7 4 28 5.3 28 7 L28 11.2 Z", P.ink);
    } },

  { name: "Settle", meaning: "Three equal slabs whose corners soften from raw to finished. The same data, top to bottom, becoming a form.",
    draw: function (P) {
      uR(5, 5, 22, 6, 0.4, P.ink); uR(5, 13, 22, 6, 1.8, P.ink); uR(5, 21, 22, 6, 3, P.ink);
    } },

  { name: "Quadrant", meaning: "Four cells of one hash; three are squares, one has resolved into a circle. Same shape, same interface; one cell is the finished part.",
    draw: function (P) {
      uRR(4.5, 4.5, 11, 11, [5.5, 1.5, 1.5, 1.5], P.ink);
      uRR(16.5, 4.5, 11, 11, [1.5, 5.5, 1.5, 1.5], P.ink);
      uRR(4.5, 16.5, 11, 11, [1.5, 1.5, 1.5, 5.5], P.ink);
      uC(22, 22, 5.5, P.ink);
    } },

  { name: "Lens", meaning: "Imago is Latin for image. An almond with one round counter: an eye, a lens, a window, depending on how you look at it.",
    draw: function (P) {
      uP("M3.5 16 C8.5 6.5 23.5 6.5 28.5 16 C23.5 25.5 8.5 25.5 3.5 16 Z", P.ink);
      uC(16, 16, 4.6, P.bg);
    } },

  { name: "Link", meaning: "A node and a block joined by one thick bond. A key turning into a component, as one continuous shape.",
    draw: function (P) {
      uLine(9.5, 9.5, 19, 19, P.ink, 5.4);
      uC(9.5, 9.5, 5.5, P.ink);
      uR(13, 13, 15, 15, 4.5, P.ink);
    } },

  { name: "Diff", meaning: "Two fetches of the same endpoint, overlaid. Where they agree cancels out; what is left is exactly what changed.",
    draw: function (P) {
      var cp = U.g.compoundPathItems.add(), s = U.s;
      cp.pathItems.roundedRectangle(T(U.y + 4 * s), L(U.x + 4 * s), 17 * s, 17 * s, 5 * s, 5 * s);
      cp.pathItems.roundedRectangle(T(U.y + 11 * s), L(U.x + 11 * s), 17 * s, 17 * s, 5 * s, 5 * s);
      for (var i = 0; i < cp.pathItems.length; i++) { cp.pathItems[i].evenodd = true; fill(cp.pathItems[i], P.ink); }
    } },

  { name: "Morph", meaning: "Round on one side, square on the other: the shape is mid-transformation. A round counter becomes a square one inside it.",
    draw: function (P) {
      uP("M16 5 L24 5 C26.2 5 28 6.8 28 9 L28 23 C28 25.2 26.2 27 24 27 L16 27 C9.9 27 5 22.1 5 16 C5 9.9 9.9 5 16 5 Z", P.ink);
      uC(12, 16, 2.7, P.bg); uR(18.3, 13.3, 5.4, 5.4, 1, P.bg);
    } },

  { name: "Emerge", meaning: "A disc rising out of a block, with a clean halo cut between them. The finished form lifting out of the raw one.",
    draw: function (P) {
      uR(4, 16, 24, 12, 4, P.ink);
      uC(16, 12.5, 9.2, P.bg);
      uC(16, 12.5, 7, P.ink);
    } }
];

function drawConcept(k, x, y, size, P) {
  var g = art.groupItems.add(); g.name = (k + 1) + " " + CONCEPTS[k].name;
  U.x = x; U.y = y; U.s = size / 32; U.g = g;
  CONCEPTS[k].draw(P);
  return g;
}
var ON_PAPER = { ink: "ink", bg: "paper" };
var ON_INK   = { ink: "card", bg: "ink" };
var ON_CARD  = { ink: "ink", bg: "card" };

for (var k = 0; k < CONCEPTS.length; k++) {
  var bx = (k % COLS) * (BW + GAP), by = Math.floor(k / COLS) * (BH + GAP);
  board((k < 9 ? "0" : "") + (k + 1) + "-" + CONCEPTS[k].name.toLowerCase().replace(/[^a-z]+/g, "-"), bx, by, BW, BH, k == 0);
  rect(bx, by, BW, BH, "paper", bg).name = "paper";

  // hero size
  drawConcept(k, bx + (BW - 190) / 2, by + 30, 190, ON_PAPER);

  // small-size strip: app tile, then 32 and 16 px on white
  var sy = by + 250;
  rrect(bx + 20, sy - 8, BW - 40, 80, 12, "card", bg).name = "size strip";
  var tile = rrect(bx + 36, sy, 64, 64, 16, "ink", art); tile.name = "app tile";
  drawConcept(k, bx + 36 + 32 - 25, sy + 32 - 25, 50, ON_INK);
  drawConcept(k, bx + 128, sy + 16, 32, ON_CARD);
  drawConcept(k, bx + 180, sy + 24, 16, ON_CARD);
  var lk = drawConcept(k, bx + 222, sy + 20, 24, ON_CARD);
  text("Imago", bx + 222 + 31, sy + 20 + 19.2, { font: "InterDisplay-SemiBold", size: 18, color: "ink", tracking: -24, into: art });

  text((k < 9 ? "0" : "") + (k + 1) + (CONCEPTS[k].tag ? "  ·  " + CONCEPTS[k].tag : ""), bx + 24, by + 364,
    { font: "JetBrainsMono-Medium", size: 8, color: CONCEPTS[k].tag ? "yellowInk" : "muted", tracking: 60, into: notes });
  text(CONCEPTS[k].name, bx + 24, by + 388, { font: "InterDisplay-SemiBold", size: 18, color: "ink", tracking: -10, into: notes });
  para(CONCEPTS[k].meaning, bx + 24, by + 398, BW - 48, 50, { font: "Inter-Regular", size: 9, leading: 13, color: "muted", into: notes });
}

saveAI("imago-logo-abstract.ai");
var dir = new Folder(KIT + "/exports/abstract"); if (!dir.exists) dir.create();
for (k = 0; k < CONCEPTS.length; k++) exportPNG("exports/abstract/" + DOC.artboards[k].name + ".png", 200, k);
"ok " + DOC.artboards.length;
