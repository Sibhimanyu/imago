// Imago brand kit — shared Illustrator (ExtendScript) helpers.
// Coordinates are top-left, y down, in points; helpers convert to Illustrator's
// y-up artboard space. Run a build script through build.sh, which prepends this.

var KIT = "__KIT__"; // replaced by build.sh with brand/kit's absolute path

// Palette: the styles.css tokens, with hand-set CMYK for print.
var PAL = {
  ink:       { hex: "1b1b19", cmyk: [0, 4, 10, 92] },
  inkRich:   { hex: "1b1b19", cmyk: [60, 52, 56, 84] }, // large solid fills
  ink2:      { hex: "45443f", cmyk: [0, 3, 10, 78] },
  muted:     { hex: "66655f", cmyk: [0, 2, 10, 64] },
  onInk:     { hex: "a19f97", cmyk: [0, 2, 8, 40] },    // quiet text on ink
  onInk2:    { hex: "6c6a63", cmyk: [0, 2, 8, 62] },
  paper:     { hex: "f6f5f1", cmyk: [2, 2, 5, 0] },
  sink:      { hex: "f1efe9", cmyk: [4, 4, 8, 0] },
  line:      { hex: "e7e5df", cmyk: [7, 6, 10, 0] },
  card:      { hex: "ffffff", cmyk: [0, 0, 0, 0] },
  yellow:    { hex: "f5ce47", cmyk: [2, 18, 80, 0] },
  yellowBg:  { hex: "fdf3cd", cmyk: [0, 3, 24, 0] },
  yellowInk: { hex: "6f570b", cmyk: [20, 35, 100, 45] },
  green:     { hex: "4fa96a", cmyk: [70, 5, 75, 0] },
  link:      { hex: "3f6fb5", cmyk: [78, 50, 0, 0] },
  red:       { hex: "d9534f", cmyk: [8, 80, 70, 0] },
  redBg:     { hex: "fbeaea", cmyk: [0, 10, 6, 0] },
  redInk:    { hex: "a83e3a", cmyk: [20, 85, 80, 12] }
};

var DOC, OX, OY, CMYK_MODE;

function newDoc(name, w, h, cmyk) {
  // Rebuilds replace only this kit's own document; anything else open is left alone.
  for (var d = app.documents.length - 1; d >= 0; d--)
    if (app.documents[d].name.replace(/\.(ai|pdf)$/, "") == name) app.documents[d].close(SaveOptions.DONOTSAVECHANGES);
  CMYK_MODE = !!cmyk;
  var p = new DocumentPreset();
  p.title = name; p.width = w; p.height = h; p.units = RulerUnits.Points;
  p.colorMode = cmyk ? DocumentColorSpace.CMYK : DocumentColorSpace.RGB;
  p.rasterResolution = cmyk ? DocumentRasterResolution.HighResolution : DocumentRasterResolution.ScreenResolution;
  DOC = app.documents.addDocument(cmyk ? "Print" : "Web", p);
  var ab = DOC.artboards[0].artboardRect; OX = ab[0]; OY = ab[1];
  DOC.layers[0].name = "Background";
  addSwatches();
  return DOC;
}

function col(name) {
  var c = PAL[name];
  if (CMYK_MODE) {
    var k = new CMYKColor();
    k.cyan = c.cmyk[0]; k.magenta = c.cmyk[1]; k.yellow = c.cmyk[2]; k.black = c.cmyk[3];
    return k;
  }
  var r = new RGBColor();
  r.red = parseInt(c.hex.substr(0, 2), 16); r.green = parseInt(c.hex.substr(2, 2), 16); r.blue = parseInt(c.hex.substr(4, 2), 16);
  return r;
}

function addSwatches() {
  var g = DOC.swatchGroups.add(); g.name = "Imago";
  for (var n in PAL) {
    var sp = DOC.spots.add(); sp.name = "imago/" + n; sp.colorType = ColorModel.PROCESS; sp.color = col(n);
    var sc = new SpotColor(); sc.spot = sp; sc.tint = 100;
    g.addSpot(sp);
  }
}

function layer(name) { var l = DOC.layers.add(); l.name = name; return l; }
function T(y) { return OY - y; }
function L(x) { return OX + x; }

function fill(item, c, opacity) {
  item.filled = !!c; item.stroked = false;
  if (c) item.fillColor = col(c);
  if (opacity !== undefined) item.opacity = opacity;
  return item;
}
function stroke(item, c, w) { item.stroked = true; item.strokeColor = col(c); item.strokeWidth = w; return item; }

function rect(x, y, w, h, c, into) { return fill((into || DOC).pathItems.rectangle(T(y), L(x), w, h), c); }
function rrect(x, y, w, h, r, c, into) { return fill((into || DOC).pathItems.roundedRectangle(T(y), L(x), w, h, r, r), c); }
function circle(cx, cy, r, c, into) { return fill((into || DOC).pathItems.ellipse(T(cy - r), L(cx - r), r * 2, r * 2), c); }
function poly(pts, into) {
  var a = [];
  for (var i = 0; i < pts.length; i++) a.push([L(pts[i][0]), T(pts[i][1])]);
  var p = (into || DOC).pathItems.add(); p.setEntirePath(a); p.filled = false; p.closed = false;
  return p;
}
function line(x1, y1, x2, y2, c, w, into) {
  var p = poly([[x1, y1], [x2, y2]], into); stroke(p, c, w); p.strokeCap = StrokeCap.ROUNDENDCAP; return p;
}

// Soft drop shadow as a live effect, so it stays editable in the Appearance panel.
function shadow(item, y, blur, opacity) {
  try {
    item.applyEffect('<LiveEffect name="Adobe Drop Shadow"><Dict data="R horz 0 R vert ' + y + ' R blur ' + blur +
      ' R opac ' + opacity + ' I mode 2 B usePSLBlur 1 I csrc 1 R dark 100 I pval 0 B useTint 0 I Adobe Effect Expand Before Version 16 "><Entry name="sclr" value="1 1 1 1 0.106 0.106 0.098" /></Dict></LiveEffect>');
  } catch (e) {}
}

// ── Type ──────────────────────────────────────────────────────────────
function font(n) { return app.textFonts.getByName(n); }

// o: { font, size, color, tracking, leading, align: "left"|"center"|"right", into }
function style(range, o) {
  var a = range.characterAttributes;
  a.textFont = font(o.font || "Inter-Regular");
  a.size = o.size || 12;
  a.fillColor = col(o.color || "ink");
  a.tracking = o.tracking || 0;
  if (o.leading) { a.autoLeading = false; a.leading = o.leading; }
  if (o.align) range.paragraphAttributes.justification =
    o.align == "right" ? Justification.RIGHT : (o.align == "center" ? Justification.CENTER : Justification.LEFT);
}
// Point text; y is the first baseline.
function text(str, x, y, o) {
  var t = (o.into || DOC).textFrames.pointText([L(x), T(y)]);
  t.contents = str;
  var al = o.align; o.align = null; style(t.textRange, o); o.align = al;
  // Point text keeps its anchor on the left; shift it for right/centre alignment.
  if (al == "right") t.translate(-textWidth(t), 0);
  if (al == "center") t.translate(-textWidth(t) / 2, 0);
  return t;
}
// Area text in a box whose top-left is (x, y).
function para(str, x, y, w, h, o) {
  var box = (o.into || DOC).pathItems.rectangle(T(y), L(x), w, h);
  var t = (o.into || DOC).textFrames.areaText(box);
  t.contents = str; style(t.textRange, o);
  t.textRange.paragraphAttributes.spaceAfter = o.spaceAfter || 0;
  return t;
}
// Restyle a substring of a text frame (first occurrence).
function span(t, sub, o) {
  var i = t.contents.indexOf(sub); if (i < 0) return;
  for (var k = 0; k < sub.length; k++) {
    var ch = t.characters[i + k].characterAttributes;
    if (o.color) ch.fillColor = col(o.color);
    if (o.font) ch.textFont = font(o.font);
  }
}
function textWidth(t) { var b = t.geometricBounds; return b[2] - b[0]; }

// ── The mark: "Reveal", drawn from its 32-unit SVG geometry ──────────────
var MARK_BODY = "M13.6 6.4h8c4.4 0 7 2.9 7 7.3v7.1c0 4.2-2.7 6.8-6.9 6.8h-8.1c-3.8 0-6-2.3-6-6.1v-9c0-3.8 2.2-6.1 6-6.1Zm7.8 6.2c-1.4 0-2.3.9-2.3 2.3v4.4c0 1.4.9 2.3 2.3 2.3h.7c1.4 0 2.3-.9 2.3-2.3v-4.4c0-1.4-.9-2.3-2.3-2.3h-.7Z";

// Parses the M/m h v c Z subset the mark uses into subpaths of
// { a: anchor, l: in-handle, r: out-handle } in mark units.
function parsePath(d) {
  var tok = d.match(/[MmHhVvCcZz]|-?\d*\.?\d+/g), i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0;
  var subs = [], cur = null;
  function num() { return parseFloat(tok[i++]); }
  function pt(px, py) { var p = { a: [px, py], l: [px, py], r: [px, py] }; cur.push(p); return p; }
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
    switch (cmd) {
      case "M": case "m":
        var nx = num(), ny = num();
        if (cmd == "m") { nx += x; ny += y; }
        x = sx = nx; y = sy = ny; cur = []; subs.push(cur); pt(x, y); break;
      case "h": x += num(); pt(x, y); break;
      case "v": y += num(); pt(x, y); break;
      case "c":
        var c1 = [x + num(), y + num()], c2 = [x + num(), y + num()];
        x += num(); y += num();
        cur[cur.length - 1].r = c1; pt(x, y).l = c2; break;
      case "C":
        var a1 = [num(), num()], a2 = [num(), num()];
        x = num(); y = num();
        cur[cur.length - 1].r = a1; pt(x, y).l = a2; break;
      case "Z": case "z":
        var last = cur[cur.length - 1];
        if (Math.abs(last.a[0] - sx) < 0.01 && Math.abs(last.a[1] - sy) < 0.01) { cur[0].l = last.l; cur.pop(); }
        x = sx; y = sy; break;
    }
  }
  return subs;
}

// mark(x, y, size, color): the mark on its 32-unit box at (x, y), size points square.
function mark(x, y, size, c, into) {
  var s = size / 32, g = (into || DOC).groupItems.add(); g.name = "Imago mark";
  function P(p) { return [L(x + p[0] * s), T(y + p[1] * s)]; }
  rrect(x + 4.2 * s, y + 6.4 * s, 12.8 * s, 6 * s, 3 * s, c, g).name = "field 1";
  rrect(x + 3 * s, y + 14.3 * s, 11.5 * s, 6 * s, 3 * s, c, g).name = "field 2";
  var cp = g.compoundPathItems.add(); cp.name = "body + aperture";
  var subs = parsePath(MARK_BODY);
  for (var k = 0; k < subs.length; k++) {
    var sp = subs[k], p = cp.pathItems.add(), a = [];
    for (var j = 0; j < sp.length; j++) a.push(P(sp[j].a));
    p.setEntirePath(a); p.closed = true;
    for (j = 0; j < sp.length; j++) {
      p.pathPoints[j].leftDirection = P(sp[j].l);
      p.pathPoints[j].rightDirection = P(sp[j].r);
    }
  }
  for (k = 0; k < cp.pathItems.length; k++) { cp.pathItems[k].evenodd = true; fill(cp.pathItems[k], c); }
  return g;
}

// App icon: the mark in `ink` on a `tile` rounded square (rx = size/4, mark at .78).
function icon(x, y, size, tile, inkC, into) {
  var g = (into || DOC).groupItems.add(); g.name = "Imago app icon";
  rrect(x, y, size, size, size / 4, tile || "ink", g).name = "tile";
  var m = size * 0.78; mark(x + (size - m) / 2, y + (size - m) / 2, m, inkC || "card", g);
  return g;
}

// Wordmark lockup, proportions from assets/imago-logo.svg (mark 32, text 22 at x 42).
// withIcon puts the app tile in place of the bare mark. Returns the group; outline turns
// the wordmark into paths so the lockup never depends on the font.
function lockup(x, y, h, c, opts) {
  opts = opts || {};
  var s = h / 32, g = (opts.into || DOC).groupItems.add(); g.name = "Imago lockup";
  if (opts.withIcon) icon(x, y, h, c, opts.iconInk || "card", g); else mark(x, y, h, c, g);
  var t = text("Imago", x + 42 * s, y + 24 * s,
    { font: "InterDisplay-SemiBold", size: 22 * s, color: c, tracking: -24, into: g });
  t.name = "wordmark";
  if (opts.outline) t.createOutline().name = "wordmark";
  return g;
}

// ── Export ──────────────────────────────────────────────────────────────
function fileAt(rel) { return new File(KIT + "/" + rel); }
function saveAI(rel) {
  var o = new IllustratorSaveOptions(); o.pdfCompatible = true; o.embedLinkedFiles = true; o.fontSubsetThreshold = 100;
  DOC.saveAs(fileAt(rel), o);
}
function savePDF(rel, preset, bleed) {
  var o = new PDFSaveOptions();
  if (preset) o.pDFPreset = preset;
  if (bleed) { o.bleedOffsetRect = [bleed, bleed, bleed, bleed]; o.bleedLink = true; o.trimMarks = false; }
  o.preserveEditability = false; o.viewAfterSaving = false;
  DOC.saveAs(fileAt(rel), o);
}
function exportPNG(rel, scale, abIndex) {
  if (abIndex !== undefined) DOC.artboards.setActiveArtboardIndex(abIndex);
  var o = new ExportOptionsPNG24(); o.artBoardClipping = true; o.antiAliasing = true; o.transparency = false;
  o.horizontalScale = o.verticalScale = scale || 100;
  DOC.exportFile(fileAt(rel), ExportType.PNG24, o);
}
function exportJPG(rel, scale) {
  var o = new ExportOptionsJPEG(); o.artBoardClipping = true; o.qualitySetting = 92; o.antiAliasing = true;
  o.horizontalScale = o.verticalScale = scale || 100;
  DOC.exportFile(fileAt(rel), ExportType.JPEG, o);
}

// ── Layout ──────────────────────────────────────────────────────────────
// Artboard with its top-left at (x, y) in the kit's y-down space.
function board(name, x, y, w, h, first) {
  var r = [L(x), T(y), L(x + w), T(y + h)], ab;
  if (first) { ab = DOC.artboards[0]; ab.artboardRect = r; } else ab = DOC.artboards.add(r);
  ab.name = name; return ab;
}
// Move item so its visual bounds are centred in the box (x, y, w, h).
function centre(item, x, y, w, h) {
  var b = item.geometricBounds; // [left, top, right, bottom], y up
  var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  item.translate(L(x + w / 2) - cx, T(y + h / 2) - cy);
}

// ── The hero: a raw response on the left becomes its interface on the right ──
// Drawn at 507 × 262 with its top-left at (x, y), then scaled by `k`.
// Amber appears only on the field that changed since the last fetch.
// opts.code / opts.changed swap in a shorter excerpt (and the index of its
// changed line); a short excerpt is centred in the panel.
var MONO = "JetBrainsMono-Regular";
function hero(x, y, k, into, opts) {
  opts = opts || {};
  var g = (into || DOC).groupItems.add(); g.name = "Hero — response becomes interface";

  // Response panel
  var rp = g.groupItems.add(); rp.name = "raw response";
  rrect(x, y, 250, 262, 14, "inkRich", rp).name = "panel";
  text("GET", x + 16, y + 21, { font: "JetBrainsMono-Medium", size: 6.8, color: "card", tracking: 40, into: rp });
  text("api.open-meteo.com/v1/forecast", x + 36, y + 21, { font: MONO, size: 6.8, color: "onInk", into: rp });
  line(x + 16, y + 31, x + 234, y + 31, "onInk2", 0.4, rp);
  var code = opts.code || [
    '{',
    '  "latitude": 13.08,',
    '  "longitude": 80.27,',
    '  "current": {',
    '    "time": "2026-09-24T15:00",',
    '    "temperature_2m": 28.4,',
    '    "relative_humidity_2m": 74,',
    '    "wind_speed_10m": 12.1,',
    '    "uv_index": 6.2',
    '  },',
    '  "hourly": {',
    '    "temperature_2m": [',
    '      26.1, 26.8, 27.5, 28.0,',
    '      28.4, 28.1, 27.2, 26.4',
    '    ]',
    '  }',
    '}'
  ];
  var ci = opts.changed === undefined ? 5 : opts.changed;
  // A short excerpt is set larger, so it fills the panel instead of floating in it.
  var big = code.length <= 12, fs = big ? 9.4 : 7.4, lh = big ? 16 : 12.2;
  // Centred in the panel below the GET rule (y + 31 to y + 262).
  var top = y + 31 + (231 - code.length * lh) / 2 + fs * 0.8;
  var hl = rrect(x + 10, top + ci * lh - fs * 1.2, big ? 162 : 128, lh + 0.2, 3, "yellow", rp); hl.opacity = 18; hl.name = "changed field";
  for (var i = 0; i < code.length; i++) {
    var t = text(code[i], x + 16, top + i * lh, { font: MONO, size: fs, color: "onInk", into: rp });
    var m = code[i].match(/[\s\[]-?\d[\d.]*|"[^"]*"(?!:)/g);
    if (m) for (var j = 0; j < m.length; j++) span(t, m[j], { color: i == ci ? "yellow" : "card" });
  }

  // Interface card
  var cx = x + 222, cy = y + 22, cw = 285, ch = 240, px = cx + 20, iw = cw - 40;
  var cd = g.groupItems.add(); cd.name = "interface";
  var card = rrect(cx, cy, cw, ch, 16, "card", cd); stroke(card, "line", 0.6); card.name = "card";
  shadow(card, 10, 22, 16);
  text("CHENNAI  ·  NOW", px, cy + 26, { font: "JetBrainsMono-Medium", size: 6.4, color: "muted", tracking: 60, into: cd });
  var wt = text("Watching", cx + cw - 20, cy + 26, { font: "Inter-Medium", size: 7, color: "muted", align: "right", into: cd });
  circle(cx + cw - 20 - textWidth(wt) - 6, cy + 23.6, 2.4, "green", cd).name = "live dot";

  text("28.4°C", px - 1.5, cy + 70, { font: "InterDisplay-SemiBold", size: 38, color: "ink", tracking: -30, into: cd });
  rrect(px + 142, cy + 51, 99, 17, 8.5, "yellowBg", cd).name = "change chip";
  text("↑ 0.6 since last fetch", px + 191.5, cy + 62.4, { font: "Inter-Medium", size: 7, color: "yellowInk", align: "center", into: cd });

  line(px, cy + 88, px + iw, cy + 88, "line", 0.6, cd);
  var kv = [["Humidity", "74%"], ["Wind", "12.1 km/h"], ["UV index", "6.2"]];
  for (i = 0; i < 3; i++) {
    text(kv[i][0], px + i * 86, cy + 106, { font: "Inter-Regular", size: 6.8, color: "muted", into: cd });
    text(kv[i][1], px + i * 86, cy + 122, { font: "Inter-SemiBold", size: 12, color: "ink", tracking: -10, into: cd });
  }

  text("Hourly temperature", px, cy + 150, { font: "Inter-Regular", size: 6.8, color: "muted", into: cd });
  var temps = [26.1, 26.8, 27.5, 28.0, 28.4, 28.1, 27.2, 26.4], c0 = cy + 196, chh = 34, pts = [];
  for (i = 0; i < temps.length; i++) pts.push([px + i * iw / 7, c0 - (temps[i] - 25.8) / 2.8 * chh]);
  var area = poly(pts.concat([[px + iw, c0 + 4], [px, c0 + 4]]), cd); area.closed = true; fill(area, "sink"); area.name = "chart area";
  line(px, c0 + 4, px + iw, c0 + 4, "line", 0.6, cd);
  var ln = poly(pts, cd); stroke(ln, "ink", 1.3); ln.strokeJoin = StrokeJoin.ROUNDENDJOIN; ln.strokeCap = StrokeCap.ROUNDENDCAP; ln.name = "chart line";
  circle(pts[4][0], pts[4][1], 3.4, "card", cd); var dot = circle(pts[4][0], pts[4][1], 2.4, "yellow", cd); dot.name = "now";

  // History strip: one tick per stored fetch, amber where the fetch changed something.
  var changed = { 3: 1, 9: 1, 10: 1, 17: 1, 23: 1 };
  for (i = 0; i < 24; i++) rrect(px + i * (iw / 24), cy + 214, 5, 9, 1.5, changed[i] ? "yellow" : "line", cd);

  if (k && k != 1) g.resize(k * 100, k * 100, true, true, true, true, k * 100, Transformation.TOPLEFT);
  return g;
}

// ── Amigo, the mascot: the mark's body and aperture stood upright on two legs ──
var AMIGO_BODY = "M13 3h6c4.4 0 7 2.9 7 7.3v9c0 4.2-2.7 6.7-6.9 6.7h-6.2C8.7 26 6 23.5 6 19.3v-9C6 5.9 8.6 3 13 3Zm.2 6c-1.4 0-2.3.9-2.3 2.3v.7c0 1.4.9 2.3 2.3 2.3h5.6c1.4 0 2.3-.9 2.3-2.3v-.7c0-1.4-.9-2.3-2.3-2.3h-5.6Z";
function amigo(x, y, size, c, into) {
  var s = size / 32, g = (into || DOC).groupItems.add(); g.name = "Amigo";
  function P(p) { return [L(x + p[0] * s), T(y + p[1] * s)]; }
  rrect(x + 9 * s, y + 21.5 * s, 6 * s, 8.5 * s, 3 * s, c, g).name = "leg";
  rrect(x + 17 * s, y + 21.5 * s, 6 * s, 8.5 * s, 3 * s, c, g).name = "leg";
  var cp = g.compoundPathItems.add(); cp.name = "body + aperture";
  var subs = parsePath(AMIGO_BODY);
  for (var k = 0; k < subs.length; k++) {
    var sp = subs[k], p = cp.pathItems.add(), a = [];
    for (var j = 0; j < sp.length; j++) a.push(P(sp[j].a));
    p.setEntirePath(a); p.closed = true;
    for (j = 0; j < sp.length; j++) { p.pathPoints[j].leftDirection = P(sp[j].l); p.pathPoints[j].rightDirection = P(sp[j].r); }
    p.evenodd = true; fill(p, c);
  }
  return g;
}

// Resting Amigo: lying on its side, head to the right, legs trailing left, with two Zs
// rising off the head. The Zs never appear on the standing pose. They are rounded
// strokes in the mark's one colour, outside the body, so Amigo still has no face.
// (x, y) is the top-left of a 40 × 32 unit box; size is the height of that box.
function zs(x, y, s, c, into) {
  var g = (into || DOC).groupItems.add(); g.name = "Zs";
  var Z = [[0, 3.8, 3.6], [4.4, 0, 5.2]]; // [left, top, width] in Amigo units
  for (var i = 0; i < Z.length; i++) {
    var zx = x + Z[i][0] * s, zy = y + Z[i][1] * s, w = Z[i][2] * s;
    var p = poly([[zx, zy], [zx + w, zy], [zx, zy + w], [zx + w, zy + w]], g);
    stroke(p, c, 1.3 * s); p.strokeCap = StrokeCap.ROUNDENDCAP; p.strokeJoin = StrokeJoin.ROUNDENDJOIN;
  }
  return g;
}
function amigoResting(x, y, size, c, into) {
  var s = size / 32, g = (into || DOC).groupItems.add(); g.name = "Amigo, resting";
  var a = amigo(0, 0, size, c, g); a.rotate(-90); // clockwise: head right, legs left
  var b = a.geometricBounds; // lie it down on the box's floor
  a.translate(L(x + 1 * s) - b[0], T(y + 31 * s) - b[3]);
  b = a.geometricBounds;
  zs(b[2] - OX - 3 * s, OY - b[1] - 9.5 * s, s, c, g);
  return g;
}
