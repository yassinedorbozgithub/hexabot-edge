/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createRequire } from 'node:module';

import z from 'zod';

import type { CredentialService } from '@/user/services/credential.service';

const requireModule = createRequire(__filename);

/**
 * Requires an optional Redis dependency. These packages are only loaded once
 * a Redis helper is selected, so the API starts without them.
 */
export const requireOptional = <T>(packageName: string): T => {
  try {
    return requireModule(packageName) as T;
  } catch (error) {
    throw new Error(
      `The Redis helpers require the optional package "${packageName}" to be installed.`,
      { cause: error },
    );
  }
};

/**
 * Connection settings shared by the `redis` and `redis-cache` helpers.
 */
export const redisConnectionSettingsShape = {
  host: z.string().min(1).default('localhost').meta({
    title: 'Host',
    description: 'Hostname of the Redis instance.',
  }),
  port: z.number().int().min(1).max(65535).default(6379).meta({
    title: 'Port',
    description: 'Port exposed by the Redis instance.',
  }),
  secure: z.boolean().default(false).meta({
    title: 'TLS',
    description: 'Connect to Redis over TLS (rediss://).',
  }),
  user: z.string().default('').meta({
    title: 'User',
    description: 'Optional Redis username when ACLs are enabled.',
  }),
  password: z
    .string()
    .default('')
    .meta({
      title: 'Password',
      description: 'Optional credential holding the Redis password.',
      'ui:widget': 'AutoCompleteWidget',
      'ui:options': {
        entity: 'Credential',
        valueKey: 'id',
        labelKey: 'name',
        enableEntityAddButton: true,
      },
    }),
};

export type RedisConnectionSettings = z.infer<
  z.ZodObject<typeof redisConnectionSettingsShape>
>;

/**
 * Builds the Redis connection URL, resolving the password credential.
 */
export const buildRedisUrl = async (
  { host, port, secure, user, password }: RedisConnectionSettings,
  credentialService: Pick<CredentialService, 'findOneValue'>,
): Promise<string> => {
  // An empty id must not reach the lookup: `{ id: undefined }` matches any row
  const secret = password ? await credentialService.findOneValue(password) : '';
  const auth =
    user || secret
      ? `${encodeURIComponent(user)}:${encodeURIComponent(secret)}@`
      : '';

  return `${secure ? 'rediss' : 'redis'}://${auth}${host}:${port}`;
};
