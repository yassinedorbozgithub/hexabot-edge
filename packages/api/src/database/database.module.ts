/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { config } from '@/config';

import { getDialect } from './dialects';
import { TypeormConfigService } from './typeorm-config.service';

/**
 * Database connection and entity providers for the configured DB_TYPE: TypeORM
 * by default, or the modules registered by the database's dialect.
 */
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const { rootModule } = getDialect(config.database.type);

    return rootModule
      ? rootModule()
      : TypeOrmModule.forRootAsync({ useClass: TypeormConfigService });
  }

  /** Provides each entity's repository token (`@InjectRepository(Entity)`). */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  static forFeature(entities: Function[]): DynamicModule {
    const { featureModule } = getDialect(config.database.type);

    return featureModule
      ? featureModule(entities)
      : TypeOrmModule.forFeature(entities);
  }
}
