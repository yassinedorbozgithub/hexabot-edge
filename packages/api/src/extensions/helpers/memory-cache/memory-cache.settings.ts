/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import z from 'zod';

import { createSettingGroup } from '@/setting/create-setting-group';

export const MEMORY_CACHE_HELPER_NAME = 'memory-cache' as const;

export const memoryCacheSettingsSchema = z
  .strictObject({
    ttl: z
      .number()
      .int()
      .min(0)
      .default(300000)
      .meta({
        title: 'TTL',
        description:
          'Time (in milliseconds) an entry stays in the cache. 0 disables expiry.',
        'ui:options': {
          step: 1000,
        },
      }),
    max: z.number().int().min(1).default(100).meta({
      title: 'Maximum entries',
      description:
        'Maximum number of entries kept in the cache before the least recently used ones are evicted.',
    }),
  })
  .meta({
    title: 'Memory Cache',
    description:
      'In-memory cache store, local to each API node. Used when selected as the default cache helper.',
  });

declare global {
  interface RuntimeSettingRegistry {
    [MEMORY_CACHE_HELPER_NAME]: typeof memoryCacheSettingsSchema;
  }
}

export const MemoryCacheSettingsGroup = createSettingGroup({
  group: MEMORY_CACHE_HELPER_NAME,
  schema: memoryCacheSettingsSchema,
  scope: 'extension',
  extensionType: 'helper',
  extensionName: MEMORY_CACHE_HELPER_NAME,
});
