/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Action } from '@hexabot-ai/types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import { MemoryDefinitionService } from '@/workflow/services/memory-definition.service';
import { MemoryScope } from '@/workflow/types';

import { McpTool } from '../decorators/mcp-tool.decorator';

import { HexabotMcpToolBase } from './hexabot-mcp-tool.base';
import {
  jsonObjectSchema,
  PaginationArgs,
  paginationSchema,
  uuidSchema,
} from './hexabot-mcp.schemas';

@Injectable()
export class HexabotMemoryDefinitionMcpTools extends HexabotMcpToolBase {
  constructor(
    private readonly memoryDefinitionService: MemoryDefinitionService,
  ) {
    super();
  }

  @McpTool('memorydefinition', Action.READ, {
    name: 'hexabot_memory_definition_search',
    description: 'Search workflow memory definitions.',
    parameters: z.object({
      query: z.string().optional(),
      scope: z.enum(MemoryScope).optional(),
      ...paginationSchema,
    }),
  })
  async searchMemoryDefinitions(
    args: { query?: string; scope?: MemoryScope } & PaginationArgs,
  ) {
    const base = args.scope ? { scope: args.scope } : {};
    const where = args.query
      ? [
          { ...base, name: this.contains(args.query) },
          { ...base, slug: this.contains(args.query) },
        ]
      : base;

    return await this.listWithCount(
      this.memoryDefinitionService,
      this.findOptions(args, where),
    );
  }

  @McpTool('memorydefinition', Action.READ, {
    name: 'hexabot_memory_definition_get',
    description: 'Read one workflow memory definition.',
    parameters: z.object({
      id: uuidSchema,
    }),
  })
  async getMemoryDefinition(args: { id: string }) {
    const definition = await this.memoryDefinitionService.findOne(args.id);
    if (!definition) {
      throw new NotFoundException(`Memory definition ${args.id} not found`);
    }

    return definition;
  }

  @McpTool('memorydefinition', Action.CREATE, {
    name: 'hexabot_memory_definition_create',
    description: 'Create a workflow memory definition.',
    parameters: z.object({
      name: z.string().min(1),
      slug: z.string().regex(/^[a-z0-9_]+$/),
      scope: z.enum(MemoryScope),
      schema: jsonObjectSchema,
      ttlSeconds: z.int().min(1).nullish(),
    }),
  })
  async createMemoryDefinition(args: {
    name: string;
    slug: string;
    scope: MemoryScope;
    schema: Record<string, unknown>;
    ttlSeconds?: number | null;
  }) {
    return await this.memoryDefinitionService.create(args as any);
  }

  @McpTool('memorydefinition', Action.UPDATE, {
    name: 'hexabot_memory_definition_update',
    description: 'Update a workflow memory definition.',
    parameters: z.object({
      id: uuidSchema,
      name: z.string().min(1).optional(),
      slug: z
        .string()
        .regex(/^[a-z0-9_]+$/)
        .optional(),
      scope: z.enum(MemoryScope).optional(),
      schema: jsonObjectSchema.optional(),
      ttlSeconds: z.int().min(1).nullish(),
    }),
  })
  async updateMemoryDefinition(args: { id: string } & Record<string, unknown>) {
    const { id, ...updates } = args;

    return await this.memoryDefinitionService.updateOne(id, updates as any);
  }
}
