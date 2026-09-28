/* The three assignment reports were submitted as the locked GitHub release
   submission-2026-09-28. Everything under tech/, launch/ and brand/ must stay
   byte-for-byte what was submitted: this fails if any file changes, goes
   missing, or is added. Unlocking is a decision, not a fix: see the release. */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const freeze = JSON.parse(fs.readFileSync(new URL('submission-freeze.json', import.meta.url), 'utf8'));
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(new URL(rel, root))).digest('hex');

describe(`the submission (${freeze.tag}) is frozen`, () => {
  it('every submitted file is unchanged, and none is added', () => {
    const changed = Object.entries(freeze.files).filter(([rel, h]) => !fs.existsSync(new URL(rel, root)) || sha(rel) !== h).map(([rel]) => rel);
    expect(changed).toEqual([]);
    const tracked = execSync(`git ls-files -- ${freeze.dirs.join(' ')}`, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
    expect(tracked.filter((rel) => !(rel in freeze.files))).toEqual([]);
  });
});
