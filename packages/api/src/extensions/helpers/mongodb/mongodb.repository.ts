/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import get from 'lodash/get';
import set from 'lodash/set';
import type { Document, Filter } from 'mongodb';
import type {
  DeepPartial,
  EntityManager,
  EntityMetadata,
  EntityTarget,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  UpdateResult,
} from 'typeorm';
import { FindOperator, Repository } from 'typeorm';
import { MongoQueryRunner } from 'typeorm/driver/mongodb/MongoQueryRunner';
import type { RelationMetadata } from 'typeorm/metadata/RelationMetadata';

import type { OrmHookName } from '@/database/decorators/orm-event-hooks.decorator';

import type { MongoDBDataSource } from './mongodb.datasource';

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const refId = (value: any): string | null =>
  value == null ? null : typeof value === 'string' ? value : value.id;
const owns = (relation: RelationMetadata) =>
  relation.isManyToOne ||
  relation.isOneToOneOwner ||
  relation.isManyToManyOwner;

/** Translates find operators; raw Mongo operators never pass through callers. */
export const mongoCondition = (field: string, value: any): Document => {
  if (!(value instanceof FindOperator)) return { [field]: { $eq: value } };
  const operand = value.value;
  switch (value.type) {
    case 'equal':
      return { [field]: { $eq: operand } };
    case 'isNull':
      return { [field]: null };
    case 'in':
      return { [field]: { $in: operand } };
    case 'lessThan':
      return { [field]: { $lt: operand } };
    case 'lessThanOrEqual':
      return { [field]: { $lte: operand } };
    case 'moreThan':
      return { [field]: { $gt: operand } };
    case 'moreThanOrEqual':
      return { [field]: { $gte: operand } };
    case 'between':
      return { [field]: { $gte: operand[0], $lte: operand[1] } };
    case 'not':
      return {
        $nor: [mongoCondition(field, value.child ?? operand)],
        [field]: { $ne: null },
      };
    case 'and':
      return { $and: operand.map((item: any) => mongoCondition(field, item)) };
    case 'or':
      return { $or: operand.map((item: any) => mongoCondition(field, item)) };
    case 'like':
    case 'ilike': {
      let pattern = '';
      const text = String(operand);
      for (let index = 0; index < text.length; index++) {
        const char = text[index];

        if (char === '\\' && index + 1 < text.length)
          pattern += escapeRegex(text[++index]);
        else
          pattern +=
            char === '%' ? '.*' : char === '_' ? '.' : escapeRegex(char);
      }

      return {
        [field]: {
          $regex: `^${pattern}$`,
          $options: value.type === 'ilike' ? 'i' : '',
        },
      };
    }
    default:
      throw new Error(`Unsupported MongoDB find operator: ${value.type}`);
  }
};

export class NativeMongoRepository<
  Entity extends ObjectLiteral,
> extends Repository<Entity> {
  constructor(
    target: EntityTarget<Entity>,
    manager: EntityManager,
    private readonly source: MongoDBDataSource,
  ) {
    super(target, manager);
  }

  private get collection() {
    return this.source.db.collection<Document>(this.metadata.tableName);
  }

  private get nativeOptions() {
    return { session: this.source.session };
  }

  /** MongoDB does not support concurrent operations on one transaction session. */
  private async broadcast(
    hook: OrmHookName,
    entity: Entity,
    databaseEntity?: Entity,
  ) {
    const metadata = this.metadata;
    for (const listener of metadata[`${hook}Listeners`]) {
      if (listener.isAllowed(entity)) await listener.execute(entity);
    }
    const queryRunner = new MongoQueryRunner(
      this.source,
      this.source.client as any,
    );
    Object.assign(queryRunner, {
      manager: this.manager,
      isTransactionActive: !!this.source.session,
    });
    const event = {
      connection: this.source,
      queryRunner,
      manager: this.manager,
      metadata,
      entity,
      databaseEntity,
      entityId: entity.id,
      updatedColumns: metadata.columns,
      updatedRelations: metadata.relations,
    };
    for (const subscriber of this.source.subscribers) {
      const target = subscriber.listenTo?.();

      if (
        !target ||
        target === Object ||
        target === metadata.target ||
        target.isPrototypeOf(metadata.target)
      ) {
        await subscriber[hook]?.(event);
      }
    }
  }

  private discriminator(): Document {
    if (this.metadata.tableType !== 'entity-child') return {};

    return {
      type: {
        $in: [this.metadata, ...this.metadata.childEntityMetadatas].map(
          (item) => item.discriminatorValue,
        ),
      },
    };
  }

  private async where(
    where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
  ): Promise<Filter<Document>> {
    if (!where) return this.discriminator();

    if (Array.isArray(where)) {
      const clauses: Document[] = [];
      for (const item of where) clauses.push(await this.where(item));

      return {
        $and: [
          this.discriminator(),
          { $or: clauses.length ? clauses : [{ id: { $in: [] } }] },
        ],
      };
    }
    const conditions: Document[] = [this.discriminator()];
    for (const [key, value] of Object.entries(where)) {
      if (value === undefined || value === null) continue; // TypeORM default semantics; IsNull is explicit.

      if (
        key.startsWith('$') ||
        key
          .split('.')
          .some((part) =>
            ['__proto__', 'constructor', 'prototype'].includes(part),
          )
      )
        throw new Error('Invalid MongoDB query field.');
      const relationId = this.metadata.relationIds.find(
        (item) => item.propertyName === key,
      );
      const relation =
        relationId?.relation ?? this.metadata.findRelationWithPropertyPath(key);

      if (relation) {
        if (owns(relation)) {
          if (value instanceof FindOperator || typeof value !== 'object') {
            conditions.push(mongoCondition(relation.propertyName, value));
          } else {
            const related = await this.source
              .getRepository(relation.inverseEntityMetadata.target)
              .find({ where: value as any, select: { id: true } });
            conditions.push({
              [relation.propertyName]: { $in: related.map((item) => item.id) },
            });
          }
        } else {
          const inverse = relation.inverseRelation;

          if (!inverse) throw new Error(`Missing inverse relation: ${key}`);
          const related = await this.source
            .getRepository(relation.inverseEntityMetadata.target)
            .find({
              where: (value instanceof FindOperator || typeof value !== 'object'
                ? { id: value }
                : value) as any,
            });
          conditions.push({
            id: {
              $in: related.flatMap((item) => {
                const ids = item[inverse.propertyName];

                return Array.isArray(ids) ? ids.map(refId) : [refId(ids)];
              }),
            },
          });
        }
        continue;
      }
      const column = this.metadata.findColumnWithPropertyPath(key);
      const embedded = this.metadata.embeddeds.find(
        (item) => item.propertyName === key,
      );

      if (!column && !embedded)
        throw new Error(
          `Unknown MongoDB query field: ${this.metadata.name}.${key}`,
        );

      if (
        embedded &&
        value &&
        typeof value === 'object' &&
        !(value instanceof FindOperator)
      ) {
        for (const [nested, operand] of Object.entries(value)) {
          if (!embedded.columns.some((item) => item.propertyName === nested))
            throw new Error(`Unknown embedded field: ${key}.${nested}`);
          conditions.push(mongoCondition(`${key}.${nested}`, operand));
        }
      } else {
        conditions.push(mongoCondition(key, value));
      }
    }

    return { $and: conditions };
  }

  private concreteMetadata(document: Document): EntityMetadata {
    return (
      this.source.entityMetadatas.find(
        (item) =>
          item.tableName === this.metadata.tableName &&
          item.discriminatorValue === document.type,
      ) ?? this.metadata
    );
  }

  private hydrate(document: Document): Entity {
    const metadata = this.concreteMetadata(document);
    const entity = metadata.create() as Entity;
    for (const column of metadata.columns) {
      if (column.relationMetadata) continue;
      const value = get(document, column.propertyPath);

      if (value !== undefined) column.setEntityValue(entity, value);
    }
    for (const relation of metadata.relations.filter(owns)) {
      const value = document[relation.propertyName];
      (entity as ObjectLiteral)[relation.propertyName] = relation.isManyToMany
        ? (value ?? []).map((id: string) => ({ id }))
        : value == null
          ? null
          : { id: value };
      for (const relationId of metadata.relationIds.filter(
        (item) => item.relation === relation,
      )) {
        (entity as ObjectLiteral)[relationId.propertyName] =
          value ?? (relation.isManyToMany ? [] : null);
      }
    }

    return entity;
  }

  private relationTree(
    relations: FindManyOptions<Entity>['relations'],
  ): Record<string, any> {
    if (!Array.isArray(relations))
      return (relations ?? {}) as Record<string, any>;
    const tree: Record<string, any> = {};
    for (const relation of relations) set(tree, relation, {});

    return tree;
  }

  private async populate(entity: Entity, relations: Record<string, any>) {
    const metadata = this.source.getMetadata(entity.constructor);
    for (const [name, nested] of Object.entries(relations)) {
      if (!nested) continue;
      const relation = metadata.findRelationWithPropertyPath(name);

      if (!relation) throw new Error(`Unknown MongoDB relation: ${name}`);
      const repository = this.source.getRepository(
        relation.inverseEntityMetadata.target,
      );
      const options = { relations: nested === true ? {} : nested };

      if (owns(relation)) {
        const refs = entity[name];

        if (relation.isManyToMany) {
          const ids = (refs ?? []).map(refId);
          const found = await repository.find({
            ...options,
            where: { id: new FindOperator('in', ids) },
          });
          (entity as ObjectLiteral)[name] = ids.flatMap((id: string) =>
            found.filter((item) => item.id === id),
          );
        } else {
          (entity as ObjectLiteral)[name] = refs
            ? await repository.findOne({
                ...options,
                where: { id: refId(refs) },
              })
            : null;
        }
      } else if (relation.inverseRelation) {
        const found = await repository.find({
          ...options,
          where: { [relation.inverseRelation.propertyName]: { id: entity.id } },
        });
        (entity as ObjectLiteral)[name] = relation.isOneToOne
          ? (found[0] ?? null)
          : found;
      }
    }
  }

  override async find(
    options: FindManyOptions<Entity> = {},
  ): Promise<Entity[]> {
    if (options.lock || options.cache || options.withDeleted)
      throw new Error('Unsupported MongoDB find options.');
    const cursor = this.collection.find(
      await this.where(options.where),
      this.nativeOptions,
    );

    if (options.order) {
      const sort: Record<string, 1 | -1> = {};
      for (const [key, direction] of Object.entries(options.order)) {
        if (!this.metadata.findColumnWithPropertyPath(key))
          throw new Error(`Unsupported MongoDB sort field: ${key}`);

        if (![1, -1, 'ASC', 'DESC', 'asc', 'desc'].includes(direction as any))
          throw new Error('Unsupported MongoDB sort direction.');
        sort[key] =
          direction === -1 || String(direction).toUpperCase() === 'DESC'
            ? -1
            : 1;
      }
      cursor.sort(sort);
    }

    if (options.skip !== undefined) cursor.skip(options.skip);

    if (options.take !== undefined) {
      if (options.take === 0) return [];

      if (options.take < 0)
        throw new Error('MongoDB take must be nonnegative.');
      cursor.limit(options.take);
    }
    const results: Entity[] = [];
    for (const document of await cursor.toArray()) {
      const entity = this.hydrate(document);
      const relations = this.relationTree(options.relations);
      await this.populate(entity, relations);
      // Like TypeORM, leave relations that were not requested unloaded.
      for (const relation of this.source
        .getMetadata(entity.constructor)
        .relations.filter(owns))
        if (!relations[relation.propertyName])
          delete (entity as ObjectLiteral)[relation.propertyName];

      // Apply projection after loading relation identifiers needed for population.
      if (options.select) {
        const fields = Array.isArray(options.select)
          ? options.select
          : Object.entries(options.select)
              .filter(([, selected]) => selected)
              .map(([key]) => key);
        for (const column of this.metadata.columns) {
          if (
            !fields.includes(column.propertyName as any) &&
            !column.relationMetadata
          )
            delete (entity as ObjectLiteral)[column.propertyName];
        }
      }
      results.push(entity);
    }

    return results;
  }

  override async findOne(
    options: FindOneOptions<Entity>,
  ): Promise<Entity | null> {
    if (!options.where) throw new Error('findOne requires a where condition.');

    return (await this.find({ ...options, take: 1 }))[0] ?? null;
  }

  override async count(options: FindManyOptions<Entity> = {}): Promise<number> {
    return this.collection.countDocuments(
      await this.where(options.where),
      this.nativeOptions,
    );
  }

  private document(entity: Entity): Document {
    const document: Document = {};
    const metadata = this.source.getMetadata(entity.constructor);
    for (const column of metadata.columns) {
      if (column.relationMetadata) continue;
      let value = column.getEntityValue(entity);

      if (value === undefined && column.default !== undefined) {
        if (typeof column.default === 'function')
          throw new Error(`SQL default is unsupported: ${column.propertyPath}`);
        value = column.default;

        if (column.type === 'simple-json' && typeof value === 'string')
          value = JSON.parse(value);
        column.setEntityValue(entity, value);
      }

      if (value !== undefined) set(document, column.propertyPath, value);
      else if (column.isNullable) set(document, column.propertyPath, null);
    }

    if (metadata.discriminatorColumn)
      document.type = metadata.discriminatorValue;
    for (const relation of metadata.relations.filter(owns)) {
      const value = entity[relation.propertyName];

      if (value === undefined) continue;
      document[relation.propertyName] = relation.isManyToMany
        ? value.map(refId)
        : refId(value);
    }

    return document;
  }

  private async validateReferences(document: Document, isUpdate = false) {
    for (const relation of this.metadata.relations.filter(owns)) {
      // An update leaves relations that were not loaded untouched in the store.
      if (isUpdate && !(relation.propertyName in document)) continue;
      const value = document[relation.propertyName];

      if (value == null) {
        if (!relation.isNullable && !relation.isManyToMany)
          throw new Error(
            `Missing required relation: ${relation.propertyName}`,
          );
        continue;
      }
      const ids = [...new Set<string>(relation.isManyToMany ? value : [value])];

      if (ids.some((id) => typeof id !== 'string' || !id))
        throw new Error(`Invalid relation id: ${relation.propertyName}`);

      const found = await this.source
        .getRepository(relation.inverseEntityMetadata.target)
        .count({ where: { id: new FindOperator('in', ids) } });

      if (found !== ids.length)
        throw new Error(
          `Related record does not exist: ${relation.propertyName}`,
        );
    }
  }

  override async save<T extends DeepPartial<Entity>>(
    input: T | T[],
    options?: any,
  ): Promise<any> {
    if (options?.listeners === false)
      throw new Error('MongoDB persistence requires lifecycle listeners.');

    if (!this.source.session)
      return this.source.withTransaction(() => this.save(input, options));

    if (Array.isArray(input)) {
      return this.source.withTransaction(async () => {
        const saved: Entity[] = [];
        for (const item of input) saved.push(await this.save(item));

        return saved;
      });
    }
    const entity =
      input instanceof (this.target as any)
        ? (input as Entity)
        : this.create(input);
    const previous = entity.id
      ? await this.findOne({
          where: { id: entity.id } as FindOptionsWhere<Entity>,
        })
      : null;

    if (previous) {
      // Preserve fields omitted from partial saves.
      for (const [key, value] of Object.entries(previous))
        if (entity[key] === undefined) (entity as ObjectLiteral)[key] = value;
      await this.broadcast('beforeUpdate', entity, previous);
    } else {
      await this.broadcast('beforeInsert', entity);
    }
    const document = this.document(entity);

    // An update leaves an unloaded source untouched, so only inserts need one.
    if (
      !previous &&
      document.type === 'SubscriberOrmEntity' &&
      !document.source
    )
      throw new Error('Subscribers require a source.');
    await this.validateReferences(document, !!previous);

    // `document` omits unset relations, so an update hydrates from the stored
    // record; otherwise those relations would come back as null.
    let stored: Document | null = document;

    if (previous) {
      stored = await this.collection.findOneAndUpdate(
        { id: entity.id },
        { $set: document },
        { ...this.nativeOptions, returnDocument: 'after' },
      );
      await this.broadcast('afterUpdate', entity, previous);
    } else {
      await this.collection.insertOne(document, this.nativeOptions);
      await this.broadcast('afterInsert', entity);
    }
    Object.assign(entity, this.hydrate(stored ?? document));

    return entity;
  }
}
