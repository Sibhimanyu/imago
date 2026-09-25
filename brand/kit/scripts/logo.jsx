// The Imago logo artwork: primary, reversed, app icon, bare mark, construction,
// one artboard each, for the SVG/PNG/PDF exports. Its pages in the Task 1
// file are drawn by guidelines.jsx.
newDoc("imago-logo-master", 640, 240, false);
var bg = DOC.layers[0], grid = layer("Grid"), art = layer("Logo"), notes = layer("Construction");
var G = 80; // gap between artboards

// 0 primary lockup on paper
board("logo-primary", 0, 0, 640, 240, true);
rect(0, 0, 640, 240, "paper", bg).name = "paper";
centre(lockup(0, 0, 96, "ink", { outline: true, into: art }), 0, 0, 640, 240);

// 1 reversed on ink
board("logo-reversed", 640 + G, 0, 640, 240);
rect(640 + G, 0, 640, 240, "ink", bg).name = "ink";
centre(lockup(0, 0, 96, "card", { outline: true, into: art }), 640 + G, 0, 640, 240);

// 2 app icon (1024 master; tile is the artboard, no padding)
var ix = 2 * (640 + G);
board("app-icon", ix, 0, 512, 512);
icon(ix, 0, 512, "ink", "card", art);

// 3 bare mark, single colour
var mx = ix + 512 + G;
board("mark", mx, 0, 320, 320);
mark(mx, 0, 320, "ink", art);

// 4 lockup with app tile (small-size use) on paper
board("logo-tile", 0, 240 + G, 640, 240);
rect(0, 240 + G, 640, 240, "paper", bg).name = "paper";
centre(lockup(0, 0, 96, "ink", { withIcon: true, outline: true, into: art }), 0, 240 + G, 640, 240);

// 5 construction: the 32-unit grid, clear space of one aperture width
var cx = 640 + G, cy = 240 + G, cw = 640, ch = 400, u = 10, gx = cx + (cw - 32 * u) / 2, gy = cy + 40;
board("logo-construction", cx, cy, cw, ch);
rect(cx, cy, cw, ch, "card", bg).name = "white";
for (var i = 0; i <= 32; i++) {
  var w = i % 8 == 0 ? 0.75 : 0.35, c = i % 8 == 0 ? "line" : "sink";
  line(gx + i * u, gy, gx + i * u, gy + 32 * u, c, w, grid);
  line(gx, gy + i * u, gx + 32 * u, gy + i * u, c, w, grid);
}
var m = mark(gx, gy, 32 * u, "ink", art); m.opacity = 90;
// aperture width = 5.3 units → clear-space frame
var ap = 5.3 * u, b = [gx + 3 * u, gy + 6.4 * u, gx + 28.6 * u, gy + 27.4 * u];
var cs = rect(b[0] - ap, b[1] - ap, b[2] - b[0] + 2 * ap, b[3] - b[1] + 2 * ap, null, notes);
stroke(cs, "yellow", 1); cs.strokeDashes = [4, 3];
text("32-unit grid  ·  clear space = one aperture width (5.3u)", cx + cw / 2, cy + ch - 14,
  { font: "JetBrainsMono-Regular", size: 9, color: "muted", align: "center", into: notes });

saveAI("build/imago-logo-master.ai");   // exports only; the Task 1 file is guidelines.jsx
var names = ["logo-primary", "logo-reversed", "app-icon", "mark", "logo-tile", "logo-construction"];
for (var k = 0; k < names.length; k++) exportPNG("exports/" + names[k] + ".png", k == 2 ? 200 : 300, k);
// Single-artboard SVGs for the web, paths only.
var so = new ExportOptionsSVG(); so.embedRasterImages = true; so.fontType = SVGFontType.OUTLINEFONT;
so.saveMultipleArtboards = true; so.artboardRange = "1-6";
var old = new Folder(KIT + "/exports").getFiles("imago-task1-logo_*.svg");
for (var f = 0; f < old.length; f++) old[f].remove();
DOC.exportFile(fileAt("exports/imago-task1-logo.svg"), ExportType.SVG, so);
savePDF("exports/imago-task1-logo.pdf");
"ok " + DOC.artboards.length;
