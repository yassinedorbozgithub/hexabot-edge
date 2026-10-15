/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

// Fixtures compile the resolver to plain JS so they exercise Node's loader.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import ts from 'typescript';

import type * as Dialects from './dialects';

const nativeRequire = createRequire(__filename);
// Compiled once from the source, so the spec does not depend on a build
const compiledResolver = ts
  .transpileModule(
    fs.readFileSync(path.join(__dirname, 'dialects.ts'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  )
  .outputText.replace('require("@/config")', 'require("../config")');
const fixtureRoots: string[] = [];

afterEach(() => {
  jest.restoreAllMocks();
  for (const root of fixtureRoots.splice(0)) {
    for (const filename of Object.keys(nativeRequire.cache)) {
      if (filename.startsWith(`${root}${path.sep}`)) {
        delete nativeRequire.cache[filename];
      }
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function fixture(dialect: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hexabot-dialects-'));
  fixtureRoots.push(root);
  const api = path.join(root, 'packages/api');
  const resolverPath = path.join(api, 'dist/database/dialects.js');
  fs.mkdirSync(path.dirname(resolverPath), { recursive: true });
  fs.writeFileSync(resolverPath, compiledResolver);
  const configDir = path.join(api, 'dist/config');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'index.js'),
    `exports.config = { database: { type: ${JSON.stringify(dialect)} } };`,
  );

  return {
    root,
    api,
    resolverPath,
    resolve: (kind: Dialects.ColumnKind) =>
      (nativeRequire(resolverPath) as typeof Dialects).getDialect(dialect)
        .columnTypes?.[kind],
  };
}

for (const location of ['package', 'workspace', 'symlink']) {
  test(`discovers community registration in ${location} node_modules`, () => {
    const { root, api, resolverPath, resolve } = fixture('community');
    const modules = path.join(
      location === 'package' ? api : root,
      'node_modules',
    );
    const helper = path.join(modules, 'hexabot-helper-community');
    fs.mkdirSync(modules, { recursive: true });

    if (location === 'symlink') {
      const target = path.join(root, 'store/community');
      fs.mkdirSync(target, { recursive: true });
      fs.symlinkSync(target, helper, 'dir');
    }
    fs.mkdirSync(path.join(helper, 'dist'), { recursive: true });
    fs.writeFileSync(
      path.join(helper, 'dist/community.dialect.js'),
      `require(${JSON.stringify(resolverPath)}).registerDialect('community', { columnTypes: { datetime: 'timestamptz', json: 'json', enum: 'enum' }, typeOrmOptions: () => ({}) });`,
    );
    fs.writeFileSync(
      path.join(helper, 'dist/index.helper.js'),
      "throw new Error('Helper must not be loaded');",
    );
    expect(resolve('datetime')).toBe('timestamptz');
    expect(resolve('json')).toBe('json');
    expect(resolve('enum')).toBe('enum');
  });
}

test('ignores registrations nested in a helper node_modules', () => {
  const { api, resolve } = fixture('nested');
  const nested = path.join(
    api,
    'node_modules/hexabot-helper-nested/node_modules/other/dist',
  );
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(
    path.join(nested, 'nested.dialect.js'),
    "throw new Error('Nested registration must not be loaded');",
  );
  expect(() => resolve('json')).toThrow(/Unsupported database type/);
});

test('does not repeat discovery after a missing registration', () => {
  const { resolve } = fixture('missing');
  const spy = jest.spyOn(fs, 'globSync');
  expect(() => resolve('json')).toThrow(/Unsupported database type/);
  const calls = spy.mock.calls.length;
  expect(calls).toBeGreaterThan(0);
  expect(() => resolve('enum')).toThrow(/Unsupported database type/);
  expect(spy).toHaveBeenCalledTimes(calls);
});

test('uses built-in registration without loading helper modules', () => {
  const { api, resolverPath, resolve } = fixture('postgres');
  const directory = path.join(api, 'dist/extensions/helpers/postgres');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, 'postgres.dialect.js'),
    `require(${JSON.stringify(resolverPath)}).registerDialect('postgres', { columnTypes: { datetime: 'timestamptz', json: 'json', enum: 'enum' }, typeOrmOptions: () => ({}) });`,
  );
  expect(resolve('datetime')).toBe('timestamptz');
});
