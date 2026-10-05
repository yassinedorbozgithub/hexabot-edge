/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type {
  ActionSnapshot,
  BaseWorkflowContext,
  StepExecutionRecord,
} from '../context';
import type { WorkflowEventMap } from '../events';
import type {
  RuntimeResolvedSuspension,
  RuntimeSuspensionRequest,
} from '../suspend-control';
import type {
  StepInfo,
  CompiledStep,
  CompiledWorkflow,
  ExecutionState,
  ResumeCursor,
  Suspension,
} from '../types';

export type StepExecutorEnvForkOverrides = {
  context?: BaseWorkflowContext;
  signal?: AbortSignal;
  setCurrentStep?: (step?: StepInfo) => void;
};

export type StepExecutorEnv = {
  compiled: CompiledWorkflow;
  context: BaseWorkflowContext;
  signal: AbortSignal;
  runId?: string;
  buildInstanceStepInfo: (
    step: CompiledStep,
    iterationStack: number[],
  ) => StepInfo;
  markSnapshot: (
    step: StepInfo,
    status: ActionSnapshot['status'],
    reason?: string,
  ) => void;
  recordStepExecution: (
    step: StepInfo,
    update: Partial<StepExecutionRecord>,
  ) => StepExecutionRecord;
  emit: <K extends keyof WorkflowEventMap>(
    event: K,
    payload: WorkflowEventMap[K],
  ) => void;
  setCurrentStep: (step?: StepInfo) => void;
  beginStepExecution?: (stepId: string) => string;
  waitForStepSuspension: (stepId: string) => Promise<RuntimeSuspensionRequest>;
  clearStepSuspensions: (stepId: string, error?: unknown) => void;
  recordStepSuspendResult?: (params: RuntimeResolvedSuspension) => void;
  executeFlow: (
    steps: CompiledStep[],
    state: ExecutionState,
    path: Array<number | string>,
    startIndex?: number,
    resumeAt?: ResumeCursor,
  ) => Promise<Suspension | void>;
  executeStep: (
    step: CompiledStep,
    state: ExecutionState,
    path: Array<number | string>,
    resumeAt?: ResumeCursor,
  ) => Promise<Suspension | void>;
  fork: (overrides: StepExecutorEnvForkOverrides) => StepExecutorEnv;
};
