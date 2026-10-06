/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { defineAction } from '../action/action';
import type { WorkflowDefinition } from '../dsl/schema';
import { compileWorkflow } from '../runtime/compiler';
import { BaseWorkflowContext } from '../runtime/context';
import { WorkflowEventEmitter } from '../runtime/events';
import { parseSuspendedStepId, WorkflowRunner } from '../runtime/runner';
import type { CompiledWorkflow, StartResult } from '../runtime/types';

import { createTaskDefs } from './test-helpers';

class TestContext extends BaseWorkflowContext {
  public eventEmitter = new WorkflowEventEmitter();

  constructor(state: Record<string, unknown> = {}) {
    super(state);
  }
}

const waitForReply = defineAction<
  { item?: unknown },
  unknown,
  TestContext,
  unknown
>({
  name: 'wait_for_reply',
  execute: async ({ input, context }) => ({
    item: input.item,
    reply: await context.workflow.suspend({ reason: 'awaiting_reply' }),
  }),
});
const echo = defineAction<{ value?: unknown }, unknown, TestContext, unknown>({
  name: 'echo',
  execute: async ({ input }) => input.value,
});
/** Wait for a reply, then update the pending `queue` the loop iterates over. */
const handleQueued = defineAction<
  { item?: unknown; update?: 'filter' | 'clear' | 'splice' },
  unknown,
  TestContext,
  unknown
>({
  name: 'handle_queued',
  execute: async ({ input, context }) => {
    const reply = await context.workflow.suspend({ reason: 'awaiting_reply' });
    const queue = context.state.queue as unknown[];
    if (input.update === 'filter') {
      context.state.queue = queue.filter((entry) => entry !== input.item);
    } else if (input.update === 'clear') {
      context.state.queue = [];
    } else {
      queue.splice(queue.indexOf(input.item), 1);
    }

    return { item: input.item, reply };
  },
});
const compile = (definition: WorkflowDefinition) =>
  compileWorkflow(definition, {
    actions: {
      wait_for_reply: waitForReply,
      echo,
      handle_queued: handleQueued,
    },
  });
/** Persist the run the way hosts do (root state + suspension metadata) and rebuild it. */
const restore = (
  compiled: CompiledWorkflow,
  runner: WorkflowRunner,
  result: StartResult,
  context = new TestContext(),
) => {
  if (result.status !== 'suspended') {
    throw new Error(`Expected a suspended run, got "${result.status}".`);
  }

  return WorkflowRunner.fromPersistedState(compiled, {
    state: structuredClone(runner.getState()!),
    context,
    snapshot: result.snapshot,
    suspension: {
      stepId: result.step.id,
      reason: result.reason ?? null,
      data: result.data,
      stepExecId: result.stepExecId,
      suspendIndex: result.suspendIndex,
      suspendKey: result.suspendKey,
      awaitResults: result.awaitResults,
    },
  });
};

describe('parseSuspendedStepId', () => {
  it('extracts path tokens and the iteration stack', () => {
    expect(parseSuspendedStepId('0.collector.1:task[2.3]')).toEqual({
      path: [0, 'collector', 1],
      iterationStack: [2, 3],
    });
    expect(parseSuspendedStepId('root:task')).toEqual({
      path: [],
      iterationStack: [],
    });
  });
});

describe('WorkflowRunner resume', () => {
  it('keeps the loop accumulator across in-memory resumes', async () => {
    const compiled = compile({
      defs: createTaskDefs({ wait: { action: 'wait_for_reply' } }),
      flow: [
        {
          loop: {
            type: 'for_each',
            name: 'totals',
            for_each: { item: 'value', in: '=[1, 2, 3]' },
            accumulate: {
              as: 'sum',
              initial: 0,
              merge: '=$accumulator + $iteration.item',
            },
            steps: [{ do: 'wait' }],
          },
        },
      ],
      outputs: { sum: '=$output.totals.sum' },
    });
    const runner = new WorkflowRunner(compiled);
    let result = await runner.start({
      inputData: {},
      context: new TestContext(),
    });

    while (result.status === 'suspended') {
      result = await runner.resume({ resumeData: 'ok' });
    }

    expect(result).toMatchObject({ status: 'finished', output: { sum: 6 } });
  });

  it('continues the outer flow after restoring a suspension inside a conditional branch', async () => {
    const compiled = compile({
      defs: createTaskDefs({
        wait: { action: 'wait_for_reply' },
        after: { action: 'echo', inputs: { value: '=$output.wait.reply' } },
      }),
      flow: [
        {
          conditional: {
            when: [
              { condition: '=false', steps: [{ do: 'after' }] },
              { else: true, steps: [{ do: 'wait' }] },
            ],
          },
        },
        { do: 'after' },
      ],
      outputs: { after: '=$output.after' },
    });
    const runner = new WorkflowRunner(compiled);
    const started = await runner.start({
      inputData: {},
      context: new TestContext(),
    });

    expect(started).toMatchObject({
      status: 'suspended',
      step: { id: '0.branch.1.0:wait' },
    });

    const restored = await restore(compiled, runner, started);

    await expect(
      restored.resume({ resumeData: 'pong' }),
    ).resolves.toMatchObject({ status: 'finished', output: { after: 'pong' } });
  });

  it('restores loop suspensions with the current iteration item and runs the remaining iterations', async () => {
    const compiled = compile({
      defs: createTaskDefs({
        wait: {
          action: 'wait_for_reply',
          inputs: { item: '=$iteration.item' },
        },
        after: { action: 'echo', inputs: { value: '=$output.wait' } },
      }),
      flow: [
        {
          loop: {
            type: 'for_each',
            name: 'items',
            for_each: { item: 'entry', in: '=["a", "b"]' },
            steps: [{ do: 'wait' }],
          },
        },
        { do: 'after' },
      ],
      outputs: { last: '=$output.after' },
    });
    let runner = new WorkflowRunner(compiled);
    let result = await runner.start({
      inputData: {},
      context: new TestContext(),
    });
    const suspendedSteps: string[] = [];

    while (result.status === 'suspended') {
      suspendedSteps.push(result.step.id);
      runner = await restore(compiled, runner, result);
      result = await runner.resume({
        resumeData: `reply-${suspendedSteps.length}`,
      });
    }

    expect(suspendedSteps).toEqual(['0.items.0:wait[0]', '0.items.0:wait[1]']);
    expect(result).toMatchObject({
      status: 'finished',
      output: { last: { item: 'b', reply: 'reply-2' } },
    });
  });

  /** Run to completion, persisting and restoring the runner at every pause. */
  const runRestoringEachPause = async (compiled: CompiledWorkflow) => {
    let runner = new WorkflowRunner(compiled);
    let result = await runner.start({
      inputData: {},
      context: new TestContext(),
    });
    let pauses = 0;

    while (result.status === 'suspended') {
      pauses += 1;
      runner = await restore(compiled, runner, result);
      result = await runner.resume({ resumeData: 'ok' });
    }

    return { result, pauses, state: runner.getState() };
  };

  it('keeps the loop accumulator when restoring at every pause', async () => {
    const { result, pauses, state } = await runRestoringEachPause(
      compile({
        defs: createTaskDefs({ wait: { action: 'wait_for_reply' } }),
        flow: [
          {
            loop: {
              type: 'for_each',
              name: 'totals',
              for_each: { item: 'value', in: '=[1, 2, 3]' },
              accumulate: {
                as: 'sum',
                initial: 0,
                merge: '=$accumulator + $iteration.item',
              },
              steps: [{ do: 'wait' }],
            },
          },
        ],
        outputs: { sum: '=$output.totals.sum' },
      }),
    );

    expect(pauses).toBe(3);
    expect(result).toMatchObject({ status: 'finished', output: { sum: 6 } });
    expect(state?.loopAccumulators).toEqual({});
  });

  it('keeps separate accumulators for nested loops when restoring at every pause', async () => {
    const { result, pauses } = await runRestoringEachPause(
      compile({
        defs: createTaskDefs({ wait: { action: 'wait_for_reply' } }),
        flow: [
          {
            loop: {
              type: 'for_each',
              name: 'outer',
              for_each: { item: 'factor', in: '=[1, 2]' },
              accumulate: {
                as: 'total',
                initial: 0,
                merge: '=$accumulator + $output.inner.sum',
              },
              steps: [
                {
                  loop: {
                    type: 'for_each',
                    name: 'inner',
                    for_each: {
                      item: 'value',
                      in: '=[$iteration.item * 10, $iteration.item * 20]',
                    },
                    accumulate: {
                      as: 'sum',
                      initial: 0,
                      merge: '=$accumulator + $iteration.item',
                    },
                    steps: [{ do: 'wait' }],
                  },
                },
              ],
            },
          },
        ],
        outputs: { total: '=$output.outer.total' },
      }),
    );

    // inner sums: 10 + 20 = 30, then 20 + 40 = 60
    expect(pauses).toBe(4);
    expect(result).toMatchObject({ status: 'finished', output: { total: 90 } });
  });

  it.each([
    { update: 'filter', restoring: true },
    { update: 'clear', restoring: true },
    { update: 'splice', restoring: false },
  ])(
    'iterates over the for_each items evaluated at loop start (update: $update, restoring: $restoring)',
    async ({ update, restoring }) => {
      const compiled = compile({
        defs: createTaskDefs({
          handle: {
            action: 'handle_queued',
            inputs: { item: '=$iteration.item', update },
          },
        }),
        flow: [
          {
            loop: {
              type: 'for_each',
              name: 'pending',
              for_each: { item: 'entry', in: '=$context.queue' },
              accumulate: {
                as: 'handled',
                initial: [],
                merge: '=$append($accumulator, $output.handle.item)',
              },
              steps: [{ do: 'handle' }],
            },
          },
        ],
        outputs: { handled: '=$output.pending.handled' },
      });
      let context = new TestContext({ queue: ['a', 'b', 'c'] });
      let runner = new WorkflowRunner(compiled);
      let result = await runner.start({ inputData: {}, context });
      let pauses = 0;

      while (result.status === 'suspended' && pauses < 5) {
        pauses += 1;
        if (restoring) {
          context = new TestContext(structuredClone(context.state));
          runner = await restore(compiled, runner, result, context);
        }
        result = await runner.resume({ resumeData: 'ok' });
      }

      expect(pauses).toBe(3);
      expect(result).toMatchObject({
        status: 'finished',
        output: { handled: ['a', 'b', 'c'] },
      });
      expect(runner.getState()?.loopItems).toEqual({});
    },
  );

  it('refuses to restore suspensions pointing inside parallel blocks', async () => {
    const compiled = compile({
      defs: createTaskDefs({ wait: { action: 'wait_for_reply' } }),
      flow: [{ parallel: { steps: [{ do: 'wait' }] } }],
      outputs: {},
    });

    await expect(
      WorkflowRunner.fromPersistedState(compiled, {
        state: { input: {}, output: {}, iterationStack: [] },
        context: new TestContext(),
        snapshot: { status: 'suspended', actions: {} },
        suspension: { stepId: '0.parallel.0:wait' },
      }),
    ).rejects.toThrow(
      'Unable to rebuild suspension for step 0.parallel.0:wait',
    );
  });
});
