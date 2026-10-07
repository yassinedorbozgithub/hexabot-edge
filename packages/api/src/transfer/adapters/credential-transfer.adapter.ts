/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { ConflictException, Injectable } from '@nestjs/common';
import { In } from 'typeorm';

import { CredentialOrmEntity } from '@/user/entities/credential.entity';
import { CredentialService } from '@/user/services/credential.service';

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
  PLACEHOLDER_CREDENTIAL_VALUE,
  recordReusedResource,
  type WorkflowTransferCredentialResource,
  type WorkflowTransferImportAdapterResult,
} from '../workflow-transfer.types';

@WorkflowTransferAdapter()
@Injectable()
export class CredentialTransferAdapter extends WorkflowTransferResourceAdapter {
  override readonly kind = 'credential';

  override readonly resourceKeys = ['credentials'];

  constructor(private readonly credentialService: CredentialService) {
    super();
  }

  override async buildExportResources(
    ctx: WorkflowTransferExportContext,
  ): Promise<Record<string, WorkflowTransferCredentialResource[]>> {
    const credentials = await findAllForExport(
      'credential',
      ctx.getRefs(this.kind),
      (ids) => this.credentialService.find({ where: { id: In(ids) } }),
    );

    return {
      credentials: await Promise.all(
        credentials.map(async (credential) => ({
          exportId: credential.id,
          name: credential.name,
          exportedOwnerId: credential.owner,
          ...(ctx.includeCredentials
            ? {
                value: await this.credentialService.findOneValue(credential.id),
              }
            : {}),
        })),
      ),
    };
  }

  override async importResources(
    ctx: WorkflowTransferImportContext,
  ): Promise<WorkflowTransferImportAdapterResult> {
    const credentials =
      ctx.getResources<WorkflowTransferCredentialResource>('credentials');
    const result = createImportAdapterResult();
    const placeholderExportIds = new Set<string>();

    for (const credential of credentials) {
      const existingByName = await ctx.manager.findOne(CredentialOrmEntity, {
        where: { name: credential.name },
        relations: ['owner'],
      });

      if (existingByName) {
        const existingOwnerId =
          existingByName.owner && typeof existingByName.owner === 'object'
            ? existingByName.owner.id
            : null;
        if (existingOwnerId !== ctx.ownerId) {
          throw new ConflictException(
            `Credential "${credential.name}" already exists for another user`,
          );
        }

        recordReusedResource(result, this.kind, credential, existingByName);
        continue;
      }

      const isPlaceholder =
        !credential.value || credential.value === PLACEHOLDER_CREDENTIAL_VALUE;
      await createImportedResource(result, ctx.manager, {
        target: CredentialOrmEntity,
        kind: this.kind,
        resource: credential,
        payload: {
          name: credential.name,
          value: isPlaceholder
            ? PLACEHOLDER_CREDENTIAL_VALUE
            : credential.value,
          owner: { id: ctx.ownerId },
        },
        action: isPlaceholder ? 'placeholder_created' : 'created',
      });
      if (isPlaceholder) {
        placeholderExportIds.add(credential.exportId);
        result.warnings.push(
          `Credential "${credential.name}" was imported as a placeholder and must be updated before use.`,
        );
      }
    }

    return { ...result, metadata: { placeholderExportIds } };
  }
}
