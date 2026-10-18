/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Message, ThreadStub } from '@hexabot-ai/types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';

import { BaseOrmRepository } from '@/utils/generics/base-orm.repository';

import { MessageOrmEntity } from '../entities/message.entity';

@Injectable()
export class MessageRepository extends BaseOrmRepository<MessageOrmEntity> {
  constructor(
    @InjectRepository(MessageOrmEntity)
    repository: Repository<MessageOrmEntity>,
  ) {
    super(repository, ['sender', 'recipient', 'sentBy', 'thread']);
  }

  /**
   * Retrieves the message history for a given subscriber, with messages sent or received
   * before the specified date. Results are limited and sorted by creation date.
   * @param thread - The thread whose message history is being retrieved.
   * @param until - Optional date to retrieve messages sent before (default: current date).
   * @param limit - Optional limit on the number of messages to retrieve (default: 30).
   * @returns The message history until the specified date.
   */
  async findHistoryUntilDate<S extends ThreadStub>(
    thread: S,
    until = new Date(),
    limit: number = 30,
  ): Promise<Message[]> {
    const results = await this.store.find({
      where: { thread: { id: thread.id }, createdAt: LessThan(until) },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return results.map((m) => m.toPlainCls());
  }

  /**
   * Retrieves the message history for a given subscriber, with messages sent or received
   * after the specified date. Results are limited and sorted by creation date.
   * @param thread The thread whose message history is being retrieved.
   * @param since Optional date to retrieve messages sent after (default: current date).
   * @param limit Optional limit on the number of messages to retrieve (default: 30).
   * @returns The message history since the specified date.
   */
  async findHistorySinceDate<S extends ThreadStub>(
    thread: S,
    since = new Date(),
    limit: number = 30,
  ): Promise<Message[]> {
    const results = await this.store.find({
      where: { thread: { id: thread.id }, createdAt: MoreThan(since) },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return results.map((m) => m.toPlainCls());
  }

  /**
   * Retrieves the most recent messages exchanged with the provided subscriber and returns them in chronological order.
   * @param thread - The thread whose messages are being retrieved.
   * @param limit - Maximum number of messages to return.
   * @returns The latest messages ordered from oldest to newest.
   */
  async findLastMessagesForThread<S extends ThreadStub>(
    thread: S,
    limit: number = 5,
  ): Promise<Message[]> {
    const normalizedLimit = Math.max(0, limit ?? 0);

    if (!normalizedLimit) {
      return [];
    }

    const results = await this.store.find({
      where: { thread: { id: thread.id } },
      order: { createdAt: 'DESC' },
      take: normalizedLimit,
    });

    return results.map((m) => m.toPlainCls());
  }

  /**
   * Checks if a subscriber has the required permission to access the message including the attachment.
   * @param subscriberId - The ID of the subscriber.
   * @param attachmentId - The ID of the attachment
   * @returns A promise that resolves to a boolean
   */
  async isAttachmentAccessibleBySubscriber(
    subscriberId: string,
    attachmentId: string,
  ) {
    const databaseType = this.repository.manager?.connection?.options.type;

    if (
      !databaseType ||
      !['sqlite', 'better-sqlite3', 'postgres'].includes(databaseType)
    ) {
      return await this.hasAttachmentInMessages(subscriberId, attachmentId);
    }

    const qb = this.repository
      .createQueryBuilder('message')
      .where('message.recipient_id = :subscriberId', { subscriberId });

    if (['sqlite', 'better-sqlite3'].includes(databaseType)) {
      qb.andWhere(
        `(
          (
            json_type(json_extract(message.message, '$.attachment')) = 'object'
            AND json_extract(message.message, '$.attachment.payload.id') = :attId
          )
          OR (
            json_type(json_extract(message.message, '$.attachment')) = 'array'
            AND EXISTS (
              SELECT 1
              FROM json_each(json_extract(message.message, '$.attachment')) AS a
              WHERE json_extract(a.value, '$.payload.id') = :attId
            )
          )
        )`,
        { attId: attachmentId },
      );
    } else {
      const jsonColumn = '(message.message::jsonb)';

      qb.andWhere(
        `(
          (
            jsonb_typeof(${jsonColumn} -> 'attachment') = 'object'
            AND (${jsonColumn} -> 'attachment' -> 'payload' ->> 'id') = :attId
          )
          OR (
            jsonb_typeof(${jsonColumn} -> 'attachment') = 'array'
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(${jsonColumn} -> 'attachment') AS a
              WHERE a -> 'payload' ->> 'id' = :attId
            )
          )
        )`,
        { attId: attachmentId },
      );
    }

    return await qb.getExists();
  }

  /**
   * Database-neutral fallback for `isAttachmentAccessibleBySubscriber`: scans
   * the subscriber's messages for the attachment, for dialects without the
   * JSON SQL used above.
   */
  private async hasAttachmentInMessages(
    subscriberId: string,
    attachmentId: string,
  ): Promise<boolean> {
    const messages = await this.store.find({
      where: { recipient: { id: subscriberId } },
      select: { id: true, message: true },
    });

    return messages.some(({ message }) => {
      const attachment = (message as { attachment?: unknown } | null)
        ?.attachment;
      const attachments = Array.isArray(attachment) ? attachment : [attachment];

      return attachments.some(
        (item) =>
          (item as { payload?: { id?: unknown } } | null)?.payload?.id ===
          attachmentId,
      );
    });
  }
}
