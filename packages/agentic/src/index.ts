/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

export { AbstractAction } from './action/abstract-action';

export { defineAction } from './action/action';

export type { DefineActionParams } from './action/action';

export type {
  Action,
  ActionExecutionArgs,
  ActionMetadata,
  Actions,
  InferActionArgs,
  InferActionBindings,
  InferActionContext,
  InferActionInput,
  InferActionOutput,
  InferActionSettings,
} from './action/types';

export {
  BaseWorkflowContext,
  EWorkflowRunStatus,
  WORKFLOW_RUN_STATUSES,
  type ActionSnapshot,
  type ActionStatus,
  type StepExecutionRecord,
  type SuspensionOptions,
  type WorkflowRunStatus,
  type WorkflowRuntimeControl,
  type WorkflowSnapshot,
} from './runtime/context';

export * from './dsl/schema';

export {
  validateWorkflow,
  type ValidateWorkflowOptions,
  type WorkflowValidationActionMetadata,
  type WorkflowValidationResult,
} from './dsl/validate';

export {
  issueMessages,
  type WorkflowValidationIssue,
  type WorkflowValidationIssueCode,
} from './dsl/issues';

export type {
  BindingActionPolicy,
  BindingKindDescriptor,
  BindingKindSchemas,
  InferMountedBindingValue,
  InferWorkflowBindings,
} from './dsl/bindings';

export {
  compileWorkflow,
  Workflow,
  WorkflowEventEmitter,
  WorkflowRunner,
  type WorkflowCompileOptions,
  type WorkflowResumeResult,
  type WorkflowRunOptions,
  type WorkflowStartResult,
} from './runtime/workflow';

export { type FlowStepPath } from './dsl/editing';

export { StepType } from './runtime/types';

export type {
  EventEmitterLike,
  WorkflowEventEmitterLike,
  WorkflowEventMap,
} from './runtime/events';

export type { StepInfo } from './runtime/types';

export type {
  BaseStep as CompiledBaseStep,
  ConditionalBranch as CompiledConditionalBranch,
  ConditionalStep as CompiledConditionalStep,
  LoopStep as CompiledLoopStep,
  CompiledMapping,
  ParallelStep as CompiledParallelStep,
  CompiledStep,
  CompiledTask,
  CompiledTaskBindings,
  TaskStep as CompiledTaskStep,
  CompiledValue,
  CompiledWorkflow,
  EvaluationScope,
  ExecutionState,
  PersistedSuspension,
  RunnerResumeArgs,
  RunnerStartArgs,
  Suspension,
  ResumeResult as WorkflowResumeOutcome,
  StartResult as WorkflowStartOutcome,
} from './runtime/types';

export {
  NonDeterministicWorkflowError,
  ParallelSuspensionError,
  WorkflowCancellationError,
} from './errors';

export {
  compileValue,
  evaluateMapping,
  evaluateValue,
  type CompileValueOptions,
  type JsonataFunctionConfig,
  type JsonataFunctionImplementation,
  type JsonataFunctionRegistry,
} from './runtime/expressions';

export { mergeSettings } from './dsl/settings';

export { createDeferred } from './utils/deferred';

export type { Deferred } from './utils/deferred';

export { assertSnakeCaseName, toSnakeCase } from './utils/naming';

export { sleep, withTimeout } from './utils/timeout';
