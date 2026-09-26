/* Pricing: the landing block, the Settings note, and the hosted-AI waitlist
   links. The form's address lives in one constant (WAITLIST_URL in
   js/config.js); empty, every waitlist link is hidden, set, each opens the
   form in a new tab. The form is only ever linked to, never embedded. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
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
  it('ships pointing at the gallery waitlist page, which is https and off this origin', async () => {
    const app = await boot();
    expect(app.WAITLIST_URL).toBe('https://imago-apis-oavuixyf.onslate.in/waitlist/');
    expect(new URL(app.WAITLIST_URL).hostname).not.toBe('imago.onslate.in');
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

describe('no third-party embed on this origin', () => {
  it('index.html loads no Zoho or PageSense script, and no iframe', () => {
    const lower = HTML.toLowerCase();
    expect(lower).not.toMatch(/<iframe\b/);
    const scripts = lower.match(/<script\b[^>]*>/g) || [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const tag of scripts) {
      expect(tag).not.toMatch(/zoho|pagesense/);
      expect(tag).not.toMatch(/src="https?:/);
    }
    expect(lower).not.toMatch(/pagesense/);
    expect(lower).not.toMatch(/zohopublic|forms\.zoho/);
  });
});
