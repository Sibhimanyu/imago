#!/usr/bin/env node
/* The Imago API gallery: one static page per public API, each showing that
   API's live response drawn by Imago's own renderer, plus the press kit and
   the hosted-AI waitlist. Writes them to gallery/dist/, laid out as they are
   served on imago.onslate.in beside the app:

     /apis/            the gallery          /press/      the press kit
     /apis/<slug>/     one page per API     /waitlist/   the waitlist
     /assets/gallery/  their scripts and stylesheet

     node gallery/build.mjs

   ./publish.sh runs this and merges gallery/dist/ into dist/, so there is one
   site. The app's own files (styles.css, favicon.svg, og.png, assets/) are
   linked, not copied. */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SITE = 'https://imago.onslate.in';
export const APP = SITE;
export const REPO = 'https://github.com/Sibhimanyu/imago';
// The waitlist function (Catalyst Advanced I/O). It accepts imago.onslate.in's origin only.
export const WAITLIST_FN = 'https://imago-60083782173.development.catalystserverless.in/server/waitlist/';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

/* ── The APIs ───────────────────────────────────────────────────────────
   Every endpoint is public, keyless, and answers with
   Access-Control-Allow-Origin, so the reader's browser can fetch it
   (checked with curl -sI -H 'Origin: https://example.com' on 2026-09-26).
   The copy was written from the actual responses. `shot` is the fallback
   screenshot, shown until the live render replaces it. */
export const APIS = [
  {
    slug: 'pokeapi',
    name: 'PokeAPI',
    label: 'Pokémon',
    endpoint: 'https://pokeapi.co/api/v2/pokemon/pikachu',
    shot: 'launch/social/pokemon.png',
    summary: 'One Pokémon as a page: sprite, stat bars, type badge.',
    about: [
      'PokeAPI’s /pokemon endpoint returns one Pokémon as a single large record: its id, height and weight, base experience, six base stats, its type and abilities, the items it can hold, and more than a hundred moves.',
      'Imago puts the sprite beside the numbers, draws the six stats as bars and the type as a badge, and turns the nested lists, like held items, into tables. Nobody told it what a Pokémon is; it read the shape of the JSON.'
    ]
  },
  {
    slug: 'open-meteo',
    name: 'Open-Meteo',
    label: 'Weather',
    endpoint: 'https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1',
    shot: 'launch/social/weather.png',
    credit: { text: 'Weather data by Open-Meteo.com', href: 'https://open-meteo.com/', licence: 'CC BY 4.0' },
    summary: 'A forecast read for a human: units rejoined, hours charted.',
    about: [
      'Open-Meteo’s forecast endpoint returns the current temperature, relative humidity and wind speed for Chennai, with each unit kept in a separate object, plus 24 hourly temperatures for the day.',
      'Imago pairs every number with its unit, leads with the current readings, draws the hourly temperatures as a chart with the day’s low and high, and folds coordinates and generation time into Details.'
    ]
  },
  {
    slug: 'open-library',
    name: 'Open Library',
    label: 'Books',
    endpoint: 'https://openlibrary.org/search.json?title=the+hobbit&limit=5',
    shot: 'launch/social/library.png',
    summary: 'A search result becomes a table of books.',
    about: [
      'Open Library’s search endpoint returns how many books match “the hobbit” and the first five as an array of records, each with a title, authors, first publish year, edition count, languages and ebook access.',
      'Imago turns that array into a table, choosing the columns by what tells one book from another, and keeps the number of matches beside it.'
    ]
  },
  {
    slug: 'frankfurter',
    name: 'Frankfurter',
    label: 'Exchange rates',
    endpoint: 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,INR',
    shot: 'gallery/shots/frankfurter.png',
    summary: 'The day’s exchange rates, as a headline and a short list.',
    about: [
      'Frankfurter returns the latest reference exchange rates published by the European Central Bank: the amount, the base currency, the date the rates were set, and a rates object keyed by currency code.',
      'With US dollars as the base and euros and rupees as the symbols, Imago shows the amount as the headline, the base and the date as facts, and the rates as a short list.'
    ]
  },
  {
    slug: 'wikipedia',
    name: 'Wikipedia',
    label: 'Encyclopedia',
    endpoint: 'https://en.wikipedia.org/api/rest_v1/page/summary/Chennai',
    shot: 'gallery/shots/wikipedia.png',
    summary: 'An article summary: thumbnail, description, opening paragraph.',
    about: [
      'Wikipedia’s REST summary endpoint returns the lead of an article in a compact form: the title, a one-line description, the opening paragraph as plain text, a thumbnail, coordinates, the last-edited time and links to the full page.',
      'For Chennai, Imago puts the thumbnail beside the facts, reads the timestamp as a time and date, and sets the description and opening paragraph as text you can read.'
    ]
  },
  {
    slug: 'iss',
    name: 'Where the ISS at?',
    title: 'The ISS position API',
    label: 'Space station',
    endpoint: 'https://api.wheretheiss.at/v1/satellites/25544',
    shot: 'launch/social/watch.png',
    summary: 'The space station’s position right now, and how it changes.',
    about: [
      'Where the ISS at? returns the International Space Station’s position at this moment: latitude and longitude, altitude and velocity in kilometres, the footprint it can see, whether it is in daylight, and a Unix timestamp.',
      'Imago leads with velocity and footprint, reads the timestamp as a clock time and the coordinates as degrees. Open it in Imago and turn on Watch to see which values change on every fetch.'
    ]
  }
];

export const APP_URL = APP + '/app/';   // the app itself; APP alone is its landing page
export const openLink = (endpoint) => APP_URL + '#open=' + endpoint;

const FREE_NOTE = 'Imago is free and open source. Bring your own free Gemini or Groq key, or use none.';

const REELS = [
  { name: 'stop-reading-json', title: 'Stop reading raw JSON', note: 'Paste a URL; the JSON becomes a page on the beat.' },
  { name: 'paste-curl', title: 'Copied as cURL? Paste it', note: 'Headers and Basic auth come along; straight to a page.' },
  { name: 'watch-live', title: 'This number is moving', note: 'Watch re-fetches and marks exactly what changed.' },
  { name: 'free-and-why', title: 'An AI tool that wants nothing', note: 'No account, no key needed, your key stays in your browser.' }
];

/* ── Helpers ────────────────────────────────────────────────────────── */

export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function exists(file) { try { return fs.statSync(file).isFile(); } catch (e) { return false; } }
function copy(from, to) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
function write(file, text) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
function hostOf(url) { return new URL(url).hostname.replace(/^www\./, ''); }
function sizeOf(file) {
  const b = fs.statSync(file).size;
  return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
}

export function readLinks(file) {
  const raw = exists(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  return {
    discussions: (raw && typeof raw.discussions === 'object' && raw.discussions) || {},
    discussionsHome: (raw && raw.discussionsHome) || '',
    waitlist: (raw && raw.waitlist) || ''
  };
}

// A link whose URL is empty is left out entirely, not rendered dead.
function optionalLink(href, text, cls) {
  if (typeof href !== 'string' || !href.trim()) return '';
  return '<a class="' + cls + '" href="' + esc(href.trim()) + '">' + esc(text) + '</a>';
}

// The captions for the press kit's post images are the X versions in
// launch/social-posts.md; the first day that uses an image names it.
export function readCaptions(markdown) {
  const captions = {};
  for (const block of markdown.split(/^### /m).slice(1)) {
    const media = block.match(/\*\*Media:\*\*\s*`social\/([\w-]+\.png)`/);
    const x = block.match(/\*\*X\*\*\s*\n((?:>.*\n?)+)/);
    if (!media || !x || captions[media[1]]) continue;
    captions[media[1]] = x[1].split('\n').map((l) => l.replace(/^>\s?/, '')).join('\n').trim();
  }
  return captions;
}

/* ── The renderer bundle ────────────────────────────────────────────────
   render-entry.js imports spec.js and render.js from ../js/. Their imports
   reach, through the app's module cycle, main.js, which boots the whole app
   (DOM caching, storage, event wiring) the moment it loads. The renderer
   needs none of that, so these modules are swapped for stubs that export
   every name the real module does, as an inert function. js/ is untouched. */
const STUBBED = new Set(['main', 'request', 'edits', 'storage', 'ui', 'chat', 'panes', 'llm']);
const JS_DIR = path.join(ROOT, 'js') + path.sep;

export function stubSource(source) {
  const list = source.match(/^export \{([^}]*)\};?\s*$/m);
  if (!list) throw new Error('stubbed module has no export list');
  return list[1].split(',').map((n) => n.trim()).filter(Boolean)
    .map((n) => 'export var ' + n + ' = function () {};').join('\n') + '\n';
}

async function bundleRenderer(outfile) {
  await esbuild.build({
    entryPoints: [path.join(HERE, 'render-entry.js')],
    bundle: true, format: 'iife', minify: true, outfile, logLevel: 'error', legalComments: 'none',
    banner: { js: '/* Imago renderer (MIT) — ' + REPO + ' */' },
    plugins: [{
      name: 'imago-stubs',
      setup(b) {
        b.onResolve({ filter: /^\.\/[\w-]+\.js$/ }, (args) => {
          const name = path.basename(args.path, '.js');
          if (args.importer.startsWith(JS_DIR) && STUBBED.has(name)) return { path: path.join(ROOT, 'js', name + '.js'), namespace: 'imago-stub' };
          return undefined;
        });
        b.onLoad({ filter: /.*/, namespace: 'imago-stub' }, (args) => ({ contents: stubSource(fs.readFileSync(args.path, 'utf8')), loader: 'js' }));
      }
    }]
  });
}

/* ── Page chrome ────────────────────────────────────────────────────── */

const MARK_PATHS = read('assets/imago-mark.svg').match(/<g fill="currentColor">([\s\S]*?)<\/g>/)[1].trim();
const mark = (size) => '<svg class="g-mark" width="' + size + '" height="' + size + '" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><g fill="currentColor">' + MARK_PATHS + '</g></svg>';

function head(page) {
  const url = SITE + page.path;
  return '<!doctype html>\n<html lang="en">\n<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + esc(page.title) + '</title>\n' +
    '<meta name="description" content="' + esc(page.description) + '">\n' +
    '<link rel="canonical" href="' + esc(url) + '">\n' +
    '<meta name="referrer" content="strict-origin-when-cross-origin">\n' +
    '<meta name="theme-color" content="#f6f5f1">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:site_name" content="Imago">\n' +
    '<meta property="og:title" content="' + esc(page.ogTitle || page.title) + '">\n' +
    '<meta property="og:description" content="' + esc(page.description) + '">\n' +
    '<meta property="og:url" content="' + esc(url) + '">\n' +
    '<meta property="og:image" content="' + esc(SITE + page.image) + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n' +
    '<link rel="stylesheet" href="/styles.css">\n' +
    '<link rel="stylesheet" href="/assets/gallery/gallery.css">\n' +
    '<!-- PAGESENSE -->\n' +
    '</head>\n';
}

function top(current) {
  const nav = [['/apis/', 'API gallery', 'home'], ['/press/', 'Press kit', 'press']]
    .map(([href, text, key]) => '<a href="' + href + '"' + (key === current ? ' aria-current="page"' : '') + '>' + text + '</a>').join('');
  return '<header class="g-top"><div class="g-wrap g-top-in">' +
    '<a class="g-brand" href="' + APP + '/" aria-label="Imago home">' + mark(24) + '<span>Imago</span></a>' +
    '<nav class="g-nav" aria-label="Site">' + nav +
    '<a class="btn btn-dark btn-sm g-nav-app" href="' + APP_URL + '">Open Imago</a></nav>' +
    '</div></header>\n';
}

function foot(links) {
  return '<footer class="g-foot"><div class="g-wrap g-foot-in">' +
    '<p class="g-foot-line">' + mark(18) + '<span><strong>Imago</strong>. APIs become interfaces.</span></p>' +
    '<p class="g-foot-links"><a href="' + APP_URL + '">The app</a><a href="' + REPO + '">Source on GitHub</a>' +
    '<a href="/press/">Press kit</a>' + optionalLink(links.discussionsHome, 'Discussions', 'g-foot-opt') + '</p>' +
    '<p class="g-foot-note">' + esc(FREE_NOTE) + ' MIT licensed. API responses belong to their providers and are fetched by your browser, not stored here.</p>' +
    '</div></footer>\n';
}

function page(meta, current, body, links, scripts) {
  return head(meta) + '<body class="g-body">\n<a class="g-skip" href="#main">Skip to content</a>\n' + top(current) +
    '<main id="main">\n' + body + '</main>\n' + foot(links) +
    (scripts || []).map((s) => '<script src="' + s + '" defer></script>\n').join('') + '</body>\n</html>\n';
}

function reelBlock(reel, cls) {
  if (!reel) return '';
  return '<figure class="g-reel ' + (cls || '') + '"><video src="' + reel.src + '"' + (reel.poster ? ' poster="' + reel.poster + '"' : '') +
    ' muted controls playsinline preload="metadata"></video>' +
    '<figcaption>' + esc(reel.title) + '. ' + esc(reel.note) + '</figcaption></figure>';
}

/* ── Pages ──────────────────────────────────────────────────────────── */

function apiTitle(api) { return (api.title || api.name) + ', drawn as an interface'; }

function apiPage(api, links) {
  const others = APIS.filter((a) => a.slug !== api.slug);
  const credit = api.credit
    ? '<p class="g-credit"><a href="' + esc(api.credit.href) + '">' + esc(api.credit.text) + '</a> <span>(' + esc(api.credit.licence) + ')</span></p>'
    : '';
  const secondary = [
    optionalLink(links.discussions[api.slug], 'Discuss this API', 'g-link'),
    optionalLink(links.waitlist, 'No key? Join the hosted-AI waitlist', 'g-link')
  ].filter(Boolean).join('');
  const body =
    '<article class="g-wrap g-api">\n' +
    '<nav class="g-crumbs" aria-label="Breadcrumb"><a href="/apis/">API gallery</a><span aria-hidden="true">/</span><span>' + esc(api.name) + '</span></nav>\n' +
    '<header class="g-hero">\n<h1>' + esc(apiTitle(api)) + '</h1>\n' +
    api.about.map((p) => '<p class="g-lede">' + esc(p) + '</p>').join('\n') + '\n' +
    '<p class="g-endpoint"><span class="method-chip">GET</span><code>' + esc(api.endpoint) + '</code></p>\n' +
    '<div class="g-actions"><a class="btn btn-dark btn-lg g-open" href="' + esc(openLink(api.endpoint)) + '">Open it in Imago</a>' + secondary + '</div>\n' +
    '</header>\n' +
    '<section class="g-live" data-live data-endpoint="' + esc(api.endpoint) + '" aria-label="The live response, drawn by Imago" aria-busy="false">\n' +
    '<div class="g-live-head"><p class="g-live-status" data-live-status role="status">A saved screenshot. The live response is drawn here when scripts run.</p>' + credit + '</div>\n' +
    '<div class="canvas g-canvas" data-live-out>' +
    '<img class="g-shot" src="/apis/' + api.slug + '/shot.png" width="1200" height="675" alt="' + esc(api.name + ' response drawn by Imago: ' + api.summary) + '">' +
    '</div>\n</section>\n' +
    '<section class="g-section g-free"><h2>Free, with or without a key</h2><p>' + esc(FREE_NOTE) +
    ' With no key you get the page above, drawn by rules that know no particular API. A key gets you a designed layout. It stays in your browser and goes only to the provider you chose.</p></section>\n' +
    '<section class="g-section"><h2>More APIs, drawn</h2><ul class="g-mini">' +
    others.map((a) => '<li><a href="/apis/' + a.slug + '/"><span class="g-mini-name">' + esc(a.name) + '</span><span class="g-mini-host">' + esc(hostOf(a.endpoint)) + '</span></a></li>').join('') +
    '</ul></section>\n</article>\n';
  return page({
    path: '/apis/' + api.slug + '/',
    title: api.name + ' example response, drawn as an interface · Imago',
    ogTitle: apiTitle(api),
    description: api.name + ' example response from ' + hostOf(api.endpoint) + ', fetched live and drawn as a readable interface by Imago. ' + api.summary,
    image: '/apis/' + api.slug + '/shot.png'
  }, null, body, links, ['/assets/gallery/render.js']);
}

function homePage(links) {
  const cards = APIS.map((a) =>
    '<li class="g-card"><a href="/apis/' + a.slug + '/">' +
    '<span class="g-card-shot"><img src="/apis/' + a.slug + '/shot.png" width="1200" height="675" loading="lazy" alt=""></span>' +
    '<span class="g-card-body"><span class="g-card-label">' + esc(a.label) + '</span>' +
    '<span class="g-card-name">' + esc(a.name) + '</span>' +
    '<span class="g-card-text">' + esc(a.summary) + '</span>' +
    '<span class="g-card-host">' + esc(hostOf(a.endpoint)) + '</span></span></a></li>').join('\n');
  const body =
    '<div class="g-wrap">\n<header class="g-hero g-hero-home">\n<h1>Public APIs, drawn as interfaces</h1>\n' +
    '<p class="g-lede">Meeting a new API usually means reading a wall of JSON. Each page here fetches one public API live, in your browser, and draws the response the way Imago does: the values that matter up top, a fact sheet under them, tables and charts for the rest.</p>\n' +
    '<p class="g-lede">Every page links straight into Imago with that endpoint loaded, so you can keep going with your own.</p>\n' +
    '<div class="g-actions"><a class="btn btn-dark btn-lg" href="' + APP_URL + '">Open Imago</a>' +
    optionalLink(links.waitlist, 'No key? Join the hosted-AI waitlist', 'g-link') + '</div>\n' +
    '</header>\n' +
    '<section class="g-section g-first" aria-labelledby="apis"><h2 id="apis">The gallery</h2><ul class="g-cards">\n' + cards + '\n</ul></section>\n' +
    '<section class="g-section g-split">\n<div><h2>How the drawing works</h2><p>Imago reads the shape of a response, not its field names. Numbers are paired with their units, three or more timestamps become a timeline, arrays of records become tables, and bookkeeping sinks into Details. Every value is written as text, so nothing from an API is ever treated as markup.</p></div>\n' +
    '<div><h2>Run an API?</h2><p>Put an “Open in Imago” button in your docs: link to <code>' + esc(APP_URL) + '#open=</code> followed by your endpoint. No sign-up and no script on your site. The badge is in the <a href="/press/">press kit</a>.</p></div>\n' +
    '</section>\n' +
    '<section class="g-section g-free"><h2>Free</h2><p>' + esc(FREE_NOTE) + '</p></section>\n</div>\n';
  return page({
    path: '/apis/',
    title: 'Public API example responses, drawn as interfaces · Imago',
    ogTitle: 'Public APIs, drawn as interfaces',
    description: 'Live example responses from PokeAPI, Open-Meteo, Open Library, Frankfurter, Wikipedia and the ISS position API, each drawn as a readable interface by Imago, a free, browser-only tool.',
    image: '/og.png'
  }, 'home', body, links);
}

function pressPage(links, reels, images, brand) {
  const reelList = reels.length
    ? '<ul class="g-press-grid">' + reels.map((r) => '<li>' + reelBlock(r, 'g-reel-tile') +
        '<p class="g-dl"><a href="' + r.src + '" download>Download MP4</a> <span>' + r.size + '</span></p></li>').join('') + '</ul>'
    : '';
  const imageList = '<ul class="g-press-grid">' + images.map((img) =>
    '<li class="g-post"><img src="' + img.src + '" loading="lazy" alt="' + esc(img.alt) + '">' +
    '<p class="g-dl"><a href="' + img.src + '" download>Download PNG</a> <span>' + img.size + '</span></p>' +
    (img.caption
      ? '<div class="g-caption"><pre id="cap-' + img.id + '">' + esc(img.caption) + '</pre>' +
        '<button class="btn btn-ghost btn-xs" type="button" data-copy="cap-' + img.id + '">Copy caption</button></div>'
      : '') + '</li>').join('') + '</ul>';
  const brandList = '<ul class="g-brand-grid">' + brand.map((b) =>
    '<li><span class="g-brand-tile' + (b.dark ? ' is-dark' : '') + '"><img src="' + b.src + '" alt="' + esc(b.name) + '" loading="lazy"></span>' +
    '<span class="g-brand-name">' + esc(b.name) + '</span><a href="' + b.src + '" download>SVG</a></li>').join('') + '</ul>';
  const body =
    '<div class="g-wrap">\n<header class="g-hero">\n<h1>Press and share kit</h1>\n' +
    '<p class="g-lede">Imago turns an API response into an interface. Paste a public API URL and it fetches the JSON in your browser and draws it as a page: the values that matter up top, a fact sheet under them, and tables and charts for the rest. It is free and open source, runs entirely in the browser with no account and no server, and works with no key; add a free Gemini or Groq key for a designed layout. Everything here is free to use when you write about or share Imago.</p>\n' +
    '<div class="g-actions"><a class="btn btn-dark btn-lg" href="' + APP_URL + '">Open Imago</a><a class="btn btn-ghost btn-lg" href="' + REPO + '">Source on GitHub</a></div>\n' +
    '</header>\n' +
    '<section class="g-section g-first"><h2>Fact sheet</h2><dl class="g-facts">' +
    [['What', 'A browser tool that draws an API’s JSON response as an interface.'],
      ['Price', 'Free. No account, no sign-up.'],
      ['Licence', 'MIT, open source.'],
      ['Where it runs', 'Entirely in the browser. There is no Imago server: your browser calls the API, and the model provider you chose, directly.'],
      ['Models', 'Optional. Bring a free Gemini or Groq key, or use none.'],
      ['Who it is for', 'Developers meeting a public JSON API for the first time.'],
      ['App', '<a href="' + APP + '/">' + esc(APP.replace('https://', '')) + '</a>'],
      ['Source', '<a href="' + REPO + '">' + esc(REPO.replace('https://', '')) + '</a>']]
      .map(([k, v]) => '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>').join('') + '</dl></section>\n' +
    (reelList ? '<section class="g-section"><h2>Reels</h2>' + reelList + '</section>\n' : '') +
    '<section class="g-section"><h2>Post images</h2><p class="g-muted">Captured from the live app. Captions are the X versions from the launch posts; posts showing the forecast credit Open-Meteo.com (CC BY 4.0).</p>' + imageList + '</section>\n' +
    '<section class="g-section"><h2>Brand assets</h2><p class="g-muted">The Reveal mark: two response fields merging into one window. Ink and paper only. Amigo is the mascot.</p>' + brandList + '</section>\n' +
    '</div>\n';
  return page({
    path: '/press/',
    title: 'Press and share kit · Imago',
    description: 'Imago press kit: a description, fact sheet, reels, post images with captions, and logo and mascot files for anyone writing about or sharing Imago.',
    image: '/og.png'
  }, 'press', body, links, ['/assets/gallery/copy.js']);
}

function waitlistPage(links) {
  const radio = (name, value, label, required) => '<label class="g-choice"><input type="radio" name="' + name + '" value="' + value + '"' + (required ? ' required' : '') + '><span>' + esc(label) + '</span></label>';
  const body =
    '<div class="g-wrap">\n<header class="g-hero">\n<h1>Hosted AI: waitlist</h1>\n' +
    '<p class="g-lede">Imago is free with your own free Gemini or Groq key, or with none. Hosted AI would be for people with no key: Imago would run the model for you. That needs a server and costs money on every call, so it would be paid. <strong>It is not built yet, and nobody pays anything now.</strong> Tell us whether you would use it and what it is worth to you, and we will email you once, if it opens.</p>\n' +
    '</header>\n' +
    '<form class="g-form" id="waitlistForm" data-endpoint="' + esc(WAITLIST_FN) + '" novalidate>\n' +
    '<label class="g-field"><span>Email</span><input class="text-input" type="email" name="email" required autocomplete="email" maxlength="254"></label>\n' +
    '<label class="g-field"><span>What would you use Imago for? <em>Optional</em></span><input class="text-input" type="text" name="use_case" maxlength="255"></label>\n' +
    '<fieldset class="g-field"><legend>Do you already have a Gemini or Groq key?</legend><div class="g-choices">' +
      radio('has_key', 'yes', 'Yes') + radio('has_key', 'no', 'No') + radio('has_key', 'unsure', 'Not sure') + '</div></fieldset>\n' +
    '<fieldset class="g-field"><legend>Which monthly price would you pay for hosted AI (100 new layouts)?</legend><div class="g-choices">' +
      radio('price', '49', '₹49', true) + radio('price', '99', '₹99') + radio('price', '199', '₹199') + radio('price', 'free', 'I would only use the free version') + '</div></fieldset>\n' +
    '<label class="g-trap" aria-hidden="true">Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>\n' +
    '<label class="g-check"><input type="checkbox" name="consent" required><span>Email me if hosted AI opens.</span></label>\n' +
    '<div class="g-actions"><button class="btn btn-dark btn-lg" type="submit">Join the waitlist</button></div>\n' +
    '<p class="g-form-status" id="waitlistStatus" role="status" aria-live="polite"></p>\n' +
    '<p class="g-muted">We keep only what this form asks for, in Zoho Catalyst, and use it only to tell you if hosted AI opens. Imago itself still has no server: this list is the only thing stored.</p>\n' +
    '</form>\n</div>\n';
  return page({
    path: '/waitlist/',
    title: 'Hosted AI waitlist · Imago',
    description: 'Imago is free with your own key. Hosted AI would be paid and is not built yet: join the waitlist and say what it is worth to you.',
    image: '/og.png'
  }, 'waitlist', body, links, ['/assets/gallery/waitlist.js']);
}

/* ── Build ──────────────────────────────────────────────────────────── */

export function applyPagesense(html, snippet) {
  return html.replace('<!-- PAGESENSE -->\n', snippet ? snippet.trim() + '\n' : '').replace('<!-- PAGESENSE -->', snippet ? snippet.trim() : '');
}

export async function build(opts = {}) {
  const out = opts.out || path.join(HERE, 'dist');
  const links = readLinks(opts.links || path.join(HERE, 'links.json'));
  const pagesenseFile = opts.pagesense || path.join(ROOT, 'pagesense.html');
  const pagesense = exists(pagesenseFile) ? fs.readFileSync(pagesenseFile, 'utf8') : '';
  const reelsDir = opts.reels || path.join(ROOT, 'launch/press/reels');

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const files = [];
  const emit = (rel, html) => { write(path.join(out, rel), applyPagesense(html, pagesense)); files.push(rel); };

  // The pages use the app's own /styles.css, so the renderer's output looks
  // exactly as it does in the app; gallery.css only adds g-*.
  await bundleRenderer(path.join(out, 'assets/gallery/render.js'));
  copy(path.join(HERE, 'gallery.css'), path.join(out, 'assets/gallery/gallery.css'));
  copy(path.join(HERE, 'copy.js'), path.join(out, 'assets/gallery/copy.js'));
  copy(path.join(HERE, 'waitlist.js'), path.join(out, 'assets/gallery/waitlist.js'));

  // Reels live in the press kit only. Each exists once it has been produced.
  const reels = {};
  for (const r of REELS) {
    const mp4 = path.join(reelsDir, r.name + '.mp4');
    if (!exists(mp4)) continue;
    copy(mp4, path.join(out, 'press/reels', r.name + '.mp4'));
    const png = path.join(reelsDir, r.name + '.png');
    const poster = exists(png) ? '/press/reels/' + r.name + '.png' : '';
    if (poster) copy(png, path.join(out, 'press/reels', r.name + '.png'));
    reels[r.name] = { ...r, src: '/press/reels/' + r.name + '.mp4', poster, size: sizeOf(mp4) };
  }

  for (const api of APIS) {
    copy(path.join(ROOT, api.shot), path.join(out, 'apis', api.slug, 'shot.png'));
    emit('apis/' + api.slug + '/index.html', apiPage(api, links));
  }
  emit('apis/index.html', homePage(links));

  // Press kit
  const captions = readCaptions(read('launch/social-posts.md'));
  const images = fs.readdirSync(path.join(ROOT, 'launch/social')).filter((f) => f.endsWith('.png')).sort().map((f) => {
    copy(path.join(ROOT, 'launch/social', f), path.join(out, 'press/images', f));
    const id = f.replace(/\.png$/, '');
    return { id, src: '/press/images/' + f, size: sizeOf(path.join(ROOT, 'launch/social', f)), caption: captions[f] || '', alt: 'Imago post image: ' + id };
  });
  const brandFiles = [
    ...fs.readdirSync(path.join(ROOT, 'brand/kit/exports')).filter((f) => /^imago-task1-logo_.*\.svg$/.test(f)).sort().map((f) => ['brand/kit/exports/' + f, f.replace(/^imago-task1-logo_|\.svg$/g, '')]),
    ...fs.readdirSync(path.join(ROOT, 'brand/kit/exports')).filter((f) => /^imago-mascot_.*\.svg$/.test(f)).sort().map((f) => ['brand/kit/exports/' + f, f.replace(/^imago-mascot_|\.svg$/g, '')]),
    ['assets/open-in-imago.svg', 'Open-in-Imago badge']
  ];
  const brand = brandFiles.map(([rel, name]) => {
    const file = path.basename(rel);
    copy(path.join(ROOT, rel), path.join(out, 'press/brand', file));
    const words = name.replace(/-/g, ' ');
    return { src: '/press/brand/' + file, name: words.charAt(0).toUpperCase() + words.slice(1), dark: /reversed/.test(name) };
  });
  emit('waitlist/index.html', waitlistPage(links));
  emit('press/index.html', pressPage(links, REELS.map((r) => reels[r.name]).filter(Boolean), images, brand));

  // Crawlers, for the whole site: the app and everything above.
  const urls = ['/', '/apis/', ...APIS.map((a) => '/apis/' + a.slug + '/'), '/press/', '/waitlist/'];
  write(path.join(out, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => '  <url><loc>' + esc(SITE + u) + '</loc></url>').join('\n') + '\n</urlset>\n');
  write(path.join(out, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n');

  return { out, pages: files, reels: Object.keys(reels), pagesense: Boolean(pagesense) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  build().then((r) => {
    console.log('gallery/dist ready: ' + r.pages.length + ' pages' +
      (r.reels.length ? ', reels: ' + r.reels.join(', ') : ', no reels yet') +
      (r.pagesense ? ', PageSense in' : ', no PageSense snippet'));
  }, (err) => { console.error(err); process.exit(1); });
}
