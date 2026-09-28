#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Copies non-TypeScript assets from src into dist (replaces the Nest CLI "assets" option).
 */

const fs = require('node:fs');
const path = require('node:path');

const apiRoot = path.resolve(__dirname, '..');
const srcDir = path.join(apiRoot, 'src');
const distDir = path.join(apiRoot, 'dist');
const patterns = [
  'config/i18n/**/*',
  'extensions/**/i18n/**/*',
  'templates/**/*.mjml',
];

let count = 0;
for (const file of fs.globSync(patterns, { cwd: srcDir })) {
  const source = fs.realpathSync(path.join(srcDir, file));
  if (!fs.statSync(source).isFile()) continue;
  fs.cpSync(source, path.join(distDir, file));
  count++;
}

console.log(`[hexabot] Copied ${count} assets to dist`);
