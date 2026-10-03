/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { z } from 'zod';

import {
  DirectionType,
  McpServerTransport,
  WorkflowType,
} from '@/workflow/types';

export const uuidSchema = z.uuid();

export const jsonObjectSchema = z.record(z.string(), z.unknown());

export const paginationSchema = {
  limit: z.int().min(1).max(100).default(20),
  skip: z.int().min(0).default(0),
  sortBy: z.string().default('createdAt'),
  sortDirection: z.enum(['ASC', 'DESC']).default('DESC'),
};

export const workflowPayloadSchema = {
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(WorkflowType).optional(),
  schedule: z.string().nullish(),
  inputSchema: jsonObjectSchema.optional(),
  builtin: z.boolean().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  zoom: z.number().optional(),
  direction: z.enum(DirectionType).optional(),
};

export const mcpServerPayloadSchema = {
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  transport: z.enum(McpServerTransport).optional(),
  url: z.string().nullish(),
  command: z.string().nullish(),
  args: z.array(z.string()).nullish(),
  cwd: z.string().nullish(),
  credential: uuidSchema.nullish(),
};

export type PaginationArgs = {
  limit: number;
  skip: number;
  sortBy: string;
  sortDirection: 'ASC' | 'DESC';
};
