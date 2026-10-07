/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { isDeepStrictEqual } from 'node:util';

import {
  type WorkflowExportBundle,
  type WorkflowExportBundleMcpServer,
} from '@hexabot-ai/types';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { In } from 'typeorm';

import { CredentialOrmEntity } from '@/user/entities/credential.entity';
import { McpServerOrmEntity } from '@/workflow/entities/mcp-server.entity';
import { McpServerService } from '@/workflow/services/mcp-server.service';
import { McpServerTransport } from '@/workflow/types';

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
export class McpServerTransferAdapter extends WorkflowTransferResourceAdapter {
  override readonly kind = 'mcpServer';

  override readonly resourceKeys = ['mcpServers'];

  override readonly dependsOn = ['credential'];

  constructor(private readonly mcpServerService: McpServerService) {
    super();
  }

  override async buildExportResources(
    ctx: WorkflowTransferExportContext,
  ): Promise<Record<string, WorkflowExportBundleMcpServer[]>> {
    const servers = await findAllForExport(
      'MCP server',
      ctx.getRefs(this.kind),
      (ids) =>
        this.mcpServerService.findAndPopulate({ where: { id: In(ids) } }),
    );
    ctx.addResourceRefs(
      'credential',
      servers
        .map((server) => server.credential?.id)
        .filter((id): id is string => typeof id === 'string' && !!id),
    );

    return {
      mcpServers: servers.map((server) => ({
        exportId: server.id,
        name: server.name,
        enabled: server.enabled,
        transport: server.transport,
        url: server.url ?? null,
        command: server.command ?? null,
        args: server.args ?? null,
        cwd: server.cwd ?? null,
        credentialExportId: server.credential?.id ?? null,
      })),
    };
  }

  override async importResources(
    ctx: WorkflowTransferImportContext,
  ): Promise<WorkflowTransferImportAdapterResult> {
    const servers =
      ctx.getResources<WorkflowExportBundle['resources']['mcpServers'][number]>(
        'mcpServers',
      );
    const credentialIdMap = ctx.getIdMap('credential');
    const placeholderCredentialExportIds =
      this.getPlaceholderCredentialExportIds(ctx);
    const result = createImportAdapterResult();

    for (const server of servers) {
      const credentialId = server.credentialExportId
        ? credentialIdMap[server.credentialExportId]
        : null;
      const credential = credentialId
        ? await ctx.manager.findOne(CredentialOrmEntity, {
            where: { id: credentialId },
          })
        : null;
      const importedCredential = server.credentialExportId
        ? credentialId
          ? credential
          : null
        : null;
      const shouldDisable =
        Boolean(server.credentialExportId) &&
        placeholderCredentialExportIds.has(server.credentialExportId!);
      const existing = await ctx.manager.findOne(McpServerOrmEntity, {
        where: { name: server.name },
        relations: ['credential'],
      });

      if (existing) {
        if (!this.isEquivalentMcpServer(existing, server, importedCredential)) {
          throw new ConflictException(
            `MCP server "${server.name}" already exists with different configuration`,
          );
        }

        recordReusedResource(result, this.kind, server, existing);
        continue;
      }

      if (server.credentialExportId && !credentialId) {
        throw new BadRequestException(
          `Workflow bundle is missing credential "${server.credentialExportId}" required by MCP server "${server.name}"`,
        );
      }

      await createImportedResource(result, ctx.manager, {
        target: McpServerOrmEntity,
        kind: this.kind,
        resource: server,
        payload: {
          name: server.name,
          enabled: shouldDisable ? false : server.enabled,
          transport: server.transport,
          url: server.url,
          command: server.command,
          args: server.args,
          cwd: server.cwd,
          credential:
            credentialId && server.transport === McpServerTransport.http
              ? { id: credentialId }
              : null,
        },
      });

      if (shouldDisable) {
        result.warnings.push(
          `MCP server "${server.name}" was disabled because it depends on an imported placeholder credential.`,
        );
      }
    }

    return result;
  }

  private getPlaceholderCredentialExportIds(
    ctx: WorkflowTransferImportContext,
  ): Set<string> {
    const placeholderExportIds =
      ctx.getDependencyResult('credential')?.metadata?.placeholderExportIds;

    if (placeholderExportIds instanceof Set) {
      return placeholderExportIds as Set<string>;
    }

    return Array.isArray(placeholderExportIds)
      ? new Set(
          placeholderExportIds.filter(
            (id): id is string => typeof id === 'string',
          ),
        )
      : new Set<string>();
  }

  private isEquivalentMcpServer(
    existing: McpServerOrmEntity,
    imported: WorkflowExportBundleMcpServer,
    importedCredential: CredentialOrmEntity | null,
  ): boolean {
    const existingCredentialName =
      existing.credential && typeof existing.credential === 'object'
        ? existing.credential.name
        : null;
    const importedCredentialName = importedCredential?.name ?? null;

    return (
      existing.transport === imported.transport &&
      (existing.url ?? null) === (imported.url ?? null) &&
      (existing.command ?? null) === (imported.command ?? null) &&
      isDeepStrictEqual(existing.args ?? null, imported.args ?? null) &&
      (existing.cwd ?? null) === (imported.cwd ?? null) &&
      existingCredentialName === importedCredentialName
    );
  }
}
