/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { INestApplication, Inject, Injectable } from '@nestjs/common';

import BaseHelper from '@/helper/lib/base-helper';
import { HelperType } from '@/helper/types';
import { CredentialService } from '@/user/services/credential.service';

import { RedisIoAdapter } from './redis-io.adapter';
import { REDIS_HELPER_NAME, redisSettingsSchema } from './redis.settings';
import { buildRedisUrl, hasOptional } from './redis.utils';

/**
 * Moves the Socket.IO adapter to Redis so events reach clients connected to
 * any API node. It is a no-op unless its `enabled` setting is on, and is read
 * once at startup.
 */
@Injectable()
export default class RedisHelper extends BaseHelper<typeof REDIS_HELPER_NAME> {
  protected readonly type = HelperType.DB;

  @Inject(CredentialService)
  private readonly credentialService: CredentialService;

  constructor() {
    super(REDIS_HELPER_NAME);
  }

  public override isAvailable(): boolean {
    return hasOptional('redis', '@socket.io/redis-adapter');
  }

  override async configureApplication(app: INestApplication) {
    const settings = redisSettingsSchema.parse(await this.readSettings());

    if (!settings.enabled) {
      return;
    }

    const redisIoAdapter = new RedisIoAdapter(app);

    try {
      await redisIoAdapter.connectToRedis(
        await buildRedisUrl(settings, this.credentialService),
        (error) =>
          this.logger.error('The Redis Socket.IO adapter failed.', error),
      );
    } catch (error) {
      this.logger.error(
        'Unable to connect to Redis, Socket.IO keeps its default adapter.',
        error,
      );

      return;
    }

    app.useWebSocketAdapter(redisIoAdapter);
  }

  /**
   * Reads the stored settings. They are seeded after startup, and the settings
   * table may not exist yet on a fresh database: missing values use the schema
   * defaults.
   */
  private async readSettings() {
    try {
      return (await this.getSettings()) ?? {};
    } catch (error) {
      this.logger.warn(
        'Unable to read the settings, the Redis Socket.IO adapter stays off.',
        error,
      );

      return {};
    }
  }
}
