/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

import { config } from '@/config';
import { SessionOrmEntity } from '@/user/entities/session.entity';

import { getDialect } from './dialects';

@Injectable()
export class TypeormConfigService implements TypeOrmOptionsFactory {
  createTypeOrmOptions(): TypeOrmModuleOptions {
    const db = config.database;
    const base = {
      synchronize: db.synchronize,
      logging: db.logging,
      autoLoadEntities: true,
      entities: [SessionOrmEntity],
    };

    // Driver options come from the registered dialect: sqlite is built in,
    // other databases are registered by their helper's `<db>.dialect`.
    return {
      ...base,
      ...getDialect(db.type).typeOrmOptions(db),
    } as TypeOrmModuleOptions;
  }
}
