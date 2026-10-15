/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import camelCase from 'lodash/camelCase';
import set from 'lodash/set';
import {
  DataSource,
  DeepPartial,
  EntityMetadata,
  EntitySubscriberInterface,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  InsertEvent,
  RemoveEvent,
  Repository,
  UpdateEvent,
} from 'typeorm';
import { DeleteResult } from 'typeorm/driver/mongodb/typings';

import {
  invokeOrmHooks,
  OrmHookName,
} from '@/database/decorators/orm-event-hooks.decorator';
import { BaseOrmEntity } from '@/database/entities/base.entity';
import type { EntityStore } from '@/database/entity-store';
import {
  toEntityHookContext,
  TypeormEntityStore,
} from '@/database/entity-store';
import { LoggerService } from '@/logger/logger.service';
import { flatten } from '@/utils/helpers/flatten';

import {
  DtoAction,
  InferCreateDto,
  InferEntityDto,
  InferFull,
  InferPlain,
  InferUpdateDto,
  TEntityDto,
} from '../types/dto.types';
import { EmitEventProps } from '../types/entity-event.types';

export enum EHook {
  preCreateValidate = 'preCreateValidate',
  preCreate = 'preCreate',
  preUpdateValidate = 'preUpdateValidate',
  preUpdate = 'preUpdate',
  preUpdateMany = 'preUpdateMany',
  preDelete = 'preDelete',
  postCreateValidate = 'postCreateValidate',
  postCreate = 'postCreate',
  postUpdateValidate = 'postUpdateValidate',
  postUpdate = 'postUpdate',
  postUpdateMany = 'postUpdateMany',
  postDelete = 'postDelete',
}

export type UpdateOneOptions = {
  upsert?: boolean;
  shouldFlatten?: boolean;
};

export type FindAllOptions<EntityType> = Omit<
  FindManyOptions<EntityType>,
  'where'
> & {
  where?: never;
};

export abstract class BaseOrmRepository<
  Entity extends BaseOrmEntity<TEntityDto<Entity>>,
> implements EntitySubscriberInterface<Entity> {
  private readonly dataSource: DataSource;

  private readonly joinRelationMap: Record<string, string>;

  /** Database-neutral storage; all persistence below goes through it. */
  protected readonly store: EntityStore<Entity>;

  /**
   * @param repository The TypeORM repository injected by `@InjectRepository`,
   * or, for databases TypeORM does not drive, the entity store
   * provided under the same token. Such a store runs entity hooks itself, and
   * `this.repository` (custom TypeORM queries) is not available with it.
   */
  protected constructor(
    protected readonly repository: Repository<Entity>,
    protected readonly populateRelations: string[] = [],
  ) {
    // A TypeORM repository (or a test double of one) has a manager and metadata
    if ('manager' in repository && 'metadata' in repository) {
      this.store = new TypeormEntityStore(repository);
      this.dataSource = repository.manager.connection;
      this.registerAsSubscriber();
    } else {
      this.store = repository as unknown as EntityStore<Entity>;
    }
    this.joinRelationMap = this.store.relationIdMap;
  }

  private async invokeEntityHooks(
    hook: OrmHookName,
    event: InsertEvent<Entity> | UpdateEvent<Entity> | RemoveEvent<Entity>,
  ): Promise<void> {
    await invokeOrmHooks(event.entity, hook, toEntityHookContext(event));
  }

  canPopulate(populate: string[]): boolean {
    if (!Array.isArray(populate) || populate.length === 0) {
      return false;
    }

    return populate.every((relation) =>
      this.populateRelations.includes(relation),
    );
  }

  getEventEmitter(): EventEmitter2 {
    return this.eventEmitter;
  }

  @Inject(EventEmitter2)
  protected readonly eventEmitter: EventEmitter2;

  @Inject(LoggerService)
  protected readonly logger: LoggerService;

  private attachJoinColumnsToDto<Action extends DtoAction>(
    data: InferEntityDto<Action, Entity>,
  ): InferEntityDto<Action, Entity> {
    if (!data) return {} as InferEntityDto<Action, Entity>;

    const result = { ...data };

    for (const [key, value] of Object.entries(data)) {
      const joinColumn = this.joinRelationMap[key];

      if (joinColumn) {
        result[joinColumn] = value;
      }
    }

    return result;
  }

  public actionDtoToEntity<Action extends DtoAction>(
    data: InferEntityDto<Action, Entity>,
  ): DeepPartial<Entity> {
    const entityDto = this.attachJoinColumnsToDto(data);
    const e = plainToInstance(this.store.target, instanceToPlain(entityDto));

    return Object.assign(e) as DeepPartial<Entity>;
  }

  async findAll(
    options: FindAllOptions<Entity> = {} as FindAllOptions<Entity>,
  ): Promise<InferPlain<Entity>[]> {
    const entities = await this.findAllEntities(options);

    return entities.map((e) => e.toPlainCls());
  }

  private async findAllEntities(
    options: FindAllOptions<Entity> = {} as FindAllOptions<Entity>,
  ): Promise<Entity[]> {
    return await this.store.find(options as FindManyOptions<Entity>);
  }

  async findAllAndPopulate(
    options: FindAllOptions<Entity> = {} as FindAllOptions<Entity>,
  ): Promise<InferFull<Entity>[]> {
    const populatedEntities = await this.store.find(
      this.withPopulateRelations(options as FindManyOptions<Entity>, true),
    );

    return populatedEntities.map((e) => e.toFullCls());
  }

  async find(
    options: FindManyOptions<Entity> = {} as FindManyOptions<Entity>,
  ): Promise<InferPlain<Entity>[]> {
    const entities = await this.findEntities(options);

    return entities.map((e) => e.toPlainCls());
  }

  private async findEntities(
    options: FindManyOptions<Entity> = {} as FindManyOptions<Entity>,
    populate = false,
  ): Promise<Entity[]> {
    const finalOptions = this.withPopulateRelations(options, populate);

    return await this.store.find(finalOptions);
  }

  private withPopulateRelations<
    T extends FindManyOptions<Entity> | FindOneOptions<Entity>,
  >(options: T, populate: boolean): T {
    if (!populate || this.populateRelations.length === 0) {
      return options;
    }

    const finalOptions = { ...(options ?? {}) } as T;
    const currentRelations = (finalOptions as any).relations;

    if (!currentRelations) {
      (finalOptions as any).relations = this.populateRelations;

      return finalOptions;
    }

    if (Array.isArray(currentRelations)) {
      (finalOptions as any).relations = Array.from(
        new Set([...currentRelations, ...this.populateRelations]),
      );
    }

    return finalOptions;
  }

  async findAndPopulate(
    options: FindManyOptions<Entity> = {} as FindManyOptions<Entity>,
  ): Promise<InferFull<Entity>[]> {
    const entities = await this.findEntities(options, true);

    return entities.map((e) => e.toFullCls());
  }

  async count(
    options: FindManyOptions<Entity> = {} as FindManyOptions<Entity>,
  ): Promise<number> {
    return await this.store.count(options);
  }

  async findOne(
    idOrOptions: string | FindOneOptions<Entity>,
  ): Promise<InferPlain<Entity> | null> {
    const entity = await this.findOneEntity(idOrOptions);

    return entity ? entity.toPlainCls() : null;
  }

  private async findOneEntity(
    idOrOptions: string | FindOneOptions<Entity>,
    populate = false,
  ): Promise<Entity | null> {
    if (typeof idOrOptions === 'string') {
      const options = this.withPopulateRelations<FindOneOptions<Entity>>(
        {
          where: { id: idOrOptions } as FindOptionsWhere<Entity>,
        },
        populate,
      );

      return await this.store.findOne(options);
    }

    const options = this.withPopulateRelations(idOrOptions, populate);

    return await this.store.findOne(options);
  }

  async findOneAndPopulate(
    idOrOptions: string | FindOneOptions<Entity>,
  ): Promise<InferFull<Entity> | null> {
    const entity = await this.findOneEntity(idOrOptions, true);

    return entity ? entity.toFullCls() : null;
  }

  async create(payload: InferCreateDto<Entity>): Promise<InferPlain<Entity>> {
    const entity = this.store.create(this.actionDtoToEntity(payload));
    await this.emitEvent<EHook.preCreate>({
      action: EHook.preCreate,
      entity,
      payload,
    });

    const createdEntity = await this.store.save(entity);

    await this.emitEvent<EHook.postCreate>({
      action: EHook.postCreate,
      entity: createdEntity,
      payload,
    });

    return createdEntity.toPlainCls();
  }

  async createMany(
    payloads: InferCreateDto<Entity>[],
  ): Promise<InferPlain<Entity>[]> {
    const entities = this.store.createMany(
      payloads.map((payload) => this.actionDtoToEntity(payload)),
    );

    for (let index = 0; index < entities.length; index++) {
      await this.emitEvent<EHook.preCreate>({
        action: EHook.preCreate,
        entity: entities[index],
        payload: payloads[index],
      });
    }

    const created = await this.store.saveMany(entities);

    for (let index = 0; index < created.length; index++) {
      await this.emitEvent<EHook.postCreate>({
        entity: created[index],
        action: EHook.postCreate,
        payload: payloads[index],
      });
    }

    return created.map((e) => e.toPlainCls());
  }

  async updateOne(
    idOrOptions: string | FindOneOptions<Entity>,
    payload: InferUpdateDto<Entity>,
    options?: UpdateOneOptions,
  ): Promise<InferPlain<Entity>> {
    const entity = await this.findOneEntity(idOrOptions);
    const databaseEntity = await this.findOneEntity(idOrOptions);

    if (entity && databaseEntity) {
      const updates = this.actionDtoToEntity(payload);

      if (options?.shouldFlatten && updates && typeof updates === 'object') {
        const flattenedUpdates = flatten(
          updates as Record<string, unknown>,
        ) as Record<string, unknown>;
        const target = entity as Record<string, unknown>;
        for (const [path, value] of Object.entries(flattenedUpdates)) {
          set(target, path, value);
        }
      } else {
        Object.assign(entity, updates);
      }
      // Read all fields from the update data.
      const entries = Object.entries(payload ?? {});
      // Find relation keys that are many-to-many.
      const manyToManyKeys = this.store.manyToManyKeys;
      // Check if update data has only many-to-many list fields.
      const hasOnlyManyToManyProperties =
        entries.length > 0 &&
        entries.every(
          ([key, val]) => manyToManyKeys.includes(key) && Array.isArray(val),
        );

      // If only many-to-many fields changed, set update time to trigger afterUpdate event
      if (hasOnlyManyToManyProperties) {
        entity.updatedAt = new Date();
      }

      await this.emitEvent<EHook.preUpdate>({
        action: EHook.preUpdate,
        entity,
        payload,
        databaseEntity,
      });

      const updatedEntity = await this.store.save(entity);

      await this.emitEvent<EHook.postUpdate>({
        action: EHook.postUpdate,
        entity: updatedEntity,
        payload,
        databaseEntity,
      });

      return updatedEntity.toPlainCls();
    }

    if (options?.upsert) {
      return await this.create(payload as unknown as InferCreateDto<Entity>);
    } else {
      throw new NotFoundException('Unable to execute updateOne() - No updates');
    }
  }

  async updateMany(
    options: FindManyOptions<Entity> = {} as FindManyOptions<Entity>,
    payload: InferUpdateDto<Entity>,
  ): Promise<InferPlain<Entity>[]> {
    const entities = await this.findEntities(options);

    if (!entities.length) {
      return [];
    }

    const changes = this.actionDtoToEntity(payload);
    const databaseEntities: Entity[] = [];

    for (let index = 0; index < entities.length; index++) {
      databaseEntities.push(
        this.store.create(entities[index] as DeepPartial<Entity>),
      );
      Object.assign(entities[index], changes);

      await this.emitEvent<EHook.preUpdate>({
        action: EHook.preUpdate,
        entity: entities[index],
        payload,
        databaseEntity: databaseEntities[index],
      });
    }

    const updatedEntities = await this.store.saveMany(entities);

    for (let index = 0; index < updatedEntities.length; index++) {
      await this.emitEvent<EHook.postUpdate>({
        action: EHook.postUpdate,
        entity: updatedEntities[index],
        payload,
        databaseEntity: databaseEntities[index],
      });
    }

    return updatedEntities.map((e) => e.toPlainCls());
  }

  async findOneOrCreate(
    idOrOptions: string | FindOneOptions<Entity>,
    payload: InferCreateDto<Entity>,
  ): Promise<InferPlain<Entity>> {
    const existing = await this.findOneEntity(idOrOptions);

    if (existing) {
      return existing.toPlainCls();
    }

    return await this.create(payload);
  }

  async deleteMany(
    options: FindManyOptions<Entity> = {} as FindManyOptions<Entity>,
  ): Promise<DeleteResult> {
    const matches = await this.store.find(options);

    if (matches.length === 0) {
      return { acknowledged: true, deletedCount: 0 };
    }

    const deletable = matches.filter((entity) => !this.isBuiltin(entity));

    if (!deletable.length) {
      return { acknowledged: true, deletedCount: 0 };
    }

    const deletableSnapshots = deletable.map((entity) =>
      this.store.create(entity as DeepPartial<Entity>),
    );

    for (let index = 0; index < deletable.length; index++) {
      await this.emitEvent<EHook.preDelete>({
        action: EHook.preDelete,
        payload: options,
        databaseEntity: deletableSnapshots[index],
      });
    }

    const deletedEntities = await this.store.removeMany(deletable);

    for (let index = 0; index < deletedEntities.length; index++) {
      if (!deletedEntities[index].id && deletableSnapshots[index]?.id) {
        deletedEntities[index].id = deletableSnapshots[index].id;
      }

      await this.emitEvent<EHook.postDelete>({
        action: EHook.postDelete,
        entity: deletedEntities[index],
        payload: options,
        databaseEntity: deletedEntities[index],
      });
    }

    const result: DeleteResult = {
      acknowledged: true,
      deletedCount: deletedEntities.length,
    };

    return result;
  }

  async deleteOne(
    idOrOptions: string | FindOneOptions<Entity>,
  ): Promise<DeleteResult> {
    const entity = await this.findOneEntity(idOrOptions);

    if (!entity || this.isBuiltin(entity)) {
      return { acknowledged: true, deletedCount: 0 };
    }

    const databaseEntity = this.store.create(entity as DeepPartial<Entity>);

    await this.emitEvent<EHook.preDelete>({
      action: EHook.preDelete,
      payload: idOrOptions,
      databaseEntity,
    });

    const deletedEntity = await this.store.remove(entity);

    if (!deletedEntity.id && databaseEntity.id) {
      deletedEntity.id = databaseEntity.id;
    }

    await this.emitEvent<EHook.postDelete>({
      action: EHook.postDelete,
      entity,
      payload: idOrOptions,
      databaseEntity: deletedEntity,
    });

    return {
      acknowledged: true,
      deletedCount: 1,
    } satisfies DeleteResult;
  }

  private isBuiltin(entity: Entity): boolean {
    return (entity as Record<string, unknown>).builtin === true;
  }

  listenTo() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    return this.store.target as Function;
  }

  private registerAsSubscriber(): void {
    const alreadyRegistered = this.dataSource.subscribers.some(
      (subscriber) => subscriber === this,
    );

    if (!alreadyRegistered) {
      this.dataSource.subscribers.push(this as EntitySubscriberInterface<any>);
    }
  }

  protected getEntityName(metadata: EntityMetadata) {
    return camelCase((metadata.name ?? 'entity').replace(/OrmEntity$/, ''));
  }

  protected async emitEvent<H extends EHook, E extends BaseOrmEntity = Entity>(
    data: EmitEventProps<E, H>,
  ) {
    if (!this.eventEmitter) return;
    const entityName = camelCase(this.store.name.replace(/OrmEntity$/, ''));

    await this.eventEmitter.emitAsync(`hook:${entityName}:${data.action}`, {
      ...data,
      entityName,
    });
  }

  protected async onBeforeInsert(_event: InsertEvent<Entity>): Promise<void> {}

  protected async onAfterInsert(_event: InsertEvent<Entity>): Promise<void> {}

  protected async onBeforeUpdate(_event: UpdateEvent<Entity>): Promise<void> {}

  protected async onAfterUpdate(_event: UpdateEvent<Entity>): Promise<void> {}

  protected async onBeforeRemove(_event: RemoveEvent<Entity>): Promise<void> {}

  protected async onAfterRemove(_event: RemoveEvent<Entity>): Promise<void> {}

  async beforeInsert(event: InsertEvent<Entity>): Promise<void> {
    await this.onBeforeInsert(event);
    await this.invokeEntityHooks('beforeInsert', event);
  }

  async afterInsert(event: InsertEvent<Entity>): Promise<void> {
    await this.onAfterInsert(event);
    await this.invokeEntityHooks('afterInsert', event);
  }

  async beforeUpdate(event: UpdateEvent<Entity>): Promise<void> {
    await this.onBeforeUpdate(event);
    await this.invokeEntityHooks('beforeUpdate', event);
  }

  async afterUpdate(event: UpdateEvent<Entity>): Promise<void> {
    await this.onAfterUpdate(event);
    await this.invokeEntityHooks('afterUpdate', event);
  }

  async beforeRemove(event: RemoveEvent<Entity>): Promise<void> {
    await this.onBeforeRemove(event);
    await this.invokeEntityHooks('beforeRemove', event);
  }

  async afterRemove(event: RemoveEvent<Entity>): Promise<void> {
    await this.onAfterRemove(event);
    await this.invokeEntityHooks('afterRemove', event);
  }
}
