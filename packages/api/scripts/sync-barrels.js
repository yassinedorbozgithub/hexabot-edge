#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Regenerates `src/<domain>/index.ts` barrels so they re-export every source
 * file of the domain. A sub-folder that owns an `index.ts` is re-exported as a
 * whole. Pass `--check` to fail instead of writing when a barrel is stale.
 */
const fs = require('node:fs');
const path = require('node:path');

const srcDir = path.resolve(__dirname, '..', 'src');
const IGNORED_DIRS = new Set(
  'test tests mocks __mocks__ __test__ __tests__ migrations'.split(' '),
);
const IGNORED_FILE = /(\.spec|\.test|\.d)\.ts$/;
const HEADER = /^\/\*[\s\S]*?\*\/\r?\n/;
const EXPORT = /^export \* from '([^']+)';$/;
const HAS_EXPORT = /^\s*export\s/m;

const collect = (dir, rel = '') =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relPath = path.posix.join(rel, entry.name);
    const absPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) return [];
      return fs.existsSync(path.join(absPath, 'index.ts'))
        ? [relPath]
        : collect(absPath, relPath);
    }
    if (
      !entry.isFile() ||
      !entry.name.endsWith('.ts') ||
      IGNORED_FILE.test(entry.name) ||
      (!rel && entry.name === 'index.ts') ||
      // Skip files without exports (emptied or side-effect only modules).
      !HAS_EXPORT.test(fs.readFileSync(absPath, 'utf8'))
    )
      return [];
    return [relPath.slice(0, -3)];
  });

const check = process.argv.includes('--check');
const stale = [];

for (const domain of fs.readdirSync(srcDir, { withFileTypes: true })) {
  const barrel = path.join(srcDir, domain.name, 'index.ts');
  if (!domain.isDirectory() || !fs.existsSync(barrel)) continue;

  const current = fs.readFileSync(barrel, 'utf8');
  const header = current.match(HEADER)?.[0] ?? '';
  // Leave code and annotated barrels untouched rather than losing comments.
  const body = current.slice(header.length).trim();
  const lines = body.split(/\r?\n/).filter(Boolean);
  if (!lines.every((line) => EXPORT.test(line))) continue;
  // Preserve all re-exports outside the domain, including package imports.
  const external = lines.filter(
    (line) => !line.startsWith("export * from './"),
  );
  const exports = [
    ...collect(path.dirname(barrel)).map((p) => `export * from './${p}';`),
    ...external,
  ].sort((a, b) => a.match(EXPORT)[1].localeCompare(b.match(EXPORT)[1], 'en'));
  const next = `${header}\n${exports.join('\n\n')}\n`;

  if (next === current) continue;
  stale.push(path.relative(process.cwd(), barrel));
  if (!check) fs.writeFileSync(barrel, next);
}

if (stale.length) {
  console.log(
    `[hexabot] ${check ? 'Stale' : 'Updated'} barrels:\n  ${stale.join('\n  ')}`,
  );
  if (check) process.exit(1);
}
