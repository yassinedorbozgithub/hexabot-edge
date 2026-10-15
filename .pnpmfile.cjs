/**
 * Database drivers are owned by their helper extension (the one whose
 * package.json sets `db`), rather than pulled in through other packages'
 * optional peers (e.g. typeorm's). Independent of DB_TYPE, so every database
 * uses the same dependency graph and lockfile.
 */
const fs = require("fs");
const path = require("path");

const EXTENSIONS_DIR = path.join(__dirname, "packages/api/src/extensions");

// Scan once when pnpm loads the hook, not for every package it resolves.
const ownedPackages = new Set();

// Some images (e.g. the widget's) install without the API extensions
if (fs.existsSync(EXTENSIONS_DIR)) {
  for (const type of fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true })) {
    if (!type.isDirectory()) continue;

    const typeDir = path.join(EXTENSIONS_DIR, type.name);
    for (const name of fs.readdirSync(typeDir)) {
      const file = path.join(typeDir, name, "package.json");
      if (!fs.existsSync(file)) continue;

      const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!pkg.db) continue;

      for (const dependency of Object.keys(pkg.dependencies ?? {})) {
        ownedPackages.add(dependency);
      }
    }
  }
}

function readPackage(pkg) {
  for (const name of ownedPackages) {
    if (pkg.peerDependenciesMeta?.[name]?.optional) {
      delete pkg.peerDependencies?.[name];
      delete pkg.peerDependenciesMeta[name];
    }
  }

  return pkg;
}

module.exports = { hooks: { readPackage } };
