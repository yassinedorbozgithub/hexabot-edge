/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { EventEmitter2 } from '@nestjs/event-emitter';
import { createCache } from 'cache-manager';
import { Keyv } from 'keyv';

import { HelperType } from '../types';

import { BaseCacheHelper } from './base-cache-helper';

const createStore = jest.fn((_settings: unknown) => new Map());

class TestCacheHelper extends BaseCacheHelper {
  static available = true;

  constructor(name = 'test-cache') {
    super(name);
  }

  public override isAvailable(): boolean {
    return TestCacheHelper.available;
  }

  public override isEnabled(settings: unknown): boolean {
    return (settings as { enabled?: boolean } | undefined)?.enabled !== false;
  }

  protected async createStore(settings: unknown) {
    return createStore(settings);
  }
}

describe('BaseCacheHelper', () => {
  let settings: Record<string, unknown>;

  const setup = async ({
    available = true,
    getSettings = jest.fn(async () => settings),
    names = ['test-cache'],
  } = {}) => {
    TestCacheHelper.available = available;
    const placeholder = new Keyv();
    const cache = createCache({ stores: [placeholder] });
    const eventEmitter = new EventEmitter2({ wildcard: true, delimiter: ':' });
    const registry: BaseCacheHelper[] = [];
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const helpers = names.map((name) => {
      const helper = new TestCacheHelper(name);

      Object.assign(helper, {
        cacheManager: cache,
        eventEmitter,
        logger,
        settingService: { getSettings },
        helperService: {
          register: (registered: BaseCacheHelper) => registry.push(registered),
          getAllByType: () => registry,
        },
      });

      return helper;
    });

    for (const helper of helpers) {
      await helper.onModuleInit();
    }
    for (const helper of helpers) {
      helper.onApplicationBootstrap();
    }

    return {
      helper: helpers[0],
      helpers,
      cache,
      placeholder,
      eventEmitter,
      logger,
    };
  };
  const emit = async (eventEmitter: EventEmitter2, event: string) => {
    await Promise.all(
      eventEmitter.listeners(event).map((listener) => listener()),
    );
  };

  beforeEach(() => {
    settings = {
      global_settings: { default_cache_helper: 'test-cache' },
      'test-cache': { size: 1 },
    };
    createStore.mockClear();
  });

  it('is a cache helper', async () => {
    expect((await setup()).helper.getType()).toBe(HelperType.CACHE);
  });

  it('installs its store when selected, keeping keys as-is', async () => {
    const { cache, placeholder, logger } = await setup();

    expect(logger.log).toHaveBeenCalledWith(
      'Cache helper "test-cache" has been enabled!',
    );

    expect(createStore).toHaveBeenCalledWith({ size: 1 });
    expect(cache.stores).toHaveLength(1);
    expect(cache.stores[0]).not.toBe(placeholder);

    await cache.set('settings', { a: 1 });

    const backingStore = createStore.mock.results[0].value as Map<
      string,
      unknown
    >;

    expect([...backingStore.keys()]).toEqual(['settings']);
    await expect(cache.get('settings')).resolves.toEqual({ a: 1 });
  });

  it('leaves the cache untouched when another helper is selected', async () => {
    settings.global_settings = { default_cache_helper: 'other-cache' };
    const { cache, placeholder, logger } = await setup();

    expect(createStore).not.toHaveBeenCalled();
    expect(cache.stores).toEqual([placeholder]);
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('leaves the cache untouched when unavailable', async () => {
    const { cache, placeholder, eventEmitter } = await setup({
      available: false,
    });

    expect(createStore).not.toHaveBeenCalled();
    expect(cache.stores).toEqual([placeholder]);
    expect(
      eventEmitter.listeners('hook:global_settings:default_cache_helper'),
    ).toHaveLength(0);
  });

  it('falls back to the default selection when settings cannot be read', async () => {
    const { cache, placeholder, logger } = await setup({
      getSettings: jest.fn(async () => {
        throw new Error('no such table: setting');
      }),
    });

    expect(logger.warn).toHaveBeenCalled();
    expect(createStore).not.toHaveBeenCalled();
    expect(cache.stores).toEqual([placeholder]);
  });

  it('rebuilds its store when its settings change', async () => {
    const { cache, eventEmitter } = await setup();
    const [initialStore] = cache.stores;
    const disconnect = jest.spyOn(initialStore, 'disconnect');

    settings['test-cache'] = { size: 2 };
    await emit(eventEmitter, 'hook:test-cache:size');

    expect(createStore).toHaveBeenLastCalledWith({ size: 2 });
    expect(cache.stores[0]).not.toBe(initialStore);
    expect(disconnect).toHaveBeenCalled();
  });

  it('keeps serving its store until the newly selected helper replaces it', async () => {
    const { helper, cache, eventEmitter } = await setup();
    const [store] = cache.stores;
    const disconnect = jest.spyOn(store, 'disconnect');

    settings.global_settings = { default_cache_helper: 'other-cache' };
    await emit(eventEmitter, 'hook:global_settings:default_cache_helper');

    expect(cache.stores).toEqual([store]);
    expect(disconnect).not.toHaveBeenCalled();

    await helper.onModuleDestroy();

    expect(disconnect).not.toHaveBeenCalled();
  });

  it('builds and rebuilds its store from another settings group', async () => {
    jest
      .spyOn(TestCacheHelper.prototype as any, 'getSettingsGroup')
      .mockReturnValue('shared');
    settings.shared = { size: 3 };

    try {
      const { eventEmitter } = await setup();

      expect(createStore).toHaveBeenLastCalledWith({ size: 3 });

      settings.shared = { size: 4 };
      await emit(eventEmitter, 'hook:shared:size');

      expect(createStore).toHaveBeenLastCalledWith({ size: 4 });
    } finally {
      jest.restoreAllMocks();
    }
  });

  describe('when the selected helper is not enabled', () => {
    const names = ['memory-cache', 'test-cache'];

    it('falls back to the default cache helper', async () => {
      settings['test-cache'] = { enabled: false };
      settings['memory-cache'] = { size: 9 };
      const { cache, placeholder, logger } = await setup({ names });

      expect(createStore).toHaveBeenCalledTimes(1);
      expect(createStore).toHaveBeenCalledWith({ size: 9 });
      expect(cache.stores[0]).not.toBe(placeholder);
      expect(logger.warn).toHaveBeenCalledWith(
        'The "test-cache" cache helper is selected but not enabled, the "memory-cache" cache helper is used instead.',
      );
    });

    it('hands over to the default helper when disabled, and back when re-enabled', async () => {
      const { cache, eventEmitter } = await setup({ names });
      const [selectedStore] = cache.stores;
      const disconnect = jest.spyOn(selectedStore, 'disconnect');

      expect(createStore).toHaveBeenLastCalledWith({ size: 1 });

      settings['test-cache'] = { enabled: false };
      await emit(eventEmitter, 'hook:test-cache:enabled');

      expect(createStore).toHaveBeenLastCalledWith(undefined);
      expect(cache.stores[0]).not.toBe(selectedStore);
      expect(disconnect).toHaveBeenCalled();

      const [fallbackStore] = cache.stores;

      settings['test-cache'] = { enabled: true };
      await emit(eventEmitter, 'hook:test-cache:enabled');

      expect(createStore).toHaveBeenLastCalledWith({ enabled: true });
      expect(cache.stores[0]).not.toBe(fallbackStore);
    });

    it('discards a store whose helper was deselected while it was being created', async () => {
      const { cache, eventEmitter } = await setup({ names });
      let resolveSlowStore: () => void = () => {};
      const slowStore = new Map<string, unknown>();

      // Only the selected helper's rebuild is slow, e.g. while Redis connects
      createStore.mockImplementation((storeSettings) =>
        (storeSettings as { slow?: boolean } | undefined)?.slow
          ? (new Promise((resolve) => {
              resolveSlowStore = () => resolve(slowStore);
            }) as never)
          : new Map(),
      );

      try {
        settings['test-cache'] = { slow: true };
        const pendingRebuild = Promise.all(
          eventEmitter
            .listeners('hook:test-cache:slow')
            .map((listener) => listener()),
        );

        // Switch only once the rebuild waits on its store
        await new Promise((resolve) => setImmediate(resolve));
        expect(createStore).toHaveBeenLastCalledWith({ slow: true });
        settings.global_settings = { default_cache_helper: 'memory-cache' };
        // The selected helper's handler queues behind its pending rebuild
        const pendingSelection = Promise.all(
          eventEmitter
            .listeners('hook:global_settings:default_cache_helper')
            .map((listener) => listener()),
        );

        // Let memory-cache install its store while the rebuild is pending
        await new Promise((resolve) => setImmediate(resolve));
        const memoryStore = cache.stores[0].store;

        expect(memoryStore).not.toBe(slowStore);

        resolveSlowStore();
        await Promise.all([pendingRebuild, pendingSelection]);

        expect(cache.stores).toHaveLength(1);
        expect(cache.stores[0].store).toBe(memoryStore);
      } finally {
        createStore.mockImplementation(() => new Map());
      }
    });

    it("keeps the active store when another helper's settings change", async () => {
      settings['test-cache'] = { enabled: false };
      const { cache, eventEmitter } = await setup({ names });
      const [fallbackStore] = cache.stores;

      createStore.mockClear();
      settings['test-cache'] = { enabled: false, size: 2 };
      await emit(eventEmitter, 'hook:test-cache:size');

      expect(createStore).not.toHaveBeenCalled();
      expect(cache.stores[0]).toBe(fallbackStore);
    });
  });

  it('logs store creation failures without throwing', async () => {
    const { eventEmitter, logger } = await setup();

    createStore.mockImplementationOnce(() => {
      throw new Error('unreachable');
    });
    await emit(eventEmitter, 'hook:test-cache:size');

    expect(logger.error).toHaveBeenCalledWith(
      'Unable to apply the "test-cache" cache settings.',
      expect.any(Error),
    );
  });

  it('disconnects its store and stops listening on shutdown', async () => {
    const { helper, cache, eventEmitter } = await setup();
    const disconnect = jest.spyOn(cache.stores[0], 'disconnect');

    await helper.onModuleDestroy();

    expect(disconnect).toHaveBeenCalled();
    expect(eventEmitter.listeners('hook:test-cache:size')).toHaveLength(0);
  });
});
