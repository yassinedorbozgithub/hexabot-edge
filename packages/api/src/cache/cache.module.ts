/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import KeyvRedis from '@keyv/redis';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { CacheableMemory } from 'cacheable';
import { Keyv } from 'keyv';

import { config } from '@/config';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        // first store is primary, subsequent stores are secondary/fallback
        stores: [
          config.cache.type === 'redis'
            ? new KeyvRedis(
                `${config.cache.protocol}//${config.cache.user}:${config.cache.password}@${config.cache.host}:${config.cache.port}`,
              )
            : new Keyv({
                store: new CacheableMemory({
                  ttl: config.cache.ttl,
                  lruSize: config.cache.max,
                }),
              }),
        ],
      }),
    }),
  ],
})
export class CacheModule {}
