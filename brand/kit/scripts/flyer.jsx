// Task 2 — A4 promotional flyer, CMYK, for print.
// A flyer gets a glance, not a read: one picture, one promise, three labels and
// where to go. About 30 words.
//
// SITE is where the flyer sends people. Set it, run
//   python3 brand/kit/scripts/qr.py <SITE>
// and rebuild; until then the CTA shows a marked slot instead of a QR code.
var SITE = "";

var W = 595.28, H = 841.89, M = 44, IW = W - 2 * M;
newDoc("imago-flyer-a4", W, H, true);
var bg = DOC.layers[0], vis = layer("Visual"), words = layer("Copy");
DOC.artboards[0].name = "A4 flyer";
// 3 mm bleed past the trim, same paper.
rect(-8.5, -8.5, W + 17, H + 17, "paper", bg).name = "paper (with bleed)";

lockup(M, 44, 26, "ink", { withIcon: true, outline: true, into: words });

// The promise
text("APIs become\ninterfaces.", M - 4, 176,
  { font: "InterDisplay-SemiBold", size: 76, leading: 72, color: "ink", tracking: -42, into: words }).name = "headline";
text("Paste an API. Get a page you can read.", M, 286,
  { font: "Inter-Regular", size: 17, color: "ink2", tracking: -10, into: words }).name = "line";

// The picture: a short response becoming its interface
hero(M, 322, 1, vis, {
  code: ['{', '  "current": {', '    "temperature_2m": 28.4,', '    "relative_humidity_2m": 74,',
    '    "wind_speed_10m": 12.1,', '    "uv_index": 6.2', '  }', '}'],
  changed: 2
});

// Three labels, the landing page's own
var L3 = [["Reads the shape", "ink"], ["Remembers it", "ink"], ["Watches it change", "yellow"]];
var cw = (IW - 2 * 20) / 3;
for (var i = 0; i < 3; i++) {
  var lx = M + i * (cw + 20), ly = 616;
  line(lx, ly, lx + cw, ly, L3[i][1], L3[i][1] == "yellow" ? 2 : 1, words);
  text(L3[i][0], lx, ly + 22, { font: "Inter-SemiBold", size: 13, color: "ink", tracking: -10, into: words });
}

// Where to go
var cy = 684, ch = 114, qs = 82;
rrect(M, cy, IW, ch, 16, "inkRich", vis).name = "CTA";
text("Paste your first endpoint.", M + 26, cy + 44, { font: "InterDisplay-SemiBold", size: 22, color: "card", tracking: -20, into: words });
text("Free, in your browser. No account.", M + 26, cy + 66, { font: "Inter-Regular", size: 11, color: "onInk", into: words });
var qx = M + IW - 16 - qs, qy = cy + (ch - qs) / 2;
var qrFile = new File(KIT + "/scripts/qr.json"), qr = null;
if (SITE && qrFile.exists) { qrFile.open("r"); qr = eval("(" + qrFile.read() + ")"); qrFile.close(); if (qr.url != SITE) qr = null; }
if (qr) {
  text(SITE.replace(/^https?:\/\//, ""), M + 26, cy + 92, { font: "JetBrainsMono-Medium", size: 11, color: "card", into: words }).name = "url";
  rrect(qx, qy, qs, qs, 8, "card", vis).name = "QR tile";
  var q = vis.groupItems.add(); q.name = "QR " + SITE;
  var pad = 7, m = (qs - 2 * pad) / qr.size;
  for (var r = 0; r < qr.size; r++) for (var c = 0; c < qr.size; c++)
    if (qr.rows[r].charAt(c) == "1") rect(qx + pad + c * m, qy + pad + r * m, m + 0.05, m + 0.05, "ink", q);
} else {
  text("Link goes here", M + 26, cy + 92, { font: "JetBrainsMono-Medium", size: 11, color: "onInk", into: words }).name = "url (placeholder)";
  var slot = rrect(qx, qy, qs, qs, 8, null, vis); stroke(slot, "onInk", 1); slot.strokeDashes = [4, 3]; slot.name = "QR slot";
  text("QR", qx + qs / 2, qy + qs / 2 + 4, { font: "JetBrainsMono-Medium", size: 11, color: "onInk", align: "center", into: words });
}

saveAI("imago-flyer-a4.ai");
var old = new File(KIT + "/exports/imago-flyer-a4-print.pdf"); if (old.exists) old.remove();
savePDF("exports/imago-flyer-a4-print.pdf", "[PDF/X-4:2008]", 8.5039); // 3 mm bleed
exportPNG("exports/imago-flyer-a4-preview.png", 250);
"ok " + (qr ? "qr" : "placeholder");
