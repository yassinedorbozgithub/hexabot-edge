/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { CacheableMemory } from 'cacheable';

import { HelperType } from '@/helper/types';

import MemoryCacheHelper from './index.helper';

describe('MemoryCacheHelper', () => {
  it('is an always available cache helper', () => {
    const helper = new MemoryCacheHelper();

    expect(helper.isAvailable()).toBe(true);
    expect(helper.getType()).toBe(HelperType.CACHE);
  });

  it('creates a store bounded by its settings', async () => {
    const store = await new MemoryCacheHelper()['createStore']({
      ttl: 1000,
      max: 5,
    });

    expect(store).toBeInstanceOf(CacheableMemory);
    expect(store).toMatchObject({ ttl: 1000, lruSize: 5 });
  });

  it('uses the default settings before they are seeded', async () => {
    const store = await new MemoryCacheHelper()['createStore'](undefined);

    expect(store).toMatchObject({ ttl: 300000, lruSize: 100 });
  });
});
