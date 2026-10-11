/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { IoAdapter } from '@nestjs/platform-socket.io';
import type { createAdapter } from '@socket.io/redis-adapter';
import type { ServerOptions } from 'socket.io';

import { requireOptional } from './redis.utils';

const CONNECTION_TIMEOUT_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 3000;

export class RedisIoAdapter extends IoAdapter {
  private adapter: ReturnType<typeof createAdapter>;

  /**
   * Connects the pub/sub clients. Rejects when Redis is unreachable instead of
   * retrying forever; once connected, the clients reconnect with backoff.
   * @param url - The Redis connection URL.
   * @param onError - Reports client errors, which must not be thrown: they are
   * emitted outside any caller and would crash the process.
   */
  async connectToRedis(
    url: string,
    onError: (error: Error) => void,
  ): Promise<void> {
    const { createClient } = requireOptional<typeof import('redis')>('redis');
    const { createAdapter } = requireOptional<
      typeof import('@socket.io/redis-adapter')
    >('@socket.io/redis-adapter');
    let connected = false;
    const pubClient = createClient({
      url,
      socket: {
        connectTimeout: CONNECTION_TIMEOUT_MS,
        reconnectStrategy: (retries: number, cause: Error) =>
          connected ? Math.min(retries * 100, MAX_RECONNECT_DELAY_MS) : cause,
      },
    });
    const subClient = pubClient.duplicate();
    pubClient.on('error', onError);
    subClient.on('error', onError);

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
    } catch (error) {
      for (const client of [pubClient, subClient]) {
        if (client.isOpen) {
          client.destroy();
        }
      }
      throw error;
    }

    connected = true;
    this.adapter = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapter);

    return server;
  }
}
