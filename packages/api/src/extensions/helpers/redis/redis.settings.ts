/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import z from 'zod';

import { createSettingGroup } from '@/setting/create-setting-group';

import { redisConnectionSettingsShape } from './redis.utils';

export const REDIS_HELPER_NAME = 'redis' as const;

export const redisSettingsSchema = z
  .strictObject({
    enabled: z.boolean().default(false).meta({
      title: 'Enabled',
      description:
        'Turn on Redis: the Socket.IO adapter (applied on restart) and the redis-cache helper.',
    }),
    ...redisConnectionSettingsShape,
  })
  .meta({
    title: 'Redis',
    description:
      'Redis connection shared by the Redis helpers, for multi-node deployments. The Socket.IO adapter applies changes on restart; the redis-cache helper applies them immediately.',
  });

declare global {
  interface RuntimeSettingRegistry {
    [REDIS_HELPER_NAME]: typeof redisSettingsSchema;
  }
}

export const RedisSettingsGroup = createSettingGroup({
  group: REDIS_HELPER_NAME,
  schema: redisSettingsSchema,
  scope: 'extension',
  extensionType: 'helper',
  extensionName: REDIS_HELPER_NAME,
});
