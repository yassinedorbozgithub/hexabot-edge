/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  buildRedisUrl,
  hasOptional,
  REDIS_HELPER_NAME,
  redisSettingsSchema,
  requireOptional,
} from 'hexabot-helper-redis';

import { BaseCacheHelper } from '@/helper/lib/base-cache-helper';
import { CredentialService } from '@/user/services/credential.service';

export const REDIS_CACHE_HELPER_NAME = 'redis-cache' as const;

// Without a timeout, connecting to an unreachable host retries forever
const CONNECTION_TIMEOUT_MS = 5000;

/**
 * Moves the primary cache store to Redis so every API node shares one cache.
 * It is listed only when `@keyv/redis` is installed, and connects with the
 * `redis` helper's settings. While that helper is disabled, the default cache
 * helper is used instead.
 */
@Injectable()
export default class RedisCacheHelper extends BaseCacheHelper<
  typeof REDIS_CACHE_HELPER_NAME
> {
  @Inject(CredentialService)
  private readonly credentialService: CredentialService;

  constructor() {
    super(REDIS_CACHE_HELPER_NAME);
  }

  public override isAvailable(): boolean {
    return hasOptional('@keyv/redis');
  }

  public override getSettingsGroup() {
    return REDIS_HELPER_NAME;
  }

  public override isEnabled(settings: unknown): boolean {
    return !!redisSettingsSchema.safeParse(settings ?? {}).data?.enabled;
  }

  protected async createStore(settings: unknown) {
    const redisSettings = redisSettingsSchema.parse(settings ?? {});
    const { default: KeyvRedis } =
      requireOptional<typeof import('@keyv/redis')>('@keyv/redis');
    const url = await buildRedisUrl(redisSettings, this.credentialService);
    const store = new KeyvRedis(url, {
      connectionTimeout: CONNECTION_TIMEOUT_MS,
    });

    // Connect before taking over: on failure the current store keeps serving,
    // rather than a store that fails every cache call
    await store.getClient();

    return store;
  }
}
