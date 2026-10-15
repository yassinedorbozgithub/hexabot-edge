/**
 * Install the workspace with only the selected database's extensions.
 * Usage: node scripts/install-db.mjs [pnpm install options]
 * DB_TYPE: environment > packages/api/.env > sqlite.
 * Package declarations and pnpm-lock.yaml are independent of that choice.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

const ROOT = path.resolve(import.meta.dirname, "..");

export function selectedDatabase(root, env = process.env) {
  if (env.DB_TYPE) return env.DB_TYPE;

  try {
    return (
      parseEnv(fs.readFileSync(path.join(root, "packages/api/.env"), "utf8"))
        .DB_TYPE || "sqlite"
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return "sqlite";
  }
}

export function installArgs(root, database, options = []) {
  const hasFilter = options.some(
    (option) =>
      option === "--filter" ||
      option.startsWith("--filter=") ||
      option === "--filter-prod" ||
      option.startsWith("--filter-prod=") ||
      option === "-F" ||
      option.startsWith("-F="),
  );
  const args = [
    "install",
    "--frozen-lockfile",
    ...(hasFilter ? [] : ["--filter", "*"]),
    ...options,
  ];

  for (const file of fs.globSync(
    "packages/api/src/extensions/*/*/package.json",
    {
      cwd: root,
    },
  )) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    if (manifest.db && manifest.db !== database) {
      // Keep exclusions last: later pnpm filters can re-include projects.
      const directory = path.dirname(file).split(path.sep).join("/");
      args.push("--filter", `!./${directory}`);
    }
  }

  return args;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const database = selectedDatabase(ROOT);
  const result = spawnSync(
    "pnpm",
    installArgs(ROOT, database, process.argv.slice(2)),
    { cwd: ROOT, stdio: "inherit", env: { ...process.env, DB_TYPE: database } },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
