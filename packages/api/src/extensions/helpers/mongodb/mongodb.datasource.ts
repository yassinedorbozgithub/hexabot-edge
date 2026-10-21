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

  private async ensureIndexes() {
    const created = new Set<string>();
    for (const metadata of this.entityMetadatas.filter(
      (item) => !item.isJunction && item.tableName !== 'sessions',
    )) {
      const collection = this.db.collection(metadata.tableName);
      await collection.createIndex({ id: 1 }, { unique: true });
      for (const index of metadata.indices) {
        const fields = Object.fromEntries(
          index.columns.map((column) => [
            column.relationMetadata?.propertyName ?? column.propertyPath,
            1 as const,
          ]),
        );

        if (!Object.keys(fields).length) continue;
        const owner = this.entityMetadatas.find(
          (item) => item.target === index.target,
        );
        const discriminator =
          index.isUnique && owner?.tableType === 'entity-child'
            ? owner.discriminatorValue
            : undefined;
        const key = JSON.stringify([metadata.tableName, fields, discriminator]);

        if (created.has(key)) continue;
        created.add(key);
        await collection.createIndex(fields, {
          unique: index.isUnique,
          ...(discriminator
            ? {
                partialFilterExpression: { type: discriminator },
                name: `${index.name}_${discriminator}`,
              }
            : {}),
        });
      }
    }
  }

  async ensureTextIndex() {
    const metadata = this.entityMetadatas.find(
      (item) => item.targetName === 'ContentOrmEntity',
    );

    if (metadata)
      await this.db
        .collection(metadata.tableName)
        .createIndex(
          { title: 'text', searchText: 'text' },
          { name: 'content_text', default_language: 'none' },
        );
  }

  override getRepository<Entity extends ObjectLiteral>(
    target: EntityTarget<Entity>,
  ): Repository<Entity> {
    return new NativeMongoRepository(target, this.manager, this);
  }

  async withTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    if (this.session) return work(this.manager);
    const session = this.client.startSession();
    try {
      return await session.withTransaction(() =>
        this.sessions.run(session, () => work(this.manager)),
      );
    } finally {
      await session.endSession();
    }
  }

  override async destroy() {
    await this.client?.close();
    Object.assign(this, { isInitialized: false });
  }

  async onApplicationShutdown() {
    await this.destroy();
  }
}
