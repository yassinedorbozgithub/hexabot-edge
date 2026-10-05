/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { z } from 'zod';

import { AbstractAction } from '../action/abstract-action';
import { ActionExecutionArgs, ActionMetadata } from '../action/types';
import { Settings } from '../dsl/schema';
import { WorkflowCancellationError } from '../errors';
import { BaseWorkflowContext } from '../runtime/context';
import { EventEmitterLike } from '../runtime/events';

const InputSchema = z.object({ value: z.number() });
const OutputSchema = z.object({ result: z.number() });

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;
const NoSettingsSchema = z.any();
type NoSettings = unknown;

class TestContext extends BaseWorkflowContext {
  public eventEmitter: EventEmitterLike = { emit: jest.fn(), on: jest.fn() };

  constructor() {
    super({});
  }
}

class HarnessedAction extends AbstractAction<
  Input,
  Output,
  TestContext,
  NoSettings
> {
  constructor(
    private readonly executor: (
      args: ActionExecutionArgs<Input, TestContext, NoSettings>,
    ) => Promise<Output>,
  ) {
    const metadata: ActionMetadata<Input, Output, NoSettings> = {
      name: 'timing_action',
      description: 'Action used to validate retry and timeout behavior.',
      inputSchema: InputSchema,
      outputSchema: OutputSchema,
      settingsSchema: NoSettingsSchema,
    };

    super(metadata);
  }

  execute(
    args: ActionExecutionArgs<Input, TestContext, NoSettings>,
  ): Promise<Output> {
    return this.executor(args);
  }
}

describe('AbstractAction timing and retries', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('fails when execution exceeds the configured timeout', async () => {
    jest.useFakeTimers();
    let attempts = 0;

    const action = new HarnessedAction(async () => {
      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 100));

      return { result: 1 };
    });
    const settings: Partial<Settings> = {
      timeout_ms: 50,
      retries: {
        enabled: true,
        max_attempts: 1,
        backoff_ms: 0,
        max_delay_ms: 0,
        jitter: 0,
        multiplier: 1,
      },
    };
    const runPromise = action.run({ value: 1 }, new TestContext(), settings);
    const runExpectation =
      expect(runPromise).rejects.toThrow(/timeout of 50ms/);
    await jest.advanceTimersByTimeAsync(60);

    await runExpectation;
    expect(attempts).toBe(1);
  });

  it('aborts a timed-out attempt before retrying', async () => {
    jest.useFakeTimers();
    const signals: AbortSignal[] = [];
    const action = new HarnessedAction(async ({ signal }) => {
      signals.push(signal);

      if (signals.length === 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return { result: signals.length };
    });
    const runPromise = action.run({ value: 1 }, new TestContext(), {
      timeout_ms: 50,
      retries: {
        enabled: true,
        max_attempts: 2,
        backoff_ms: 0,
        max_delay_ms: 0,
        jitter: 0,
        multiplier: 1,
      },
    });

    await jest.advanceTimersByTimeAsync(50);

    await expect(runPromise).resolves.toEqual({ result: 2 });
    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[0].reason).toEqual(
      new Error('Step execution exceeded timeout of 50ms'),
    );
    expect(signals[1].aborted).toBe(false);
  });

  it('aborts a timed-out attempt without aborting the run signal', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const signals: AbortSignal[] = [];
    const action = new HarnessedAction(
      ({ signal }) =>
        new Promise((_, reject) => {
          signals.push(signal);
          signal.addEventListener('abort', () => reject(signal.reason));
        }),
    );
    const runPromise = action.run(
      { value: 1 },
      new TestContext(),
      {
        timeout_ms: 50,
        retries: {
          enabled: true,
          max_attempts: 2,
          backoff_ms: 0,
          max_delay_ms: 0,
          jitter: 0,
          multiplier: 1,
        },
      },
      undefined,
      controller.signal,
    );
    const runExpectation = expect(runPromise).rejects.toThrow('stop');

    await jest.advanceTimersByTimeAsync(50);

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(controller.signal.aborted).toBe(false);
    expect(signals[1].aborted).toBe(false);

    // Run cancellation still reaches the attempt in flight.
    controller.abort(new Error('stop'));

    await runExpectation;
    expect(signals[1].aborted).toBe(true);
  });

  it('does not retry an action that throws a cancellation error', async () => {
    let attempts = 0;
    const action = new HarnessedAction(async () => {
      attempts += 1;

      throw new WorkflowCancellationError('cancelled upstream');
    });
    const runPromise = action.run({ value: 1 }, new TestContext(), {
      timeout_ms: 0,
      retries: {
        enabled: true,
        max_attempts: 3,
        backoff_ms: 0,
        max_delay_ms: 0,
        jitter: 0,
        multiplier: 1,
      },
    });

    await expect(runPromise).rejects.toThrow('cancelled upstream');
    expect(attempts).toBe(1);
  });

  it('applies exponential backoff capped by max_delay_ms', async () => {
    jest.useFakeTimers();

    let attempts = 0;
    const attemptTimestamps: number[] = [];
    const action = new HarnessedAction(async () => {
      attempts += 1;
      attemptTimestamps.push(Date.now());

      if (attempts < 3) {
        throw new Error('Retry me');
      }

      return { result: attempts };
    });
    const runPromise = action.run({ value: 1 }, new TestContext(), {
      timeout_ms: 0,
      retries: {
        enabled: true,
        max_attempts: 3,
        backoff_ms: 10,
        max_delay_ms: 15,
        jitter: 0,
        multiplier: 2,
      },
    });

    await Promise.resolve();
    expect(attempts).toBe(1);

    await jest.advanceTimersByTimeAsync(9);
    expect(attempts).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(attempts).toBe(2);

    await jest.advanceTimersByTimeAsync(14);
    expect(attempts).toBe(2);
    await jest.advanceTimersByTimeAsync(1);

    await expect(runPromise).resolves.toEqual({ result: 3 });

    expect(attempts).toBe(3);
    expect(attemptTimestamps[1] - attemptTimestamps[0]).toBe(10);
    expect(attemptTimestamps[2] - attemptTimestamps[1]).toBe(15);
  });

  it('uses jitter to randomize retry delays', async () => {
    jest.useFakeTimers();

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(1);
    let attempts = 0;
    const attemptTimestamps: number[] = [];
    const action = new HarnessedAction(async () => {
      attempts += 1;
      attemptTimestamps.push(Date.now());

      if (attempts < 2) {
        throw new Error('Intermittent');
      }

      return { result: attempts };
    });
    const runPromise = action.run({ value: 1 }, new TestContext(), {
      timeout_ms: 0,
      retries: {
        enabled: true,
        max_attempts: 2,
        backoff_ms: 100,
        max_delay_ms: 0,
        jitter: 0.5,
        multiplier: 1,
      },
    });

    await Promise.resolve();
    expect(attempts).toBe(1);

    await jest.advanceTimersByTimeAsync(149);
    expect(attempts).toBe(1);
    await jest.advanceTimersByTimeAsync(1);

    await expect(runPromise).resolves.toEqual({ result: 2 });

    expect(attempts).toBe(2);
    expect(randomSpy).toHaveBeenCalled();
    expect(attemptTimestamps[1] - attemptTimestamps[0]).toBe(150);
  });
});
