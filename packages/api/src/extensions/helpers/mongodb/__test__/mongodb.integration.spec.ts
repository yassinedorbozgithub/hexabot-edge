/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { randomUUID } from 'node:crypto';

import MongoStore from 'connect-mongo';
import { ILike, In, IsNull, Not } from 'typeorm';

// Load all application entities so relation metadata matches production.
import '@/app.module';
import { SourceOrmEntity } from '@/channel/entities/source.entity';
import { SubscriberOrmEntity } from '@/chat/entities/subscriber.entity';
import { ContentTypeOrmEntity } from '@/cms/entities/content-type.entity';
import { ContentOrmEntity } from '@/cms/entities/content.entity';
import { ContentRepository } from '@/cms/repositories/content.repository';
import { config } from '@/config';
import { FullTextSearchStore } from '@/extensions/helpers/fulltext-search/fulltext-search.store';
import { RoleOrmEntity } from '@/user/entities/role.entity';
import { UserOrmEntity } from '@/user/entities/user.entity';
import { UserRepository } from '@/user/repositories/user.repository';

import { MongoDBDataSource } from '../mongodb.datasource';

const uri = process.env.MONGODB_TEST_URL;
const integration = uri ? describe : describe.skip;

integration('Native MongoDB primary database', () => {
  let source: MongoDBDataSource;
  let users: UserRepository;
  let content: ContentRepository;

  beforeAll(async () => {
    source = new MongoDBDataSource({
      ...config.database,
      type: 'mongodb',
      url: uri,
      database: `hexabot_adapter_test_${randomUUID().replaceAll('-', '')}`,
    });
    await source.initialize();
    users = new UserRepository(source.getRepository(UserOrmEntity));
    content = new ContentRepository(source.getRepository(ContentOrmEntity));
  });

  afterAll(async () => {
    if (source?.isInitialized) {
      await source.db.dropDatabase();
      await source.destroy();
    }
  });

  it('persists UUIDs, hashes passwords, populates roles, and enforces unique indexes', async () => {
    const role = await source
      .getRepository(RoleOrmEntity)
      .save({ name: 'mongo-admin' });
    const user = await users.create({
      username: 'mongo-admin',
      firstName: 'Mongo',
      lastName: 'Admin',
      email: 'mongo@example.test',
      password: 'test-password',
      roles: [role.id],
    } as any);
    const raw = await source.db.collection('users').findOne({ id: user.id });
    expect(raw?.password).toMatch(/^\$2/);
    expect(raw?.roles).toEqual([role.id]);
    expect(raw?.createdAt).toBeInstanceOf(Date);
    expect(raw?.type).toBe('UserOrmEntity');
    expect((await users.findOneAndPopulate(user.id))?.roles[0].id).toBe(
      role.id,
    );
    expect(
      await source
        .getRepository(UserOrmEntity)
        .count({ where: { roles: { name: 'mongo-admin' } } }),
    ).toBe(1);
    expect(
      await source
        .getRepository(UserOrmEntity)
        .count({ where: { username: ILike('%ADMIN'), avatar: IsNull() } }),
    ).toBe(1);
    await expect(
      source.getRepository(RoleOrmEntity).save({ name: 'mongo-admin' }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('supports content hooks, native text search, and cascade deletion', async () => {
    const type = await source
      .getRepository(ContentTypeOrmEntity)
      .save({ name: 'mongo-articles', fields: [] } as any);
    const article = await content.create({
      title: 'MongoDB testing',
      contentType: type.id,
      properties: { body: 'Native persistence' },
    } as any);
    expect(await content.textSearch('mongo')).toHaveLength(1);
    const hits = await new FullTextSearchStore(source).search('persistence');
    expect(hits[0]?.contentId).toBe(article.id);
    await source.getRepository(ContentTypeOrmEntity).remove(type);
    expect(await content.findOne(article.id)).toBeNull();
  });

  it('rolls back multi-document writes on failure', async () => {
    await expect(
      source.transaction(async (manager) => {
        await manager.save(
          RoleOrmEntity,
          manager.create(RoleOrmEntity, { name: 'rolled-back' }),
        );
        throw new Error('abort transaction');
      }),
    ).rejects.toThrow('abort transaction');
    expect(
      await source
        .getRepository(RoleOrmEntity)
        .count({ where: { name: 'rolled-back' } }),
    ).toBe(0);
  });

  it('supports native sessions and TTL index creation', async () => {
    const store = MongoStore.create({
      client: source.client,
      dbName: source.db.databaseName,
      ttl: 60,
    });
    const session = {
      cookie: { maxAge: 60000 },
      passport: { user: 'mongo-user' },
    } as any;
    await new Promise<void>((resolve, reject) =>
      store.set('mongo-session', session, (error) =>
        error ? reject(error) : resolve(),
      ),
    );
    await new Promise<void>((resolve, reject) =>
      store.set('mongo-session-2', session, (error) =>
        error ? reject(error) : resolve(),
      ),
    );
    const indexes = await source.db.collection('sessions').indexes();
    expect(indexes.some((index) => index.expireAfterSeconds === 0)).toBe(true);
    const restored = await new Promise<any>((resolve, reject) =>
      store.get('mongo-session', (error, value) =>
        error ? reject(error) : resolve(value),
      ),
    );
    expect(restored.passport.user).toBe('mongo-user');
    await new Promise<void>((resolve, reject) =>
      store.destroy('mongo-session', (error) =>
        error ? reject(error) : resolve(),
      ),
    );
    expect(
      await source.db
        .collection('sessions')
        .countDocuments({ _id: 'mongo-session' } as any),
    ).toBe(0);
  });
});
