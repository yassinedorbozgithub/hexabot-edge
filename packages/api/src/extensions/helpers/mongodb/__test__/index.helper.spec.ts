/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { MongoClient } from 'mongodb';

import MongoDBHelper from '../index.helper';

jest.mock('mongodb', () => ({ MongoClient: jest.fn() }));

describe('MongoDBHelper', () => {
  const collection = {};
  const db = { collection: jest.fn(() => collection) };
  const client = {
    connect: jest.fn(),
    db: jest.fn(() => db),
    close: jest.fn(),
  };
  const createHelper = (settings = {}) => {
    const helper = new MongoDBHelper();
    Object.assign(helper, {
      settingService: {
        getSettings: jest.fn(async () => ({ mongodb: settings })),
      },
      credentialService: {
        findOneValue: jest.fn(async () => 'mongodb://localhost'),
      },
    });

    return helper;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    client.connect.mockResolvedValue(client);
    client.close.mockResolvedValue(undefined);
    jest
      .mocked(MongoClient)
      .mockImplementation(() => client as unknown as MongoClient);
  });

  it('does not connect when disabled or missing credentials', async () => {
    await expect(createHelper().getDb()).rejects.toThrow('disabled');
    await expect(createHelper({ enabled: true }).getDb()).rejects.toThrow(
      'credential',
    );
    expect(MongoClient).not.toHaveBeenCalled();
  });

  it('shares a connection between concurrent calls and exposes collections', async () => {
    const helper = createHelper({
      enabled: true,
      uri: 'credential-id',
      database: 'events',
    });
    await expect(
      Promise.all([helper.getDb(), helper.getDb()]),
    ).resolves.toEqual([db, db]);
    expect(MongoClient).toHaveBeenCalledTimes(1);
    expect(client.db).toHaveBeenCalledWith('events');
    await expect(helper.getCollection('logs')).resolves.toBe(collection);
    await helper.onModuleDestroy();
    expect(client.close).toHaveBeenCalledTimes(1);
    await expect(helper.getDb()).rejects.toThrow('shutting down');
  });

  it('closes a failed connection, hides driver errors, and permits retry', async () => {
    client.connect.mockRejectedValueOnce(new Error('secret URI'));
    const helper = createHelper({ enabled: true, uri: 'credential-id' });
    await expect(helper.getDb()).rejects.toThrow(
      'Unable to connect to MongoDB',
    );
    expect(client.close).toHaveBeenCalledTimes(1);
    await expect(helper.getDb()).resolves.toBe(db);
    expect(MongoClient).toHaveBeenCalledTimes(2);
    await helper.onModuleDestroy();
  });

  it('sanitizes invalid URI errors from the constructor', async () => {
    jest.mocked(MongoClient).mockImplementationOnce(() => {
      throw new Error('secret URI');
    });
    await expect(
      createHelper({ enabled: true, uri: 'credential-id' }).getDb(),
    ).rejects.toThrow('Unable to connect to MongoDB');
  });

  it('waits for an in-flight connection before closing', async () => {
    let finish!: () => void;
    client.connect.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const helper = createHelper({ enabled: true, uri: 'credential-id' });
    const connecting = helper.getDb();
    const stopping = helper.onModuleDestroy();
    // Let settings, credentials, and the lazy import resolve.
    await new Promise((resolve) => setImmediate(resolve));
    expect(client.close).not.toHaveBeenCalled();
    finish();
    await Promise.all([connecting, stopping]);
    expect(client.close).toHaveBeenCalledTimes(1);
  });
});
