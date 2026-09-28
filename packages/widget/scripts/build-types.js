/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

/**
 * Emits declarations with `tsc`, then adds `.js` extensions to their relative
 * imports: this package is ESM, so strict NodeNext consumers cannot resolve
 * extensionless specifiers such as `./ChatWidget`.
 */

import { execFileSync } from "node:child_process";
import { existsSync, globSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");

execFileSync(
  process.execPath,
  [
    join(dirname(require.resolve("typescript7/package.json")), "bin/tsc"),
    "-p",
    "tsconfig.build.json",
    "--declarationMap",
    "false",
  ],
  { cwd: root, stdio: "inherit" },
);

// Stylesheet side-effect imports carry no types and do not exist next to the
// published declarations.
const STYLE_IMPORT = /^import\s+(["'])[^"']+\.(?:css|scss|sass|less)\1;\r?\n/gm;
const RELATIVE_SPECIFIER =
  /((?:from|import)\s*\(?\s*)(["'])(\.{1,2}\/[^"']+)\2/g;
const unresolved = [];

for (const file of globSync("**/*.d.ts", { cwd: distDir })) {
  const filePath = join(distDir, file);
  const source = readFileSync(filePath, "utf8");
  const output = source
    .replace(STYLE_IMPORT, "")
    .replace(RELATIVE_SPECIFIER, (match, prefix, quote, specifier) => {
      if (specifier.endsWith(".js")) return match;
      const target = resolve(dirname(filePath), specifier);

      if (existsSync(`${target}.d.ts`)) {
        return `${prefix}${quote}${specifier}.js${quote}`;
      }
      if (existsSync(join(target, "index.d.ts"))) {
        return `${prefix}${quote}${specifier}/index.js${quote}`;
      }
      unresolved.push(`${file}: ${specifier}`);

      return match;
    });

  if (output !== source) writeFileSync(filePath, output);
}

if (unresolved.length) {
  process.stderr.write(
    `Unresolved declaration imports:\n  ${unresolved.join("\n  ")}\n`,
  );
  process.exit(1);
}
