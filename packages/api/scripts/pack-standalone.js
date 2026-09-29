#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Creates an npm tarball of the API that bundles @hexabot-ai/agentic and
 * @hexabot-ai/types. The manifest is temporarily rewritten (workspace ranges
 * pinned, bundleDependencies added) for `npm pack`, then restored.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const apiRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(apiRoot, 'package.json');
const BUNDLED = ['@hexabot-ai/agentic', '@hexabot-ai/types'];

const readManifest = (name) => {
  const file = path.join(apiRoot, '..', name.split('/')[1], 'package.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const original = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(original);

// npm does not understand the workspace protocol: pin to local versions.
for (const deps of [manifest.dependencies, manifest.devDependencies]) {
  for (const [name, range] of Object.entries(deps || {})) {
    if (range.startsWith('workspace:')) {
      deps[name] = readManifest(name).version;
    }
  }
}

// Bundled packages' own dependencies are not bundled by npm: declare them on
// the API so they get installed alongside it.
for (const name of BUNDLED) {
  const deps = readManifest(name).dependencies || {};
  for (const [dep, range] of Object.entries(deps)) {
    manifest.dependencies[dep] ??= range;
  }
}

manifest.bundleDependencies = BUNDLED;

for (const file of fs.readdirSync(apiRoot)) {
  if (file.endsWith('.tgz')) fs.rmSync(path.join(apiRoot, file));
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

try {
  execFileSync('npm', ['pack', '--ignore-scripts'], {
    cwd: apiRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
} catch {
  process.exitCode = 1;
} finally {
  fs.writeFileSync(manifestPath, original);
}
