/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { registerDialect } from '@/database/dialects';

declare global {
  interface DatabaseDialectRegistry {
    postgres: true;
  }
}

registerDialect('postgres', {
  columnTypes: {
    datetime: 'timestamptz',
    enum: 'enum',
    json: 'json',
  },
  typeOrmOptions: (db) => ({
    type: 'postgres',
    url: db.url,
    host: db.url ? undefined : db.host,
    port: db.url ? undefined : (db.port ?? 5432),
    username: db.url ? undefined : db.username,
    password: db.url ? undefined : db.password,
    database: db.url ? undefined : db.database,
    schema: db.schema,
  }),
});
