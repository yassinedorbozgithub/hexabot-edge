/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { ActionSnapshot } from '../context';
import {
  StepType,
  type StepInfo,
  type WorkflowEventMap,
} from '../workflow-event-emitter';
import type { CompiledStep } from '../workflow-types';

type SkipStepEnv = {
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
  emit: <K extends keyof WorkflowEventMap>(
    event: K,
    payload: WorkflowEventMap[K],
  ) => void;
};

/** Visit a step and its parallel/conditional descendants (loop bodies never ran, so they are left as is). */
const visitStepTree = (
  step: CompiledStep,
  visit: (step: CompiledStep) => void,
) => {
  visit(step);

  switch (step.type) {
    case StepType.Parallel:
      step.steps.forEach((child) => visitStepTree(child, visit));
      break;
    case StepType.Conditional:
      step.branches.forEach((branch) =>
        branch.steps.forEach((child) => visitStepTree(child, visit)),
      );
      break;
    case StepType.Loop:
    case StepType.Task:
      break;
  }
};

export const markStepsSkipped = (
  env: SkipStepEnv,
  steps: CompiledStep[],
  iterationStack: number[],
  reason?: string,
) => {
  steps.forEach((root) =>
    visitStepTree(root, (step) => {
      const stepInfo = env.buildInstanceStepInfo(step, iterationStack);
      env.markSnapshot(stepInfo, 'skipped', reason);
      env.emit('hook:step:skipped', {
        runId: env.runId,
        step: stepInfo,
        reason,
      });
    }),
  );
};

export const markStepsCancelled = (
  env: SkipStepEnv,
  steps: CompiledStep[],
  iterationStack: number[],
  reason?: string,
) => {
  steps.forEach((root) =>
    visitStepTree(root, (step) => {
      const stepInfo = env.buildInstanceStepInfo(step, iterationStack);
      env.markSnapshot(stepInfo, 'cancelled', reason);
      env.emit('hook:step:cancelled', {
        runId: env.runId,
        step: stepInfo,
        error: new Error(reason ?? 'Step execution was cancelled.'),
      });
    }),
  );
};
