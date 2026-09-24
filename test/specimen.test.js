/* The landing demo is a live request drawn by the real renderer: nothing on
   it is hand-written, and no example is favoured. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { boot, jsonFetch, flush, LANDING } from './harness.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const settle = async () => { for (let i = 0; i < 4; i += 1) await flush(); };

describe('the landing demo is live', () => {
  it('ships no hand-written response or interface', () => {
    const landing = html.slice(html.indexOf('id="landingView"'), html.indexOf('id="appView"'));
    expect(landing).not.toMatch(/data:image\/png;base64/);
    expect(landing).not.toMatch(/pikachu|Chennai|Tolkien|"base_stat"/i);
    expect(landing).not.toMatch(/From schema cache<\/span>\s*<\/div>\s*<div class="si-hero"/);
  });

  it('fetches the example it shows and draws it with the renderer', async () => {
    const calls = [];
    const app = await boot({ fetch: (url) => { calls.push(String(url)); return jsonFetch({ name: 'widget', score: 7 })(url); } });
    app.showSpecimen('Library');
    await settle();
    const doc = app.window.document;
    expect(calls.some((u) => u.includes('openlibrary.org'))).toBe(true);
    expect(doc.getElementById('specimenUrl').textContent).toContain('openlibrary.org');
    expect(doc.getElementById('specimenJson').textContent).toContain('"widget"');
    expect(doc.querySelector('#specimenOut .stage-title').textContent).toBe('Widget');
    expect(doc.querySelector('#specimenOut .spec-body')).not.toBeNull();
    expect(doc.getElementById('specimenPane').getAttribute('aria-busy')).toBe('false');
    expect(doc.querySelector('.specimen-switch [data-example="Library"]').getAttribute('aria-selected')).toBe('true');
  });

  it('fetches each example once, then reuses it', async () => {
    const calls = [];
    const app = await boot({ fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    app.showSpecimen('Weather'); await settle();
    const before = calls.length;
    app.showSpecimen('Library'); await settle();
    app.showSpecimen('Weather'); await settle();
    expect(calls.filter((u) => u.includes('open-meteo')).length).toBe(1);
    expect(calls.length).toBe(before + 1);
  });

  it('says so plainly when the example cannot be reached', async () => {
    const app = await boot({ fetch: () => Promise.reject(new TypeError('Failed to fetch')) });
    app.showSpecimen('Pokémon');
    await settle();
    const doc = app.window.document;
    expect(doc.getElementById('specimenNote').textContent).toMatch(/Could not reach pokeapi\.co/);
    expect(doc.getElementById('specimenOut').children.length).toBe(0);
  });

  it('picks the first example by chance, not always the same one', async () => {
    const seen = new Set();
    for (let i = 0; i < 12; i += 1) {
      const app = await boot({ url: LANDING, fetch: jsonFetch({ a: 1 }) });
      seen.add(app.specimen.name);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('starts fetching as soon as the landing page shows', async () => {
    const calls = [];
    await boot({ url: LANDING, fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    await settle();
    expect(calls.length).toBe(1);
  });

  it('does not fetch anything while the app is showing', async () => {
    const calls = [];
    await boot({ url: 'https://imago.test/#app', fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    await settle();
    expect(calls.length).toBe(0);
  });

  it('Try an example opens the app on the example that is showing', async () => {
    const calls = [];
    const app = await boot({ fetch: (url) => { calls.push(String(url)); return jsonFetch({ a: 1 })(url); } });
    app.showSpecimen('Library'); await settle();
    app.dom.landingTry.click();
    await settle();
    expect(app.state.view).toBe('app');
    expect(app.state.url).toContain('openlibrary.org');
  });
});

describe('the landing hero follows the brand banner', () => {
  it('sets the promise beside the demo, the URL on the response and the examples below', async () => {
    const app = await boot({ url: LANDING, fetch: jsonFetch({ a: 1 }) });
    const doc = app.window.document;
    const top = doc.querySelector('.landing-main > .landing-top');
    expect([...top.children].map((c) => c.className)).toEqual(['landing-hero', 'specimen']);
    expect(doc.querySelector('.spec-response').contains(doc.getElementById('specimenUrl'))).toBe(true);
    const foot = doc.querySelector('.specimen > .specimen-foot');
    expect(foot.querySelector('.specimen-switch')).not.toBeNull();
    expect(foot.contains(doc.getElementById('specimenNote'))).toBe(true);
    expect(doc.querySelector('.spec-seam')).toBeNull();
  });

  it('switches examples from the tabs under the composition', async () => {
    const app = await boot({ url: LANDING, fetch: jsonFetch({ a: 1 }) });
    const doc = app.window.document;
    doc.querySelector('.specimen-foot [data-example="Weather"]').click();
    await settle();
    expect(doc.getElementById('specimenUrl').textContent).toContain('open-meteo.com');
  });
});
