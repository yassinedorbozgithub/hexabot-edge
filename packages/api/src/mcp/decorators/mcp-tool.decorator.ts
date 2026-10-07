/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Action } from '@hexabot-ai/types';
import { applyDecorators } from '@nestjs/common';
import { Tool, ToolGuards, ToolOptions } from '@rekog/mcp-nest';

import { TModel } from '@/user/types/model.type';

import { McpPermissionGuard } from '../guards/mcp-permission.guard';

import { McpPermission } from './mcp-permission.decorator';

/**
 * Declares an MCP tool that requires the given permission.
 */
export const McpTool = (
  model: TModel,
  action: Action,
  options: ToolOptions,
): MethodDecorator =>
  applyDecorators(
    McpPermission(model, action),
    ToolGuards([McpPermissionGuard]),
    Tool(options),
  );
