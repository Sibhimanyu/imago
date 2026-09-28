/* The three assignment reports (tech/, launch/, brand/): each one links to all
   three from a switcher of its own, not from the hero's chips. */
import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const REPORTS = { tech: 'Technology', launch: 'Business', brand: 'Design' };
const doc = (slug) => new JSDOM(fs.readFileSync(new URL(`../${slug}/index.html`, import.meta.url), 'utf8')).window.document;

describe('assignment report switcher', () => {
  for (const slug of Object.keys(REPORTS)) {
    it(`${slug}/ links to every report and marks itself current`, () => {
      const d = doc(slug);
      const links = [...d.querySelectorAll('header.top nav.reports a')];
      expect(links.map((a) => [a.getAttribute('href'), a.textContent]))
        .toEqual(Object.entries(REPORTS).map(([s, name]) => [`../${s}/`, name]));
      expect(links.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.getAttribute('href'))).toEqual([`../${slug}/`]);
      for (const s of Object.keys(REPORTS)) expect(fs.existsSync(new URL(`../${s}/index.html`, import.meta.url))).toBe(true);
    });

    it(`${slug}/ keeps the switcher out of the hero chips`, () => {
      const chips = [...doc(slug).querySelectorAll('.meta a')].map((a) => a.getAttribute('href'));
      expect(chips.some((h) => /^\.\.\/(tech|launch|brand)\/$/.test(h))).toBe(false);
    });
  }
});

describe('what the reports point at', () => {
  const local = (slug, ref) => new URL(`../${slug}/${decodeURI(ref.split(/[?#]/)[0])}`, import.meta.url);

  for (const slug of Object.keys(REPORTS)) {
    it(`${slug}/: every local link, image and 2x source exists`, () => {
      const d = doc(slug), refs = [];
      d.querySelectorAll('a[href], img[src], video[src], source[src], video[poster]').forEach((el) => {
        for (const attr of ['href', 'src', 'poster']) { const v = el.getAttribute(attr); if (v) refs.push(v); }
      });
      d.querySelectorAll('img[srcset]').forEach((img) => img.getAttribute('srcset').split(',').forEach((c) => refs.push(c.trim().split(/\s+/)[0])));
      const missing = refs.filter((r) => !/^(https?:|mailto:|file:|#)/.test(r) && r.split(/[?#]/)[0] !== '').filter((r) => !fs.existsSync(local(slug, r)));
      expect(missing).toEqual([]);
    });
  }

  it('brand/: each editable file card downloads a real .ai and gives its path on the Mac', () => {
    const cards = [...doc('brand').querySelectorAll('.files .file')];
    expect(cards.map((c) => c.querySelector('h3').textContent)).toEqual(['imago-task1-logo.ai', 'imago-task2-flyer-a4.ai', 'imago-task3-blog-banner.ai']);
    for (const c of cards) {
      const name = c.querySelector('h3').textContent;
      expect(fs.existsSync(new URL(`../brand/kit/${name}`, import.meta.url))).toBe(true);
      expect(c.querySelector('a[download]').getAttribute('href')).toBe(`https://github.com/Sibhimanyu/imago/raw/master/brand/kit/${name}`);
      const path = c.querySelector('button.copy').dataset.copy;
      expect(path.endsWith(`/brand/kit/${name}`)).toBe(true);
      expect(c.querySelector('.local-open').getAttribute('href')).toBe(`file://${path}`);
      expect(c.querySelector('.local-open').hidden).toBe(true);   // a web page cannot open file:// links
    }
  });

  it('brand/: the brand book pages and the banner offer a 2x source', () => {
    const d = doc('brand');
    const pages = [...d.querySelectorAll('img[src*="guidelines/"]')];
    expect(pages.length).toBeGreaterThanOrEqual(13);
    for (const img of pages) expect(img.getAttribute('srcset')).toMatch(/@2x\.png 2x/);
    for (const img of d.querySelectorAll('img[src$="blog-banner.png"]')) expect(img.getAttribute('srcset')).toMatch(/banner@2x\.png 2x/);
  });
});

describe('tech/: the source code', () => {
  it('can be downloaded as a zip of master from the hero', () => {
    const a = [...doc('tech').querySelectorAll('.hero .meta a')].find((x) => /\.zip$/.test(x.getAttribute('href')));
    expect(a.getAttribute('href')).toBe('https://github.com/Sibhimanyu/imago/archive/refs/heads/master.zip');
    expect(a.hasAttribute('download')).toBe(true);
    expect(a.textContent).toMatch(/Download source/);
  });
});
