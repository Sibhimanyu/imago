/* The API gallery (gallery/): a static marketing site, deployed on its own
   origin because it carries a third-party analytics script. These tests run
   the real build into temp directories and read what it wrote. */
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
const htmlFiles = (out) => ['index.html', 'press/index.html', ...APIS.map((a) => a.slug + '/index.html')];

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
  fs.writeFileSync(path.join(reels, 'paste-to-page.mp4'), 'mp4');
  fs.writeFileSync(path.join(reels, 'paste-to-page.png'), 'png');
  fs.writeFileSync(path.join(reels, 'watch-live.mp4'), 'mp4');   // no poster
  await build({ out: FILLED, links, pagesense, reels });
}, 60000);

afterAll(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

describe('gallery pages', () => {
  it('writes a page for every API with its h1', () => {
    expect(APIS.map((a) => a.slug)).toEqual(['pokeapi', 'open-meteo', 'open-library', 'frankfurter', 'wikipedia', 'iss']);
    for (const api of APIS) {
      const d = doc(PLAIN, api.slug + '/index.html');
      expect(d.querySelector('h1').textContent).toBe((api.title || api.name) + ', drawn as an interface');
    }
    expect(doc(PLAIN, 'pokeapi/index.html').querySelector('h1').textContent).toBe('PokeAPI, drawn as an interface');
  });

  it('carries its copy, endpoint, title, description, canonical and Open Graph in the static HTML', () => {
    for (const api of APIS) {
      const d = doc(PLAIN, api.slug + '/index.html');
      expect(d.querySelectorAll('.g-lede').length).toBeGreaterThanOrEqual(2);
      expect(d.querySelector('.g-endpoint code').textContent).toBe(api.endpoint);
      expect(d.title).toContain(api.name);
      expect(d.querySelector('meta[name="description"]').content).toContain('example response');
      expect(d.querySelector('link[rel="canonical"]').href).toBe(SITE + '/' + api.slug + '/');
      expect(d.querySelector('meta[property="og:url"]').content).toBe(SITE + '/' + api.slug + '/');
      expect(d.querySelector('meta[property="og:image"]').content).toBe(SITE + '/' + api.slug + '/shot.png');
      expect(fs.existsSync(path.join(PLAIN, api.slug, 'shot.png'))).toBe(true);
      expect(d.querySelector('.g-shot').getAttribute('src')).toBe('/' + api.slug + '/shot.png');
      expect(d.querySelector('[data-live]').getAttribute('data-endpoint')).toBe(api.endpoint);
    }
  });

  it('links "Open it in Imago" to the exact #open= link', () => {
    for (const api of APIS) {
      const open = [...doc(PLAIN, api.slug + '/index.html').querySelectorAll('a')].filter((a) => a.textContent === 'Open it in Imago');
      expect(open).toHaveLength(1);
      expect(open[0].getAttribute('href')).toBe(APP + '/#open=' + api.endpoint);
    }
    expect(doc(PLAIN, 'open-meteo/index.html').querySelector('.g-open').getAttribute('href'))
      .toBe('https://imago.onslate.in/#open=https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m&forecast_days=1');
  });

  it('credits Open-Meteo beside the rendered data, and only there', () => {
    const credit = doc(PLAIN, 'open-meteo/index.html').querySelector('.g-live .g-credit a');
    expect(credit.textContent).toBe('Weather data by Open-Meteo.com');
    expect(credit.getAttribute('href')).toBe('https://open-meteo.com/');
    expect(doc(PLAIN, 'pokeapi/index.html').querySelector('.g-credit')).toBeNull();
  });

  it('carries the Free note on every API page', () => {
    for (const api of APIS) {
      expect(doc(PLAIN, api.slug + '/index.html').querySelector('.g-free').textContent)
        .toContain('Imago is free and open source. Bring your own free Gemini or Groq key, or use none.');
    }
  });
});

describe('links.json', () => {
  const linkTexts = (d) => [...d.querySelectorAll('a')].map((a) => a.textContent);

  it('an empty value produces no link at all', () => {
    for (const rel of htmlFiles(PLAIN)) {
      const html = read(PLAIN, rel);
      expect(html).not.toContain('Discuss this API');
      expect(html).not.toContain('waitlist');
      expect(linkTexts(doc(PLAIN, rel))).not.toContain('Discussions');
      expect(html).not.toMatch(/href=""/);
    }
  });

  it('a filled value produces the link, and only where it is filled', () => {
    const poke = doc(FILLED, 'pokeapi/index.html');
    const discuss = [...poke.querySelectorAll('a')].find((a) => a.textContent === 'Discuss this API');
    expect(discuss.getAttribute('href')).toBe('https://github.com/Sibhimanyu/imago/discussions/7');
    const waitlist = [...poke.querySelectorAll('a')].find((a) => a.textContent === 'No key? Join the hosted-AI waitlist');
    expect(waitlist.getAttribute('href')).toBe('https://forms.example/waitlist');
    expect([...poke.querySelectorAll('a')].find((a) => a.textContent === 'Discussions').getAttribute('href'))
      .toBe('https://github.com/Sibhimanyu/imago/discussions');
    // iss's discussion URL is still empty: no Discuss link there, the waitlist still shows.
    const iss = linkTexts(doc(FILLED, 'iss/index.html'));
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
  it('is replaced by gallery/pagesense.html inside <head> when it exists', () => {
    for (const rel of htmlFiles(FILLED)) {
      const html = read(FILLED, rel);
      expect(html).not.toContain('<!-- PAGESENSE -->');
      const head = html.slice(0, html.indexOf('</head>'));
      expect(head).toContain(SNIPPET);
      expect(html.split(SNIPPET).length - 1).toBe(1);
    }
  });

  it('leaves nothing behind when there is no snippet', () => {
    for (const rel of htmlFiles(PLAIN)) {
      const html = read(PLAIN, rel);
      expect(html).not.toContain('PAGESENSE');
      expect(html).not.toContain('pagesense');
      expect(new JSDOM(html).window.document.querySelectorAll('script').length).toBeLessThanOrEqual(1);
    }
  });
});

describe('the Imago origin stays clean', () => {
  // Imago keeps model keys in localStorage on imago.onslate.in. The gallery
  // runs a third-party script, so it may only ever LINK there: no script,
  // stylesheet, image, frame or media is loaded from the app's origin.
  it('references imago.onslate.in only from <a href>', () => {
    for (const out of [PLAIN, FILLED]) {
      for (const rel of htmlFiles(out)) {
        const d = doc(out, rel);
        for (const node of d.querySelectorAll('*')) {
          for (const attr of node.attributes) {
            if (!attr.value.includes('imago.onslate.in')) continue;
            expect(node.tagName + '[' + attr.name + ']', rel).toBe('A[href]');
          }
        }
        for (const s of d.querySelectorAll('script')) {
          expect(s.textContent).not.toContain('imago.onslate.in');
          const src = s.getAttribute('src');
          if (src !== 'https://cdn.pagesense.example/abc.js') expect(src).toMatch(/^\/assets\/[\w-]+\.js$/);
        }
        for (const l of d.querySelectorAll('link[rel="stylesheet"]')) expect(l.getAttribute('href')).toMatch(/^\/assets\//);
      }
      for (const asset of ['assets/render.js', 'assets/copy.js', 'assets/gallery.css']) {
        expect(read(out, asset)).not.toContain('imago.onslate.in');
      }
    }
  });
});

describe('the live panel', () => {
  const page = () => read(PLAIN, 'pokeapi/index.html');
  const bundle = () => read(PLAIN, 'assets/render.js');
  const settle = () => new Promise((r) => setTimeout(r, 20));

  function run(fetch) {
    const dom = new JSDOM(page(), { url: SITE + '/pokeapi/', runScripts: 'outside-only', pretendToBeVisual: true });
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
  it('embeds a reel only when its MP4 exists at build time', () => {
    expect(read(PLAIN, 'pokeapi/index.html')).not.toContain('<video');
    expect(read(PLAIN, 'press/index.html')).not.toContain('<video');
    const video = doc(FILLED, 'pokeapi/index.html').querySelector('video');
    expect(video.getAttribute('src')).toBe('/reels/paste-to-page.mp4');
    expect(video.getAttribute('poster')).toBe('/reels/paste-to-page.png');
    for (const attr of ['muted', 'controls', 'playsinline']) expect(video.hasAttribute(attr)).toBe(true);
    expect(fs.existsSync(path.join(FILLED, 'reels/paste-to-page.mp4'))).toBe(true);
    const iss = doc(FILLED, 'iss/index.html').querySelector('video');
    expect(iss.getAttribute('src')).toBe('/reels/watch-live.mp4');
    expect(iss.hasAttribute('poster')).toBe(false);
    const press = doc(FILLED, 'press/index.html');
    expect([...press.querySelectorAll('video')].map((v) => v.getAttribute('src'))).toEqual(['/reels/paste-to-page.mp4', '/reels/watch-live.mp4']);
    expect(press.querySelector('a[download][href="/reels/watch-live.mp4"]')).not.toBeNull();
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

  it('writes the sitemap, robots.txt and the Slate config', () => {
    const sitemap = read(PLAIN, 'sitemap.xml');
    for (const u of ['/', '/press/', ...APIS.map((a) => '/' + a.slug + '/')]) expect(sitemap).toContain('<loc>' + SITE + u + '</loc>');
    expect(read(PLAIN, 'robots.txt')).toContain('Sitemap: ' + SITE + '/sitemap.xml');
    expect(read(PLAIN, '.catalyst/slate-config.toml')).toBe('framework = "static"\ndeployment_name = "default"\n');
    const home = doc(PLAIN, 'index.html');
    expect([...home.querySelectorAll('.g-card a')].map((a) => a.getAttribute('href'))).toEqual(APIS.map((a) => '/' + a.slug + '/'));
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
    expect(scripts).toEqual(['/assets/waitlist.js']);
    expect(fs.existsSync(path.join(PLAIN, 'assets/waitlist.js'))).toBe(true);
    expect(read(PLAIN, 'sitemap.xml')).toContain(SITE + '/waitlist/');
  });
});
