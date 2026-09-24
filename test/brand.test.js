/* imago ↔ amigo: the landing page names the anagram, and Amigo (the mascot)
   stands in the empty page. */
import { describe, it, expect } from 'vitest';
import { boot } from './harness.js';

describe('the imago/amigo wordplay', () => {
  it('marks the two swapped letters on the landing page', async () => {
    const app = await boot();
    const words = [...app.window.document.querySelectorAll('.landing-foot .anagram')];
    expect(words.map((w) => w.textContent)).toEqual(['imago', 'amigo']);
    expect(words.map((w) => [...w.querySelectorAll('b')].map((b) => b.textContent).join(''))).toEqual(['ia', 'ai']);
    expect(app.window.document.querySelector('.landing-foot').textContent).toMatch(/Spanish for friend/);
  });

  it('puts Amigo in the empty page, drawn from the sprite', async () => {
    const app = await boot({ local: { 'imago.preferences': { onboarded: true } } });
    app.showInterfaceEmpty();
    const use = app.dom.interfaceOut.querySelector('.empty-icon.is-amigo svg use');
    expect(use.getAttribute('href')).toBe('#amigoMark');
    expect(app.window.document.getElementById('amigoMark')).not.toBeNull();
  });
});

describe('link previews', () => {
  // The site moved to imago.onslate.in; previews pointing at the old host
  // showed a broken image wherever the link was pasted.
  it('point at the live host, and the image sits on the same host as the page', async () => {
    const app = await boot();
    const meta = (sel) => app.window.document.querySelector(sel).getAttribute('content');
    const page = new URL(meta('meta[property="og:url"]'));
    expect(page.host).toBe('imago.onslate.in');
    expect(new URL(meta('meta[property="og:image"]')).host).toBe(page.host);
    expect(new URL(meta('meta[name="twitter:image"]')).host).toBe(page.host);
  });
});
