// Logo exploration — the accepted Reveal mark plus twelve alternative directions,
// each drawn from something Imago actually does. One artboard per idea, showing the
// mark large, as an app tile, and at 32 / 16 px so the small-size read is honest.
newDoc("imago-logo-concepts", 400, 460, false);
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

// P: { ink, bg, accent, soft } — `bg` is used for knock-outs, so every idea works
// on paper and reversed on the ink tile.
var CONCEPTS = [
  { name: "Reveal", tag: "ACCEPTED", meaning: "Two incoming response fields join one rounded body; the aperture on the right is the interface revealed inside it.",
    draw: function (P) { mark(U.x, U.y, 32 * U.s, P.ink, U.g); } },

  { name: "Brace Window", meaning: "A JSON brace opens and the space it holds is already a window with rows in it. Raw syntax on the left, finished view on the right.",
    draw: function (P) {
      uP("M11.5 5 C8.4 5 7.6 6.6 7.6 9.4 L7.6 12.6 C7.6 14.8 6.6 16 4.4 16 C6.6 16 7.6 17.2 7.6 19.4 L7.6 22.6 C7.6 25.4 8.4 27 11.5 27", null, P.ink, 2.8);
      uR(14, 6.5, 14.5, 19, 4, P.ink);
      uR(17, 10.5, 8.5, 2.6, 1.3, P.accent);
      uR(17, 15, 6, 2.6, 1.3, P.bg);
      uR(17, 19.5, 7.3, 2.6, 1.3, P.bg);
    } },

  { name: "Imago Wings", meaning: "Four interface tiles arranged as a butterfly. Imago is the insect's final form; the dashboard is the data's.",
    draw: function (P) {
      uR(3.5, 6, 11.8, 11.5, 4.2, P.ink); uR(16.7, 6, 11.8, 11.5, 4.2, P.ink);
      uR(5.5, 19, 9.8, 8, 3.6, P.ink);    uR(16.7, 19, 9.8, 8, 3.6, P.ink);
      uR(19.6, 9.6, 6, 2.2, 1.1, P.bg);   uR(19.6, 13.2, 3.8, 2.2, 1.1, P.accent);
    } },

  { name: "Viewfinder", meaning: "An array's square brackets become the corners of a viewfinder: the response, framed and captured as an image.",
    draw: function (P) {
      var w = 2.8;
      uP("M5 11 L5 8 C5 6.3 6.3 5 8 5 L11 5", null, P.ink, w);
      uP("M21 5 L24 5 C25.7 5 27 6.3 27 8 L27 11", null, P.ink, w);
      uP("M27 21 L27 24 C27 25.7 25.7 27 24 27 L21 27", null, P.ink, w);
      uP("M11 27 L8 27 C6.3 27 5 25.7 5 24 L5 21", null, P.ink, w);
      uR(10.5, 10.5, 11, 11, 3.2, P.ink); uC(18.2, 13.8, 1.5, P.accent);
    } },

  { name: "Live i", meaning: "The i of imago, its dot the green-then-amber light that watches an endpoint. The quietest possible mark; strongest as a favicon.",
    draw: function (P) { uR(12.2, 13, 7.6, 15, 3.8, P.ink); uC(16, 7.4, 3.9, P.accent); } },

  { name: "Dog-ear", meaning: "Turn the corner of a response and the interface is underneath. The folded corner is the only coloured thing on the page.",
    draw: function (P) {
      uP("M9 4.5 L19 4.5 L26.5 12 L26.5 24.5 C26.5 26.4 25 27.5 23.2 27.5 L9 27.5 C7.1 27.5 5.5 26.2 5.5 24.2 L5.5 8 C5.5 6 7.1 4.5 9 4.5 Z", P.ink);
      uP("M19 4.5 L19 10 C19 11.1 19.9 12 21 12 L26.5 12 Z", P.accent);
      uR(9.5, 15.5, 12.5, 2.4, 1.2, P.bg); uR(9.5, 19.6, 8.5, 2.4, 1.2, P.bg); uR(9.5, 23.7, 10.5, 2.4, 1.2, P.bg);
    } },

  { name: "Before / After", meaning: "The hero in miniature: a dark raw pane with a white interface card laid over it, one bar lit where the data changed.",
    draw: function (P) {
      uR(3, 5.5, 16, 19, 4, P.ink);
      uR(6.5, 9.5, 6, 1.8, 0.9, P.bg); uR(6.5, 13, 8.5, 1.8, 0.9, P.bg); uR(6.5, 16.5, 4.5, 1.8, 0.9, P.bg);
      var c = uR(12.5, 10, 16.5, 17.5, 4, P.soft); stroke(c, P.ink, 1.6 * U.s);
      uR(16, 18, 2.4, 6, 1.2, P.ink); uR(19.8, 14.5, 2.4, 9.5, 1.2, P.accent); uR(23.6, 16.4, 2.4, 7.6, 1.2, P.ink);
    } },

  { name: "Stacked I", meaning: "A capital I built from three response rows. The middle row has opened into a window, so the letter is also the product.",
    draw: function (P) {
      uR(7.5, 4.5, 17, 5.4, 2.7, P.ink);
      uRing(11.2, 12.2, 9.6, 7.6, 2.6, P.ink, 2.6); uR(14.2, 15.1, 3.6, 1.8, 0.9, P.accent);
      uR(7.5, 22.1, 17, 5.4, 2.7, P.ink);
    } },

  { name: "Key : Value", meaning: "The colon between a key and its value, the exact place data turns into meaning. The key is a point; the value arrives as a tile.",
    draw: function (P) { uC(16, 9.6, 4.6, P.ink); uR(11.2, 17.2, 9.6, 9.6, 3, P.ink); uC(16, 22, 1.6, P.accent); } },

  { name: "History Strip", meaning: "One tick per stored fetch, the same strip the app draws under a watched endpoint. The amber tick is the fetch where something changed.",
    draw: function (P) {
      var xs = [4.4, 9.9, 15.4, 20.9, 26.4];
      for (var i = 0; i < 5; i++) uR(xs[i] - 0.1, i == 3 ? 5 : 9, 3.4, i == 3 ? 22 : 14, 1.7, i == 3 ? P.accent : P.ink);
    } },

  { name: "Fingerprint", meaning: "Every response shape hashes to a fingerprint. Loose type-dots fuse into components; same shape, same interface, no second model call.",
    draw: function (P) {
      var g = [6.5, 12.5, 18.5, 24.5], r = 1.9, h = 3.8;
      uR(6.5 - r, 6.5 - r, 18 + h, h, r, P.ink); uC(24.5, 6.5, r, P.ink);
      uC(6.5, 12.5, r, P.ink); uC(12.5, 12.5, r, P.ink); uR(18.5 - r, 12.5 - r, 6 + h, h, r, P.ink);
      uR(6.5 - r, 18.5 - r, 18 + h, h, r, P.accent);
      for (var i = 0; i < 4; i++) uC(g[i], 24.5, r, i == 1 ? P.ink : P.ink);
    } },

  { name: "Tree to UI", meaning: "Nested JSON as a tree whose leaves have already become components. Structure on the left, finished rows on the right.",
    draw: function (P) {
      uC(7.5, 7.5, 3, P.ink);
      uP("M7.5 10 L7.5 21.5 C7.5 23.2 8.8 24.5 10.5 24.5 L13 24.5", null, P.ink, 2.4);
      uP("M7.5 12.5 C7.5 14.2 8.8 15.5 10.5 15.5 L13 15.5", null, P.ink, 2.4);
      uR(13, 5, 15, 5, 2.5, P.ink); uR(15, 13, 13, 5, 2.5, P.accent); uR(15, 22, 10, 5, 2.5, P.ink);
    } },

  { name: "Chrysalis", meaning: "A closed pod on the left, split open on the right into a card. The before and after of metamorphosis in one silhouette.",
    draw: function (P) {
      uP("M14.5 4 C8.4 4 5 9.8 5 16 C5 22.2 8.4 28 14.5 28 Z", P.ink);
      uR(17, 4, 11, 24, 3.5, P.ink);
      uR(19.5, 8, 6, 2.2, 1.1, P.bg); uR(19.5, 12, 4, 2.2, 1.1, P.bg); uR(19.5, 21.5, 6, 3.5, 1.75, P.accent);
    } }
];

function drawConcept(k, x, y, size, P) {
  var g = art.groupItems.add(); g.name = (k + 1) + " " + CONCEPTS[k].name;
  U.x = x; U.y = y; U.s = size / 32; U.g = g;
  CONCEPTS[k].draw(P);
  return g;
}
var ON_PAPER = { ink: "ink", bg: "paper", accent: "yellow", soft: "card" };
var ON_INK   = { ink: "card", bg: "ink", accent: "yellow", soft: "ink" };
var ON_CARD  = { ink: "ink", bg: "card", accent: "yellow", soft: "card" };

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

saveAI("imago-logo-concepts.ai");
var dir = new Folder(KIT + "/exports/concepts"); if (!dir.exists) dir.create();
for (k = 0; k < CONCEPTS.length; k++) exportPNG("exports/concepts/" + DOC.artboards[k].name + ".png", 200, k);
"ok " + DOC.artboards.length;
