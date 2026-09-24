/* The basic layout is built from the shape of the data, never from the
   vocabulary of the example APIs. These pin the generic rules that replaced
   the sample-specific ones, and fail if sample words creep back in. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { boot } from './harness.js';

const src = (f) => readFileSync(new URL('../js/' + f, import.meta.url), 'utf8');
const url = 'https://any.test/thing';

describe('no sample API vocabulary in the layout rules', () => {
  it('spec, render, values and the model prompt name no example API field', () => {
    const code = ['spec.js', 'render.js', 'values.js', 'llm.js'].map(src).join('\n')
      .split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');   // comments may cite examples
    for (const word of ['base_stat', 'moves', 'encounter', 'sprite', 'lending', 'ebook', 'availability',
                        'day_length', 'generationtime', 'wind_speed', 'soil_', 'results.sunrise', 'Species']) {
      expect(code, word).not.toContain(word);
    }
  });
});

describe('generic rules', () => {
  it('draws bars for the quantity that varies most when no name says which', async () => {
    const app = await boot();
    const rows = ['a', 'b', 'c'].map((n, i) => ({ level_x: [10, 70, 40][i], bonus: i === 2 ? 1 : 0, thing: { name: n } }));
    const bars = app.buildFallbackSpec({ parts: rows }, url).components.find((c) => c.type === 'statBars');
    expect(bars.valuePath).toBe('level_x');
    expect(bars.labelPath).toBe('thing.name');
  });

  it('keeps a record of many fields a table, not a ranking', async () => {
    const app = await boot();
    const rows = ['a', 'b', 'c'].map((n, i) => ({ title: n, big: i * 1e6, small: i, year: 2000 + i, lang: 'en', extra: 'x' }));
    const types = app.buildFallbackSpec({ items: rows }, url).components.map((c) => c.type);
    expect(types).toContain('table');
    expect(types).not.toContain('statBars');
  });

  it('folds a bundle of links into Details, even with empty sub-objects', async () => {
    const app = await boot();
    const data = { name: 'x', about: { a: 'plain words' },
                   links: { one: 'https://a.test/1', deep: { two: 'https://a.test/2', none: { z: null } } } };
    const blocks = app.buildFallbackSpec(data, url).components;
    expect(blocks.find((c) => c.path === 'links').emphasis).toBe('quiet');
    expect(blocks.find((c) => c.path === 'about').emphasis).not.toBe('quiet');
  });

  it('folds a list too long to read into Details', async () => {
    const app = await boot();
    const long = Array.from({ length: 40 }, (_, i) => ({ label: 'r' + i, note: 'n', when: i }));
    const short = long.slice(0, 5);
    const blocks = app.buildFallbackSpec({ name: 'x', long, short }, url).components;
    expect(blocks.find((c) => c.path === 'long').emphasis).toBe('quiet');
    expect(blocks.find((c) => c.path === 'short').emphasis).not.toBe('quiet');
  });
});
