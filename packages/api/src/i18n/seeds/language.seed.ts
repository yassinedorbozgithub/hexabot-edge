/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { CacheKey } from '@/cache/types';
import { BaseOrmSeeder } from '@/utils/generics/base-orm.seeder';

import { LanguageCreateDto } from '../dto/language.dto';
import { LanguageOrmEntity } from '../entities/language.entity';
import { LanguageRepository } from '../repositories/language.repository';

@Injectable()
export class LanguageSeeder extends BaseOrmSeeder<LanguageOrmEntity> {
  constructor(
    languageRepository: LanguageRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    super(languageRepository);
  }

  async seed(models: LanguageCreateDto[]): Promise<boolean> {
    const seeded = await super.seed(models);

    if (seeded) {
      await this.cacheManager.del(CacheKey.LANGUAGES);
      await this.cacheManager.del(CacheKey.DEFAULT_LANGUAGE);
    }

    return seeded;
  }
}
