/* Pure helpers: path parsing, diffing, spec normalisation, escaping, headers.
   These are the trust boundary between untrusted input (a third-party API
   body, a model's spec) and the renderer, so they get hostile input, not just
   happy-path input. */
import { describe, it, expect, beforeAll } from 'vitest';
import { boot } from './harness.js';

let A;
beforeAll(async () => { A = await boot(); });

describe('parsePath / getByPath', () => {
  it('treats bracket and dot indexing as the same path', () => {
    expect(A.parsePath('a[0].b')).toEqual(['a', '0', 'b']);
    expect(A.canonPath('a[0].b')).toBe(A.canonPath('a.0.b'));
  });

  it('keeps the trailing segments of an unterminated bracket', () => {
    // Previously `break` discarded everything after a missing `]`.
    expect(A.parsePath('a[0')).toEqual(['a', '0']);
  });

  it('reads nested values', () => {
    expect(A.getByPath({ a: { b: [10, 20] } }, 'a.b[1]')).toBe(20);
  });

  it('returns undefined for a missing path instead of throwing', () => {
    expect(A.getByPath({ a: 1 }, 'a.b.c')).toBeUndefined();
    expect(A.getByPath(null, 'a')).toBeUndefined();
  });

  it('does not resolve prototype members as if they were data', () => {
    // A model-chosen path of `__proto__` or `constructor` must not hand the
    // renderer a JavaScript internal.
    expect(A.getByPath({ a: 1 }, '__proto__')).toBeUndefined();
    expect(A.getByPath({ a: 1 }, 'constructor')).toBeUndefined();
    expect(A.getByPath({ a: 1 }, 'toString')).toBeUndefined();
  });
});

describe('escapeHtml / highlightJson', () => {
  it('escapes the HTML metacharacters', () => {
    expect(A.escapeHtml('<img src=x onerror=alert(1)>'))
      .toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(A.escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('never emits a live tag from a hostile JSON string', () => {
    const line = JSON.stringify({ x: '<script>alert(1)</script>' });
    const html = A.highlightJson(line);
    expect(html).not.toMatch(/<script/i);
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('parseHeaders / redactSecretHeaders', () => {
  it('parses name:value pairs and skips junk lines', () => {
    expect(A.parseHeaders('A: 1\n\n:leading\nB:')).toEqual({ A: '1' });
  });

  it('keeps colons inside the value', () => {
    expect(A.parseHeaders('X: http://a/b')).toEqual({ X: 'http://a/b' });
  });

  it('withholds credential headers and names them', () => {
    const out = A.redactSecretHeaders({
      Authorization: 'Bearer tok', 'X-Api-Key': 'k', Accept: 'application/json'
    });
    expect(out.safe).toEqual({ Accept: 'application/json' });
    expect(out.redacted.sort()).toEqual(['Authorization', 'X-Api-Key']);
  });

  it('does not mistake a lookalike name for a credential', () => {
    const out = A.redactSecretHeaders({ 'X-Api-Version': '2' });
    expect(out.safe).toEqual({ 'X-Api-Version': '2' });
    expect(out.redacted).toEqual([]);
  });
});

describe('sameOrigin', () => {
  it('compares scheme, host and port', () => {
    expect(A.sameOrigin('https://a.test/x', 'https://a.test/y')).toBe(true);
    expect(A.sameOrigin('https://a.test/x', 'https://b.test/y')).toBe(false);
    expect(A.sameOrigin('https://a.test/x', 'http://a.test/y')).toBe(false);
    expect(A.sameOrigin('https://a.test:1/x', 'https://a.test:2/y')).toBe(false);
  });

  it('is false rather than throwing on a non-URL', () => {
    expect(A.sameOrigin('', 'https://a.test')).toBe(false);
    expect(A.sameOrigin('not a url', 'https://a.test')).toBe(false);
  });
});

describe('normalizeSpec', () => {
  it('rejects junk instead of passing it to the renderer', () => {
    for (const bad of [null, undefined, 42, 'x', [], {}, { components: 'nope' }]) {
      expect(A.normalizeSpec(bad)).toBeNull();
    }
  });

  it('drops components of an unknown type', () => {
    const spec = A.normalizeSpec({
      title: 'T',
      components: [{ type: 'notAThing', path: 'a' }, { type: 'metric', path: 'a' }]
    });
    expect(spec.components).toHaveLength(1);
    expect(spec.components[0].type).toBe('metric');
  });

  it('drops a pathless component that may not address the root', () => {
    // `text` is not structural, so a pathless one cannot render the body.
    expect(A.normalizeSpec({ title: 'T', components: [{ type: 'text', path: '' }] }))
      .toBeNull();
  });

  it('allows a structural component to address the root', () => {
    const spec = A.normalizeSpec({ title: 'T', components: [{ type: 'jsonBlock', path: '' }] });
    expect(spec).not.toBeNull();
    expect(spec.components).toHaveLength(1);
  });

  it('survives null entries and a huge component list', () => {
    const many = Array.from({ length: 500 }, () => ({ type: 'metric', path: 'a' }));
    const spec = A.normalizeSpec({ title: 'T', components: [null, ...many] });
    expect(spec).not.toBeNull();
    expect(spec.components.length).toBeLessThanOrEqual(many.length);
  });
});

describe('buildFallbackSpec', () => {
  it('produces a root-legal spec for every scalar body', () => {
    // Regression: a pathless `text` normalised away to null, and applySpec
    // then dereferenced it. /health endpoints return exactly these.
    for (const scalar of [null, true, false, 0, 42, '', 'ok']) {
      const spec = A.normalizeSpec(A.buildFallbackSpec(scalar, 'https://a.test/health'));
      expect(spec, `scalar ${JSON.stringify(scalar)}`).not.toBeNull();
      expect(spec.title).toBeTruthy();
    }
  });

  it('titles a bare array by its length', () => {
    const spec = A.buildFallbackSpec([{ a: 1 }, { a: 2 }], 'https://a.test/x');
    expect(spec.title).toBe('2 items');
  });

  it('handles an object body', () => {
    const spec = A.normalizeSpec(A.buildFallbackSpec({ name: 'pikachu', id: 25 }, 'https://a.test/p'));
    expect(spec).not.toBeNull();
    expect(spec.components.length).toBeGreaterThan(0);
  });
});

describe('flatten / diffData', () => {
  it('reports a changed scalar', () => {
    const d = A.diffData({ a: 1 }, { a: 2 });
    expect(Object.keys(d).length).toBeGreaterThan(0);
  });

  it('reports nothing for identical bodies', () => {
    expect(Object.keys(A.diffData({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] }))).toHaveLength(0);
  });

  it('distinguishes an empty container from the string that looks like it', () => {
    // flatten used to encode [] as the literal '[]', so this diff was missed.
    const d = A.diffData({ a: [] }, { a: '[]' });
    expect(Object.keys(d).length).toBeGreaterThan(0);
  });

  it('sees a collection gaining its first element', () => {
    expect(Object.keys(A.diffData({ a: [] }, { a: [1] })).length).toBeGreaterThan(0);
  });
});

describe('hashString / fingerprint', () => {
  it('is stable for the same input', () => {
    expect(A.hashString('abc')).toBe(A.hashString('abc'));
  });

  it('is insensitive to key order in the schema', () => {
    const one = A.fingerprint({ a: 1, b: 2 });
    const two = A.fingerprint({ b: 2, a: 1 });
    expect(one.hash).toBe(two.hash);
  });
});

describe('diff display values', () => {
  it('shows an emptied collection as [] rather than an internal sentinel', () => {
    const d = A.diffData({ a: [1] }, { a: [] });
    const entry = Object.values(d).find((e) => e.after === '[]' || e.before === '[]');
    expect(entry, JSON.stringify(d)).toBeTruthy();
    for (const e of Object.values(d)) {
      expect(String(e.after)).not.toContain('[object Object]');
      expect(String(e.before)).not.toContain('[object Object]');
    }
  });

  it('shows an emptied object as {}', () => {
    const d = A.diffData({ a: { k: 1 } }, { a: {} });
    for (const e of Object.values(d)) {
      expect(String(e.after)).not.toContain('[object Object]');
    }
  });
});
