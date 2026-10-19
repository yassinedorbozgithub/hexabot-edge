/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createRequire } from 'node:module';

import { registerDialect } from '@/database/dialects';

const requireModule = createRequire(__filename);

declare global {
  interface DatabaseDialectRegistry {
    mongodb: true;
  }
}

registerDialect('mongodb', {
  // These describe existing entity metadata only; BSON values are stored natively.
  columnTypes: {
    datetime: 'datetime',
    enum: 'simple-enum',
    json: 'simple-json',
  },
  typeOrmOptions: () => ({ type: 'mongodb' }),
  rootModule: () => {
    const { MongoDBModule } = requireModule(
      './mongodb.module',
    ) as typeof import('./mongodb.module');

    return MongoDBModule.forRoot();
  },
  featureModule: (entities) => {
    const { MongoDBModule } = requireModule(
      './mongodb.module',
    ) as typeof import('./mongodb.module');

    return MongoDBModule.forFeature(entities);
  },
  sessionStore: (app, { ttlSeconds }) => {
    const { MongoDBDataSource } = requireModule(
      './mongodb.datasource',
    ) as typeof import('./mongodb.datasource');
    const MongoStore = requireModule(
      'connect-mongo',
    ) as typeof import('connect-mongo');
    const source = app.get(MongoDBDataSource);

    return MongoStore.create({
      client: source.client,
      dbName: source.db.databaseName,
      ttl: ttlSeconds,
    });
  },
});
