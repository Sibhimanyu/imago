// Task 3 — blog banner, 1200 × 700 px, RGB.
//
// A blog banner is not the landing page's hero. The hero is interactive and
// is seen by someone already on the site, so it carries buttons, a live demo
// and a URL box. The banner is a still picture that travels: the header of
// the launch post, its card on the blog index, and the preview when the link
// is shared, where it is often shown 300 to 500 px wide. So it names the post,
// says the promise in a few big words, shows one idea boldly enough to read
// at a quarter of its size, and has nothing that looks clickable. The logo
// frames it; it is not the subject.
var W = 1200, H = 700, M = 80;
newDoc("imago-task3-blog-banner", W, H, false);
var bg = DOC.layers[0], vis = layer("Visual"), words = layer("Copy");
DOC.artboards[0].name = "blog banner 1200x700";
rect(0, 0, W, H, "paper", bg).name = "paper";

// Frame: the brand, top left; where to find it, bottom left.
lockup(M, 72, 34, "ink", { withIcon: true, outline: true, into: words });
text("imago.onslate.in", M, H - 72, { font: "JetBrainsMono-Medium", size: 17, color: "muted", into: words }).name = "address";

// The post, then the promise.
text("INTRODUCING IMAGO", M, 262, { font: "JetBrainsMono-Medium", size: 17, color: "muted", tracking: 120, into: words }).name = "post";
text("APIs become\ninterfaces.", M - 5, 356,
  { font: "InterDisplay-SemiBold", size: 92, leading: 88, color: "ink", tracking: -40, into: words }).name = "headline";
text("Paste an endpoint. Get a page you can read.", M, 506,
  { font: "Inter-Regular", size: 24, color: "ink2", tracking: -8, into: words }).name = "standfirst";

// Colour the characters of sub starting at index from (span() takes the first match).
function spanAfter(t, sub, from, o) {
  for (var k = 0; k < sub.length; k++) t.characters[from + k].characterAttributes.fillColor = col(o.color);
}

// One idea, drawn big: two fields of a real response become one value you
// can read, with amber on what changed since the last fetch.
var px = 640, py = 112, pw = 400, ph = 300;
var panel = vis.groupItems.add(); panel.name = "raw response";
rrect(px, py, pw, ph, 20, "inkRich", panel).name = "panel";
text("GET  open-meteo", px + 30, py + 44, { font: "JetBrainsMono-Medium", size: 15, color: "onInk", tracking: 20, into: panel });
line(px + 30, py + 64, px + pw - 30, py + 64, "onInk2", 0.8, panel);
var code = ['{', '  "temperature_2m": 28.4,', '  "wind_speed_10m": 12.1', '}'], lh = 38, cy = py + 118;
var hl = rrect(px + 18, cy + lh - 28, pw - 36, 38, 6, "yellow", panel); hl.opacity = 20; hl.name = "changed field";
for (var i = 0; i < code.length; i++) {
  var t = text(code[i], px + 30, cy + i * lh, { font: MONO, size: 21, color: "onInk", into: panel });
  var m = code[i].match(/: (-?\d[\d.]*)/);   // the value, not the digits in the key
  if (m) spanAfter(t, m[1], code[i].indexOf(': ') + 2, { color: i == 1 ? "yellow" : "card" });
}

var cx = 820, cyc = 382, cw = 320, chh = 250;
var card = vis.groupItems.add(); card.name = "interface";
var c = rrect(cx, cyc, cw, chh, 20, "card", card); stroke(c, "line", 1); shadow(c, 14, 30, 18);
text("CHENNAI  ·  NOW", cx + 30, cyc + 46, { font: "JetBrainsMono-Medium", size: 14, color: "muted", tracking: 60, into: card });
text("28.4°C", cx + 27, cyc + 140, { font: "InterDisplay-SemiBold", size: 80, color: "ink", tracking: -30, into: card }).name = "value";
rrect(cx + 30, cyc + 170, 230, 44, 22, "yellowBg", card).name = "change chip";
text("↑ 0.6 since last fetch", cx + 145, cyc + 199, { font: "Inter-Medium", size: 18, color: "yellowInk", align: "center", into: card });

saveAI("imago-task3-blog-banner.ai");
exportPNG("exports/imago-task3-blog-banner.png", 100);
exportJPG("exports/imago-task3-blog-banner.jpg", 100);
exportPNG("exports/imago-task3-blog-banner@2x.png", 200);
"ok";
