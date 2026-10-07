/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import jsonata from 'jsonata';
import { z } from 'zod';

import { SNAKE_CASE_REGEX } from '../utils/naming';

// JSONata throws plain `{ code, position, message }` objects, not Error instances.
const getJsonataParseError = (expression: string): string | undefined => {
  try {
    jsonata(expression.slice(1));

    return undefined;
  } catch (error) {
    const message =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : 'Unknown JSONata parse error';

    return `Invalid JSONata expression: ${message}`;
  }
};

export const ExpressionStringSchema = z
  .string()
  .regex(/^=/, 'Expression strings must start with "="')
  .superRefine((value, ctx) => {
    const message = getJsonataParseError(value);

    if (message) {
      ctx.addIssue({ code: 'custom', message });
    }
  });

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Per-action timeout in milliseconds; 0 disables the timeout wrapper.
export const DEFAULT_TIMEOUT_MS = 0;

// Editor defaults for new workflows: disabled with 3 attempts and backoff starting at 25ms, capped at 10s, no jitter.
// At runtime, a `retries` block without `enabled` retries; omitting `retries` means a single attempt.
export const DEFAULT_RETRY_SETTINGS = {
  enabled: false,
  max_attempts: 3,
  backoff_ms: 25,
  max_delay_ms: 10_000,
  jitter: 0,
  multiplier: 1,
} as const;

export type InputField = {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  // Fields are optional unless `required: true`; not allowed on array `items`.
  required?: boolean;
  enum?: Array<string | number | boolean>;
  items?: InputField;
  properties?: Record<string, InputField>;
};

export type ConditionalBranch =
  | { condition: string; steps: FlowStep[] }
  | { else?: unknown; steps: FlowStep[] };

export type ConditionalBlock = {
  description?: string;
  when: ConditionalBranch[];
};

export type ParallelBlock = {
  description?: string;
  strategy?: 'wait_all' | 'wait_any';
  steps: FlowStep[];
};

export type LoopAccumulate = {
  as: string;
  initial: JsonValue;
  merge: string;
};

type BaseLoopStep = {
  name?: string;
  description?: string;
  accumulate?: LoopAccumulate;
  steps: FlowStep[];
};

export type ForEachLoopStep = BaseLoopStep & {
  type: 'for_each';
  for_each: { item: string; in: string };
  max_concurrency?: number;
  until?: string;
};

export type WhileLoopStep = BaseLoopStep & {
  type: 'while';
  while: string;
};

export type LoopStep = ForEachLoopStep | WhileLoopStep;

export type FlowStep =
  | { do: string }
  | { parallel: ParallelBlock }
  | { conditional: ConditionalBlock }
  | { loop: LoopStep };

export const JsonValueSchema: z.ZodType<JsonValue> = z.json();

// Task inputs are compiled with `compileValue`, which treats every `=` string
// nested in arrays and objects as a JSONata expression.
const TaskInputsSchema = z
  .record(z.string(), JsonValueSchema)
  .superRefine((inputs, ctx) => {
    const visit = (value: unknown, path: Array<string | number>): void => {
      if (typeof value === 'string') {
        const message = value.startsWith('=')
          ? getJsonataParseError(value)
          : undefined;

        if (message) {
          ctx.addIssue({ code: 'custom', message, path });
        }
      } else if (Array.isArray(value)) {
        value.forEach((entry, index) => visit(entry, [...path, index]));
      } else if (value && typeof value === 'object') {
        for (const [key, entry] of Object.entries(value)) {
          visit(entry, [...path, key]);
        }
      }
    };

    visit(inputs, []);
  });
const InputFieldSchema: z.ZodType<InputField> = z.lazy(() =>
  z
    .strictObject({
      type: z.enum([
        'string',
        'number',
        'integer',
        'boolean',
        'array',
        'object',
      ]),
      description: z.string().optional(),
      required: z.boolean().optional(),
      enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
      items: InputFieldSchema.optional(),
      properties: z.record(z.string(), InputFieldSchema).optional(),
    })
    .superRefine((value, ctx) => {
      if (value.type === 'array' && !value.items) {
        ctx.addIssue({
          code: 'custom',
          message: 'Array inputs must declare "items"',
          path: ['items'],
        });
      }

      if (value.items?.required !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: '"required" is not valid on array "items"',
          path: ['items', 'required'],
        });
      }

      if (value.type !== 'array' && value.items) {
        ctx.addIssue({
          code: 'custom',
          message: '"items" is only valid when type is "array"',
          path: ['items'],
        });
      }

      if (value.type !== 'object' && value.properties) {
        ctx.addIssue({
          code: 'custom',
          message: '"properties" is only valid when type is "object"',
          path: ['properties'],
        });
      }
    }),
);
// Retry policy: exponential backoff per attempt, capped by max_delay_ms, with optional jitter multiplier.
const RetriesSchema = z.strictObject({
  enabled: z.boolean().optional().meta({
    title: 'Enabled',
    description:
      'Enable retry attempts when an action fails (disabled = no retries). Defaults to enabled when a retries block is present.',
  }),
  max_attempts: z
    .int()
    .min(1)
    .default(DEFAULT_RETRY_SETTINGS.max_attempts)
    .meta({
      title: 'Max Attempts',
      description: 'Total number of attempts before giving up.',
    }),
  backoff_ms: z.int().min(0).default(DEFAULT_RETRY_SETTINGS.backoff_ms).meta({
    title: 'Initial Backoff (ms)',
    description: 'Delay in milliseconds before the first retry.',
  }),
  max_delay_ms: z
    .int()
    .min(0)
    .default(DEFAULT_RETRY_SETTINGS.max_delay_ms)
    .meta({
      title: 'Max Delay (ms)',
      description: 'Maximum delay cap in milliseconds between retries.',
    }),
  jitter: z.number().min(0).default(DEFAULT_RETRY_SETTINGS.jitter).meta({
    title: 'Jitter',
    description: 'Randomization factor applied to retry delays (0 = none).',
  }),
  multiplier: z
    .number()
    .min(1)
    .default(DEFAULT_RETRY_SETTINGS.multiplier)
    .meta({
      title: 'Backoff Multiplier',
      description: 'Multiplier applied to the delay after each retry.',
    }),
});

// Shared execution settings applied to every action invocation.
export const BaseSettingsSchema = z.strictObject({
  timeout_ms: z.int().nonnegative().optional().meta({
    title: 'Timeout (ms)',
    description:
      'Maximum runtime in milliseconds for a single action invocation (0 = disabled).',
  }),
  retries: RetriesSchema.optional().meta({
    title: 'Retries',
    description: 'Retry policy applied when an action fails.',
  }),
});

export const SettingsSchema = BaseSettingsSchema.catchall(JsonValueSchema);

const TaskBindingReferenceSchema = z.union([z.string(), z.array(z.string())]);
const TaskBindingsSchema = z.record(z.string(), TaskBindingReferenceSchema);

export const TASK_KIND = 'task' as const;

export const TaskDefinitionSchema = z.strictObject({
  kind: z.literal(TASK_KIND),
  description: z.string().optional(),
  action: z.string(),
  inputs: TaskInputsSchema.optional(),
  bindings: TaskBindingsSchema.optional(),
  settings: SettingsSchema.optional(),
});

const NonTaskDefinitionSchema = z.strictObject({
  kind: z
    .string()
    .refine(
      (kind) => kind !== TASK_KIND,
      `kind "${TASK_KIND}" must follow the task definition shape.`,
    ),
  description: z.string().optional(),
  action: z.string().optional(),
  settings: z.record(z.string(), z.unknown()),
  bindings: TaskBindingsSchema.optional(),
});

export const DefDefinitionSchema = z.union([
  TaskDefinitionSchema,
  NonTaskDefinitionSchema,
]);
const ConditionalWhenSchema: z.ZodType<ConditionalBranch> = z.lazy(() =>
  z.strictObject({
    condition: ExpressionStringSchema,
    steps: z.array(FlowStepSchema),
  }),
);
const ConditionalElseSchema: z.ZodType<ConditionalBranch> = z.lazy(() =>
  z.strictObject({
    else: z.unknown().optional(),
    steps: z.array(FlowStepSchema),
  }),
);
const ConditionalSchema: z.ZodType<{
  description?: string;
  when: ConditionalBranch[];
}> = z.strictObject({
  description: z.string().optional(),
  when: z.array(z.union([ConditionalWhenSchema, ConditionalElseSchema])).min(1),
});
const ParallelSchema: z.ZodType<ParallelBlock> = z.strictObject({
  description: z.string().optional(),
  strategy: z.enum(['wait_all', 'wait_any']).optional(),
  steps: z.array(z.lazy(() => FlowStepSchema)),
});
const LoopAccumulateSchema: z.ZodType<LoopAccumulate> = z.strictObject({
  as: z.string(),
  initial: JsonValueSchema,
  merge: ExpressionStringSchema,
});
const ForEachLoopSchema = z.strictObject({
  type: z.literal('for_each'),
  name: z.string().optional(),
  description: z.string().optional(),
  for_each: z.strictObject({
    item: z.string(),
    in: ExpressionStringSchema,
  }),
  max_concurrency: z.int().positive().optional(),
  until: ExpressionStringSchema.optional(),
  accumulate: LoopAccumulateSchema.optional(),
  steps: z.array(z.lazy(() => FlowStepSchema)),
});
const WhileLoopSchema = z.strictObject({
  type: z.literal('while'),
  name: z.string().optional(),
  description: z.string().optional(),
  while: ExpressionStringSchema,
  accumulate: LoopAccumulateSchema.optional(),
  steps: z.array(z.lazy(() => FlowStepSchema)),
});
const LoopSchema: z.ZodType<LoopStep> = z.lazy(() =>
  z.union([ForEachLoopSchema, WhileLoopSchema]),
);

export const FlowStepSchema: z.ZodType<FlowStep> = z.lazy(() =>
  z.union([
    z.strictObject({
      do: z.string(),
    }),
    z.strictObject({
      parallel: ParallelSchema,
    }),
    z.strictObject({
      conditional: ConditionalSchema,
    }),
    z.strictObject({
      loop: LoopSchema,
    }),
  ]),
);

export const WorkflowMetadataSchema = z.strictObject({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
});

const InputsSchema = z.strictObject({
  schema: z.record(z.string(), InputFieldSchema).optional(),
});
const DefaultsSchema = z.strictObject({
  settings: SettingsSchema.optional(),
});

export const WorkflowDefinitionSchema = z.strictObject({
  inputs: InputsSchema.optional(),
  context: z.record(z.string(), JsonValueSchema).optional(),
  defaults: DefaultsSchema.optional(),
  defs: z.record(
    z.string().regex(SNAKE_CASE_REGEX, 'Name must be snake_case'),
    DefDefinitionSchema,
  ),
  flow: z.array(FlowStepSchema),
  outputs: z.record(z.string(), ExpressionStringSchema),
});

export type Settings = z.infer<typeof SettingsSchema>;

export type Conditional = z.infer<typeof ConditionalSchema>;

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;

export type DefDefinition = z.infer<typeof DefDefinitionSchema>;

export type DefDefinitions = z.infer<typeof WorkflowDefinitionSchema>['defs'];

export type TaskDefinitions = Record<string, TaskDefinition>;

export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export const isTaskDefinition = (
  definition: DefDefinition,
): definition is TaskDefinition => definition.kind === TASK_KIND;

export const extractTaskDefinitions = (defs: DefDefinitions): TaskDefinitions =>
  Object.entries(defs).reduce<TaskDefinitions>((tasks, [defName, def]) => {
    if (isTaskDefinition(def)) {
      tasks[defName] = def;
    }

    return tasks;
  }, {});
