/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { z } from "zod";

import { mcpServerTransportSchema } from "./domain";

const jsonObjectSchema: z.ZodType<Record<string, unknown>> = z.record(
  z.string(),
  z.unknown(),
);

export const mcpToolSummarySchema = z.object({
  id: z.string(),
  serverId: z.string(),
  name: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  inputSchema: jsonObjectSchema,
  outputSchema: jsonObjectSchema.optional(),
  annotations: jsonObjectSchema.optional(),
  meta: jsonObjectSchema.optional(),
});

export const mcpServerConnectionInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  transport: mcpServerTransportSchema,
  url: z.string().nullable(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
});

export const mcpToolsDiscoverySchema = z.object({
  server: mcpServerConnectionInfoSchema,
  toolCount: z.number(),
  tools: z.array(mcpToolSummarySchema),
  meta: jsonObjectSchema.optional(),
});

export const mcpServerDiagnosticsSchema = z.object({
  ok: z.boolean(),
  checkedAt: z.string(),
  latencyMs: z.number(),
  server: mcpServerConnectionInfoSchema,
  toolCount: z.number(),
  sampledToolNames: z.array(z.string()),
  meta: jsonObjectSchema.optional(),
  error: z.string().optional(),
});

export type McpToolSummary = z.infer<typeof mcpToolSummarySchema>;

export type McpServerConnectionInfo = z.infer<
  typeof mcpServerConnectionInfoSchema
>;

export type McpToolsDiscovery = z.infer<typeof mcpToolsDiscoverySchema>;

export type McpServerDiagnostics = z.infer<typeof mcpServerDiagnosticsSchema>;
