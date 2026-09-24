/* Phone fixes: the brand mark leads back to the landing page, and the rules
   jsdom cannot lay out (touch targets, iOS focus zoom, the toast) are pinned
   in the stylesheet. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { boot, jsonFetch, flush } from './harness.js';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
// The phone block is the last coarse-pointer block, so nothing later overrides it.
const blocks = css.split('@media (pointer: coarse) {');
const coarse = blocks[blocks.length - 1].split('\n}')[0];

describe('the brand mark', () => {
  it('opens the landing page, and Open app returns to the same page', async () => {
    const app = await boot({ local: { 'imago.preferences': { onboarded: true } }, fetch: jsonFetch({ a: 1 }) });
    app.setUrlInput('https://a.test/x');
    app.performRequest(false);
    await flush(); await flush();
    app.setAppPane('settings');
    app.dom.brandHome.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true }));
    expect(app.dom.landingView.hidden).toBe(false);
    expect(app.dom.appView.hidden).toBe(true);
    expect(app.dom.paneSettings.hidden).toBe(true);
    app.dom.landingSkip.click();
    expect(app.dom.appView.hidden).toBe(false);
    expect(app.state.data).toEqual({ a: 1 });
  });

  it('answers Enter and Space the same way', async () => {
    for (const key of ['Enter', ' ']) {
      const app = await boot({ local: { 'imago.preferences': { onboarded: true } } });
      app.dom.brandHome.dispatchEvent(new app.window.KeyboardEvent('keydown', { key, bubbles: true }));
      expect(app.dom.landingView.hidden).toBe(false);
    }
  });
});

describe('phone styles', () => {
  it('gives every small control a 44px target under a finger', () => {
    expect(coarse).toMatch(/\.btn, \.btn-sm, \.mini-select, \.text-input, \.spec-details-summary \{ min-height: 44px; \}/);
    expect(coarse).toMatch(/\.icon-btn, \.rail \.icon-btn \{ width: 44px; height: 44px; \}/);
    expect(coarse).toMatch(/\.switch::before \{ content: ""; position: absolute; inset: -11px -4px; \}/);
  });

  it('comes after every component rule it overrides', () => {
    expect(css.lastIndexOf('@media (pointer: coarse)')).toBeGreaterThan(css.lastIndexOf('.keyline-action {'));
    expect(css.lastIndexOf('@media (pointer: coarse)')).toBeGreaterThan(css.lastIndexOf('.edit-bar .edit-label {'));
  });

  it('keeps form fields at 16px so iOS does not zoom on focus', () => {
    expect(coarse).toMatch(/input, select, textarea \{ font-size: 16px !important; \}/);
  });

  it('spans the toast across a phone instead of squeezing a pill', () => {
    expect(css).toMatch(/max-width: 720px[\s\S]*\.toast \{ bottom: 84px; left: 16px; right: 16px; max-width: none; border-radius: 14px;/);
  });
});
