// Front-end asset references must all carry the same version tag, and point at files that exist.
// (Browsers may hold older copies of scripts; a tag that changes with each release forces fresh ones.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const files = fs.readdirSync(PUBLIC).filter((f) => /\.(js|html)$/.test(f));

test('every local script/style reference has the same ?v= tag and the file exists', () => {
  const tags = new Set();
  let refs = 0;
  for (const f of files) {
    const src = fs.readFileSync(path.join(PUBLIC, f), 'utf8');
    const found = [
      ...[...src.matchAll(/from '\.\/([A-Za-z0-9_-]+\.js)(\?v=[^']+)?'/g)].map((m) => [m[1], m[2]]),
      ...[...src.matchAll(/(?:src|href)="\/((?:app|guard|listen)\.js|styles\.css)(\?v=[^"]+)?"/g)].map((m) => [m[1], m[2]]),
    ];
    for (const [file, tag] of found) {
      refs++;
      assert.ok(tag, `${f} references ${file} without a ?v= tag`);
      assert.ok(fs.existsSync(path.join(PUBLIC, file)), `${f} references missing file ${file}`);
      tags.add(tag);
    }
  }
  assert.ok(refs >= 15, `expected to find the references, found ${refs}`);
  assert.equal(tags.size, 1, `all references must share one tag, found: ${[...tags].join(', ')}`);
});
