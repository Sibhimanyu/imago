/* Pricing: the landing block, the Settings note, and the hosted-AI waitlist
   links. The form's address lives in one constant (WAITLIST_URL in
   js/config.js); empty, every waitlist link is hidden, set, each opens the
   form in a new tab. The form is only ever linked to, never embedded. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boot, LANDING, APP } from './harness.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const FORM = 'https://forms.zohopublic.in/example/form/ImagoHostedAI/formperma/abc';

function waitlistNodes(app) {
  return [...app.window.document.querySelectorAll('[data-waitlist]')];
}
function waitlistLinks(app) {
  return waitlistNodes(app).flatMap((n) => (n.tagName === 'A' ? [n] : [...n.querySelectorAll('a')]));
}

describe('pricing block on the landing page', () => {
  it('sits after the proofs and before the footer, with both plans', async () => {
    const app = await boot({ url: LANDING });
    const doc = app.window.document;
    const pricing = doc.querySelector('#landingView .pricing');
    expect(pricing).not.toBe(null);
    expect(doc.querySelector('#landingView .proofs').nextElementSibling).toBe(pricing);
    expect(pricing.querySelector('h2').textContent).toBe('Free, and why');
    const heads = [...pricing.querySelectorAll('h3')].map((h) => h.textContent);
    expect(heads).toEqual(['Free forever', 'Hosted AI · waitlist']);
    expect(pricing.textContent).toContain('Not built yet. No payment now.');
  });

  it('keeps the voice rules: no exclamation marks', () => {
    const block = HTML.slice(HTML.indexOf('class="pricing"'), HTML.indexOf('</section>', HTML.indexOf('class="pricing"')));
    expect(block.length).toBeGreaterThan(100);
    expect(block).not.toContain('!');
  });
});

describe('waitlist links', () => {
  it('ships pointing at the waitlist page on this site, which gallery/build.mjs writes', async () => {
    const app = await boot();
    expect(app.WAITLIST_URL).toBe('https://imago.onslate.in/waitlist/');
    const { SITE } = await import('../gallery/build.mjs');
    expect(app.WAITLIST_URL).toBe(SITE + '/waitlist/');
  });

  it('are all hidden at boot while WAITLIST_URL is empty, and carry no href', async () => {
    // The landing link and the Settings note: if these showed with no
    // address, a user would click a link that goes nowhere.
    const app = await boot({ url: LANDING, app: APP.replace(/var WAITLIST_URL = "[^"]*";/, 'var WAITLIST_URL = "";') });
    const nodes = waitlistNodes(app);
    expect(nodes.length).toBe(2);
    for (const n of nodes) expect(n.hidden).toBe(true);
    for (const a of waitlistLinks(app)) expect(a.hasAttribute('href')).toBe(false);
  });

  it('render at boot when WAITLIST_URL is set in js/config.js', async () => {
    // The real boot path with the constant changed, the way the owner will
    // change it: init must carry it to every link without any other edit.
    const DECL = /var WAITLIST_URL = "[^"]*";/;
    expect(APP).toMatch(DECL);
    const app = await boot({ url: LANDING, app: APP.replace(DECL, 'var WAITLIST_URL = ' + JSON.stringify(FORM) + ';') });
    expect(app.WAITLIST_URL).toBe(FORM);
    for (const n of waitlistNodes(app)) expect(n.hidden).toBe(false);
    for (const a of waitlistLinks(app)) {
      expect(a.getAttribute('href')).toBe(FORM);
      expect(a.getAttribute('rel')).toBe('noopener');
    }
  });

  it('render with the form address, a new tab and rel=noopener once set', async () => {
    const app = await boot();
    app.applyWaitlist(FORM);
    const nodes = waitlistNodes(app);
    for (const n of nodes) expect(n.hidden).toBe(false);
    const links = waitlistLinks(app);
    expect(links.length).toBe(2);
    for (const a of links) {
      expect(a.getAttribute('href')).toBe(FORM);
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener');
    }
  });

  it('put the Settings note under the key boxes, as a link', async () => {
    const app = await boot();
    app.applyWaitlist(FORM);
    const note = app.window.document.querySelector('#paneSettings .waitlist-note');
    expect(note.textContent).toBe('No key? Join the hosted-AI waitlist.');
    expect(note.querySelector('a').getAttribute('href')).toBe(FORM);
    // Under the provider blocks, before the model field.
    expect(note.previousElementSibling.classList.contains('provider-block')).toBe(true);
  });

  it('hide again when the address is cleared, and refuse anything but https', async () => {
    const app = await boot();
    app.applyWaitlist(FORM);
    app.applyWaitlist('');
    for (const n of waitlistNodes(app)) expect(n.hidden).toBe(true);
    for (const a of waitlistLinks(app)) expect(a.hasAttribute('href')).toBe(false);
    app.applyWaitlist('javascript:alert(1)');
    for (const n of waitlistNodes(app)) expect(n.hidden).toBe(true);
    app.applyWaitlist('http://forms.example/insecure');
    for (const n of waitlistNodes(app)) expect(n.hidden).toBe(true);
  });
});

describe('third-party code on this origin', () => {
  const SNIPPET = fs.readFileSync(path.join(ROOT, 'pagesense.html'), 'utf8').trim();
  const PAGESENSE_SRC = SNIPPET.match(/src="([^"]+)"/)[1];

  it('index.html loads PageSense once, from pagesense.html, and no other outside script or iframe', () => {
    expect(SNIPPET).toMatch(/^<script async src="https:\/\/cdn-in\.pagesense\.io\/js\/[\w/]+\.js"><\/script>$/);
    const head = HTML.slice(0, HTML.indexOf('</head>'));
    expect(head.split(SNIPPET).length - 1).toBe(1);
    const lower = HTML.toLowerCase();
    expect(lower).not.toMatch(/<iframe\b/);
    const outside = (HTML.match(/<script\b[^>]*src="https?:[^"]*"/g) || []).map((t) => t.match(/src="([^"]+)"/)[1]);
    expect(outside).toEqual([PAGESENSE_SRC]);
    expect(lower).not.toMatch(/zohopublic|forms\.zoho/);
  });

  it('the CSP lets PageSense in by host, and nothing broader', () => {
    const csp = HTML.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    const script = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src'));
    expect(script).toBe("script-src 'self' https://cdn-in.pagesense.io https://static.zohocdn.com");
    expect(PAGESENSE_SRC.startsWith('https://cdn-in.pagesense.io/')).toBe(true);
    expect(csp).not.toMatch(/unsafe-eval/);
  });

  // PageSense prepends this to <head> and removes it only once its A/B and
  // location checks finish; in Safari that was a blank page for seconds.
  it('never lets PageSense hide the page', () => {
    const SCREEN = '<style id="zps-page-screen">body{background:transparent !important; opacity:0  !important; visibility: hidden  !important;} html{ opacity:0  !important; visibility: hidden  !important; }</style>';
    const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
    // PageSense prepends the screen, so it comes first here too. Should it ever
    // be appended, our rules must still win on specificity, which jsdom does not
    // model for !important (Chrome does): so the selectors are checked as text.
    expect(css).toMatch(/^html:root, html:root > body \{ opacity: 1 !important; visibility: visible !important; \}$/m);
    const win = new JSDOM('<html><head>' + SCREEN + '<style>' + css + '</style></head><body></body></html>').window;
    for (const el of [win.document.documentElement, win.document.body]) {
      const cs = win.getComputedStyle(el);
      expect(cs.visibility).toBe('visible');
      expect(cs.opacity).toBe('1');
    }
    expect(win.getComputedStyle(win.document.body).backgroundColor).not.toBe('transparent');
  });
});

describe('first paint', () => {
  it('preloads exactly the modules in js/ that main.js pulls in', () => {
    const preloaded = [...HTML.matchAll(/<link rel="modulepreload" href="\/js\/([\w-]+\.js)">/g)].map((m) => m[1]).sort();
    const modules = fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js') && f !== 'theme-boot.js').sort();
    expect(preloaded).toEqual(modules);
  });

  it('asks for the stylesheet and every module before the one parser-blocking script', () => {
    const head = HTML.slice(0, HTML.indexOf('</head>'));
    const boot = head.indexOf('<script src="/js/theme-boot.js"></script>');
    expect(boot).toBeGreaterThan(0);
    expect(head.indexOf('<link rel="stylesheet" href="/styles.css">')).toBeGreaterThan(0);
    expect(head.indexOf('<link rel="stylesheet" href="/styles.css">')).toBeLessThan(boot);
    expect(head.lastIndexOf('<link rel="modulepreload"')).toBeLessThan(boot);
  });

  it('names every local file from the site root, so the same page works at /app/', () => {
    const refs = [...HTML.matchAll(/\b(?:src|href)="([^"#][^"]*)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|mailto:|data:)/.test(u));
    expect(refs.length).toBeGreaterThan(15);
    for (const u of refs) expect(u, u).toMatch(/^\//);
  });

  it('no outside script blocks the parser', () => {
    for (const tag of HTML.match(/<script\b[^>]*src="https?:[^"]*"[^>]*>/g) || []) expect(tag).toMatch(/\sasync\s/);
  });
});
