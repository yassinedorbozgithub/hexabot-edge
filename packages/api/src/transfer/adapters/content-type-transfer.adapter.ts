/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { isDeepStrictEqual } from 'node:util';

import {
  type WorkflowExportBundle,
  type WorkflowExportBundleContentType,
} from '@hexabot-ai/types';
import { ConflictException, Injectable } from '@nestjs/common';
import { In } from 'typeorm';

import { ContentTypeOrmEntity } from '@/cms/entities/content-type.entity';
import { ContentTypeService } from '@/cms/services/content-type.service';

import {
  WorkflowTransferAdapter,
  WorkflowTransferExportContext,
  WorkflowTransferImportContext,
  WorkflowTransferResourceAdapter,
} from '../workflow-transfer-resource-adapter';
import {
  createImportAdapterResult,
  createImportedResource,
  findAllForExport,
  recordReusedResource,
  type WorkflowTransferImportAdapterResult,
} from '../workflow-transfer.types';

@WorkflowTransferAdapter()
@Injectable()
export class ContentTypeTransferAdapter extends WorkflowTransferResourceAdapter {
  override readonly kind = 'contentType';

  override readonly resourceKeys = ['contentTypes'];

  constructor(private readonly contentTypeService: ContentTypeService) {
    super();
  }

  override async buildExportResources(
    ctx: WorkflowTransferExportContext,
  ): Promise<Record<string, WorkflowExportBundleContentType[]>> {
    const contentTypes = await findAllForExport(
      'content type',
      ctx.getRefs(this.kind),
      (ids) => this.contentTypeService.find({ where: { id: In(ids) } }),
    );

    return {
      contentTypes: contentTypes.map((contentType) => ({
        exportId: contentType.id,
        name: contentType.name,
        schema: contentType.schema,
      })),
    };
  }

  override async importResources(
    ctx: WorkflowTransferImportContext,
  ): Promise<WorkflowTransferImportAdapterResult> {
    const contentTypes =
      ctx.getResources<
        WorkflowExportBundle['resources']['contentTypes'][number]
      >('contentTypes');
    const result = createImportAdapterResult();

    for (const contentType of contentTypes) {
      const existing = await ctx.manager.findOne(ContentTypeOrmEntity, {
        where: { name: contentType.name },
      });

      if (existing) {
        if (!this.isEquivalentContentType(existing, contentType)) {
          throw new ConflictException(
            `Content type "${contentType.name}" already exists with different configuration`,
          );
        }

        recordReusedResource(result, this.kind, contentType, existing);
        continue;
      }

      await createImportedResource(result, ctx.manager, {
        target: ContentTypeOrmEntity,
        kind: this.kind,
        resource: contentType,
        payload: { name: contentType.name, schema: contentType.schema },
      });
    }

    return result;
  }

  private isEquivalentContentType(
    existing: ContentTypeOrmEntity,
    imported: WorkflowExportBundle['resources']['contentTypes'][number],
  ): boolean {
    return isDeepStrictEqual(existing.schema, imported.schema);
  }
}
