/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { getMetadataArgsStorage } from 'typeorm';

import { config } from '@/config';

import { DatetimeColumn } from './datetime-column.decorator';
import { EnumColumn } from './enum-column.decorator';
import { JsonColumn } from './json-column.decorator';

jest.mock('@/config', () => ({
  config: { database: { type: 'sqlite' } },
}));

describe('SQL column decorators', () => {
  afterEach(() => {
    config.database.type = 'sqlite';
  });

  it('loads Postgres types on a fresh entity import before helpers load', () => {
    config.database.type = 'postgres';
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BaseOrmEntity } = require('../entities/base.entity');
      const columns = getMetadataArgsStorage().columns.filter(
        (column) => column.target === BaseOrmEntity,
      );
      expect(
        columns.filter((column) => column.options.type === 'timestamptz'),
      ).toHaveLength(2);
    });
  });

  it.each(['sqlite', 'postgres'] as const)(
    'preserves column options and schema types for %s',
    (dialect) => {
      config.database.type = dialect;
      class Entity {}
      DatetimeColumn({ nullable: true })(Entity.prototype, 'createdAt');
      JsonColumn({ name: 'payload', nullable: true })(Entity.prototype, 'data');
      EnumColumn({ enum: ['open', 'closed'], default: 'open' })(
        Entity.prototype,
        'status',
      );

      const columns = getMetadataArgsStorage().columns.filter(
        (column) => column.target === Entity,
      );
      expect(columns.map((column) => column.options)).toEqual([
        {
          type: dialect === 'sqlite' ? 'datetime' : 'timestamptz',
          nullable: true,
        },
        {
          type: dialect === 'sqlite' ? 'simple-json' : 'json',
          name: 'payload',
          nullable: true,
        },
        {
          type: dialect === 'sqlite' ? 'simple-enum' : 'enum',
          enum: ['open', 'closed'],
          default: 'open',
        },
      ]);
    },
  );

  it.each(['mongodb', 'mysql', 'toString'])(
    'rejects unsupported database %s for every decorator',
    (dialect) => {
      config.database.type = dialect as typeof config.database.type;
      expect(() => DatetimeColumn()).toThrow(/support/i);
      expect(() => JsonColumn()).toThrow(/support/i);
      expect(() => EnumColumn({ enum: ['open'] })).toThrow(/support/i);
    },
  );

  it('requires enum values at compile time and runtime', () => {
    // @ts-expect-error enum is required even when other options are supplied
    expect(() => EnumColumn({ nullable: true })).toThrow(
      'EnumColumn requires the enum option to be provided.',
    );
  });
});
