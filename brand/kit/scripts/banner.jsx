// Task 3 — blog banner, 1200 × 700 px, RGB.
var W = 1200, H = 700, M = 80;
newDoc("imago-blog-banner", W, H, false);
var bg = DOC.layers[0], vis = layer("Visual"), words = layer("Copy");
DOC.artboards[0].name = "blog banner 1200x700";
rect(0, 0, W, H, "paper", bg).name = "paper";

lockup(M, 72, 36, "ink", { withIcon: true, outline: true, into: words });

text("APIs become\ninterfaces.", M - 4, 266,
  { font: "InterDisplay-SemiBold", size: 74, leading: 74, color: "ink", tracking: -40, into: words }).name = "headline";
para("Paste an endpoint. Get a readable interface, not raw JSON.", M, 374, 420, 64,
  { font: "Inter-Regular", size: 21, leading: 29, color: "ink2", tracking: -8, into: words }).name = "standfirst";

// The command bar, as the call to action
var by = 480, bw = 410, bh = 54;
var bar = rrect(M, by, bw, bh, 14, "card", vis); stroke(bar, "line", 1); bar.name = "command bar";
text("Paste an API URL or a curl command", M + 20, by + 32.5, { font: "Inter-Regular", size: 14, color: "muted", into: words });
rrect(M + bw - 7 - 58, by + 7, 58, bh - 14, 10, "ink", vis).name = "send button";
text("→", M + bw - 7 - 29, by + 34, { font: "Inter-SemiBold", size: 18, color: "card", align: "center", into: words });

text("response   →   shape   →   plan   →   interface", M, 614,
  { font: MONO, size: 12, color: "muted", tracking: 20, into: words }).name = "pipeline";

// Same hero as the flyer, larger
hero(552, 204, 1.2, vis);
text("Live example: Open-Meteo forecast", W - 40, 614, { font: "Inter-Regular", size: 12, color: "muted", align: "right", into: words });

saveAI("imago-blog-banner.ai");
exportPNG("exports/imago-blog-banner.png", 100);
exportJPG("exports/imago-blog-banner.jpg", 100);
exportPNG("exports/imago-blog-banner@2x.png", 200);
"ok";
