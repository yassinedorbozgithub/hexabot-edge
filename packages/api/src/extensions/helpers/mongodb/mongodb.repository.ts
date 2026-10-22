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
}
