// Amigo, the mascot: standing and resting, as reusable vector assets. Its
// artboards end up in the Task 1 file; build.sh task1 runs the merge.
newDoc("imago-mascot", 320, 320, false);
var art = layer("Mascot");
board("amigo", 0, 0, 320, 320, true);
amigo(0, 0, 320, "ink", art);
// Resting lies down with Zs off its head: a 40 × 32 unit box, so this board is wider.
board("amigo-resting", 400, 0, 400, 320);
amigoResting(400 + 30, 30, 260, "ink", art);
saveAI("build/imago-mascot.ai");   // merged into imago-task1-logo.ai by task1.jsx
var old = new Folder(KIT + "/exports").getFiles("imago-mascot_*.svg");
for (var f = 0; f < old.length; f++) old[f].remove();
var so = new ExportOptionsSVG(); so.fontType = SVGFontType.OUTLINEFONT; so.saveMultipleArtboards = true; so.artboardRange = "1-2";
DOC.exportFile(fileAt("exports/imago-mascot.svg"), ExportType.SVG, so);
exportPNG("exports/amigo.png", 200, 0);
exportPNG("exports/amigo-resting.png", 200, 1);
"ok";
