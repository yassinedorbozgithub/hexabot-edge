/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type {
  ConditionalStep,
  ExecutionState,
  ResumeCursor,
  Suspension,
} from '../workflow-types';
import { evaluateValue, toEvaluationScope } from '../workflow-values';

import { markStepsSkipped } from './skip-helpers';
import type { StepExecutorEnv } from './types';

/**
 * Evaluate a conditional step by checking branches in order and executing the first match.
 * @param env Executor environment providing helpers and workflow context.
 * @param step The conditional step definition.
 * @param state Mutable workflow execution state.
 * @param path Path tokens locating this step within the workflow tree.
 * @param resumeAt Location of a persisted suspension inside a branch, if resuming.
 * @returns A suspension if a branch pauses execution, otherwise void.
 */
export async function executeConditional(
  env: StepExecutorEnv,
  step: ConditionalStep,
  state: ExecutionState,
  path: Array<number | string>,
  resumeAt?: ResumeCursor,
): Promise<Suspension | void> {
  if (resumeAt) {
    // The branch was already selected before suspending: `['branch', index, ...rest]`.
    const index = resumeAt.path[1] as number;

    return env.executeFlow(
      step.branches[index].steps,
      state,
      [...path, 'branch', index],
      0,
      { ...resumeAt, path: resumeAt.path.slice(2) },
    );
  }

  for (let index = 0; index < step.branches.length; index += 1) {
    const branch = step.branches[index];
    const conditionResult =
      branch.condition !== undefined
        ? await evaluateValue(
            branch.condition,
            toEvaluationScope(state, env.context.state),
          )
        : true;

    if (conditionResult) {
      step.branches.forEach((candidate, candidateIndex) => {
        if (candidateIndex !== index) {
          markStepsSkipped(env, candidate.steps, state.iterationStack);
        }
      });

      return env.executeFlow(branch.steps, state, [...path, 'branch', index]);
    }
  }

  if (step.branches.length > 0) {
    step.branches.forEach((branch) =>
      markStepsSkipped(env, branch.steps, state.iterationStack),
    );
  }

  return undefined;
}
