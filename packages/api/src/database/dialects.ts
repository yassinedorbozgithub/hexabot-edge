/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { globSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

import type { ColumnType, DataSourceOptions } from 'typeorm';

import type { config } from '@/config';

declare global {
  /**
   * Databases Hexabot can run on. Extensions augment it (e.g. the `postgres`
   * helper) and call `registerDialect` from a `<db>.dialect` module.
   */
  interface DatabaseDialectRegistry {
    sqlite: true;
  }
}

export type DatabaseDialect = keyof DatabaseDialectRegistry;

export type ColumnKind = 'datetime' | 'enum' | 'json';

export type DatabaseConfig = typeof config.database;

export type DialectDefinition = {
  /**
   * Column types used by the `DatetimeColumn`, `EnumColumn`, `JsonColumn`
   * decorators. Omitted by non-SQL databases.
   */
  columnTypes?: Record<ColumnKind, ColumnType>;
  /** Driver-specific TypeORM connection options, merged over the shared ones */
  typeOrmOptions: (db: DatabaseConfig) => Partial<DataSourceOptions>;
};

const dialects: Partial<Record<DatabaseDialect, DialectDefinition>> = {
  sqlite: {
    columnTypes: {
      datetime: 'datetime',
      enum: 'simple-enum',
      json: 'simple-json',
    },
    typeOrmOptions: (db) => ({
      type: 'better-sqlite3',
      database: db.sqlitePath ?? 'hexabot.sqlite',
    }),
  },
};

export const registerDialect = (
  dialect: DatabaseDialect,
  definition: DialectDefinition,
) => {
  dialects[dialect] = definition;
};

const searchedDialects = new Set<string>();
/**
 * Loads the `<db>.dialect` module from the built-in helpers or from installed
 * `hexabot-helper-*` packages. Runs synchronously, so it works before helpers
 * are initialized (entity decorators, TypeORM options, CLI).
 */
const loadDialect = (dbType: string) => {
  const sources = [
    {
      directory: join(__dirname, '../extensions/helpers'),
      pattern: '*/*.dialect.{js,ts}',
      extension: extname(__filename),
    },
  ];

  // Resolve from the API's location, including package-local and hoisted
  // node_modules. Scan each package as a root so pnpm symlinks work too.
  for (const directory of require.resolve.paths('hexabot-helper-') ?? []) {
    for (const helper of globSync('hexabot-helper-*', { cwd: directory })) {
      sources.push({
        directory: join(directory, helper),
        pattern: '**/*.dialect.js',
        extension: '.js',
      });
    }
  }

  for (const { directory, pattern, extension } of sources) {
    const filename = `${dbType}.dialect${extension}`;
    // Skip nested node_modules: slow, and may hold other packages' files
    for (const file of globSync(pattern, {
      cwd: directory,
      exclude: (path) => basename(path) === 'node_modules',
    })) {
      if (basename(file) !== filename) continue;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require(join(directory, file));

      if (Object.hasOwn(dialects, dbType)) return;
    }
  }
};

/**
 * Returns the registered dialect for `dbType`, loading its `<db>.dialect`
 * module on first use. Each missing dialect is searched only once.
 */
export const getDialect = (dbType: string): DialectDefinition => {
  if (!Object.hasOwn(dialects, dbType) && !searchedDialects.has(dbType)) {
    loadDialect(dbType);
    searchedDialects.add(dbType);
  }

  const dialect = Object.hasOwn(dialects, dbType)
    ? dialects[dbType as DatabaseDialect]
    : undefined;

  if (!dialect) {
    throw new Error(`Unsupported database type: ${dbType}`);
  }

  return dialect;
};
