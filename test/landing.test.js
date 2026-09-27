/* The landing page below the hero: the launch film, the rest of the
   features, how it works, and the footer's links. The film must be a real
   file under assets/ (publish.sh ships that folder) and must never play or
   download on its own: it has sound and weighs megabytes. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boot, LANDING } from './harness.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const landingHtml = HTML.slice(HTML.indexOf('id="landingView"'), HTML.indexOf('id="appView"'));

async function landing() {
  const app = await boot({ url: LANDING });
  return app.window.document;
}

describe('the landing sections, in order', () => {
  it('runs hero, film, proofs, features, how it works, pricing', async () => {
    const doc = await landing();
    const main = doc.querySelector('#landingView .landing-main');
    expect([...main.children].map((c) => c.className)).toEqual(['landing-top', 'film', 'proofs', 'features', 'how', 'pricing']);
  });

  it('gives every new section a heading it is labelled by', async () => {
    const doc = await landing();
    for (const sel of ['.film', '.features', '.how']) {
      const section = doc.querySelector('#landingView ' + sel);
      const title = doc.getElementById(section.getAttribute('aria-labelledby'));
      expect(section.contains(title), sel).toBe(true);
      expect(title.tagName, sel).toBe('H2');
    }
  });

  it('keeps the voice rules: no exclamation marks', () => {
    const from = landingHtml.indexOf('class="film"');
    const to = landingHtml.indexOf('class="pricing"');
    expect(to - from).toBeGreaterThan(1000);
    expect(landingHtml.slice(from, to).replace(/<!--[\s\S]*?-->/g, '')).not.toContain('!');
  });
});

describe('the launch film', () => {
  it('points at a video and a poster that ship in assets/', async () => {
    const doc = await landing();
    const video = doc.querySelector('#landingView .film video');
    const src = video.querySelector('source').getAttribute('src');
    const poster = video.getAttribute('poster');
    expect(video.querySelector('source').getAttribute('type')).toBe('video/mp4');
    for (const url of [src, poster]) {
      expect(url.startsWith('/assets/'), url).toBe(true);
      expect(fs.existsSync(path.join(ROOT, url)), url).toBe(true);
    }
  });

  it('waits for the reader: controls, no autoplay, nothing preloaded', async () => {
    const doc = await landing();
    const video = doc.querySelector('#landingView .film video');
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.getAttribute('preload')).toBe('none');
  });

  it('is described in text for anyone who cannot watch it', async () => {
    const doc = await landing();
    const video = doc.querySelector('#landingView .film video');
    const desc = doc.getElementById(video.getAttribute('aria-describedby'));
    expect(desc.textContent.length).toBeGreaterThan(80);
  });

  it('stays within the page policy, which only allows media from this origin', () => {
    const csp = HTML.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain('media-src');
  });
});

describe('what else it does', () => {
  it('lists six features, each a heading and one paragraph', async () => {
    const doc = await landing();
    const features = [...doc.querySelectorAll('#landingView .features .feature')];
    expect(features.length).toBe(6);
    for (const f of features) {
      expect(f.querySelector('h3').textContent.length).toBeGreaterThan(0);
      expect(f.querySelectorAll('p').length).toBe(1);
    }
  });

  it('explains how it works in four numbered steps, with the limits beneath', async () => {
    const doc = await landing();
    const steps = [...doc.querySelectorAll('#landingView .how .how-steps > li h3')].map((h) => h.textContent);
    expect(steps).toEqual(['Fetch', 'Fingerprint', 'Plan, once', 'Render']);
    expect(doc.querySelector('#landingView .how-limits').textContent).toMatch(/GET only/);
  });
});

describe('the footer links', () => {
  it('go to the gallery, the press kit, the source and help, and open off-site ones in a new tab', async () => {
    const doc = await landing();
    const links = [...doc.querySelectorAll('.landing-foot .foot-links a')];
    expect(links.map((a) => a.textContent)).toEqual(['API gallery', 'Press kit', 'Source on GitHub', 'Help']);
    for (const a of links) {
      const external = /^https:/.test(a.getAttribute('href'));
      expect(a.getAttribute('target') === '_blank', a.textContent).toBe(external);
      if (external) expect(a.getAttribute('rel')).toContain('noopener');
    }
  });
});
