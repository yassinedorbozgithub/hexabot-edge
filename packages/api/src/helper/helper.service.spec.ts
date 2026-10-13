/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { LoggerService } from '@/logger/logger.service';
import type { RuntimeSettingsService } from '@/setting/services/runtime-settings.service';
import type { SettingService } from '@/setting/services/setting.service';

import { HelperService } from './helper.service';
import type BaseHelper from './lib/base-helper';
import { HelperType } from './types';

describe('HelperService', () => {
  let service: HelperService;
  let settingService: jest.Mocked<Pick<SettingService, 'getSettings'>>;
  let logger: jest.Mocked<
    Pick<LoggerService, 'warn' | 'log' | 'error' | 'debug'>
  >;

  beforeEach(() => {
    settingService = {
      getSettings: jest.fn(),
    };
    logger = {
      warn: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    service = new HelperService(
      settingService as unknown as SettingService,
      logger as unknown as LoggerService,
      {
        setSchemaTransformer: jest.fn(),
      } as unknown as RuntimeSettingsService,
    );
  });

  it('returns an empty array for unknown helper types', () => {
    const helpers = service.getAllByType('invalid' as HelperType);

    expect(helpers).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Unknown helper type requested: invalid',
    );
  });

  it('starts with an empty registry for cache helpers', () => {
    expect(service.getAllByType(HelperType.CACHE)).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns the cache helper selected by default_cache_helper', async () => {
    const memoryCache = {
      getName: () => 'memory-cache',
      getType: () => HelperType.CACHE,
    } as unknown as BaseHelper;

    service.register(memoryCache);
    settingService.getSettings.mockResolvedValue({
      global_settings: { default_cache_helper: 'memory-cache' },
    } as unknown as Awaited<ReturnType<SettingService['getSettings']>>);

    await expect(service.getDefaultHelper(HelperType.CACHE)).resolves.toBe(
      memoryCache,
    );
  });

  it.each([HelperType.UTIL, HelperType.DB])(
    'has no default helper for %s helpers',
    async (type) => {
      await expect(service.getDefaultHelper(type)).rejects.toThrow(
        `Default helpers are not available for type: ${type}`,
      );
    },
  );
});
