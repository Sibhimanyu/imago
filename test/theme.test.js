// Dark theme: the Settings choice, the system default, storage, the
// before-first-paint boot script, and Full HTML pages following the theme.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { boot, jsonFetch, installColorScheme } from './harness.js';

const root = (app) => app.window.document.documentElement;
const BOOT = fs.readFileSync(new URL('../js/theme-boot.js', import.meta.url), 'utf8');

describe('theme setting', () => {
  it('defaults to System, which is light when the system is light', async () => {
    const app = await boot({ systemDark: false });
    expect(app.themePref()).toBe('system');
    expect(app.dom.themeSelect.value).toBe('system');
    expect(root(app).getAttribute('data-theme')).toBe('light');
  });

  it('System follows a dark system, and a system flip while open', async () => {
    const app = await boot({ systemDark: true });
    expect(root(app).getAttribute('data-theme')).toBe('dark');
    app.window.__setSystemDark(false);
    expect(root(app).getAttribute('data-theme')).toBe('light');
    app.window.__setSystemDark(true);
    expect(root(app).getAttribute('data-theme')).toBe('dark');
  });

  it('no matchMedia at all means light', async () => {
    const app = await boot();
    expect(root(app).getAttribute('data-theme')).toBe('light');
  });

  it('choosing Dark in Settings applies it, saves it, and survives a reload', async () => {
    const app = await boot({ systemDark: false });
    app.dom.themeSelect.value = 'dark';
    app.dom.themeSelect.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    expect(root(app).getAttribute('data-theme')).toBe('dark');
    expect(app.getPrefs().theme).toBe('dark');
    expect(app.window.document.querySelector('meta[name="theme-color"]').getAttribute('content')).toBe('#161614');
    const again = await boot({ systemDark: false, local: { 'imago.preferences': app.getPrefs() } });
    expect(root(again).getAttribute('data-theme')).toBe('dark');
    expect(again.dom.themeSelect.value).toBe('dark');
  });

  it('a pinned choice ignores the system flipping', async () => {
    const app = await boot({ systemDark: true, local: { 'imago.preferences': { theme: 'light' } } });
    expect(root(app).getAttribute('data-theme')).toBe('light');
    app.window.__setSystemDark(false);
    app.window.__setSystemDark(true);
    expect(root(app).getAttribute('data-theme')).toBe('light');
  });

  it('going back to System forgets the choice instead of storing it', async () => {
    const app = await boot({ systemDark: false, local: { 'imago.preferences': { theme: 'dark', onboarded: true } } });
    app.setTheme('system');
    expect('theme' in app.getPrefs()).toBe(false);
    expect(app.getPrefs().onboarded).toBe(true);
    expect(root(app).getAttribute('data-theme')).toBe('light');
  });

  it('an unknown stored value falls back to System', async () => {
    const app = await boot({ systemDark: true, local: { 'imago.preferences': { theme: 'sepia' } } });
    expect(app.themePref()).toBe('system');
    expect(root(app).getAttribute('data-theme')).toBe('dark');
  });

  it('saving other preferences keeps the theme', async () => {
    const app = await boot({ local: { 'imago.preferences': { theme: 'dark' } } });
    app.savePrefs();
    expect(app.getPrefs().theme).toBe('dark');
  });
});

// The boot script runs before main.js, so it is tested on its own.
describe('theme-boot.js', () => {
  function runBoot({ prefs, dark, noMatchMedia } = {}) {
    const { window } = new JSDOM('<!DOCTYPE html><html><head></head></html>', { url: 'https://imago.test/', runScripts: 'outside-only' });
    if (prefs !== undefined) window.localStorage.setItem('imago.preferences', typeof prefs === 'string' ? prefs : JSON.stringify(prefs));
    if (!noMatchMedia) installColorScheme(window, dark);
    window.eval(BOOT);
    return window.document.documentElement.getAttribute('data-theme');
  }
  it('follows the system when nothing is chosen', () => {
    expect(runBoot({ dark: true })).toBe('dark');
    expect(runBoot({ dark: false })).toBe('light');
  });
  it('honours a pinned choice over the system', () => {
    expect(runBoot({ prefs: { theme: 'dark' }, dark: false })).toBe('dark');
    expect(runBoot({ prefs: { theme: 'light' }, dark: true })).toBe('light');
  });
  it('survives corrupt storage and a missing matchMedia', () => {
    expect(runBoot({ prefs: '{not json', dark: true })).toBe('dark');
    expect(runBoot({ noMatchMedia: true })).toBe('light');
  });
});

describe('Full HTML pages follow the theme', () => {
  it('sanitizeHtmlDoc appends the palette last, and nothing without one', async () => {
    const app = await boot();
    const doc = '<html><head><style>:root{--bg:#000}</style></head><body><h1>x</h1></body></html>';
    const out = app.sanitizeHtmlDoc(doc, {}, app.HTML_PALETTE ? app.HTML_PALETTE.dark : { bg: '#1e1e1b', card: '#242420', line: '#34332f', ink: '#f1efe9', muted: '#a8a69d' });
    const styles = out.match(/<style>[^<]*<\/style>/g);
    expect(styles[styles.length - 1]).toContain('--bg:#1e1e1b');
    expect(styles[styles.length - 1]).toContain('--ink:#f1efe9');
    expect(app.sanitizeHtmlDoc(doc, {})).not.toContain('--ink:');
  });

  it('a page on screen is redrawn in the new theme', async () => {
    const app = await boot({ systemDark: false, fetch: jsonFetch({ hello: 'world' }) });
    app.state.builder = 'html';
    app.applyHtml('<html><head></head><body><h1>Hi</h1></body></html>', 'generated');
    const frame = () => app.dom.interfaceOut.querySelector('.html-frame');
    expect(frame().srcdoc).toContain('--bg:#ffffff');
    app.dom.themeSelect.value = 'dark';
    app.dom.themeSelect.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    expect(frame().srcdoc).toContain('--bg:#1e1e1b');
    app.window.__setSystemDark(true);   // pinned Dark: a system flip changes nothing
    expect(frame().srcdoc).toContain('--bg:#1e1e1b');
  });

  it('a system flip redraws a page when the choice is System', async () => {
    const app = await boot({ systemDark: false });
    app.state.builder = 'html';
    app.applyHtml('<html><head></head><body><h1>Hi</h1></body></html>', 'generated');
    app.window.__setSystemDark(true);
    expect(app.dom.interfaceOut.querySelector('.html-frame').srcdoc).toContain('--bg:#1e1e1b');
  });
});
