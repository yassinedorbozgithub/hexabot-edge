/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

import { getValueAtPath } from '../utils/object';

import type { BindingKindSchemas } from './bindings';
import { validateAndResolveBindings } from './bindings';
import { collectTaskReferences } from './flow-steps';
import { toIssuePath, type WorkflowValidationIssue } from './issues';
import {
  extractTaskDefinitions,
  WorkflowDefinitionSchema,
  type WorkflowDefinition,
} from './schema';
import { extractActionSettings, mergeSettings } from './settings';

export type WorkflowValidationActionMetadata = {
  supportedBindings?: readonly string[];
  inputSchema?: z.ZodTypeAny;
  settingSchema?: z.ZodTypeAny;
};

export type ValidateWorkflowOptions = {
  bindingKinds?: BindingKindSchemas;
  actions?: Record<string, WorkflowValidationActionMetadata>;
};

export type WorkflowValidationResult =
  | { success: true; data: WorkflowDefinition }
  | { success: false; issues: WorkflowValidationIssue[] };

const isExpressionString = (value: unknown): boolean =>
  typeof value === 'string' && value.startsWith('=');
const toActionSchemaIssues = ({
  actionName,
  code,
  payload,
  schema,
  section,
  taskId,
}: {
  actionName: string;
  code: 'action_inputs' | 'action_settings';
  payload: unknown;
  schema: z.ZodTypeAny;
  section: 'inputs' | 'settings';
  taskId: string;
}): WorkflowValidationIssue[] => {
  const result = schema.safeParse(payload);

  if (result.success) {
    return [];
  }

  return result.error.issues.flatMap<WorkflowValidationIssue>((issue) => {
    const issuePath = toIssuePath(issue.path);

    // Expressions are resolved immediately before action execution, so their
    // eventual runtime type cannot be checked while validating the definition.
    if (isExpressionString(getValueAtPath(payload, issuePath))) {
      return [];
    }

    const path = ['defs', taskId, section, ...issuePath];

    return [
      {
        actionName,
        code,
        message: `${path.join('.')}: ${issue.message}`,
        path,
        taskId,
      },
    ];
  });
};
const validateTaskActionSchemas = (
  definition: WorkflowDefinition,
  actions?: Record<string, WorkflowValidationActionMetadata>,
): WorkflowValidationIssue[] => {
  if (!actions) {
    return [];
  }

  const issues: WorkflowValidationIssue[] = [];
  const taskDefinitions = extractTaskDefinitions(definition.defs);

  for (const [taskId, task] of Object.entries(taskDefinitions)) {
    const action = actions[task.action];

    // Missing actions are reported by binding validation and have no schemas
    // available for payload validation.
    if (!action) {
      continue;
    }

    if (action.inputSchema) {
      issues.push(
        ...toActionSchemaIssues({
          actionName: task.action,
          code: 'action_inputs',
          payload: task.inputs ?? {},
          schema: action.inputSchema,
          section: 'inputs',
          taskId,
        }),
      );
    }

    if (action.settingSchema) {
      const effectiveSettings = mergeSettings(
        definition.defaults?.settings,
        task.settings,
      );

      issues.push(
        ...toActionSchemaIssues({
          actionName: task.action,
          code: 'action_settings',
          payload: extractActionSettings(effectiveSettings),
          schema: action.settingSchema,
          section: 'settings',
          taskId,
        }),
      );
    }
  }

  return issues;
};
const toSchemaIssues = (zodIssues: z.ZodIssue[]): WorkflowValidationIssue[] =>
  zodIssues.map((issue) => {
    const path = issue.path.join('.') || '<root>';

    return {
      code: 'schema',
      message: `${path}: ${issue.message}`,
      path: toIssuePath(issue.path),
    };
  });
const invalidWorkflow = (
  issues: WorkflowValidationIssue[],
): WorkflowValidationResult => ({
  success: false,
  issues,
});

export function validateWorkflow(
  input: string | unknown,
  options?: ValidateWorkflowOptions,
): WorkflowValidationResult {
  let candidate: unknown = input;

  if (typeof input === 'string') {
    try {
      candidate = parseYaml(input);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown YAML parse error';

      return invalidWorkflow([
        { code: 'yaml_parse', message: 'Unable to parse workflow YAML' },
        { code: 'yaml_parse', message },
      ]);
    }
  }

  const parsed = WorkflowDefinitionSchema.safeParse(candidate);

  if (!parsed.success) {
    return invalidWorkflow(toSchemaIssues(parsed.error.issues));
  }

  const issues: WorkflowValidationIssue[] = [];
  const taskDefinitions = extractTaskDefinitions(parsed.data.defs);
  const reportedMissingTasks = new Set<string>();

  for (const { taskId, path } of collectTaskReferences(parsed.data.flow)) {
    if (
      Object.hasOwn(taskDefinitions, taskId) ||
      reportedMissingTasks.has(taskId)
    ) {
      continue;
    }

    reportedMissingTasks.add(taskId);
    issues.push({
      code: 'unknown_task',
      message: `Unknown task(s) referenced in flow: ${taskId}`,
      path,
      taskId,
    });
  }

  const bindingValidation = validateAndResolveBindings(parsed.data, {
    bindingKinds: options?.bindingKinds,
    actions: options?.actions,
  });

  issues.push(...bindingValidation.issues);
  issues.push(...validateTaskActionSchemas(parsed.data, options?.actions));

  if (issues.length > 0) {
    return invalidWorkflow(issues);
  }

  return { success: true, data: parsed.data };
}
