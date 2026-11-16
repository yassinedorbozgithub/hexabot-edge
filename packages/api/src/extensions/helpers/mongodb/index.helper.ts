/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Db, Document, MongoClient } from 'mongodb';

import BaseHelper from '@/helper/lib/base-helper';
import { HelperType } from '@/helper/types';
import { CredentialService } from '@/user/services/credential.service';

import { MONGODB_HELPER_NAME, mongodbSettingsSchema } from './mongodb.settings';

@Injectable()
export default class MongoDBHelper
  extends BaseHelper<typeof MONGODB_HELPER_NAME>
  implements OnModuleDestroy
{
  protected readonly type = HelperType.DB;

  protected readonly requiredPackages = ['mongodb'];

  @Inject(CredentialService)
  private readonly credentialService: CredentialService;

  private client?: MongoClient;

  private connection?: Promise<Db>;

  private stopped = false;

  constructor() {
    super(MONGODB_HELPER_NAME);
  }

  async getDb(): Promise<Db> {
    if (this.stopped) {
      throw new Error('The MongoDB helper is shutting down.');
    }
    this.connection ??= this.connect().catch((error: unknown) => {
      this.connection = undefined;
      throw error;
    });

    return this.connection;
  }

  async getCollection<T extends Document = Document>(name: string) {
    return (await this.getDb()).collection<T>(name);
  }

  private async connect(): Promise<Db> {
    const settings = mongodbSettingsSchema.parse(
      (await this.getSettings()) ?? {},
    );

    if (!settings.enabled) {
      throw new Error('The MongoDB helper is disabled.');
    }

    if (!settings.uri) {
      throw new Error(
        'The MongoDB helper requires a connection URI credential.',
      );
    }

    const uri = await this.credentialService.findOneValue(settings.uri);
    // Load the optional driver only when the connection is requested.
    const { MongoClient } = await import('mongodb');
    let client: MongoClient | undefined;
    try {
      client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      const db = client.db(settings.database);
      this.client = client;

      return db;
    } catch {
      await client?.close().catch(() => undefined);
      // Driver errors can contain credentials from the connection URI.
      throw new Error(
        'Unable to connect to MongoDB. Check the connection credential and server.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    await this.connection?.catch(() => undefined);
    await this.client?.close();
  }
}
