/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Subscriber, SubscriberFull } from '@hexabot-ai/types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';

import { EUserProfileType } from '@/user/entities/user-profile.entity';
import {
  BaseOrmRepository,
  FindAllOptions,
} from '@/utils/generics/base-orm.repository';

import { SubscriberOrmEntity } from '../entities/subscriber.entity';

@Injectable()
export class SubscriberRepository extends BaseOrmRepository<SubscriberOrmEntity> {
  constructor(
    @InjectRepository(SubscriberOrmEntity)
    repository: Repository<SubscriberOrmEntity>,
  ) {
    super(repository, ['labels', 'assignedTo', 'avatar', 'source']);
  }

  private buildForeignIdWhere(id: string, sourceId?: string) {
    return {
      foreignId: id,
      ...(sourceId ? { source: { id: sourceId } } : {}),
    };
  }

  /**
   * Finds a single subscriber by his foreign ID (channel's id).
   * @param id - The foreign ID of the subscriber.
   * @returns The found subscriber entity, or `null` if no subscriber is found.
   */
  async findOneByForeignId(
    id: string,
    sourceId?: string,
  ): Promise<Subscriber | null> {
    return await this.findOne({
      where: this.buildForeignIdWhere(id, sourceId),
      order: { lastvisit: 'DESC' },
    });
  }

  /**
   * Finds a subscriber by their foreign ID and populates related fields such as `labels` and `assignedTo`.
   * @param id - The foreign ID of the subscriber.
   * @returns The found subscriber entity with populated fields.
   */
  async findOneByForeignIdAndPopulate(
    id: string,
    sourceId?: string,
  ): Promise<SubscriberFull | null> {
    const result = await this.findOneAndPopulate({
      where: this.buildForeignIdWhere(id, sourceId),
      order: { lastvisit: 'DESC' },
    });

    return result;
  }

  /**
   * Unassigns a subscriber by their foreign ID by setting the `assignedTo` field to `null`.
   * @param foreignId - The foreign ID of the subscriber.
   * @returns The updated subscriber entity.
   */

  /**
   * Counts currently assigned subscribers by assignee user ID.
   */
  async countAssignedSubscribersByUserIds(
    userIds: string[],
  ): Promise<Record<string, number>> {
    if (!userIds.length) {
      return {};
    }

    const uniqueUserIds = Array.from(new Set(userIds));
    const counts = await Promise.all(
      uniqueUserIds.map((userId) =>
        this.store.count({
          where: {
            type: EUserProfileType.SubscriberOrmEntity,
            assignedTo: { id: userId },
          },
        }),
      ),
    );

    // Only report assignees with at least one subscriber, like a GROUP BY.
    return uniqueUserIds.reduce<Record<string, number>>(
      (acc, userId, index) => {
        if (counts[index]) {
          acc[userId] = counts[index];
        }

        return acc;
      },
      {},
    );
  }

  /**
   * Updates a subscriber's labels.
   *
   * - If `labelsToPull` is empty, adds `labelsToPush` without duplicates.
   * - Otherwise, removes `labelsToPull` then adds `labelsToPush`.
   * @param subscriberId - The `_id` of the subscriber.
   * @param labelsToPush - Label IDs to add.
   * @param labelsToPull - Optional label IDs to remove before adding.
   * @returns The subscriber object (pre-update by default), or `null` if not found.
   */
  async updateLabels(
    subscriberId: string,
    labelsToPush: string[],
    labelsToPull: string[] = [],
  ): Promise<Subscriber> {
    const subscriber = await this.findOne(subscriberId);

    if (!subscriber) {
      throw new Error(`Unable to resolve subscriber ${subscriberId}`);
    }

    const labelIds = new Set(subscriber.labels);
    labelsToPull.forEach((id) => labelIds.delete(id));
    labelsToPush.forEach((id) => labelIds.add(id));

    const entity = await this.store.findOne({ where: { id: subscriberId } });

    if (!entity) {
      throw new Error(`Unable to resolve subscriber ${subscriberId}`);
    }

    // Saving the full label set keeps this database-neutral (no join-table SQL).
    entity.labels = Array.from(labelIds).map(
      (id) => ({ id }) as SubscriberOrmEntity['labels'][number],
    );
    await this.store.save(entity);

    const refreshed = await this.findOne(subscriberId);

    if (!refreshed) {
      throw new Error(`Unable to reload subscriber ${subscriberId}`);
    }

    return refreshed;
  }

  async findAll(
    options?: FindAllOptions<SubscriberOrmEntity>,
  ): Promise<Subscriber[]> {
    return await super.find({
      where: { type: EUserProfileType.SubscriberOrmEntity },
      ...options,
    });
  }

  async findAndPopulate(
    options?: FindManyOptions<SubscriberOrmEntity>,
  ): Promise<SubscriberFull[]> {
    return await super.findAndPopulate({
      where: { type: EUserProfileType.SubscriberOrmEntity },
      ...options,
    });
  }
}
