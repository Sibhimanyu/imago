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
