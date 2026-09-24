// Amigo, the mascot: standing and resting, as reusable vector assets.
newDoc("imago-mascot", 320, 320, false);
var art = layer("Mascot");
board("amigo", 0, 0, 320, 320, true);
amigo(0, 0, 320, "ink", art);
// The resting Zs rise above and right of the 32-unit box, so this board is wider.
board("amigo-resting", 400, 0, 400, 320);
var r = amigoResting(0, 0, 250, "ink", art); centre(r, 400, 0, 400, 320);
saveAI("imago-mascot.ai");
var old = new Folder(KIT + "/exports").getFiles("imago-mascot_*.svg");
for (var f = 0; f < old.length; f++) old[f].remove();
var so = new ExportOptionsSVG(); so.fontType = SVGFontType.OUTLINEFONT; so.saveMultipleArtboards = true; so.artboardRange = "1-2";
DOC.exportFile(fileAt("exports/imago-mascot.svg"), ExportType.SVG, so);
exportPNG("exports/amigo.png", 200, 0);
exportPNG("exports/amigo-resting.png", 200, 1);
"ok";
