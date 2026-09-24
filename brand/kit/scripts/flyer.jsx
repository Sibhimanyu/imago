// Task 2 — A4 promotional flyer, CMYK, for print.
var W = 595.28, H = 841.89, M = 44, IW = W - 2 * M;
newDoc("imago-flyer-a4", W, H, true);
var bg = DOC.layers[0], vis = layer("Visual"), words = layer("Copy");
DOC.artboards[0].name = "A4 flyer";
// 3 mm bleed past the trim, same paper.
rect(-8.5, -8.5, W + 17, H + 17, "paper", bg).name = "paper (with bleed)";

// Masthead
lockup(M, 40, 24, "ink", { withIcon: true, outline: true, into: words });
text("API PLAYGROUND  ·  RUNS IN YOUR BROWSER", W - M, 56.5,
  { font: "JetBrainsMono-Medium", size: 6.6, color: "muted", tracking: 60, align: "right", into: words });

// Headline + standfirst
text("APIs become\ninterfaces.", M - 3, 142,
  { font: "InterDisplay-SemiBold", size: 62, leading: 60, color: "ink", tracking: -40, into: words }).name = "headline";
para("Paste a GET endpoint or a curl command. Imago reads the JSON, works out its shape, and builds the page the data deserves, with metrics, charts and tables drawn by its own components.",
  M, 228, 392, 60, { font: "Inter-Regular", size: 12, leading: 17.5, color: "ink2", into: words }).name = "standfirst";

// Hero
hero(M, 306, 1, vis);
text("response   →   shape   →   plan   →   interface", M, 590,
  { font: MONO, size: 6.8, color: "muted", tracking: 20, into: words }).name = "pipeline";
text("Live example: Open-Meteo forecast", W - M, 590,
  { font: "Inter-Regular", size: 6.8, color: "muted", align: "right", into: words });

// Features, 2 × 2
var F = [
  ["Reads the shape", "Values become types, types become a plan. A forecast gets metrics and a chart; a book search gets a table.", "ink"],
  ["Remembers every interpretation", "Each response shape is hashed. Seen it before? The stored interface comes straight back, with no model call.", "ink"],
  ["Watches endpoints change", "Every fetch is diffed against the last one. Amber marks exactly what moved, down to the field.", "yellow"],
  ["Safe by construction", "The model returns a small JSON plan, never HTML. Every value is written as text, and your keys stay in your browser.", "ink"]
];
var colW = (IW - 26) / 2;
for (var i = 0; i < 4; i++) {
  var fx = M + (i % 2) * (colW + 26), fy = 610 + Math.floor(i / 2) * 66;
  line(fx, fy, fx + colW, fy, F[i][2], F[i][2] == "yellow" ? 1.6 : 0.8, words);
  text(F[i][0], fx, fy + 19, { font: "Inter-SemiBold", size: 10.5, color: "ink", tracking: -8, into: words });
  para(F[i][1], fx, fy + 26, colW - 6, 34, { font: "Inter-Regular", size: 8.2, leading: 11.8, color: "muted", into: words });
}

// Call to action: the command bar, as the app shows it
var cy = 746, chh = 52;
rrect(M, cy, IW, chh, 14, "inkRich", vis).name = "CTA bar";
text("Paste your first endpoint.", M + 20, cy + 23.5, { font: "Inter-SemiBold", size: 13.5, color: "card", tracking: -12, into: words });
text("Works without a key  ·  No backend  ·  No sign-up", M + 20, cy + 38.5, { font: "Inter-Regular", size: 7.6, color: "onInk", into: words });
var bx = M + IW - 12 - 236, by = cy + 10;
rrect(bx, by, 236, 32, 9, "card", vis).name = "command bar";
text("Paste an API URL or a curl command", bx + 12, by + 19.2, { font: "Inter-Regular", size: 7.8, color: "muted", into: words });
rrect(bx + 236 - 4 - 34, by + 4, 34, 24, 7, "ink", vis).name = "send button";
text("→", bx + 236 - 21, by + 20, { font: "Inter-SemiBold", size: 11, color: "card", align: "center", into: words });

saveAI("imago-flyer-a4.ai");
var old = new File(KIT + "/exports/imago-flyer-a4-print.pdf"); if (old.exists) old.remove();
savePDF("exports/imago-flyer-a4-print.pdf", "[PDF/X-4:2008]", 8.5039); // 3 mm bleed
exportPNG("exports/imago-flyer-a4-preview.png", 250);
"ok";
