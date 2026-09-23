/* Page edits: hide a field, rename its label, or move it between Headline,
   Normal and Details, saved per response shape. The page used to be whatever
   the model or the basic layout decided, with no way to adjust it. */
import { describe, it, expect } from 'vitest';
import { boot, jsonFetch, flush } from './harness.js';

const DATA = { title: 'Stock', price: 12.5, volume: 900, sector: 'Tech' };

async function page(opts) {
  const app = await boot(opts);
  app.state.url = 'https://a.test/stock';
  app.state.data = DATA;
  app.state.schemaHash = 'sch_stock';
  app.applySpec(app.normalizeSpec(app.buildFallbackSpec(DATA, app.state.url)), 'fallback');
  app.updateMeta();
  return app;
}

const bar = (app, label) => [...app.dom.interfaceOut.querySelectorAll('.edit-bar')]
  .find((b) => b.querySelector('.edit-label').value === label);
const text = (app) => app.dom.interfaceOut.textContent;

describe('applyEdits', () => {
  it('hides, relabels and re-weights by type@path, and leaves an unedited spec alone', async () => {
    const app = await boot();
    const spec = { title: 'T', components: [{ type: 'metric', path: 'a', label: 'A' }, { type: 'text', path: 'b' }] };
    const none = app.editsFor('nothing');
    expect(app.applyEdits(spec, none)).toBe(spec);
    const edits = app.editsFor('nothing');
    edits.hidden['text@b'] = true;
    edits.labels['metric@a'] = '  Alpha ' + 'x'.repeat(100);
    edits.weight['metric@a'] = 'hero';
    const out = app.applyEdits(spec, edits);
    expect(out.components).toHaveLength(1);
    expect(out.components[0].label).toBe(('Alpha ' + 'x'.repeat(100)).slice(0, 80));
    expect(out.components[0].emphasis).toBe('hero');
    expect(spec.components[0].label).toBe('A');                 // the original is untouched
  });

  it('ignores a weight that is not one of the three', async () => {
    const app = await boot();
    const edits = app.editsFor('nothing');
    edits.weight['metric@a'] = 'giant';
    const out = app.applyEdits({ components: [{ type: 'metric', path: 'a' }] }, edits);
    expect(out.components[0].emphasis).toBeUndefined();
  });
});

describe('editing a page', () => {
  it('Edit shows a bar on each field and a panel; Done takes them away', async () => {
    const app = await page();
    expect(app.dom.editBtn.disabled).toBe(false);
    app.dom.editBtn.click();
    expect(app.dom.editBtn.getAttribute('aria-pressed')).toBe('true');
    expect(app.dom.interfaceOut.querySelector('.edit-panel')).not.toBeNull();
    expect(app.dom.interfaceOut.querySelectorAll('.edit-bar').length).toBeGreaterThanOrEqual(3);
    app.dom.interfaceOut.querySelector('.edit-done').click();
    expect(app.dom.interfaceOut.querySelector('.edit-bar')).toBeNull();
    expect(app.dom.editBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('renaming a label sticks, and is saved for the shape', async () => {
    const app = await page();
    app.setEditing(true);
    const input = bar(app, 'Price').querySelector('.edit-label');
    input.value = 'Share price';
    input.dispatchEvent(new app.window.Event('change'));
    app.setEditing(false);
    expect(text(app)).toContain('Share price');
    const stored = JSON.parse(app.window.localStorage.getItem('imago.pageEdits'));
    expect(Object.values(stored.sch_stock.labels)).toEqual(['Share price']);
    // Back to the original name clears the edit instead of storing a copy.
    app.setEditing(true);
    const again = bar(app, 'Share price').querySelector('.edit-label');
    again.value = 'Price';
    again.dispatchEvent(new app.window.Event('change'));
    expect(app.window.localStorage.getItem('imago.pageEdits')).toBe('{}');
  });

  it('moving a field to Details or Headline re-lays the page', async () => {
    const app = await page();
    app.setEditing(true);
    const weight = bar(app, 'Sector').querySelector('.edit-weight');
    weight.value = 'quiet';
    weight.dispatchEvent(new app.window.Event('change'));
    app.setEditing(false);
    expect(app.dom.interfaceOut.querySelector('details.spec-details').textContent).toContain('Sector');
    app.setEditing(true);
    const w2 = bar(app, 'Volume').querySelector('.edit-weight');
    w2.value = 'hero';
    w2.dispatchEvent(new app.window.Event('change'));
    app.setEditing(false);
    const heroes = [...app.dom.interfaceOut.querySelectorAll('.comp-hero .comp-label')].map((n) => n.textContent);
    expect(heroes).toContain('Volume');
  });

  it('a hidden field leaves the page, is listed in the panel, and can be brought back; Reset clears all', async () => {
    const app = await page();
    app.setEditing(true);
    bar(app, 'Sector').querySelector('.edit-hide').click();
    expect(bar(app, 'Sector')).toBeUndefined();
    expect(app.window.document.activeElement).toBe(app.dom.editBtn);
    const show = app.dom.interfaceOut.querySelector('.edit-show');
    expect(show.textContent).toBe('Show Sector');
    show.click();
    expect(bar(app, 'Sector')).toBeDefined();
    bar(app, 'Volume').querySelector('.edit-hide').click();
    app.dom.interfaceOut.querySelector('.edit-reset').click();
    expect(bar(app, 'Volume')).toBeDefined();
    expect(app.dom.interfaceOut.querySelector('.edit-reset')).toBeNull();   // nothing left to reset
  });

  it('edits follow the shape, not the URL', async () => {
    const app = await page();
    app.setEditing(true);
    bar(app, 'Sector').querySelector('.edit-hide').click();
    app.setEditing(false);
    app.state.url = 'https://b.test/other-stock';          // same shape, another endpoint
    app.applySpec(app.normalizeSpec(app.buildFallbackSpec(DATA, app.state.url)), 'fallback');
    expect(text(app)).not.toContain('Sector');
    app.state.schemaHash = 'sch_other';                    // another shape
    app.applySpec(app.normalizeSpec(app.buildFallbackSpec(DATA, app.state.url)), 'fallback');
    expect(text(app)).toContain('Sector');
  });

  it('a response path named __proto__ is just a key', async () => {
    const app = await boot();
    const edits = app.editsFor('h');
    edits.hidden['text@__proto__'] = true;
    const out = app.applyEdits({ components: [{ type: 'text', path: '__proto__' }, { type: 'text', path: 'x' }] }, edits);
    expect(out.components.map((c) => c.path)).toEqual(['x']);
    expect(({}).polluted).toBeUndefined();
    // Raw JSON: in an object literal '__proto__' would set the prototype, not a key.
    app.window.localStorage.setItem('imago.pageEdits', '{"h":{"hidden":{"__proto__":true}}}');
    expect(Object.keys(app.editsFor('h').hidden)).toEqual(['__proto__']);
  });
});

describe('editing and the rest of the app', () => {
  it('pauses Watch while editing and resumes it on Done', async () => {
    const app = await page();
    app.state.refreshIntervalMs = 30000;
    app.startTimer();
    expect(app.state.tickHandle).toBeTruthy();
    app.setEditing(true);
    expect(app.state.tickHandle).toBeNull();
    app.setEditing(false);
    expect(app.state.tickHandle).toBeTruthy();
    app.stopTimer();
  });

  it('a new request leaves edit mode', async () => {
    const app = await page({ fetch: jsonFetch(DATA) });
    app.setEditing(true);
    app.setUrlInput('https://a.test/next');
    app.performRequest(false);
    expect(app.state.editing).toBe(false);
    expect(app.window.document.body.classList.contains('is-editing')).toBe(false);
    await flush();
  });

  it('Edit is unavailable without a page, and for full-HTML pages', async () => {
    const app = await page();
    app.state.builder = 'html';
    app.updateMeta();
    expect(app.dom.editBtn.disabled).toBe(true);
    app.state.builder = 'spec';
    app.state.data = null;
    app.updateMeta();
    expect(app.dom.editBtn.disabled).toBe(true);
  });

  it('Details opens while editing, so tucked fields can be edited', async () => {
    const app = await page();
    app.setEditing(true);
    bar(app, 'Sector').querySelector('.edit-weight').value = 'quiet';
    bar(app, 'Sector').querySelector('.edit-weight').dispatchEvent(new app.window.Event('change'));
    expect(app.dom.interfaceOut.querySelector('details.spec-details').open).toBe(true);
  });

  it('a share link carries the edited page, even when it started as the basic layout', async () => {
    const app = await page();
    app.setEditing(true);
    bar(app, 'Sector').querySelector('.edit-hide').click();
    const built = app.buildShareLink();
    expect(built.withLayout).toBe(true);
    const read = app.readShareLink(built.link.slice(built.link.indexOf('#')));
    expect(read.spec.components.some((c) => c.path === 'sector')).toBe(false);
  });

  it('Clear all data removes the edits too', async () => {
    const app = await page();
    app.setEditing(true);
    bar(app, 'Sector').querySelector('.edit-hide').click();
    app.clearAllData();
    expect(app.window.localStorage.getItem('imago.pageEdits')).toBeNull();
  });
});

describe('re-rendering keeps the page honest', () => {
  // Edit (or any re-render) redrew the basic layout without its no-key line,
  // and the "Basic layout" badge came back in its place.
  it('the no-key line survives a re-render, once, and goes when a real layout arrives', async () => {
    const app = await page();
    app.resolveSpec(app.state.url, { hash: 'sch_stock', schema: {} }, false);
    await flush();
    expect(app.dom.interfaceOut.querySelectorAll('.keyline')).toHaveLength(1);
    // A Watch tick resolves again: the re-render draws the line, then the
    // resolver asks for it too. Still one.
    app.resolveSpec(app.state.url, { hash: 'sch_stock', schema: {} }, false);
    await flush();
    expect(app.dom.interfaceOut.querySelectorAll('.keyline')).toHaveLength(1);
    app.setEditing(true);
    app.setEditing(false);
    expect(app.dom.interfaceOut.querySelectorAll('.keyline')).toHaveLength(1);
    expect(app.dom.cacheBadge.hidden).toBe(true);
    app.applySpec(app.normalizeSpec({ title: 'T', layout: 'dashboard', components: [{ type: 'metric', path: 'price' }] }), 'generated');
    expect(app.dom.interfaceOut.querySelector('.keyline')).toBeNull();
    app.applySpec(app.normalizeSpec(app.buildFallbackSpec(DATA, app.state.url)), 'fallback');
    expect(app.dom.interfaceOut.querySelector('.keyline')).toBeNull();   // not re-added once a key worked
  });
});
