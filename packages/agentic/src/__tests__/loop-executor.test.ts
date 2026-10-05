/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { BaseWorkflowContext } from '../runtime/context';
import { type EventEmitterLike } from '../runtime/events';
import type { StepExecutorEnv } from '../runtime/executors/env';
import {
  executeLoop,
  shouldStopLoop,
  updateAccumulator,
} from '../runtime/executors/loop';
import { compileValue } from '../runtime/expressions';
import type { RuntimeSuspensionRequest } from '../runtime/suspend-control';
import {
  StepType,
  type StepInfo,
  CompiledStep,
  ExecutionState,
  LoopStep,
  Suspension,
} from '../runtime/types';

class TestContext extends BaseWorkflowContext {
  public eventEmitter: EventEmitterLike = { emit: jest.fn(), on: jest.fn() };

  constructor() {
    super({});
  }
}

const createState = (): ExecutionState => ({
  input: {},
  output: {},
  iterationStack: [],
});
const createEnv = (executeFlow: jest.Mock): StepExecutorEnv => {
  const compiled = {
    definition: {} as any,
    tasks: {},
    flow: [],
    outputMapping: {},
    inputParser: { parse: (value: unknown) => value } as any,
  } as any;
  const env = {
    compiled,
    context: new TestContext(),
    signal: new AbortController().signal,
    runId: 'run-loop',
    buildInstanceStepInfo: jest.fn(),
    markSnapshot: jest.fn(),
    recordStepExecution: jest.fn(),
    emit: jest.fn(),
    setCurrentStep: jest.fn(),
    waitForStepSuspension: jest
      .fn()
      .mockImplementation(
        () => new Promise<RuntimeSuspensionRequest>(() => undefined),
      ),
    clearStepSuspensions: jest.fn(),
    primeStepResumeData: jest.fn(),
    executeFlow,
    executeStep: jest.fn(),
    fork: jest.fn(),
  } as StepExecutorEnv;

  env.fork = jest.fn((overrides) => ({ ...env, ...overrides }));

  return env;
};
const createTaskStep = (id: string): CompiledStep => ({
  id,
  type: StepType.Task,
  label: id,
  taskName: `task_${id}`,
});

describe('executeLoop', () => {
  it('iterates items, accumulates values, and stops when the until condition is met', async () => {
    const flowCalls: Array<{ index: number; item: unknown }> = [];
    const executeFlow = jest.fn(
      async (_steps: CompiledStep[], iterationState: ExecutionState) => {
        flowCalls.push(
          iterationState.iteration as { index: number; item: unknown },
        );
        iterationState.output[`item_${iterationState.iteration?.index}`] =
          iterationState.iteration?.item;

        return undefined;
      },
    );
    const env = createEnv(executeFlow);
    const state = createState();
    const step: LoopStep = {
      id: 'loop',
      type: StepType.Loop,
      loopType: 'for_each',
      label: 'loop',
      name: 'collector',
      forEach: { item: 'entry', in: { kind: 'literal', value: [2, 4, 6] } },
      until: compileValue('=$accumulator >= 6'),
      accumulate: {
        as: 'sum',
        initial: 0,
        merge: compileValue('=$accumulator + $iteration.item'),
      },
      steps: [createTaskStep('child')],
    };
    const result = await executeLoop(env, step, state, []);

    expect(result).toBeUndefined();
    // `until` sees the accumulator merged for the iteration that just finished.
    expect(flowCalls).toEqual([
      { item: 2, index: 0 },
      { item: 4, index: 1 },
    ]);
    expect(state.output.collector).toEqual({ sum: 6 });
    expect(state.accumulator).toBe(6);
    expect(state.output).toMatchObject({ item_0: 2, item_1: 4 });
    expect(state.output).not.toHaveProperty('item_2');
  });

  it('rejects for_each inputs that do not evaluate to an array', async () => {
    const executeFlow = jest.fn();
    const env = createEnv(executeFlow);
    const state = createState();
    const step: LoopStep = {
      id: 'loop',
      type: StepType.Loop,
      loopType: 'for_each',
      label: 'loop',
      name: 'collector',
      forEach: { item: 'entry', in: { kind: 'literal', value: 'not-a-list' } },
      steps: [createTaskStep('child')],
    };

    await expect(executeLoop(env, step, state, [])).rejects.toThrow(
      'Loop "collector" expects "for_each.in" to evaluate to an array, got string.',
    );

    // Nullish inputs still mean "nothing to iterate".
    const nullishStep: LoopStep = {
      ...step,
      forEach: { item: 'entry', in: { kind: 'literal', value: null } },
    };

    await expect(
      executeLoop(env, nullishStep, state, []),
    ).resolves.toBeUndefined();
    expect(executeFlow).not.toHaveBeenCalled();
  });

  it('resumes after suspension and continues remaining iterations', async () => {
    const innerSuspension: Suspension = {
      step: { id: 'child', name: 'child', type: StepType.Task } as StepInfo,
      continue: jest.fn().mockResolvedValue(undefined),
    };
    const executeFlow = jest
      .fn()
      .mockResolvedValueOnce(innerSuspension)
      .mockImplementationOnce(
        async (_steps: CompiledStep[], iterationState: ExecutionState) => {
          iterationState.output[`item_${iterationState.iteration?.index}`] =
            iterationState.iteration?.item;

          return undefined;
        },
      );
    const env = createEnv(executeFlow);
    const state = createState();
    const step: LoopStep = {
      id: 'loop',
      type: StepType.Loop,
      loopType: 'for_each',
      label: 'loop',
      name: 'collector',
      forEach: { item: 'entry', in: { kind: 'literal', value: [1, 2] } },
      until: compileValue('=$iteration.index >= 1'),
      accumulate: {
        as: 'sum',
        initial: 0,
        merge: compileValue('=$accumulator + $iteration.item'),
      },
      steps: [createTaskStep('child')],
    };
    const suspension = await executeLoop(env, step, state, []);
    expect(suspension).toEqual(
      expect.objectContaining({ step: innerSuspension.step }),
    );

    const result = await suspension?.continue({ resumed: true });

    expect(result).toBeUndefined();
    expect(innerSuspension.continue).toHaveBeenCalledWith({ resumed: true });
    expect(executeFlow).toHaveBeenCalledTimes(2);
    expect(executeFlow).toHaveBeenNthCalledWith(
      1,
      step.steps,
      expect.any(Object),
      [0],
      0,
      undefined,
    );
    expect(executeFlow).toHaveBeenNthCalledWith(
      2,
      step.steps,
      expect.any(Object),
      [1],
      0,
      undefined,
    );
    expect(state.output.collector).toEqual({ sum: 3 });
    expect(state.accumulator).toBe(3);
  });

  it('evaluates while loops before each iteration and can exit without running', async () => {
    const executeFlow = jest.fn();
    const env = createEnv(executeFlow);
    const state = createState();
    const step: LoopStep = {
      id: 'loop',
      type: StepType.Loop,
      loopType: 'while',
      label: 'loop',
      while: compileValue('=$exists($output.await_phone_reply) = true'),
      steps: [createTaskStep('child')],
    };
    const result = await executeLoop(env, step, state, []);

    expect(result).toBeUndefined();
    expect(executeFlow).not.toHaveBeenCalled();
  });

  it('continues while loops after suspension until the condition becomes false', async () => {
    const innerSuspension: Suspension = {
      step: { id: 'child', name: 'child', type: StepType.Task } as StepInfo,
      continue: jest.fn().mockResolvedValue(undefined),
    };
    const executeFlow = jest
      .fn()
      .mockResolvedValueOnce(innerSuspension)
      .mockImplementationOnce(
        async (_steps: CompiledStep[], iterationState: ExecutionState) => {
          iterationState.output.should_continue = false;
          iterationState.output.done = true;

          return undefined;
        },
      );
    const env = createEnv(executeFlow);
    const state = createState();
    state.output.should_continue = true;

    const step: LoopStep = {
      id: 'loop',
      type: StepType.Loop,
      loopType: 'while',
      label: 'loop',
      name: 'collector',
      while: compileValue(
        '=$exists($output.should_continue) and $output.should_continue = true',
      ),
      accumulate: {
        as: 'count',
        initial: 0,
        merge: compileValue('=$accumulator + 1'),
      },
      steps: [createTaskStep('child')],
    };
    const suspension = await executeLoop(env, step, state, []);
    expect(suspension).toEqual(
      expect.objectContaining({ step: innerSuspension.step }),
    );

    const result = await suspension?.continue({ resumed: true });

    expect(result).toBeUndefined();
    expect(innerSuspension.continue).toHaveBeenCalledWith({ resumed: true });
    expect(executeFlow).toHaveBeenCalledTimes(2);
    expect(executeFlow).toHaveBeenNthCalledWith(
      1,
      step.steps,
      expect.any(Object),
      [0],
      0,
      undefined,
    );
    expect(executeFlow).toHaveBeenNthCalledWith(
      2,
      step.steps,
      expect.any(Object),
      [1],
      0,
      undefined,
    );
    expect(state.output.collector).toEqual({ count: 2 });
  });
});

describe('loop helpers', () => {
  it('updates accumulator and stop conditions based on configuration', async () => {
    const step: LoopStep = {
      id: 'loop',
      type: StepType.Loop,
      loopType: 'for_each',
      label: 'loop',
      forEach: { item: 'entry', in: { kind: 'literal', value: [] } },
      steps: [],
    };
    const scope = {
      input: {},
      context: new TestContext().state,
      output: {},
      iteration: { item: 1, index: 0 },
      accumulator: 5,
    };

    await expect(updateAccumulator(step, scope, 5)).resolves.toBe(5);
    await expect(shouldStopLoop(step, scope)).resolves.toBe(false);
  });

  it('does not stop while loops through until semantics', async () => {
    const step: LoopStep = {
      id: 'loop',
      type: StepType.Loop,
      loopType: 'while',
      label: 'loop',
      while: compileValue('=true'),
      steps: [],
    };
    const scope = {
      input: {},
      context: new TestContext().state,
      output: {},
      iteration: { item: undefined, index: 0 },
      accumulator: 0,
    };

    await expect(shouldStopLoop(step, scope)).resolves.toBe(false);
  });
});
