/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { isDeepStrictEqual } from 'node:util';

import {
  type WorkflowExportBundle,
  type WorkflowExportBundleMemoryDefinition,
} from '@hexabot-ai/types';
import { ConflictException, Injectable } from '@nestjs/common';
import { In } from 'typeorm';

import { MemoryDefinitionOrmEntity } from '@/workflow/entities/memory-definition.entity';
import { MemoryDefinitionService } from '@/workflow/services/memory-definition.service';

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
export class MemoryDefinitionTransferAdapter extends WorkflowTransferResourceAdapter {
  override readonly kind = 'memoryDefinition';

  override readonly resourceKeys = ['memoryDefinitions'];

  constructor(
    private readonly memoryDefinitionService: MemoryDefinitionService,
  ) {
    super();
  }

  override async buildExportResources(
    ctx: WorkflowTransferExportContext,
  ): Promise<Record<string, WorkflowExportBundleMemoryDefinition[]>> {
    const definitions = await findAllForExport(
      'memory definition',
      ctx.getRefs(this.kind),
      (ids) => this.memoryDefinitionService.find({ where: { id: In(ids) } }),
    );

    return {
      memoryDefinitions: definitions.map((definition) => ({
        exportId: definition.id,
        name: definition.name,
        slug: definition.slug,
        scope: definition.scope,
        schema: definition.schema,
        ttlSeconds: definition.ttlSeconds ?? null,
      })),
    };
  }

  override async importResources(
    ctx: WorkflowTransferImportContext,
  ): Promise<WorkflowTransferImportAdapterResult> {
    const definitions =
      ctx.getResources<
        WorkflowExportBundle['resources']['memoryDefinitions'][number]
      >('memoryDefinitions');
    const result = createImportAdapterResult();

    for (const definition of definitions) {
      const existing = await ctx.manager.findOne(MemoryDefinitionOrmEntity, {
        where: { slug: definition.slug },
      });

      if (existing) {
        if (!this.isEquivalentMemoryDefinition(existing, definition)) {
          throw new ConflictException(
            `Memory definition "${definition.slug}" already exists with different configuration`,
          );
        }

        recordReusedResource(result, this.kind, definition, existing);
        continue;
      }

      await createImportedResource(result, ctx.manager, {
        target: MemoryDefinitionOrmEntity,
        kind: this.kind,
        resource: definition,
        payload: {
          name: definition.name,
          slug: definition.slug,
          scope: definition.scope,
          schema: definition.schema,
          ttlSeconds: definition.ttlSeconds ?? null,
        },
      });
    }

    return result;
  }

  private isEquivalentMemoryDefinition(
    existing: MemoryDefinitionOrmEntity,
    imported: WorkflowExportBundle['resources']['memoryDefinitions'][number],
  ): boolean {
    return (
      existing.name === imported.name &&
      existing.scope === imported.scope &&
      (existing.ttlSeconds ?? null) === (imported.ttlSeconds ?? null) &&
      isDeepStrictEqual(existing.schema, imported.schema)
    );
  }
}
