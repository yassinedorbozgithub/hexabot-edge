/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { DynamicModule, Module } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { config } from '@/config';

import { MongoDBDataSource } from './mongodb.datasource';

@Module({})
export class MongoDBModule {
  static forRoot(): DynamicModule {
    return {
      module: MongoDBModule,
      global: true,
      providers: [
        {
          provide: MongoDBDataSource,
          useFactory: async () =>
            new MongoDBDataSource(config.database).initialize(),
        },
        { provide: DataSource, useExisting: MongoDBDataSource },
      ],
      exports: [MongoDBDataSource, DataSource],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  static forFeature(entities: Function[]): DynamicModule {
    const providers = entities.map((entity) => ({
      provide: getRepositoryToken(entity),
      inject: [MongoDBDataSource],
      useFactory: (source: MongoDBDataSource) => source.getRepository(entity),
    }));

    return { module: MongoDBModule, providers, exports: providers };
  }
}
