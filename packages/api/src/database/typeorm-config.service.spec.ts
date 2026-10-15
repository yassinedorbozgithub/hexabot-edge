/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import '@/extensions/helpers/postgres/postgres.dialect';

import { config } from '@/config';

import { TypeormConfigService } from './typeorm-config.service';

jest.mock('@/config', () => ({
  config: {
    database: { type: 'sqlite', synchronize: false, logging: false },
  },
}));

describe('TypeormConfigService', () => {
  const database = { ...config.database };

  afterEach(() => {
    config.database = { ...database };
  });

  const createOptions = (overrides: Partial<typeof config.database>) => {
    Object.assign(config.database, overrides);

    return new TypeormConfigService().createTypeOrmOptions();
  };

  it('uses the built-in sqlite dialect', () => {
    expect(createOptions({ sqlitePath: '/data/test.sqlite' })).toMatchObject({
      type: 'better-sqlite3',
      database: '/data/test.sqlite',
      autoLoadEntities: true,
    });
  });

  it('uses the options registered by the postgres dialect', () => {
    expect(
      createOptions({
        type: 'postgres',
        host: 'db',
        username: 'hexabot',
        password: 'secret',
        database: 'hexabot',
        schema: 'public',
      }),
    ).toMatchObject({
      type: 'postgres',
      host: 'db',
      port: 5432,
      username: 'hexabot',
      password: 'secret',
      database: 'hexabot',
      schema: 'public',
    });
  });

  it('prefers the postgres url over individual settings', () => {
    expect(
      createOptions({
        type: 'postgres',
        url: 'postgres://u:p@db:5433/hexabot',
        host: 'ignored',
      }),
    ).toMatchObject({
      type: 'postgres',
      url: 'postgres://u:p@db:5433/hexabot',
      host: undefined,
      port: undefined,
    });
  });

  it('rejects databases without a registered dialect', () => {
    expect(() =>
      createOptions({ type: 'mysql' as typeof config.database.type }),
    ).toThrow(/Unsupported database type: mysql/);
  });
});
