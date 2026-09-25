// Task 1 is one file: the logo sheet, then Amigo, then the brand guidelines,
// each piece's artboards and layers copied in below the last. Run after
// logo.jsx, mascot.jsx and guidelines.jsx (build.sh task1 does all four).
var GAP = 240;
function openKit(rel) {
  var f = fileAt(rel);
  for (var d = app.documents.length - 1; d >= 0; d--) {
    var doc = app.documents[d];
    if (doc.fullName && doc.fullName.fsName == f.fsName) doc.close(SaveOptions.DONOTSAVECHANGES);
  }
  if (!f.exists) throw new Error("missing " + rel + ": build it first");
  return app.open(f);
}
// Bounds of every artboard, [left, top, right, bottom] with y up.
function extent(doc) {
  var e = null;
  for (var i = 0; i < doc.artboards.length; i++) {
    var r = doc.artboards[i].artboardRect;
    e = e ? [Math.min(e[0], r[0]), Math.max(e[1], r[1]), Math.max(e[2], r[2]), Math.min(e[3], r[3])] : r.slice(0);
  }
  return e;
}
// Recreate src's layer tree inside into, bottom layer first so the stack keeps its order.
function copyLayers(srcLayers, into, dx, dy) {
  for (var i = srcLayers.length - 1; i >= 0; i--) {
    var s = srcLayers[i], t = into.layers.add();
    t.name = s.name;
    s.locked = false; s.visible = true;
    for (var j = 0; j < s.pageItems.length; j++) {
      var it = s.pageItems[j];
      if (it.parent != s) continue;   // sublayers' items are copied with their sublayer
      it.locked = false; it.hidden = false;
      // Position is read in the source and set in the target, each in its own
      // document's coordinates; a duplicate does not keep its place across files.
      var pos = it.position;
      it.duplicate(t, ElementPlacement.PLACEATEND).position = [pos[0] + dx, pos[1] + dy];
    }
    if (s.layers.length) copyLayers(s.layers, t, dx, dy);
  }
}
function merge(dst, rel, title, prefix) {
  var src = openKit(rel);
  var de = extent(dst), se = extent(src);
  var dx = de[0] - se[0], dy = (de[3] - GAP) - se[1];
  for (var i = 0; i < src.artboards.length; i++) {
    var r = src.artboards[i].artboardRect;
    dst.artboards.add([r[0] + dx, r[1] + dy, r[2] + dx, r[3] + dy]).name = prefix + src.artboards[i].name;
  }
  app.activeDocument = src;
  var top = dst.layers.add(); top.name = title;
  copyLayers(src.layers, top, dx, dy);
  src.close(SaveOptions.DONOTSAVECHANGES);
  app.activeDocument = dst;
}
var dst = openKit("imago-task1-logo.ai");
merge(dst, "build/imago-mascot.ai", "Mascot", "Mascot · ");
merge(dst, "build/imago-brand-guidelines.ai", "Brand guidelines", "Guidelines · ");
DOC = dst;
saveAI("imago-task1-logo.ai");
"ok " + dst.artboards.length + " artboards";
