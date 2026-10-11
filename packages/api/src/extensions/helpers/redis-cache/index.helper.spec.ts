/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import KeyvRedis from '@keyv/redis';

import { HelperType } from '@/helper/types';

import RedisCacheHelper from './index.helper';

const mockRedisStore = Object.assign(new Map(), {
  getClient: jest.fn(async () => ({})),
});

jest.mock('@keyv/redis', () => ({
  __esModule: true,
  default: jest.fn(() => mockRedisStore),
}));

describe('RedisCacheHelper', () => {
  const createHelper = () => {
    const helper = new RedisCacheHelper();
    const findOneValue = jest.fn(async (id: string) =>
      id === 'credential-id' ? 'p@ss' : '',
    );

    Object.assign(helper, { credentialService: { findOneValue } });

    return { helper, findOneValue };
  };

  beforeEach(() => {
    jest.mocked(KeyvRedis).mockClear();
    mockRedisStore.getClient.mockClear();
  });

  it('is a cache helper, available once @keyv/redis is installed', () => {
    const { helper } = createHelper();

    expect(helper.isAvailable()).toBe(true);
    expect(helper.getType()).toBe(HelperType.CACHE);
  });

  it('builds its store from the redis helper settings', () => {
    expect(createHelper().helper.getSettingsGroup()).toBe('redis');
  });

  it('connects to Redis with the redis settings and password credential', async () => {
    const { helper, findOneValue } = createHelper();
    const store = await helper['createStore']({
      enabled: true,
      host: 'cache.local',
      port: 6380,
      secure: true,
      user: 'hexabot',
      password: 'credential-id',
    });

    expect(findOneValue).toHaveBeenCalledWith('credential-id');
    expect(KeyvRedis).toHaveBeenCalledWith(
      'rediss://hexabot:p%40ss@cache.local:6380',
      { connectionTimeout: 5000 },
    );
    expect(mockRedisStore.getClient).toHaveBeenCalled();
    expect(store).toBe(mockRedisStore);
  });

  it.each([
    [true, { enabled: true }],
    [false, { enabled: false }],
    [false, undefined],
    [false, { enabled: 'yes' }],
  ])('is enabled=%s with the redis settings %j', (expected, settings) => {
    expect(createHelper().helper.isEnabled(settings)).toBe(expected);
  });

  it('fails when Redis is unreachable, so the current store is kept', async () => {
    const { helper } = createHelper();

    mockRedisStore.getClient.mockRejectedValueOnce(
      new Error('Redis client is not connected or has failed to connect.'),
    );

    await expect(
      helper['createStore']({ enabled: true, host: 'redis' }),
    ).rejects.toThrow('Redis client is not connected');
  });
});
