/* The last design leftovers: the live dot pulses once per refresh instead of
   forever, pixel art is drawn crisp while photos stay smooth, and page titles
   use a display face. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { boot, jsonFetch, flush } from './harness.js';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

describe('the live dot', () => {
  it('pulses on an auto-refresh, not on a fetch you started, and never forever', async () => {
    const app = await boot({ fetch: jsonFetch({ v: 1 }) });
    const dot = app.window.document.querySelector('#livePill .live-dot');
    app.setUrlInput('https://a.test/x');
    app.performRequest(false);
    await flush(); await flush();
    expect(dot.classList.contains('is-beat')).toBe(false);
    app.performRequest(true);
    await flush(); await flush();
    expect(dot.classList.contains('is-beat')).toBe(true);
    expect(css).not.toMatch(/\.live-dot\s*\{[^}]*infinite/);
    // Reduced motion stops the beat too, not just the base rule.
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*\.live-dot\.is-beat \{ animation: none; \}/);
  });
});

describe('images', () => {
  function image(app, naturalWidth) {
    const r = app.renderComponent({ type: 'image', path: 'src', label: 'Pic' }, { src: 'https://img.test/a.png' }, null);
    const img = r.node.querySelector('img');
    Object.defineProperty(img, 'naturalWidth', { value: naturalWidth });
    img.dispatchEvent(new app.window.Event('load'));
    return img;
  }

  it('a small image (a sprite) is drawn pixelated; a photo is not', async () => {
    const app = await boot();
    expect(image(app, 96).classList.contains('is-pixel')).toBe(true);
    expect(image(app, 800).classList.contains('is-pixel')).toBe(false);
    expect(css).toMatch(/\.comp-image img\.is-pixel \{ image-rendering: pixelated; \}/);
    expect(css).not.toMatch(/\.comp-image img \{[^}]*pixelated/);
  });
});

describe('page titles', () => {
  it('use the display face, which is a design token', async () => {
    expect(css).toMatch(/\.canvas \.stage-title \{ font-family: var\(--display\);/);
    const tokens = JSON.parse(readFileSync(new URL('../design/tokens.json', import.meta.url), 'utf8'));
    expect(tokens.font.display).toBe('Inter Display');
  });
});
