import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { installArgs, selectedDatabase } from "./install-db.mjs";

const require = createRequire(import.meta.url);
const { readPackage } = require("../.pnpmfile.cjs").hooks;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hexabot-install-db-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const extensions = {
    postgres: { name: "hexabot-helper-postgres", db: "postgres" },
    custom: { name: "hexabot-helper-custom", db: "custom" },
    redis: { name: "hexabot-helper-redis" },
  };
  for (const [name, manifest] of Object.entries(extensions)) {
    const directory = path.join(
      root,
      "packages/api/src/extensions/helpers",
      name,
    );
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, "package.json"),
      JSON.stringify(manifest),
    );
  }
  return root;
}

test("selects DB_TYPE from environment, dotenv, then SQLite", (t) => {
  const root = fixture(t);
  assert.equal(selectedDatabase(root, {}), "sqlite");
  for (const contents of [
    "DB_TYPE=postgres # local DB",
    "export DB_TYPE='postgres'",
  ]) {
    fs.writeFileSync(path.join(root, "packages/api/.env"), contents);
    assert.equal(selectedDatabase(root, {}), "postgres");
    assert.equal(selectedDatabase(root, { DB_TYPE: "custom" }), "custom");
  }
});

test("excludes only helpers tied to other databases", (t) => {
  const root = fixture(t);
  const sqlite = installArgs(root, "sqlite");
  const postgres = installArgs(root, "postgres");
  assert.ok(sqlite.includes("!./packages/api/src/extensions/helpers/postgres"));
  assert.ok(
    !postgres.includes("!./packages/api/src/extensions/helpers/postgres"),
  );
  for (const args of [sqlite, postgres]) {
    assert.ok(args.includes("--frozen-lockfile"));
    assert.ok(args.includes("!./packages/api/src/extensions/helpers/custom"));
    assert.ok(!args.some((arg) => arg.includes("redis")));
  }
});

test("appends exclusions after supplied filters without selecting all projects", (t) => {
  const root = fixture(t);
  const options = [
    "--filter",
    "@hexabot-ai/api...",
    "--filter",
    "./packages/api/src/extensions/**",
    "--prod",
  ];
  const args = installArgs(root, "sqlite", options);
  assert.deepEqual(args.slice(0, options.length + 2), [
    "install",
    "--frozen-lockfile",
    ...options,
  ]);
  assert.ok(!args.includes("*"));
  assert.ok(args.at(-1).startsWith("!./packages/api/src/extensions/"));
});

test("works with removed extensions or no extensions directory", (t) => {
  const root = fixture(t);
  fs.rmSync(path.join(root, "packages/api/src/extensions"), {
    recursive: true,
  });
  assert.deepEqual(installArgs(root, "sqlite"), [
    "install",
    "--frozen-lockfile",
    "--filter",
    "*",
  ]);
});

test("removes only TypeORM's optional Postgres peers, leaving helper dependencies intact", () => {
  const typeorm = {
    name: "typeorm",
    peerDependencies: { pg: "^8", "pg-query-stream": "^4", redis: "^5" },
    peerDependenciesMeta: {
      pg: { optional: true },
      "pg-query-stream": { optional: true },
      redis: { optional: true },
    },
  };
  readPackage(typeorm);
  assert.deepEqual(typeorm.peerDependencies, { redis: "^5" });
  assert.deepEqual(typeorm.peerDependenciesMeta, { redis: { optional: true } });
  const helper = {
    name: "hexabot-helper-postgres",
    dependencies: { pg: "^8" },
  };
  assert.deepEqual(readPackage(structuredClone(helper)), helper);
  const requiredPeer = { name: "typeorm", peerDependencies: { pg: "^8" } };
  assert.deepEqual(readPackage(structuredClone(requiredPeer)), requiredPeer);
});
