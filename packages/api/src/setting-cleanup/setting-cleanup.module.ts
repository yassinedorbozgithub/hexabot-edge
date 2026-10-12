/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Global, Module, OnApplicationBootstrap } from '@nestjs/common';

import { AppInstance } from '@/app.instance';
import { LoggerService } from '@/logger/logger.service';

import { SettingCleanupService } from './setting-cleanup.service';

@Global()
@Module({
  providers: [SettingCleanupService],
  exports: [SettingCleanupService],
})
export class SettingCleanupModule implements OnApplicationBootstrap {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly settingCleanupService: SettingCleanupService,
  ) {}

  async onApplicationBootstrap() {
    if (!AppInstance.isReady()) {
      // bypass in test or CLI env
      return;
    }

    try {
      await this.settingCleanupService.prune();
    } catch (error) {
      this.loggerService.error('Unable to delete unused settings', error);
    }
  }
}
