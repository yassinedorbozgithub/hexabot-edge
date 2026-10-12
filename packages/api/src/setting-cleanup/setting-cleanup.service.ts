/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { DeleteResult } from 'typeorm/driver/mongodb/typings';

import { HelperService } from '@/helper/helper.service';
import { BaseCacheHelper } from '@/helper/lib/base-cache-helper';
import { LoggerService } from '@/logger/logger.service';
import { SettingService } from '@/setting/services/setting.service';

import { TPruneCriteria, THelperSettingGroup } from './types';

@Injectable()
export class SettingCleanupService {
  constructor(
    private readonly helperService: HelperService,
    private readonly loggerService: LoggerService,
    private readonly settingService: SettingService,
  ) {}

  /**
   * Deletes unused settings with the specified criteria.
   * @param criteria - An array of criteria objects containing:
   *                   - extensionType: Extension type marker stored in setting subgroup
   *                   - groups: Array of groups to exclude from deletion
   * @returns A promise that resolves to the result of the deletion operation.
   */
  private async deleteUnused(
    criteria: TPruneCriteria[],
  ): Promise<DeleteResult> {
    const groupsToDelete = new Set<string>();

    for (const { extensionType, groups } of criteria) {
      const matchingSettings = await this.settingService.find({
        where: { subgroup: extensionType },
      });

      if (!matchingSettings.length) {
        continue;
      }

      const groupsSet = new Set<string>(groups);

      matchingSettings.forEach(({ group }) => {
        if (!groupsSet.has(group)) {
          groupsToDelete.add(group);
        }
      });
    }

    if (!groupsToDelete.size) {
      return { acknowledged: true, deletedCount: 0 };
    }

    return await this.settingService.deleteMany({
      where: { group: In(Array.from(groupsToDelete)) },
    });
  }

  /**
   * Retrieves the setting groups used by the registered helpers: their own
   * group, plus the group a cache helper reads its store settings from.
   * @returns An array of helper groups.
   */
  public getActiveGroups(): THelperSettingGroup[] {
    const groups = this.helperService
      .getAll()
      .flatMap((helper) =>
        helper instanceof BaseCacheHelper
          ? [helper.getName(), helper.getSettingsGroup()]
          : [helper.getName()],
      );

    return Array.from(new Set(groups)) as THelperSettingGroup[];
  }

  /**
   * Prune extensions unused settings.
   *
   */
  public async prune(): Promise<void> {
    const helpers = this.getActiveGroups();
    const { deletedCount } = await this.deleteUnused([
      { extensionType: 'helper', groups: helpers },
    ]);

    if (deletedCount > 0) {
      this.loggerService.log(
        `${deletedCount} unused setting${deletedCount === 1 ? '' : 's'} ${deletedCount === 1 ? 'is' : 'are'} successfully deleted!`,
      );
    }
  }
}
