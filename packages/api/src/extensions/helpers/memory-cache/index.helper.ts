/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Injectable } from '@nestjs/common';
import { CacheableMemory } from 'cacheable';

import { BaseCacheHelper } from '@/helper/lib/base-cache-helper';

import {
  MEMORY_CACHE_HELPER_NAME,
  memoryCacheSettingsSchema,
} from './memory-cache.settings';

/**
 * Default in-memory cache store, bounded by its `ttl` and `max` (LRU size)
 * settings. Each API node keeps its own copy.
 */
@Injectable()
export default class MemoryCacheHelper extends BaseCacheHelper<
  typeof MEMORY_CACHE_HELPER_NAME
> {
  constructor() {
    super(MEMORY_CACHE_HELPER_NAME);
  }

  protected async createStore(settings: unknown) {
    const { ttl, max } = memoryCacheSettingsSchema.parse(settings ?? {});

    return new CacheableMemory({ ttl, lruSize: max });
  }
}
