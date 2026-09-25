// Task 2 — A4 promotional flyer, CMYK, for print.
//
// An A4 flyer is a handout: it is held and read, not glanced at from across a
// room, so it carries a short case, not just a slogan (about 130 words; the
// usual ceiling is 200). It is written for two readers. A skimmer gets the
// headline, the picture, three benefit titles and the call to action, about
// 15 words. A reader gets, in AIDA order: what it is and who it is for, how it
// works, what each benefit means, why to trust it, and where to go.
//
// SITE is where the flyer sends people. If it changes, run
//   python3 brand/kit/scripts/qr.py <SITE>
// and rebuild; without a matching qr.json the CTA shows a marked slot instead.
var SITE = "https://imago.onslate.in";

var W = 595.28, H = 841.89, M = 44, IW = W - 2 * M;
newDoc("imago-task2-flyer-a4", W, H, true);
var bg = DOC.layers[0], vis = layer("Visual"), words = layer("Copy");
DOC.artboards[0].name = "A4 flyer";
// 3 mm bleed past the trim, same paper.
rect(-8.5, -8.5, W + 17, H + 17, "paper", bg).name = "paper (with bleed)";

// Signature and audience
lockup(M, 40, 24, "ink", { withIcon: true, outline: true, into: words });
text("FOR ANYONE WHO WORKS WITH APIS", W - M, 56,
  { font: "JetBrainsMono-Medium", size: 6.8, color: "muted", tracking: 70, align: "right", into: words }).name = "audience";

// Attention: the promise
text("APIs become\ninterfaces.", M - 3, 132,
  { font: "InterDisplay-SemiBold", size: 60, leading: 57, color: "ink", tracking: -40, into: words }).name = "headline";
// Interest: the problem, and what Imago does about it
para("Raw JSON is hard to read. Paste a GET endpoint or a curl command, and Imago builds the page the data deserves.",
  M, 214, 400, 56, { font: "Inter-Regular", size: 13.5, leading: 19, color: "ink2", into: words }).name = "subhead";

// The picture: a short response becoming its interface
hero(M, 276, 1, vis, {
  code: ['{', '  "latitude": 13.08,', '  "longitude": 80.27,', '  "current": {', '    "temperature_2m": 28.4,',
    '    "relative_humidity_2m": 74,', '    "wind_speed_10m": 12.1,', '    "uv_index": 6.2', '  },',
    '  "hourly": { \u2026 }', '}'],
  changed: 4
});
// Desire: three benefits, each a title for skimmers and one line for readers
var B = [
  ["Reads the shape", "Metrics, charts and tables chosen for your data, not a wall of JSON.", "ink"],
  ["Remembers it", "A shape it has seen before comes straight back, with no model call.", "ink"],
  ["Watches it change", "Keep an endpoint live. Amber marks exactly what moved.", "yellow"]
];
var cw = (IW - 2 * 22) / 3;
// How it works, in the picture's own terms, on the same three columns
var S = ["Paste an endpoint", "Imago reads its shape", "A live page, drawn for it"];
for (var i = 0; i < 3; i++) {
  var sx = M + i * (cw + 22);
  var st = text((i + 1) + "  " + S[i], sx, 556, { font: MONO, size: 7.4, color: "muted", into: words });
  st.name = "step " + (i + 1); span(st, String(i + 1), { color: "ink", font: "JetBrainsMono-Medium" });
  if (i < 2) text("\u2192", sx + textWidth(st) + 12, 556, { font: MONO, size: 7.4, color: "muted", into: words });
}
for (var i = 0; i < 3; i++) {
  var bx = M + i * (cw + 22), by = 578;
  line(bx, by, bx + cw, by, B[i][2], B[i][2] == "yellow" ? 1.8 : 0.9, words);
  text(B[i][0], bx, by + 19, { font: "Inter-SemiBold", size: 11.5, color: "ink", tracking: -8, into: words });
  para(B[i][1], bx, by + 26, cw - 4, 40, { font: "Inter-Regular", size: 8.6, leading: 12.2, color: "muted", into: words });
}

// Trust: plain facts, since there are no testimonials to quote
var facts = ["Runs in your browser", "Your keys stay on your device", "Works without a key", "Share any page as a link"];
text(facts.join("   ·   "), M, 666, { font: "Inter-Medium", size: 8.2, color: "ink2", into: words }).name = "facts";

// Action: where to go
var cy = 682, ch = 116, qs = 96;
rrect(M, cy, IW, ch, 16, "inkRich", vis).name = "CTA";
text("Paste your first endpoint.", M + 24, cy + 40, { font: "InterDisplay-SemiBold", size: 22, color: "card", tracking: -20, into: words });
text("Free. No account. Nothing to install.", M + 24, cy + 60, { font: "Inter-Regular", size: 10.5, color: "onInk", into: words });
var qx = M + IW - 10 - qs, qy = cy + (ch - qs) / 2;
text("Scan to open Imago  →", qx - 14, cy + 60, { font: "Inter-Medium", size: 9, color: "onInk", align: "right", into: words }).name = "scan label";
var qrFile = new File(KIT + "/scripts/qr.json"), qr = null;
if (SITE && qrFile.exists) { qrFile.open("r"); qr = eval("(" + qrFile.read() + ")"); qrFile.close(); if (qr.url != SITE) qr = null; }
if (qr) {
  text(SITE.replace(/^https?:\/\//, ""), M + 24, cy + 92, { font: "JetBrainsMono-Medium", size: 11, color: "card", into: words }).name = "url";
  // White tile with the ISO quiet zone of four modules on every side.
  rrect(qx, qy, qs, qs, 8, "card", vis).name = "QR tile";
  var q = vis.groupItems.add(); q.name = "QR " + SITE;
  var m = qs / (qr.size + 8), pad = 4 * m;
  for (var r = 0; r < qr.size; r++) for (var c = 0; c < qr.size; c++)
    if (qr.rows[r].charAt(c) == "1") rect(qx + pad + c * m, qy + pad + r * m, m + 0.05, m + 0.05, "ink", q);
} else {
  text("Link goes here", M + 24, cy + 92, { font: "JetBrainsMono-Medium", size: 11, color: "onInk", into: words }).name = "url (placeholder)";
  var slot = rrect(qx, qy, qs, qs, 8, null, vis); stroke(slot, "onInk", 1); slot.strokeDashes = [4, 3]; slot.name = "QR slot";
  text("QR", qx + qs / 2, qy + qs / 2 + 4, { font: "JetBrainsMono-Medium", size: 11, color: "onInk", align: "center", into: words });
}

// The name, as the brand tells it
var nm = text("imago (n.)  the final, fully formed stage after metamorphosis. Raw JSON goes in; its finished form comes out.",
  W / 2, 822, { font: "Inter-Regular", size: 7, color: "muted", align: "center", into: words });
nm.name = "the name"; span(nm, "imago", { color: "ink", font: "Inter-SemiBold" });

saveAI("imago-task2-flyer-a4.ai");
var old = new File(KIT + "/exports/imago-task2-flyer-a4-print.pdf"); if (old.exists) old.remove();
savePDF("exports/imago-task2-flyer-a4-print.pdf", "[PDF/X-4:2008]", 8.5039); // 3 mm bleed
exportPNG("exports/imago-task2-flyer-a4-preview.png", 250);
"ok " + (qr ? "qr" : "placeholder");
