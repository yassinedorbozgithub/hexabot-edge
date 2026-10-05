/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { getAbortReason, throwIfAborted } from '../../errors';
import { evaluateMapping, toEvaluationScope } from '../expressions';
import type { RuntimeSuspensionRequest } from '../suspend-control';
import type {
  CompiledTask,
  ExecutionState,
  Suspension,
  TaskStep,
} from '../types';

import type { StepExecutorEnv } from './env';

type TaskProgressOutcome =
  | { type: 'completed'; value: unknown }
  | { type: 'failed'; error: unknown }
  | { type: 'cancelled'; error: Error }
  | { type: 'suspended'; request: RuntimeSuspensionRequest };

/**
 * Execute a task step by running its task and handling suspension or output mapping.
 * @param env Executor environment with compiled workflow and helpers.
 * @param step The compiled task step to execute.
 * @param state Mutable workflow execution state.
 * @returns A suspension if the task pauses execution, otherwise void.
 */
export async function executeTaskStep(
  env: StepExecutorEnv,
  step: TaskStep,
  state: ExecutionState,
): Promise<Suspension | void> {
  const task = env.compiled.tasks[step.taskName];
  if (!task) {
    throw new Error(`Task "${step.taskName}" is not defined.`);
  }

  const stepInfo = env.buildInstanceStepInfo(step, state.iterationStack);
  const throwIfCancelled = () => {
    if (env.signal.aborted) {
      const error = getAbortReason(env.signal);
      recordTaskError(env, stepInfo, 'cancelled', error);
      throw error;
    }
  };

  throwIfCancelled();

  const inputs = await evaluateMapping(
    task.inputs,
    toEvaluationScope(state, env.context.state),
  );
  throwIfCancelled();

  const stepExecution = env.recordStepExecution(stepInfo, {
    action: task.actionName,
    status: 'running',
    startedAt: Date.now(),
    input: inputs,
    context: { before: env.context.snapshot() },
  });
  env.beginStepExecution?.(stepInfo.id);
  env.setCurrentStep(stepInfo);
  env.markSnapshot(stepInfo, 'running');
  env.emit('hook:step:start', {
    runId: env.runId,
    step: stepInfo,
    stepExecution,
  });

  try {
    throwIfAborted(env.signal);

    const actionPromise = Promise.resolve().then(() =>
      task.action.run(
        inputs,
        env.context,
        task.settings,
        task.bindings,
        env.signal,
      ),
    );
    const outcome = await waitForTaskProgress(env, stepInfo.id, actionPromise);

    if (outcome.type === 'completed') {
      await completeTask(env, stepInfo, task, state, outcome.value);

      return undefined;
    }

    if (outcome.type === 'failed' || outcome.type === 'cancelled') {
      env.clearStepSuspensions(stepInfo.id, outcome.error);
      recordTaskError(env, stepInfo, outcome.type, outcome.error);
      throw outcome.error;
    }

    return buildSuspensionContinuation(
      env,
      stepInfo,
      task,
      state,
      actionPromise,
      outcome.request,
    );
  } finally {
    env.setCurrentStep(undefined);
  }
}

const waitForTaskProgress = async (
  env: StepExecutorEnv,
  stepId: string,
  actionPromise: Promise<unknown>,
): Promise<TaskProgressOutcome> => {
  const completion = actionPromise.then(
    (value): TaskProgressOutcome => ({ type: 'completed', value }),
    (error): TaskProgressOutcome => ({ type: 'failed', error }),
  );
  const suspension = env
    .waitForStepSuspension(stepId)
    .then<TaskProgressOutcome>((request) => ({ type: 'suspended', request }));
  let cleanupCancellation = () => undefined;
  const cancellation = new Promise<TaskProgressOutcome>((resolve) => {
    if (env.signal.aborted) {
      resolve({ type: 'cancelled', error: getAbortReason(env.signal) });

      return;
    }

    const onAbort = () => {
      resolve({ type: 'cancelled', error: getAbortReason(env.signal) });
    };

    env.signal.addEventListener('abort', onAbort, { once: true });
    cleanupCancellation = () => {
      env.signal.removeEventListener('abort', onAbort);
    };
  });

  try {
    return await Promise.race([completion, suspension, cancellation]);
  } finally {
    cleanupCancellation();
  }
};
const completeTask = async (
  env: StepExecutorEnv,
  stepInfo: Suspension['step'],
  task: CompiledTask,
  state: ExecutionState,
  result: unknown,
) => {
  state.output[task.name] = result;
  const stepExecution = env.recordStepExecution(stepInfo, {
    status: 'completed',
    endedAt: Date.now(),
    output: result,
    context: { after: env.context.snapshot() },
  });
  env.markSnapshot(stepInfo, 'completed');
  env.emit('hook:step:success', {
    runId: env.runId,
    step: stepInfo,
    stepExecution,
  });
  env.clearStepSuspensions(stepInfo.id);
};
const recordSuspension = (
  env: StepExecutorEnv,
  stepInfo: Suspension['step'],
  reason?: string,
  data?: unknown,
) => {
  const stepExecution = env.recordStepExecution(stepInfo, {
    status: 'suspended',
    endedAt: Date.now(),
    reason,
    context: { after: env.context.snapshot() },
  });
  env.markSnapshot(stepInfo, 'suspended', reason);
  env.emit('hook:step:suspended', {
    runId: env.runId,
    step: stepInfo,
    stepExecution,
    reason,
    data,
  });
};
const buildSuspensionContinuation = (
  env: StepExecutorEnv,
  stepInfo: Suspension['step'],
  task: CompiledTask,
  state: ExecutionState,
  actionPromise: Promise<unknown>,
  request: RuntimeSuspensionRequest,
): Suspension => {
  recordSuspension(env, stepInfo, request.reason, request.data);

  let resumed = false;

  return {
    step: stepInfo,
    reason: request.reason,
    data: request.data,
    stepExecId: request.stepExecId,
    suspendIndex: request.suspendIndex,
    suspendKey: request.suspendKey,
    awaitResults: request.awaitResults,
    continue: async (resumeData: unknown) => {
      if (resumed) {
        throw new Error(
          `Suspension for step "${stepInfo.id}" has already been resumed.`,
        );
      }

      resumed = true;
      env.setCurrentStep(stepInfo);
      env.recordStepSuspendResult?.({
        stepId: stepInfo.id,
        stepExecId: request.stepExecId,
        suspendIndex: request.suspendIndex,
        suspendKey: request.suspendKey,
        resumeData,
      });
      request.resume.resolve(resumeData);

      let outcome: TaskProgressOutcome;
      try {
        outcome = await waitForTaskProgress(env, stepInfo.id, actionPromise);
      } finally {
        env.setCurrentStep(undefined);
      }

      if (outcome.type === 'suspended') {
        return buildSuspensionContinuation(
          env,
          stepInfo,
          task,
          state,
          actionPromise,
          outcome.request,
        );
      }

      if (outcome.type === 'completed') {
        await completeTask(env, stepInfo, task, state, outcome.value);

        return undefined;
      }

      env.clearStepSuspensions(stepInfo.id, outcome.error);
      recordTaskError(env, stepInfo, outcome.type, outcome.error);
      throw outcome.error;
    },
  };
};
const recordTaskError = (
  env: StepExecutorEnv,
  stepInfo: Suspension['step'],
  status: 'failed' | 'cancelled',
  error: unknown,
) => {
  const stepExecution = env.recordStepExecution(stepInfo, {
    status,
    endedAt: Date.now(),
    error: normalizeError(error),
    context: { after: env.context.snapshot() },
  });
  env.markSnapshot(stepInfo, status, normalizeErrorMessage(error));
  env.emit(status === 'failed' ? 'hook:step:error' : 'hook:step:cancelled', {
    runId: env.runId,
    step: stepInfo,
    stepExecution,
    error,
  });
};
const normalizeError = (error: unknown): { message: string; stack?: string } =>
  error instanceof Error
    ? { message: error.message, stack: error.stack }
    : { message: String(error) };
const normalizeErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
