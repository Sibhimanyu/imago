// Brand guidelines — what the name and the mark mean, and how to use them.
// Eleven 1280 × 800 pages, one artboard each, exported as one PDF.
var PW = 1280, PH = 800, M = 72, GAP = 80, PER_ROW = 5;
newDoc("imago-brand-guidelines", PW, PH, false);
var bg = DOC.layers[0], grid = layer("Grid"), art = layer("Artwork"), words = layer("Copy");
var PAGES = ["Cover", "The name", "What the mark means", "Anatomy", "Construction", "Logo versions",
  "Misuse", "Mascot", "Colour", "Typography", "Voice and use"];
var ox, oy; // current page origin

function hexRGB(n) { var h = PAL[n].hex; return parseInt(h.substr(0, 2), 16) + " " + parseInt(h.substr(2, 2), 16) + " " + parseInt(h.substr(4, 2), 16); }
function cmykStr(n) { return PAL[n].cmyk.join(" "); }
function label(s, x, y, c) { return text(s.toUpperCase(), x, y, { font: "JetBrainsMono-Medium", size: 10, color: c || "muted", tracking: 80, into: words }); }
function h2(s, x, y, size, c) { return text(s, x, y, { font: "InterDisplay-SemiBold", size: size || 20, color: c || "ink", tracking: -20, into: words }); }
function body(s, x, y, w, h, o) {
  o = o || {};
  return para(s, x, y, w, h, { font: o.font || "Inter-Regular", size: o.size || 13, leading: o.leading || 19, color: o.color || "muted", into: words });
}
function page(i, dark) {
  ox = (i % PER_ROW) * (PW + GAP); oy = Math.floor(i / PER_ROW) * (PH + GAP);
  board((i < 9 ? "0" : "") + (i + 1) + " " + PAGES[i], ox, oy, PW, PH, i == 0);
  rect(ox, oy, PW, PH, dark ? "ink" : "paper", bg).name = "page " + (i + 1);
  if (i == 0) return;
  label((i < 9 ? "0" : "") + (i + 1) + "  ·  " + PAGES[i], ox + M, oy + M + 4);
  mark(ox + PW - M - 26, oy + M - 18, 26, "ink", art);
  text("Imago brand guidelines", ox + M, oy + PH - 40, { font: "Inter-Regular", size: 10, color: "muted", into: words });
  text((i + 1) + " / " + PAGES.length, ox + PW - M, oy + PH - 40, { font: MONO, size: 10, color: "muted", align: "right", into: words });
}
function title(s, sub) {
  text(s, ox + M - 2, oy + 150, { font: "InterDisplay-SemiBold", size: 46, color: "ink", tracking: -30, into: words });
  if (sub) body(sub, ox + M, oy + 168, 640, 50, { size: 15, leading: 22, color: "ink2" });
}
// Recolour every path of a mark group.
function eachPath(g, fn) {
  for (var i = 0; i < g.pathItems.length; i++) fn(g.pathItems[i]);
  for (i = 0; i < g.compoundPathItems.length; i++)
    for (var j = 0; j < g.compoundPathItems[i].pathItems.length; j++) fn(g.compoundPathItems[i].pathItems[j]);
}
// The mark's body without its aperture: step 2 of the story.
function bodyOnly(x, y, size, c, into) {
  var s = size / 32, sp = parsePath(MARK_BODY)[0], p = (into || art).pathItems.add(), a = [];
  function P(q) { return [L(x + q[0] * s), T(y + q[1] * s)]; }
  for (var j = 0; j < sp.length; j++) a.push(P(sp[j].a));
  p.setEntirePath(a); p.closed = true;
  for (j = 0; j < sp.length; j++) { p.pathPoints[j].leftDirection = P(sp[j].l); p.pathPoints[j].rightDirection = P(sp[j].r); }
  return fill(p, c);
}
function fields(x, y, size, c, into) {
  var s = size / 32, g = (into || art).groupItems.add(); g.name = "fields";
  rrect(x + 4.2 * s, y + 6.4 * s, 12.8 * s, 6 * s, 3 * s, c, g); rrect(x + 3 * s, y + 14.3 * s, 11.5 * s, 6 * s, 3 * s, c, g);
  return g;
}
function place(rel, x, y, w) {
  var p = art.placedItems.add(); p.file = new File(KIT + "/" + rel);
  var b = p.geometricBounds, pw = b[2] - b[0], ph = b[1] - b[3];
  p.resize(w / pw * 100, w / pw * 100); p.position = [L(x), T(y)];
  p.embed(); return w * ph / pw;
}

// ── 01 Cover ──────────────────────────────────────────────────────────
page(0, true);
lockup(ox + M, oy + M, 40, "card", { outline: true, into: art });
mark(ox + 740, oy + 96, 480, "onInk2", art).opacity = 45;
text("Brand\nguidelines", ox + M - 4, oy + 470, { font: "InterDisplay-SemiBold", size: 96, leading: 92, color: "card", tracking: -40, into: words });
text("APIs become interfaces.", ox + M, oy + 632, { font: "Inter-Regular", size: 22, color: "onInk", tracking: -10, into: words });
text("Version 1.0  ·  September 2026", ox + M, oy + PH - 52, { font: MONO, size: 11, color: "onInk", into: words });
var toc = []; for (var t = 1; t < PAGES.length; t++) toc.push((t < 9 ? "0" : "") + (t + 1) + " " + PAGES[t]);
para(toc.join("\n"), ox + PW - M - 210, oy + PH - 52 - (PAGES.length - 1) * 16 + 4, 210, (PAGES.length - 1) * 16 + 10,
  { font: MONO, size: 10.5, leading: 16, color: "onInk", align: "right", into: words });

// ── 02 The name ─────────────────────────────────────────────────────────
page(1);
text("imago", ox + M - 8, oy + 300, { font: "InterDisplay-SemiBold", size: 170, color: "ink", tracking: -50, into: words });
text("(n.)  ih-MAH-go", ox + M, oy + 350, { font: MONO, size: 14, color: "muted", into: words });
var dx = ox + 700;
label("1  ·  Latin", dx, oy + 200);
h2("Image.", dx, oy + 232, 26);
label("2  ·  Entomology", dx, oy + 290);
h2("The final, fully formed adult stage", dx, oy + 322, 26);
h2("an insect reaches after metamorphosis.", dx, oy + 354, 26);
body("That is the product. An API response is material still changing form. Imago reads its shape and gives it the finished form it was always heading for: an interface a person can read.",
  dx, oy + 382, 500, 80, { size: 15, leading: 23, color: "ink2" });
// The metamorphosis, in three stages
var sy = oy + 520, sw = 352, sh = 170;
var stages = [["Response", "raw JSON"], ["Shape", "values become types"], ["Interface", "the finished form"]];
for (var k = 0; k < 3; k++) {
  var sx = ox + M + k * (sw + 40);
  var box = rrect(sx, sy, sw, sh, 14, k == 0 ? "inkRich" : "card", art); if (k) stroke(box, "line", 1);
  label((k + 1) + "  " + stages[k][0], sx + 20, sy + 30, k == 0 ? "onInk" : "muted");
  text(stages[k][1], sx + sw - 20, sy + 30, { font: "Inter-Regular", size: 11, color: k == 0 ? "onInk" : "muted", align: "right", into: words });
  if (k < 2) text("→", sx + sw + 12, sy + sh / 2 + 8, { font: "Inter-Regular", size: 20, color: "muted", into: words });
}
var j1 = para('{\n  "city": "Chennai",\n  "temperature_2m": 28.4,\n  "wind_speed_10m": 12.1\n}', ox + M + 20, sy + 52, 320, 100,
  { font: MONO, size: 12, leading: 20, color: "card", into: words });
para('{\n  city: string,\n  temperature_2m: number,\n  wind_speed_10m: number\n}', ox + M + sw + 60, sy + 52, 320, 100,
  { font: MONO, size: 12, leading: 20, color: "ink2", into: words });
var ix0 = ox + M + 2 * (sw + 40) + 20;
text("Chennai", ix0, sy + 66, { font: "Inter-Regular", size: 12, color: "muted", into: words });
text("28.4°C", ix0 - 2, sy + 118, { font: "InterDisplay-SemiBold", size: 48, color: "ink", tracking: -30, into: words });
text("Wind  12.1 km/h", ix0, sy + 146, { font: "Inter-Medium", size: 12, color: "ink2", into: words });

// ── 03 What the mark means ──────────────────────────────────────────────
page(2);
title("Data in. Interface out.", "The mark tells the product's story in one shape, read left to right.");
var steps = [
  ["Fields arrive", "Two rounded bars enter from the left: the keys and values an API sends back. They are uneven, because responses are."],
  ["They become one body", "The fields join a single rounded object. The response stops being loose values and is understood as a whole."],
  ["A window opens", "An aperture is cut into the body: the usable interface Imago finds inside the data. That opening is the product."]
];
var cw3 = 352;
for (k = 0; k < 3; k++) {
  var cx3 = ox + M + k * (cw3 + 40), cy3 = oy + 250;
  var c3 = rrect(cx3, cy3, cw3, 300, 16, "card", art); stroke(c3, "line", 1);
  var ms = 200, mx3 = cx3 + (cw3 - ms) / 2 + 4, my3 = cy3 + 40;
  if (k == 0) fields(mx3, my3, ms, "ink");
  if (k == 1) { fields(mx3, my3, ms, "ink"); bodyOnly(mx3, my3, ms, "ink"); }
  if (k == 2) mark(mx3, my3, ms, "ink", art);
  label("Step " + (k + 1), cx3 + 22, cy3 + 30);
  if (k < 2) text("→", cx3 + cw3 + 12, cy3 + 158, { font: "Inter-Regular", size: 20, color: "muted", into: words });
  h2(steps[k][0], cx3, cy3 + 334, 21);
  body(steps[k][1], cx3, cy3 + 346, cw3 - 10, 70);
}
text("“Incoming API fields become a proper window.”", ox + M, oy + 700, { font: "InterDisplay-Medium", size: 22, color: "ink", tracking: -15, into: words });

// ── 04 Anatomy ──────────────────────────────────────────────────────────
page(3);
title("Anatomy", "Four parts, each standing for something the product does.");
var AS = 440, ax = ox + M + 10, ay = oy + 210, au = AS / 32;
mark(ax, ay, AS, "ink", art);
var parts = [
  [[10.6, 9.4], "Field", "A key and its value, arriving from the API."],
  [[6.5, 17.3], "Second field", "Offset and shorter. Responses are uneven, and the mark admits it."],
  [[17, 24.6], "Body", "The fields merge into one rounded object: the response, read as a whole."],
  [[21.75, 17.1], "Aperture", "The window cut into the body: the interface revealed inside the data."]
];
var lx = ox + 700;
for (k = 0; k < parts.length; k++) {
  var px4 = ax + parts[k][0][0] * au, py4 = ay + parts[k][0][1] * au, ly = oy + 262 + k * 112;
  line(px4, py4, lx - 24, ly - 6, "yellow", 1.2, art);
  circle(px4, py4, 6, "yellow", art); circle(px4, py4, 2.5, "ink", art);
  label("0" + (k + 1), lx, ly - 2, "muted");
  h2(parts[k][1], lx + 36, ly, 22);
  body(parts[k][2], lx + 36, ly + 12, 420, 44, { size: 14, leading: 20 });
}

// ── 05 Construction ─────────────────────────────────────────────────────
page(4);
title("Construction and clear space");
var u5 = 12, gx5 = ox + M + 20, gy5 = oy + 250;
for (var i5 = 0; i5 <= 32; i5++) {
  var w5 = i5 % 8 == 0 ? 0.8 : 0.4, c5 = i5 % 8 == 0 ? "line" : "sink";
  line(gx5 + i5 * u5, gy5, gx5 + i5 * u5, gy5 + 32 * u5, c5, w5, grid);
  line(gx5, gy5 + i5 * u5, gx5 + 32 * u5, gy5 + i5 * u5, c5, w5, grid);
}
mark(gx5, gy5, 32 * u5, "ink", art);
var ap5 = 5.3 * u5, b5 = [gx5 + 3 * u5, gy5 + 6.4 * u5, gx5 + 28.6 * u5, gy5 + 27.4 * u5];
var cs5 = rect(b5[0] - ap5, b5[1] - ap5, b5[2] - b5[0] + 2 * ap5, b5[3] - b5[1] + 2 * ap5, null, art);
stroke(cs5, "yellow", 1.2); cs5.strokeDashes = [5, 4];
// aperture width marker
line(gx5 + 19.1 * u5, gy5 + 25 * u5, gx5 + 24.4 * u5, gy5 + 25 * u5, "card", 1.2, art);
text("x", gx5 + 21.75 * u5, gy5 + 24.2 * u5, { font: MONO, size: 11, color: "card", align: "center", into: words });
var rx5 = ox + 640;
var rules = [
  ["Grid", "Drawn on a 32-unit square. Fields are 6 units tall with fully round ends; every corner is a true radius."],
  ["Clear space", "Keep at least one aperture width (x) clear on every side. Nothing enters the dashed frame."],
  ["Minimum size", "Bare mark: 16 px, only with excellent contrast. Below 24 px, use the app icon: the fields merge into the body."],
  ["Colour", "Always one flat colour. Ink on light surfaces, white on ink."]
];
for (k = 0; k < rules.length; k++) {
  h2(rules[k][0], rx5, oy + 262 + k * 84, 18);
  body(rules[k][1], rx5, oy + 272 + k * 84, 560, 50, { size: 13.5, leading: 19 });
}
var sizes = [16, 24, 32, 48, 64], sx5 = rx5;
for (k = 0; k < sizes.length; k++) {
  icon(sx5, oy + 690 - sizes[k], sizes[k], "ink", "card", art);
  text(sizes[k] + " px", sx5 + sizes[k] / 2, oy + 712, { font: MONO, size: 10, color: "muted", align: "center", into: words });
  sx5 += sizes[k] + 36;
}
mark(sx5 + 20, oy + 674, 16, "ink", art);
text("16 px bare", sx5 + 28, oy + 712, { font: MONO, size: 10, color: "muted", align: "center", into: words });

// ── 06 Logo versions ────────────────────────────────────────────────────
page(5);
title("Logo versions", "Four versions cover every surface. Pick by background and size, never by taste.");
var V = [
  ["Primary", "Mark and wordmark in ink on paper or white. The default everywhere there is room."],
  ["Reversed", "White on ink. Dark surfaces, the cover of a deck, the footer of a site."],
  ["App icon", "The mark in white on an ink tile, rx = size / 4. Favicons, docks, anything below 24 px."],
  ["Tile lockup", "App icon plus wordmark. Small headers and places where the bare mark would thin out."]
];
var vw = (PW - 2 * M - 3 * 32) / 4;
for (k = 0; k < 4; k++) {
  var vx = ox + M + k * (vw + 32), vy = oy + 260, vh = 250;
  var tile = rrect(vx, vy, vw, vh, 16, k == 1 ? "ink" : (k == 2 ? "sink" : "card"), art);
  if (k != 1) stroke(tile, "line", 1);
  var it;
  if (k == 0) it = lockup(0, 0, 44, "ink", { outline: true, into: art });
  if (k == 1) it = lockup(0, 0, 44, "card", { outline: true, into: art });
  if (k == 2) it = icon(0, 0, 112, "ink", "card", art);
  if (k == 3) it = lockup(0, 0, 44, "ink", { withIcon: true, outline: true, into: art });
  centre(it, vx, vy, vw, vh);
  h2(V[k][0], vx, vy + vh + 40, 20);
  body(V[k][1], vx, vy + vh + 52, vw - 8, 70);
}

// ── 07 Misuse ───────────────────────────────────────────────────────────
page(6);
title("Misuse", "The mark only works as drawn. Each of these breaks what it says.");
var D = ["Don't rotate it", "Don't stretch or squash it", "Don't outline it", "Don't add a shadow or effect",
  "Don't give it a brand colour", "Don't set it on busy imagery"];
var dw = (PW - 2 * M - 2 * 32) / 3, dh = 180;
for (k = 0; k < 6; k++) {
  var ddx = ox + M + (k % 3) * (dw + 32), ddy = oy + 250 + Math.floor(k / 3) * (dh + 64);
  var dt = rrect(ddx, ddy, dw, dh, 14, "card", art); stroke(dt, "line", 1);
  if (k == 5) {
    var st = art.groupItems.add(), cols = ["yellow", "green", "link", "red", "ink2", "yellowBg"];
    for (var s6 = 0; s6 < 12; s6++) rect(ddx + s6 * dw / 12, ddy, dw / 12 + 0.5, dh, cols[s6 % 6], st);
    var mk = DOC.pathItems.roundedRectangle(T(ddy), L(ddx), dw, dh, 14, 14);
    mk.move(st, ElementPlacement.PLACEATBEGINNING); st.clipped = true; mk.clipping = true;
  }
  var mm = mark(0, 0, 120, k == 4 ? "link" : "ink", art);
  if (k == 0) mm.rotate(-18);
  if (k == 1) mm.resize(150, 70);
  if (k == 2) eachPath(mm, function (p) { p.filled = false; stroke(p, "ink", 2); });
  if (k == 3) { var sh = mark(0, 0, 120, "muted", art); sh.opacity = 40; centre(sh, ddx + 8, ddy + 10, dw, dh); }
  if (k == 4) eachPath(mm, function (p) { var c = new RGBColor(); c.red = 124; c.green = 92; c.blue = 255; p.fillColor = c; });
  if (k == 5) eachPath(mm, function (p) { p.fillColor = col("card"); });
  centre(mm, ddx, ddy, dw, dh);
  circle(ddx + 16, ddy + dh + 24, 9, "red", art);
  text("×", ddx + 16, ddy + dh + 28.5, { font: "Inter-SemiBold", size: 14, color: "card", align: "center", into: words });
  text(D[k], ddx + 34, ddy + dh + 29, { font: "Inter-Medium", size: 14, color: "ink", into: words });
}

// ── 08 Mascot ───────────────────────────────────────────────────────────
page(7);
title("Amigo, the mascot", "Amigo is the Imago system standing up to help. It is built from the mark, so it never needs a face.");
var hc = rrect(ox + M, oy + 250, 360, 440, 16, "card", art); stroke(hc, "line", 1);
label("Standing", ox + M + 22, oy + 280);
amigo(ox + M + 105, oy + 278, 150, "ink", art);
line(ox + M + 22, oy + 470, ox + M + 338, oy + 470, "line", 1, art);
label("Resting  ·  lying down", ox + M + 22, oy + 500);
amigoResting(ox + M + 94, oy + 516, 150, "ink", art);
// Where it comes from
var rx8 = ox + M + 392, rw8 = 360;
var rc = rrect(rx8, oy + 250, rw8, 170, 16, "card", art); stroke(rc, "line", 1);
label("Where it comes from", rx8 + 22, oy + 280);
mark(rx8 + 40, oy + 296, 96, "ink", art);
text("→", rx8 + rw8 / 2, oy + 352, { font: "Inter-Regular", size: 22, color: "muted", align: "center", into: words });
amigo(rx8 + rw8 - 136, oy + 296, 96, "ink", art);
body("Same body, same aperture, stood upright. The two incoming fields become two centred legs.",
  rx8, oy + 436, rw8, 44, { size: 13, leading: 19, color: "ink2" });
// In the product
var ec = rrect(rx8, oy + 500, rw8, 190, 16, "card", art); stroke(ec, "line", 1);
label("In use  ·  empty state, resting", rx8 + 22, oy + 530);
amigoResting(rx8 + rw8 / 2 - 34, oy + 544, 58, "ink", art);
text("No endpoints saved yet", rx8 + rw8 / 2, oy + 632, { font: "Inter-SemiBold", size: 15, color: "ink", tracking: -10, align: "center", into: words });
text("Paste a URL above and it will appear here.", rx8 + rw8 / 2, oy + 654, { font: "Inter-Regular", size: 12, color: "muted", align: "center", into: words });
// Rules
var qx = ox + M + 784, qw = PW - M - (M + 784);
var lists = [
  ["Use Amigo in", "green", ["Loading and empty states", "Onboarding and setup", "Success confirmations", "Recoverable errors", "Small moments in docs and slides"]],
  ["Never in", "red", ["The favicon or the app icon", "The navigation wordmark", "Dense data views", "Anywhere a status icon is more precise"]],
  ["Rules", "ink", ["One flat colour, like the mark", "Keep the body, aperture and legs", "No eyes, mouth, arms, clothes or expressions", "Never a robot, animal or person", "Personality comes from the copy beside it", "Zs only lying down, never standing"]]
];
var qy = oy + 262;
for (k = 0; k < 3; k++) {
  h2(lists[k][0], qx, qy, 18);
  qy += 12;
  for (var q = 0; q < lists[k][2].length; q++) {
    qy += 21;
    circle(qx + 3.5, qy - 4.5, 3.5, lists[k][1], art);
    text(lists[k][2][q], qx + 16, qy, { font: "Inter-Regular", size: 13, color: "ink2", into: words });
  }
  qy += 44;
}

// ── 09 Colour ───────────────────────────────────────────────────────────
page(8);
title("Colour", "Ink and paper are the brand. Imago has no brand hue: colour means the user's data moved, never us.");
function swatch(n, name, role, x, y, w, h, dark) {
  var r8 = rrect(x, y, w, h, 14, n, art); if (n == "paper" || n == "card") stroke(r8, "line", 1);
  var c = dark ? "card" : "ink", q = dark ? "onInk" : "ink2";
  if (n == "green" || n == "red" || n == "link") { c = "card"; q = "card"; }
  h2(name, x + 22, y + 40, 22, c);
  text(role, x + 22, y + 62, { font: "Inter-Regular", size: 12.5, color: q, into: words });
  para("HEX  #" + PAL[n].hex.toUpperCase() + "\nRGB  " + hexRGB(n) + "\nCMYK " + cmykStr(n), x + 22, y + h - 70, w - 44, 56,
    { font: MONO, size: 10.5, leading: 16, color: q, into: words });
}
var hw = (PW - 2 * M - 32) / 2;
swatch("ink", "Ink", "The mark, primary text, dark surfaces", ox + M, oy + 250, hw, 200, true);
swatch("paper", "Paper", "The reading surface, warm so JSON never glares", ox + M + hw + 32, oy + 250, hw, 200, false);
var acc = [["yellow", "Amber", "A value changed"], ["green", "Green", "Live, succeeded"], ["red", "Red", "Failed, destructive"], ["link", "Blue", "Links, and only links"]];
var aw = (PW - 2 * M - 3 * 24) / 4;
for (k = 0; k < 4; k++) swatch(acc[k][0], acc[k][1], acc[k][2], ox + M + k * (aw + 24), oy + 474, aw, 190, false);
body("Accents are signals, not decoration. If a colour doesn't carry a meaning, it doesn't go in.", ox + M, oy + 684, 900, 24, { size: 13, color: "ink2" });

// ── 10 Typography ───────────────────────────────────────────────────────
page(9);
title("Typography", "One family does the work through weight and size. Mono is kept for what machines produce.");
var TF = [
  ["InterDisplay-SemiBold", "Inter Display", "SemiBold · titles and the wordmark", "Tracking −0.035em at display sizes."],
  ["Inter-Regular", "Inter", "Regular, Medium, SemiBold · everything people read", "Body 14 px, labels 11.5 px SemiBold."],
  ["JetBrainsMono-Regular", "JetBrains Mono", "Regular · URLs, JSON, headers, hashes", "If a machine produced it, it can be mono."]
];
var tw = (PW - 2 * M - 2 * 40) / 3;
for (k = 0; k < 3; k++) {
  var tx = ox + M + k * (tw + 40);
  line(tx, oy + 244, tx + tw, oy + 244, "ink", 1, art);
  text("Aa", tx - 4, oy + 390, { font: TF[k][0], size: 130, color: "ink", tracking: -30, into: words });
  h2(TF[k][1], tx, oy + 440, 22);
  text(TF[k][2], tx, oy + 462, { font: "Inter-Regular", size: 12.5, color: "ink2", into: words });
  text(TF[k][3], tx, oy + 482, { font: "Inter-Regular", size: 12.5, color: "muted", into: words });
}
var ty = oy + 560;
line(ox + M, ty - 26, ox + PW - M, ty - 26, "line", 1, art);
text("APIs become interfaces.", ox + M, ty + 20, { font: "InterDisplay-SemiBold", size: 40, color: "ink", tracking: -35, into: words });
text("Forecast · Chennai", ox + M, ty + 66, { font: "InterDisplay-SemiBold", size: 24, color: "ink", tracking: -25, into: words });
text("Schema already known: reused cached interface, no model call.", ox + M, ty + 98, { font: "Inter-Regular", size: 14, color: "ink2", into: words });
text("GET api.open-meteo.com/v1/forecast?latitude=13.08", ox + M, ty + 124, { font: MONO, size: 12, color: "muted", into: words });
var specs = ["Display 40–60 · 600 · −0.035em", "Title 26 · 600 · −0.025em", "Body 14 · 400", "Mono 12 · 400"];
for (k = 0; k < 4; k++) text(specs[k], ox + PW - M, ty + [20, 66, 98, 124][k], { font: MONO, size: 10, color: "muted", align: "right", into: words });

// ── 11 Voice and use ────────────────────────────────────────────────────
page(10);
title("Voice and use");
h2("APIs become interfaces.", ox + M, oy + 232, 30);
body("The tagline, always in full, always with its full stop. Plain, precise and accountable: say what happened, give the likely cause and the next step, use exact numbers.",
  ox + M, oy + 250, 520, 70, { size: 14, leading: 21, color: "ink2" });
var say = ["Schema already known: reused cached interface, no model call.", "The browser could not reach this endpoint. It may not send CORS headers.", "Rate: 1.1 → 1.2"];
var not = ["Awesome, we magically transformed your API!", "Oops, something went wrong.", "Loading your amazing data ✨"];
label("Say", ox + M, oy + 360, "ink");
for (k = 0; k < 3; k++) {
  circle(ox + M + 4, oy + 388 + k * 30 - 4.5, 4, "green", art);
  text(say[k], ox + M + 18, oy + 388 + k * 30, { font: "Inter-Regular", size: 13.5, color: "ink", into: words });
}
label("Not", ox + M, oy + 510, "ink");
for (k = 0; k < 3; k++) {
  circle(ox + M + 4, oy + 538 + k * 30 - 4.5, 4, "red", art);
  text(not[k], ox + M + 18, oy + 538 + k * 30, { font: "Inter-Regular", size: 13.5, color: "muted", into: words });
}
body("No emoji. No exclamation marks. No hype.", ox + M, oy + 640, 520, 24, { size: 13.5, color: "ink2", font: "Inter-Medium" });
var fx10 = ox + 680, fw10 = 262;
var fh10 = place("exports/imago-flyer-a4-preview.png", fx10, oy + 210, fw10);
stroke(rect(fx10, oy + 210, fw10, fh10, null, art), "line", 1);
label("A4 flyer · CMYK", fx10, oy + 210 + fh10 + 26);
var bx10 = fx10 + fw10 + 28, bw10 = ox + PW - M - bx10;
var bh10 = place("exports/imago-blog-banner.png", bx10, oy + 210, bw10);
stroke(rect(bx10, oy + 210, bw10, bh10, null, art), "line", 1);
label("Blog banner · 1200 × 700", bx10, oy + 210 + bh10 + 26);
var ih10 = 72; icon(bx10, oy + 210 + bh10 + 60, ih10, "ink", "card", art);
lockup(bx10 + ih10 + 28, oy + 210 + bh10 + 60 + 20, 32, "ink", { outline: true, into: art });
label("App icon · lockup", bx10, oy + 210 + bh10 + 60 + ih10 + 26);

// ── Save and export ─────────────────────────────────────────────────────
saveAI("imago-brand-guidelines.ai");
var oldPdf = new File(KIT + "/exports/imago-brand-guidelines.pdf"); if (oldPdf.exists) oldPdf.remove();
savePDF("exports/imago-brand-guidelines.pdf");
for (k = 0; k < PAGES.length; k++) exportPNG("exports/guidelines/" + (k < 9 ? "0" : "") + (k + 1) + ".png", 100, k);
"ok " + DOC.artboards.length;
