/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { ContentFull } from '@hexabot-ai/types';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { BaseOrmRepository } from '@/utils/generics/base-orm.repository';

import { ContentOrmEntity } from '../entities/content.entity';

@Injectable()
export class ContentRepository extends BaseOrmRepository<ContentOrmEntity> {
  constructor(
    @InjectRepository(ContentOrmEntity)
    repository: Repository<ContentOrmEntity>,
  ) {
    super(repository, ['contentType']);
  }

  /**
   * Performs a full-text search on the `Content` entity based on the provided query string.
   * The search is case-insensitive.
   * @param query - The text query string to search for.
   * @returns A promise that resolves to the matching content entities.
   */
  async textSearch(
    query: string,
    options?: {
      status?: boolean;
      contentTypeId?: string;
      limit?: number;
    },
  ): Promise<ContentFull[]> {
    const filters = {
      ...(typeof options?.status === 'boolean'
        ? { status: options.status }
        : {}),
      ...(options?.contentTypeId
        ? { contentType: { id: options.contentTypeId } }
        : {}),
    };
    const results = await this.store.find({
      where: [
        { ...filters, title: ILike(`%${query}%`) },
        { ...filters, searchText: ILike(`%${query}%`) },
      ],
      relations: ['contentType'],
      ...(options?.limit && options.limit > 0 ? { take: options.limit } : {}),
    });

    return results.map((content) => content.toFullCls());
  }
}
