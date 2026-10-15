/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type {
  DeepPartial,
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  InsertEvent,
  ObjectLiteral,
  RemoveEvent,
  Repository,
  UpdateEvent,
} from 'typeorm';

/**
 * Database-neutral storage for one entity: what repositories and entity hooks
 * need, without depending on a TypeORM repository or manager. Options use the
 * TypeORM find-options shape, which every backend translates.
 */
export interface EntityStore<Entity extends ObjectLiteral> {
  /** The entity class */
  readonly target: new (...args: any[]) => Entity;
  /** Entity name, as used in `hook:<name>:*` events */
  readonly name: string;
  /** Relation property -> its `@RelationId` property */
  readonly relationIdMap: Record<string, string>;
  /** Many-to-many relation properties */
  readonly manyToManyKeys: string[];

  create(data: DeepPartial<Entity>): Entity;
  createMany(data: DeepPartial<Entity>[]): Entity[];
  find(options?: FindManyOptions<Entity>): Promise<Entity[]>;
  findOne(options: FindOneOptions<Entity>): Promise<Entity | null>;
  count(options?: FindManyOptions<Entity>): Promise<number>;
  save(entity: Entity): Promise<Entity>;
  saveMany(entities: Entity[]): Promise<Entity[]>;
  remove(entity: Entity): Promise<Entity>;
  removeMany(entities: Entity[]): Promise<Entity[]>;
  /** Updates matching records directly, without lifecycle hooks */
  update(
    where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
    changes: DeepPartial<Entity>,
  ): Promise<number>;
}

/** Access to the store of any entity (e.g. from an entity hook). */
export interface EntityStores {
  get<Entity extends ObjectLiteral>(
    target: new (...args: any[]) => Entity,
  ): EntityStore<Entity>;
}

/**
 * Context passed to entity lifecycle hooks (`@OnBeforeInsert`, ...). `stores`
 * runs in the same unit of work as the operation (on SQL, the same
 * transaction).
 */
export type EntityHookContext<Entity extends ObjectLiteral = ObjectLiteral> = {
  entity?: Entity;
  databaseEntity?: Entity;
  stores: EntityStores;
};

export class TypeormEntityStore<
  Entity extends ObjectLiteral,
> implements EntityStore<Entity> {
  constructor(private readonly repository: Repository<Entity>) {}

  get target() {
    return this.repository.target as new (...args: any[]) => Entity;
  }

  get name() {
    return this.repository.metadata.name ?? 'entity';
  }

  get relationIdMap() {
    return Object.fromEntries(
      this.repository.metadata.relationIds.map((relationId) => [
        relationId.relation.propertyName,
        relationId.propertyName,
      ]),
    );
  }

  get manyToManyKeys() {
    return this.repository.metadata.relations
      .filter((relation) => relation.isManyToMany)
      .map((relation) => relation.propertyName);
  }

  create(data: DeepPartial<Entity>): Entity {
    return this.repository.create(data);
  }

  createMany(data: DeepPartial<Entity>[]): Entity[] {
    return this.repository.create(data);
  }

  async find(options?: FindManyOptions<Entity>) {
    return await this.repository.find(options);
  }

  async findOne(options: FindOneOptions<Entity>) {
    return (await this.repository.findOne(options)) ?? null;
  }

  async count(options?: FindManyOptions<Entity>) {
    return await this.repository.count(options);
  }

  async save(entity: Entity) {
    return await this.repository.save(entity);
  }

  async saveMany(entities: Entity[]) {
    return await this.repository.save(entities);
  }

  async remove(entity: Entity) {
    return await this.repository.remove(entity);
  }

  async removeMany(entities: Entity[]) {
    return await this.repository.remove(entities);
  }

  async update(
    where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
    changes: DeepPartial<Entity>,
  ) {
    return (await this.repository.update(where, changes as any)).affected ?? 0;
  }
}

/** Stores bound to a TypeORM manager (e.g. a subscriber event's transaction). */
export class TypeormEntityStores implements EntityStores {
  constructor(private readonly manager: EntityManager) {}

  get<Entity extends ObjectLiteral>(target: new (...args: any[]) => Entity) {
    return new TypeormEntityStore(this.manager.getRepository(target));
  }
}

/**
 * Builds the hook context from a TypeORM subscriber event. Its stores use the
 * event's manager, so hooks run in the same transaction as the operation.
 */
export const toEntityHookContext = <Entity extends ObjectLiteral>(
  event: InsertEvent<Entity> | UpdateEvent<Entity> | RemoveEvent<Entity>,
): EntityHookContext<Entity> => ({
  entity: event.entity as Entity | undefined,
  databaseEntity: (event as UpdateEvent<Entity> | RemoveEvent<Entity>)
    .databaseEntity,
  stores: new TypeormEntityStores(event.manager),
});
