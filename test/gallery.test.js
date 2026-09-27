/* The API gallery, press kit and waitlist (gallery/): static pages served on
   imago.onslate.in beside the app. These tests run the real build into temp
   directories and read what it wrote. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, APIS, APP, SITE, WAITLIST_FN, readCaptions, stubSource } from '../gallery/build.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'imago-gallery-'));
const PLAIN = path.join(tmp, 'plain');     // links.json all empty, no PageSense, no reels
const FILLED = path.join(tmp, 'filled');   // links filled, PageSense snippet, two reels
const SNIPPET = '<script src="https://cdn.pagesense.example/abc.js"></script>';

const read = (out, rel) => fs.readFileSync(path.join(out, rel), 'utf8');
const doc = (out, rel) => new JSDOM(read(out, rel)).window.document;
const apiFile = (slug) => 'apis/' + slug + '/index.html';
const htmlFiles = () => ['apis/index.html', 'press/index.html', 'waitlist/index.html', ...APIS.map((a) => apiFile(a.slug))];

beforeAll(async () => {
  const emptyLinks = path.join(tmp, 'links-empty.json');
  fs.writeFileSync(emptyLinks, JSON.stringify({ discussions: { pokeapi: '', iss: '' }, discussionsHome: '', waitlist: '' }));
  await build({ out: PLAIN, links: emptyLinks, pagesense: path.join(tmp, 'no-such-pagesense.html'), reels: path.join(tmp, 'no-reels') });

  const links = path.join(tmp, 'links-filled.json');
  fs.writeFileSync(links, JSON.stringify({
    discussions: { pokeapi: 'https://github.com/Sibhimanyu/imago/discussions/7', iss: '' },
    discussionsHome: 'https://github.com/Sibhimanyu/imago/discussions',
    waitlist: 'https://forms.example/waitlist'
  }));
  const pagesense = path.join(tmp, 'pagesense.html');
  fs.writeFileSync(pagesense, SNIPPET + '\n');
  const reels = path.join(tmp, 'reels');
  fs.mkdirSync(reels);
  fs.writeFileSync(path.join(reels, 'stop-reading-json.mp4'), 'mp4');
  fs.writeFileSync(path.join(reels, 'stop-reading-json.png'), 'png');
  fs.writeFileSync(path.join(reels, 'watch-live.mp4'), 'mp4');   // no poster
  await build({ out: FILLED, links, pagesense, reels });
}, 60000);

afterAll(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

describe('gallery pages', () => {
  it('writes a page for every API with its h1', () => {
    expect(APIS.map((a) => a.slug)).toEqual(['pokeapi', 'open-meteo', 'open-library', 'frankfurter', 'wikipedia', 'iss']);
    for (const api of APIS) {
      const d = doc(PLAIN, apiFile(api.slug));
      expect(d.querySelector('h1').textContent).toBe((api.title || api.name) + ', drawn as an interface');
    }
    expect(doc(PLAIN, apiFile('pokeapi')).querySelector('h1').textContent).toBe('PokeAPI, drawn as an interface');
  });

  it('carries its copy, endpoint, title, description, canonical and Open Graph in the static HTML', () => {
    for (const api of APIS) {
      const d = doc(PLAIN, apiFile(api.slug));
      expect(d.querySelectorAll('.g-lede').length).toBeGreaterThanOrEqual(2);
      expect(d.querySelector('.g-endpoint code').textContent).toBe(api.endpoint);
      expect(d.title).toContain(api.name);
      expect(d.querySelector('meta[name="description"]').content).toContain('example response');
      expect(d.querySelector('link[rel="canonical"]').href).toBe('https://imago.onslate.in/apis/' + api.slug + '/');
      expect(d.querySelector('meta[property="og:url"]').content).toBe(SITE + '/apis/' + api.slug + '/');
      expect(d.querySelector('meta[property="og:image"]').content).toBe(SITE + '/apis/' + api.slug + '/shot.png');
      expect(fs.existsSync(path.join(PLAIN, 'apis', api.slug, 'shot.png'))).toBe(true);
      expect(d.querySelector('.g-shot').getAttribute('src')).toBe('/apis/' + api.slug + '/shot.png');
      expect(d.querySelector('[data-live]').getAttribute('data-endpoint')).toBe(api.endpoint);
    }
  });

  it('links "Open it in Imago" to the exact #open= link', () => {
    for (const api of APIS) {
      const open = [...doc(PLAIN, apiFile(api.slug)).querySelectorAll('a')].filter((a) => a.textContent === 'Open it in Imago');
      expect(open).toHaveLength(1);
      expect(open[0].getAttribute('href')).toBe(APP + '/#open=' + api.endpoint);
    }
    expect(doc(PLAIN, apiFile('open-meteo')).querySelector('.g-open').getAttribute('href'))
      .toBe('https://imago.onslate.in/#open=https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1');
  });

  it('credits Open-Meteo beside the rendered data, and only there', () => {
    const credit = doc(PLAIN, apiFile('open-meteo')).querySelector('.g-live .g-credit a');
    expect(credit.textContent).toBe('Weather data by Open-Meteo.com');
    expect(credit.getAttribute('href')).toBe('https://open-meteo.com/');
    expect(doc(PLAIN, apiFile('pokeapi')).querySelector('.g-credit')).toBeNull();
  });

  it('carries the Free note on every API page', () => {
    for (const api of APIS) {
      expect(doc(PLAIN, apiFile(api.slug)).querySelector('.g-free').textContent)
        .toContain('Imago is free and open source. Bring your own free Gemini or Groq key, or use none.');
    }
  });
});

describe('links.json', () => {
  const linkTexts = (d) => [...d.querySelectorAll('a')].map((a) => a.textContent);

  it('an empty value produces no link at all', () => {
    for (const rel of htmlFiles().filter((f) => !f.startsWith('waitlist/'))) {
      const html = read(PLAIN, rel);
      expect(html).not.toContain('Discuss this API');
      expect(html).not.toContain('waitlist');
      expect(linkTexts(doc(PLAIN, rel))).not.toContain('Discussions');
      expect(html).not.toMatch(/href=""/);
    }
  });

  it('a filled value produces the link, and only where it is filled', () => {
    const poke = doc(FILLED, apiFile('pokeapi'));
    const discuss = [...poke.querySelectorAll('a')].find((a) => a.textContent === 'Discuss this API');
    expect(discuss.getAttribute('href')).toBe('https://github.com/Sibhimanyu/imago/discussions/7');
    const waitlist = [...poke.querySelectorAll('a')].find((a) => a.textContent === 'No key? Join the hosted-AI waitlist');
    expect(waitlist.getAttribute('href')).toBe('https://forms.example/waitlist');
    expect([...poke.querySelectorAll('a')].find((a) => a.textContent === 'Discussions').getAttribute('href'))
      .toBe('https://github.com/Sibhimanyu/imago/discussions');
    // iss's discussion URL is still empty: no Discuss link there, the waitlist still shows.
    const iss = linkTexts(doc(FILLED, apiFile('iss')));
    expect(iss).not.toContain('Discuss this API');
    expect(iss).toContain('No key? Join the hosted-AI waitlist');
  });

  it('the checked-in links.json has every key, empty for now', () => {
    const links = JSON.parse(fs.readFileSync(new URL('../gallery/links.json', import.meta.url), 'utf8'));
    expect(Object.keys(links).sort()).toEqual(['discussions', 'discussionsHome', 'waitlist']);
    expect(typeof links.discussions).toBe('object');
  });
});

describe('the PageSense slot', () => {
  it('is replaced by pagesense.html inside <head> when it exists', () => {
    for (const rel of htmlFiles()) {
      const html = read(FILLED, rel);
      expect(html).not.toContain('<!-- PAGESENSE -->');
      const head = html.slice(0, html.indexOf('</head>'));
      expect(head).toContain(SNIPPET);
      expect(html.split(SNIPPET).length - 1).toBe(1);
    }
  });

  it('leaves nothing behind when there is no snippet', () => {
    for (const rel of htmlFiles()) {
      const html = read(PLAIN, rel);
      expect(html).not.toContain('PAGESENSE');
      expect(html).not.toContain('pagesense');
      expect(new JSDOM(html).window.document.querySelectorAll('script').length).toBeLessThanOrEqual(1);
    }
  });
});

describe('one site with the app', () => {
  // The pages are served from imago.onslate.in beside the app, so they use the
  // app's own stylesheet and icons and load nothing else from anywhere but
  // /assets/gallery/ and PageSense.
  it('loads only its own scripts, the app stylesheet and gallery.css', () => {
    for (const out of [PLAIN, FILLED]) {
      for (const rel of htmlFiles()) {
        const d = doc(out, rel);
        for (const s of d.querySelectorAll('script')) {
          const src = s.getAttribute('src');
          if (src !== 'https://cdn.pagesense.example/abc.js') expect(src, rel).toMatch(/^\/assets\/gallery\/[\w-]+\.js$/);
          expect(s.textContent).toBe('');
        }
        expect([...d.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href'))).toEqual(['/styles.css', '/assets/gallery/gallery.css']);
        expect(d.querySelector('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');
      }
    }
  });

  it('writes nothing the app already serves', () => {
    const appFiles = ['index.html', 'styles.css', 'og.png', 'favicon.svg', ...fs.readdirSync(new URL('../assets/', import.meta.url)).map((f) => 'assets/' + f)];
    for (const f of appFiles) expect(fs.existsSync(path.join(FILLED, f)), f).toBe(false);
    expect(fs.existsSync(path.join(FILLED, '.catalyst'))).toBe(false);
    expect(fs.readdirSync(FILLED).sort()).toEqual(['apis', 'assets', 'press', 'robots.txt', 'sitemap.xml', 'waitlist']);
  });
});

describe('the live panel', () => {
  const page = () => read(PLAIN, apiFile('pokeapi'));
  const bundle = () => read(PLAIN, 'assets/gallery/render.js');
  const settle = () => new Promise((r) => setTimeout(r, 20));

  function run(fetch) {
    const dom = new JSDOM(page(), { url: SITE + '/apis/pokeapi/', runScripts: 'outside-only', pretendToBeVisual: true });
    dom.window.fetch = fetch;
    dom.window.eval(bundle());
    return dom.window;
  }

  it('fetches the endpoint and draws it with the renderer, without booting the app', async () => {
    const calls = [];
    const win = run((url) => { calls.push(url); return Promise.resolve({ ok: true, json: () => Promise.resolve({ name: 'pikachu', height: 4, weight: 60 }) }); });
    await settle();
    expect(calls).toEqual(['https://pokeapi.co/api/v2/pokemon/pikachu']);
    const d = win.document;
    expect(d.querySelector('[data-live-out] .stage-title').textContent).toBe('Pikachu');
    expect(d.querySelector('[data-live-out] .spec-body')).not.toBeNull();
    expect(d.querySelector('.g-shot')).toBeNull();
    expect(d.querySelector('[data-live]').classList.contains('is-live')).toBe(true);
    expect(d.querySelector('[data-live]').getAttribute('aria-busy')).toBe('false');
    expect(d.querySelector('[data-live-status]').textContent).toMatch(/Fetched live just now/);
    expect(win.__imago).toBeUndefined();   // main.js never ran
  });

  it('keeps the screenshot and says so when the fetch fails', async () => {
    const win = run(() => Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) }));
    await settle();
    const d = win.document;
    expect(d.querySelector('.g-shot')).not.toBeNull();
    expect(d.querySelector('[data-live]').classList.contains('is-failed')).toBe(true);
    expect(d.querySelector('[data-live-status]').textContent).toBe('Could not reach pokeapi.co just now, so this is a saved screenshot. Open it in Imago to try again.');
  });

  it('stubs a module by exporting its names as inert functions', () => {
    const stub = stubSource('var a = 1;\nexport { init, toast, tick };\n');
    expect(stub).toBe('export var init = function () {};\nexport var toast = function () {};\nexport var tick = function () {};\n');
    expect(() => stubSource('var a = 1;')).toThrow(/export list/);
  });
});

describe('reels', () => {
  it('are in the press kit only, each once its MP4 exists at build time', () => {
    expect(read(PLAIN, 'press/index.html')).not.toContain('<video');
    for (const rel of htmlFiles().filter((f) => f !== 'press/index.html')) expect(read(FILLED, rel), rel).not.toContain('<video');
    const press = doc(FILLED, 'press/index.html');
    const videos = [...press.querySelectorAll('video')];
    expect(videos.map((v) => v.getAttribute('src'))).toEqual(['/press/reels/stop-reading-json.mp4', '/press/reels/watch-live.mp4']);
    expect(videos[0].getAttribute('poster')).toBe('/press/reels/stop-reading-json.png');
    expect(videos[1].hasAttribute('poster')).toBe(false);
    for (const attr of ['muted', 'controls', 'playsinline']) expect(videos[0].hasAttribute(attr)).toBe(true);
    expect(fs.existsSync(path.join(FILLED, 'press/reels/stop-reading-json.mp4'))).toBe(true);
    expect(press.querySelector('a[download][href="/press/reels/watch-live.mp4"]')).not.toBeNull();
  });
});

describe('press kit and site files', () => {
  it('offers every post image with a download link and its X caption', () => {
    const d = doc(PLAIN, 'press/index.html');
    const pngs = fs.readdirSync(new URL('../launch/social/', import.meta.url)).filter((f) => f.endsWith('.png'));
    for (const f of pngs) {
      expect(d.querySelector('a[download][href="/press/images/' + f + '"]'), f).not.toBeNull();
      expect(fs.existsSync(path.join(PLAIN, 'press/images', f))).toBe(true);
    }
    expect(d.getElementById('cap-pokemon').textContent).toMatch(/^PokeAPI's Pikachu, drawn by Imago/);
    expect(d.querySelector('[data-copy="cap-pokemon"]')).not.toBeNull();
    for (const f of ['imago-task1-logo_logo-primary.svg', 'imago-mascot_amigo.svg', 'open-in-imago.svg']) {
      expect(d.querySelector('a[download][href="/press/brand/' + f + '"]'), f).not.toBeNull();
    }
    expect([...d.querySelectorAll('a')].some((a) => a.getAttribute('href') === 'https://github.com/Sibhimanyu/imago')).toBe(true);
  });

  it('reads captions from the X version of the first day that uses an image', () => {
    const md = '### Day 1\n**Media:** `social/a.png`\n\n**LinkedIn**\n> long one\n\n**X**\n> short one\n>\n> line two\n\n---\n### Day 2\n**Media:** `social/a.png`\n\n**X**\n> later\n';
    expect(readCaptions(md)).toEqual({ 'a.png': 'short one\n\nline two' });
  });

  it('writes one sitemap and robots.txt for the whole site, the app included', () => {
    const sitemap = read(PLAIN, 'sitemap.xml');
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(['/', '/apis/', ...APIS.map((a) => '/apis/' + a.slug + '/'), '/press/', '/waitlist/'].map((u) => 'https://imago.onslate.in' + u));
    expect(read(PLAIN, 'robots.txt')).toBe('User-agent: *\nAllow: /\n\nSitemap: https://imago.onslate.in/sitemap.xml\n');
    const home = doc(PLAIN, 'apis/index.html');
    expect([...home.querySelectorAll('.g-card a')].map((a) => a.getAttribute('href'))).toEqual(APIS.map((a) => '/apis/' + a.slug + '/'));
    expect([...home.querySelectorAll('.g-nav a')].map((a) => a.getAttribute('href'))).toEqual(['/apis/', '/press/', APP + '/']);
  });
});

describe('the hosted-AI waitlist page', () => {
  it('posts to the Catalyst function, with a spam trap and consent, and says it is not built', () => {
    const d = doc(PLAIN, 'waitlist/index.html');
    const form = d.getElementById('waitlistForm');
    expect(form.getAttribute('data-endpoint')).toBe(WAITLIST_FN);
    expect(new URL(WAITLIST_FN).protocol).toBe('https:');
    expect(form.querySelector('input[name="website"][tabindex="-1"]')).not.toBeNull();
    expect(form.querySelector('input[name="consent"][required]')).not.toBeNull();
    expect([...form.querySelectorAll('input[name="price"]')].map((i) => i.value)).toEqual(['49', '99', '199', 'free']);
    expect(d.body.textContent).toMatch(/not built yet, and nobody pays anything now/);
    const scripts = [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    expect(scripts).toEqual(['/assets/gallery/waitlist.js']);
    expect(fs.existsSync(path.join(PLAIN, 'assets/gallery/waitlist.js'))).toBe(true);
    expect(read(PLAIN, 'sitemap.xml')).toContain(SITE + '/waitlist/');
  });
});
