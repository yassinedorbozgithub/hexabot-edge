/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { INestApplication } from '@nestjs/common';
import { createClient } from 'redis';

import { HelperType } from '@/helper/types';

import RedisHelper from './index.helper';
import { RedisIoAdapter } from './redis-io.adapter';

type MockClient = {
  isOpen: boolean;
  on: jest.Mock;
  connect: jest.Mock;
  destroy: jest.Mock;
  duplicate: jest.Mock;
};

const mockClients: MockClient[] = [];
// When set, the first (pub) client fails to connect with it
let mockConnectError: Error | undefined;
const mockAdapter = Symbol('redis-adapter');

jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn(() => mockAdapter),
}));
jest.mock('redis', () => {
  const createClient = (): MockClient => {
    const client: MockClient = {
      isOpen: false,
      on: jest.fn(),
      connect: jest.fn(async () => {
        if (mockConnectError && client === mockClients[0]) {
          throw mockConnectError;
        }
        client.isOpen = true;
      }),
      destroy: jest.fn(),
      duplicate: jest.fn(() => createClient()),
    };
    mockClients.push(client);

    return client;
  };

  return { createClient: jest.fn(createClient) };
});

describe('RedisHelper', () => {
  const createHelper = (settings?: Record<string, unknown>) => {
    const helper = new RedisHelper();

    Object.assign(helper, {
      logger: { warn: jest.fn(), error: jest.fn() },
      settingService: {
        getSettings: jest.fn(async () => ({ redis: settings })),
      },
      credentialService: { findOneValue: jest.fn(async () => 'secret') },
    });

    return helper;
  };
  const createApp = () =>
    ({ useWebSocketAdapter: jest.fn() }) as unknown as INestApplication;

  beforeEach(() => {
    mockClients.length = 0;
    mockConnectError = undefined;
    jest.mocked(createClient).mockClear();
  });

  it('is available once the Redis packages are installed', () => {
    const helper = createHelper();

    expect(helper.isAvailable()).toBe(true);
    expect(helper.getType()).toBe(HelperType.DB);
  });

  it('keeps the default Socket.IO adapter until it is enabled', async () => {
    const app = createApp();

    await createHelper().configureApplication(app);

    expect(createClient).not.toHaveBeenCalled();
    expect(app.useWebSocketAdapter).not.toHaveBeenCalled();
  });

  it('keeps the default Socket.IO adapter when settings cannot be read', async () => {
    const helper = createHelper();
    const app = createApp();

    Object.assign(helper, {
      settingService: {
        getSettings: jest.fn(async () => {
          throw new Error('no such table: setting');
        }),
      },
    });
    await helper.configureApplication(app);

    expect(app.useWebSocketAdapter).not.toHaveBeenCalled();
  });

  it('connects to Redis and sets the Redis Socket.IO adapter', async () => {
    const app = createApp();

    await createHelper({
      enabled: true,
      host: 'cache.local',
      port: 6380,
      secure: false,
      user: '',
      password: 'credential-id',
    }).configureApplication(app);

    expect(createClient).toHaveBeenCalledWith({
      url: 'redis://:secret@cache.local:6380',
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: expect.any(Function),
      },
    });
    expect(mockClients).toHaveLength(2);
    expect(
      mockClients.every((client) => client.connect.mock.calls.length),
    ).toBe(true);
    expect(app.useWebSocketAdapter).toHaveBeenCalledWith(
      expect.any(RedisIoAdapter),
    );
  });

  it('keeps the default Socket.IO adapter when Redis is unreachable', async () => {
    const helper = createHelper({ enabled: true });
    const app = createApp();

    mockConnectError = new Error('getaddrinfo EAI_AGAIN redis');
    await helper.configureApplication(app);

    expect(app.useWebSocketAdapter).not.toHaveBeenCalled();
    expect(helper['logger'].error).toHaveBeenCalledWith(
      'Unable to connect to Redis, Socket.IO keeps its default adapter.',
      mockConnectError,
    );
    // The client that did connect is closed rather than left open
    expect(mockClients[0].destroy).not.toHaveBeenCalled();
    expect(mockClients[1].destroy).toHaveBeenCalled();
  });

  it('reports Redis client errors instead of throwing them', async () => {
    const onError = jest.fn();

    await new RedisIoAdapter().connectToRedis('redis://redis:6379', onError);
    const error = new Error('connection lost');

    for (const client of mockClients) {
      const [[event, listener]] = client.on.mock.calls;
      expect(event).toBe('error');
      expect(() => listener(error)).not.toThrow();
    }
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('fails fast before connecting, then reconnects with backoff', async () => {
    const adapter = new RedisIoAdapter();
    const cause = new Error('ECONNREFUSED');

    mockConnectError = cause;
    await expect(
      adapter.connectToRedis('redis://redis:6379', jest.fn()),
    ).rejects.toBe(cause);

    const [[{ socket: failed }]] = jest.mocked(createClient).mock.calls as any;

    expect(failed.reconnectStrategy(1, cause)).toBe(cause);

    mockConnectError = undefined;
    jest.mocked(createClient).mockClear();
    await adapter.connectToRedis('redis://redis:6379', jest.fn());

    const [[{ socket }]] = jest.mocked(createClient).mock.calls as any;

    expect(socket.reconnectStrategy(1, cause)).toBe(100);
    expect(socket.reconnectStrategy(100, cause)).toBe(3000);
  });
});
