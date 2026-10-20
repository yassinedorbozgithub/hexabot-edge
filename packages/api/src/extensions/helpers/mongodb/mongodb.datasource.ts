/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

import type { OnApplicationShutdown } from '@nestjs/common';
import type { ClientSession, Db, MongoClient } from 'mongodb';
import type { EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { DataSource, EntityManager, getMetadataArgsStorage } from 'typeorm';
import { ConnectionMetadataBuilder } from 'typeorm/connection/ConnectionMetadataBuilder';

import type { DatabaseConfig } from '@/database/dialects';

import { NativeMongoRepository } from './mongodb.repository';

/** Native MongoDB persistence with the existing TypeORM metadata/API boundary. */
export class MongoDBDataSource
  extends DataSource
  implements OnApplicationShutdown
{
  client: MongoClient;

  db: Db;

  private readonly sessions = new AsyncLocalStorage<ClientSession>();

  constructor(private readonly databaseConfig: DatabaseConfig) {
    super({ type: 'mongodb', database: databaseConfig.database });
    Object.assign(this, { manager: new NativeMongoManager(this) });
  }

  get session() {
    return this.sessions.getStore();
  }

  /**
   * Builds the connection URI from the discrete DB_* values. A direct
   * connection is used so a single-node replica set exposed on a remapped
   * port (e.g. Docker) is not rediscovered through its advertised address.
   */
  private buildUrl(): string {
    const { host, port, username, password } = this.databaseConfig;
    const credentials = username
      ? `${encodeURIComponent(username)}:${encodeURIComponent(password ?? '')}@`
      : '';
    const params = new URLSearchParams({ directConnection: 'true' });

    if (username) params.set('authSource', 'admin');

    return `mongodb://${credentials}${host}:${port ?? 27017}/?${params}`;
  }

  override async initialize(): Promise<this> {
    if (this.isInitialized) return this;
    const { MongoClient } = await import('mongodb');
    const options = this.databaseConfig;
    this.client = new MongoClient(options.url || this.buildUrl(), {
      serverSelectionTimeoutMS: 5000,
    });
    try {
      await this.client.connect();
      this.db = this.client.db(options.database);
      const topology = await this.db.admin().command({ hello: 1 });

      if (!topology.setName && topology.msg !== 'isdbgrid') {
        throw new Error(
          'Hexabot MongoDB requires a replica set (a single-node replica set is sufficient) or a sharded cluster for atomic writes and workflow imports.',
        );
      }
      // Build metadata without TypeORM's SQL synchronization or Mongo ObjectId
      // validation: Hexabot keeps its UUID ids in BSON documents.
      const entities = getMetadataArgsStorage().tables.map(
        ({ target }) => target,
      );
      const entityMetadatas = await new ConnectionMetadataBuilder(
        this,
      ).buildEntityMetadatas(entities);
      Object.assign(this, {
        entityMetadatas,
        entityMetadatasMap: new Map(
          entityMetadatas.map((metadata) => [metadata.target, metadata]),
        ),
      });
      await this.ensureIndexes();
      await this.ensureTextIndex();
      Object.assign(this, { isInitialized: true });

      return this;
    } catch (error) {
      await this.client.close();
      throw error;
    }
  }
}
