/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { TypeormStore } from 'connect-typeorm';
import session from 'express-session';
import { DataSource } from 'typeorm';

import { AppInstance } from '@/app.instance';
import { config } from '@/config';
import { getDialect } from '@/database/dialects';
import { SessionOrmEntity } from '@/user/entities/session.entity';

const toSeconds = (milliseconds: number): number =>
  Math.max(1, Math.floor(milliseconds / 1000));
const logStoreError = (error: Error) => {
  if (config.env === 'test') {
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[session-store] TypeORM store error:', error);
};
const buildStore = (): session.Store => {
  if (!AppInstance.isReady()) {
    return new session.MemoryStore();
  }

  const app = AppInstance.getApp();
  const ttlSeconds =
    config.session.ttlSeconds ?? toSeconds(config.session.cookie.maxAge);
  const { sessionStore } = getDialect(config.database.type);

  // Databases without TypeORM bring their own store
  if (sessionStore) {
    return sessionStore(app, { ttlSeconds });
  }

  const dataSource = app.get(DataSource);

  if (!dataSource.isInitialized) {
    throw new Error('TypeORM data source is not initialized');
  }

  const repository = dataSource.getRepository(SessionOrmEntity);

  return new TypeormStore({
    cleanupLimit: config.session.cleanupLimit,
    limitSubquery: config.session.limitSubquery,
    ttl: ttlSeconds,
    onError: (_store, error) => logStoreError(error),
  }).connect(repository);
};

let sessionStore: session.Store | null = null;

export const getSessionStore = (): session.Store => {
  if (!sessionStore) {
    try {
      sessionStore = buildStore();
    } catch (error) {
      if (config.env !== 'test') {
        // eslint-disable-next-line no-console
        console.warn(
          '[session-store] Falling back to in-memory store:',
          error instanceof Error ? error.message : error,
        );
      }
      sessionStore = new session.MemoryStore();
    }
  }

  return sessionStore;
};
