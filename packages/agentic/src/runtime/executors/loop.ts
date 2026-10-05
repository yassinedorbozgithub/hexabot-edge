/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { evaluateValue, toEvaluationScope } from '../expressions';
import { wrapSuspensionContinuation } from '../resume';
import type {
  EvaluationScope,
  ExecutionState,
  LoopStep,
  ResumeCursor,
  Suspension,
} from '../types';

import type { StepExecutorEnv } from './env';

/**
 * Execute a loop step by iterating over input items and executing child steps.
 * @param env Executor environment with helpers and workflow context.
 * @param step The loop step configuration.
 * @param state Mutable workflow execution state.
 * @param path Path tokens locating this loop within the workflow.
 * @param resumeAt Location of a persisted suspension inside this loop, if resuming.
 * @returns A suspension if a child step pauses execution, otherwise void.
 */
export async function executeLoop(
  env: StepExecutorEnv,
  step: LoopStep,
  state: ExecutionState,
  path: Array<number | string>,
  resumeAt?: ResumeCursor,
): Promise<Suspension | void> {
  const items =
    step.loopType === 'for_each'
      ? await evaluateValue(step.forEach.in, buildScope(env, state))
      : undefined;
  const initial = step.accumulate?.initial ?? state.accumulator;
  let accumulator = initial;

  if (!resumeAt) {
    saveLoopAccumulator(env, step, state, initial);
  } else {
    const saved = state.loopAccumulators;
    const key = loopAccumulatorKey(env, step, state);
    // Runs persisted before loop accumulators were tracked fall back to `state.accumulator`.
    accumulator =
      saved && key in saved ? saved[key] : (state.accumulator ?? initial);
  }

  return runIterations(
    env,
    step,
    state,
    path,
    Array.isArray(items) ? items : [],
    resumeAt?.iterationStack[0] ?? 0,
    accumulator,
    resumeAt,
  );
}

async function runIterations(
  env: StepExecutorEnv,
  step: LoopStep,
  state: ExecutionState,
  path: Array<number | string>,
  items: unknown[],
  startIndex: number,
  accumulator: unknown,
  resumeAt?: ResumeCursor,
): Promise<Suspension | void> {
  for (let index = startIndex; ; index += 1) {
    const iteration = {
      item: step.loopType === 'for_each' ? items[index] : undefined,
      index,
    };
    // A resumed iteration already passed its entry check before suspending.
    const isResumedIteration = resumeAt !== undefined && index === startIndex;
    const shouldEnter =
      step.loopType === 'for_each'
        ? index < items.length
        : isResumedIteration ||
          Boolean(
            await evaluateValue(
              step.while,
              buildScope(env, state, iteration, accumulator),
            ),
          );
    if (!shouldEnter) {
      break;
    }

    const iterationState: ExecutionState = {
      ...state,
      iteration,
      accumulator,
      iterationStack: [...state.iterationStack, index],
    };
    const suspension = await env.executeFlow(
      step.steps,
      iterationState,
      [...path, index],
      0,
      // Loop children paths are `[loopName, childIndex, ...rest]`.
      isResumedIteration
        ? {
            path: resumeAt.path.slice(1),
            iterationStack: resumeAt.iterationStack.slice(1),
          }
        : undefined,
    );
    const finishIteration = async () => {
      const scope = buildScope(env, iterationState, iteration, accumulator);
      accumulator = await updateAccumulator(step, scope, accumulator);
      saveLoopAccumulator(env, step, state, accumulator);

      return shouldStopLoop(step, scope);
    };

    if (suspension) {
      return wrapSuspensionContinuation(suspension, async () => {
        if (await finishIteration()) {
          finalizeAccumulatorState(env, step, state, accumulator);

          return undefined;
        }

        return runIterations(
          env,
          step,
          state,
          path,
          items,
          index + 1,
          accumulator,
        );
      });
    }

    if (await finishIteration()) {
      break;
    }
  }

  finalizeAccumulatorState(env, step, state, accumulator);

  return undefined;
}

function finalizeAccumulatorState(
  env: StepExecutorEnv,
  step: LoopStep,
  state: ExecutionState,
  accumulator: unknown,
): void {
  if (step.accumulate && state.loopAccumulators) {
    delete state.loopAccumulators[loopAccumulatorKey(env, step, state)];
  }

  if (step.accumulate && step.name) {
    state.output[step.name] = { [step.accumulate.as]: accumulator };
  }

  if (step.accumulate) {
    state.accumulator = accumulator;
  }
}

/**
 * Update the loop accumulator using the configured merge expression.
 * @param step The loop step containing accumulation settings.
 * @param scope Current evaluation scope for expressions.
 * @param previous Previous accumulator value to merge with.
 * @returns The updated accumulator value.
 */
export async function updateAccumulator(
  step: LoopStep,
  scope: EvaluationScope,
  previous: unknown,
): Promise<unknown> {
  if (!step.accumulate) {
    return previous;
  }

  return evaluateValue(step.accumulate.merge, {
    ...scope,
    accumulator: previous,
  });
}

/**
 * Determine whether loop execution should stop based on the `until` condition.
 * @param step The loop step configuration.
 * @param scope Current evaluation scope for expressions.
 * @returns True if the loop should stop, otherwise false.
 */
export async function shouldStopLoop(
  step: LoopStep,
  scope: EvaluationScope,
): Promise<boolean> {
  if (step.loopType !== 'for_each' || !step.until) {
    return false;
  }

  const result = await evaluateValue(step.until, scope);

  return Boolean(result);
}

/** Loop instance id, unique per enclosing iteration so nested loops do not collide. */
function loopAccumulatorKey(
  env: StepExecutorEnv,
  step: LoopStep,
  state: ExecutionState,
): string {
  return env.buildInstanceStepInfo(step, state.iterationStack).id;
}

/** Track the running accumulator on the shared state so persisted runs can restore it. */
function saveLoopAccumulator(
  env: StepExecutorEnv,
  step: LoopStep,
  state: ExecutionState,
  accumulator: unknown,
): void {
  if (step.accumulate && state.loopAccumulators) {
    state.loopAccumulators[loopAccumulatorKey(env, step, state)] = accumulator;
  }
}

function buildScope(
  env: StepExecutorEnv,
  state: ExecutionState,
  iteration = state.iteration,
  accumulator = state.accumulator,
): EvaluationScope {
  return {
    ...toEvaluationScope(state, env.context.state),
    iteration,
    accumulator,
  };
}
