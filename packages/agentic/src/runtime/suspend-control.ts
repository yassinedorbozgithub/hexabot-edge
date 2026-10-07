/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { NonDeterministicWorkflowError } from '../errors';
import type { Deferred } from '../utils/deferred';
import { createDeferred } from '../utils/deferred';

import type {
  SuspensionOptions,
  WorkflowRunStatus,
  WorkflowRuntimeControl,
} from './context';
import type { WorkflowRunner } from './runner';

const INDEX_KEY_PREFIX = 'index:';
const USER_KEY_PREFIX = 'key:';

type ReplayExpectation = {
  suspendIndex?: number;
  suspendKey: string;
  reason?: string;
  matched: boolean;
};

type StepExecutionState = {
  stepId: string;
  stepExecId: string;
  suspendCursor: number;
  awaitResults: Map<string, unknown>;
  replayExpectation?: ReplayExpectation;
};

type StoredReplaySeed = {
  stepExecId: string;
  awaitResults: Record<string, unknown>;
  activeSuspension?: {
    suspendIndex?: number;
    suspendKey?: string;
    reason?: string;
  };
};

export type RuntimeSuspensionRequest = {
  stepId: string;
  stepExecId: string;
  suspendIndex: number;
  suspendKey: string;
  reason?: string;
  data?: unknown;
  awaitResults: Record<string, unknown>;
  resume: Deferred<unknown>;
};

export type RuntimeStepReplaySeed = {
  stepId: string;
  stepExecId: string;
  awaitResults?: Record<string, unknown>;
  activeSuspension?: {
    suspendIndex?: number;
    suspendKey?: string;
    reason?: string;
  };
};

export type RuntimeResolvedSuspension = {
  stepId: string;
  resumeData: unknown;
  stepExecId?: string;
  suspendIndex?: number;
  suspendKey?: string;
};

/** Minimal wrapper that exposes runner controls to actions via the context. */
export class RunnerRuntimeControl implements WorkflowRuntimeControl {
  private readonly runner: WorkflowRunner;

  private readonly pendingSuspensions = new Map<
    string,
    RuntimeSuspensionRequest[]
  >();

  private readonly suspensionWaiters = new Map<
    string,
    Array<(request: RuntimeSuspensionRequest) => void>
  >();

  private readonly suspendListeners = new Map<
    string,
    Set<(resumed: Promise<unknown>) => void>
  >();

  private readonly primedResumeData = new Map<string, unknown[]>();

  private readonly stepAttempts = new Map<string, number>();

  private readonly activeStepExecutions = new Map<string, StepExecutionState>();

  private readonly replaySeeds = new Map<string, StoredReplaySeed>();

  constructor(runner: WorkflowRunner) {
    this.runner = runner;
  }

  get status(): WorkflowRunStatus {
    return this.runner.getStatus();
  }

  get resumeData(): unknown {
    return this.runner.getLastResumeData();
  }

  suspend<T = unknown>(options?: SuspensionOptions): Promise<T> {
    const currentStep = this.runner.getCurrentStep();

    if (!currentStep) {
      throw new Error(
        'workflow.suspend() can only be called while a workflow step is running.',
      );
    }

    const execution = this.ensureStepExecution(currentStep.id);

    execution.suspendCursor += 1;
    const suspendIndex = execution.suspendCursor;
    const suspendKey = buildSuspendKey(suspendIndex, options?.key);

    this.assertReplayExpectation(execution, {
      suspendIndex,
      suspendKey,
      reason: options?.reason,
    });

    if (execution.awaitResults.has(suspendKey)) {
      return Promise.resolve(execution.awaitResults.get(suspendKey) as T);
    }

    const primed = shiftQueue(this.primedResumeData, currentStep.id);

    if (primed) {
      return Promise.resolve(primed.value as T);
    }

    const request: RuntimeSuspensionRequest = {
      stepId: currentStep.id,
      stepExecId: execution.stepExecId,
      suspendIndex,
      suspendKey,
      reason: options?.reason,
      data: options?.data,
      awaitResults: Object.fromEntries(execution.awaitResults),
      resume: createDeferred<unknown>(),
    };

    this.suspendListeners
      .get(currentStep.id)
      ?.forEach((listener) => listener(request.resume.promise));
    this.enqueueSuspension(request);

    return request.resume.promise as Promise<T>;
  }

  onSuspend(listener: (resumed: Promise<unknown>) => void): () => void {
    const stepId = this.runner.getCurrentStep()?.id;

    if (!stepId) {
      return () => undefined;
    }

    const listeners = this.suspendListeners.get(stepId) ?? new Set();

    listeners.add(listener);
    this.suspendListeners.set(stepId, listeners);

    return () => {
      listeners.delete(listener);

      if (
        listeners.size === 0 &&
        this.suspendListeners.get(stepId) === listeners
      ) {
        this.suspendListeners.delete(stepId);
      }
    };
  }

  hasRecordedResult(key?: string): boolean {
    const currentStep = this.runner.getCurrentStep();

    if (!currentStep) {
      return false;
    }

    const execution = this.ensureStepExecution(currentStep.id);
    const suspendKey = buildSuspendKey(execution.suspendCursor + 1, key);

    if (execution.awaitResults.has(suspendKey)) {
      return true;
    }

    return (this.primedResumeData.get(currentStep.id)?.length ?? 0) > 0;
  }

  resume(data?: unknown): void {
    void this.runner.resume({ resumeData: data });
  }

  waitForStepSuspension(stepId: string): Promise<RuntimeSuspensionRequest> {
    const queued = shiftQueue(this.pendingSuspensions, stepId);

    if (queued) {
      return Promise.resolve(queued.value);
    }

    return new Promise((resolve) => {
      pushQueue(this.suspensionWaiters, stepId, resolve);
    });
  }

  beginStepExecution(stepId: string): string {
    const existing = this.activeStepExecutions.get(stepId);

    if (existing) {
      return existing.stepExecId;
    }

    const seeded = this.replaySeeds.get(stepId);

    if (seeded) {
      const execution: StepExecutionState = {
        stepId,
        stepExecId: seeded.stepExecId,
        suspendCursor: 0,
        awaitResults: normalizeAwaitResults(seeded.awaitResults),
        replayExpectation: seeded.activeSuspension
          ? {
              suspendIndex: seeded.activeSuspension.suspendIndex,
              suspendKey:
                normalizeSuspendKey(
                  seeded.activeSuspension.suspendIndex,
                  seeded.activeSuspension.suspendKey,
                ) ?? buildSuspendKey(seeded.activeSuspension.suspendIndex ?? 1),
              reason: seeded.activeSuspension.reason,
              matched: false,
            }
          : undefined,
      };

      this.activeStepExecutions.set(stepId, execution);
      this.replaySeeds.delete(stepId);
      this.bumpStepAttemptCounter(stepId, execution.stepExecId);

      return execution.stepExecId;
    }

    const attempt = (this.stepAttempts.get(stepId) ?? 0) + 1;
    const stepExecId = `${stepId}#${attempt}`;
    this.stepAttempts.set(stepId, attempt);
    this.activeStepExecutions.set(stepId, {
      stepId,
      stepExecId,
      suspendCursor: 0,
      awaitResults: new Map<string, unknown>(),
    });

    return stepExecId;
  }

  prepareStepReplay(seed: RuntimeStepReplaySeed): void {
    const normalizedAwaitResults = Object.fromEntries(
      normalizeAwaitResults(seed.awaitResults ?? {}),
    );

    this.replaySeeds.set(seed.stepId, {
      stepExecId: seed.stepExecId,
      awaitResults: normalizedAwaitResults,
      activeSuspension: seed.activeSuspension
        ? {
            suspendIndex: seed.activeSuspension.suspendIndex,
            suspendKey: normalizeSuspendKey(
              seed.activeSuspension.suspendIndex,
              seed.activeSuspension.suspendKey,
            ),
            reason: seed.activeSuspension.reason,
          }
        : undefined,
    });
    this.bumpStepAttemptCounter(seed.stepId, seed.stepExecId);
  }

  recordStepSuspendResult(params: RuntimeResolvedSuspension): void {
    const suspendKey = normalizeSuspendKey(
      params.suspendIndex,
      params.suspendKey,
    );

    if (!suspendKey) {
      this.primeStepResumeData(params.stepId, params.resumeData);

      return;
    }

    const activeExecution = this.activeStepExecutions.get(params.stepId);

    if (
      activeExecution &&
      (!params.stepExecId || params.stepExecId === activeExecution.stepExecId)
    ) {
      if (!activeExecution.awaitResults.has(suspendKey)) {
        activeExecution.awaitResults.set(suspendKey, params.resumeData);
      }

      return;
    }

    const replaySeed = this.replaySeeds.get(params.stepId);

    if (replaySeed) {
      if (params.stepExecId && replaySeed.stepExecId !== params.stepExecId) {
        return;
      }

      replaySeed.awaitResults[suspendKey] =
        replaySeed.awaitResults[suspendKey] ?? params.resumeData;
      this.replaySeeds.set(params.stepId, replaySeed);

      return;
    }

    const fallbackExecId = params.stepExecId ?? `${params.stepId}#1`;
    this.replaySeeds.set(params.stepId, {
      stepExecId: fallbackExecId,
      awaitResults: { [suspendKey]: params.resumeData },
    });
    this.bumpStepAttemptCounter(params.stepId, fallbackExecId);
  }

  clearStepSuspensions(stepId: string, error?: unknown): void {
    const queued = this.pendingSuspensions.get(stepId);

    if (queued) {
      for (const request of queued) {
        request.resume.reject(
          error ?? new Error(`Suspension for step "${stepId}" was cancelled.`),
        );
      }
    }

    const execution = this.activeStepExecutions.get(stepId);

    this.pendingSuspensions.delete(stepId);
    this.suspensionWaiters.delete(stepId);
    this.primedResumeData.delete(stepId);
    this.activeStepExecutions.delete(stepId);

    if (
      !error &&
      execution?.replayExpectation &&
      !execution.replayExpectation.matched
    ) {
      throw new NonDeterministicWorkflowError(
        `Replay for step "${stepId}" did not reach expected suspension ` +
          `"${execution.replayExpectation.suspendKey}".`,
      );
    }
  }

  primeStepResumeData(stepId: string, resumeData: unknown): void {
    pushQueue(this.primedResumeData, stepId, resumeData);
  }

  getSnapshot() {
    return this.runner.getSnapshot();
  }

  private enqueueSuspension(request: RuntimeSuspensionRequest): void {
    const waiter = shiftQueue(this.suspensionWaiters, request.stepId);

    if (waiter) {
      waiter.value(request);

      return;
    }

    pushQueue(this.pendingSuspensions, request.stepId, request);
  }

  private ensureStepExecution(stepId: string): StepExecutionState {
    const existing = this.activeStepExecutions.get(stepId);

    if (existing) {
      return existing;
    }

    this.beginStepExecution(stepId);

    const created = this.activeStepExecutions.get(stepId);

    if (!created) {
      throw new Error(`Unable to create runtime state for step "${stepId}".`);
    }

    return created;
  }

  private assertReplayExpectation(
    execution: StepExecutionState,
    encountered: { suspendIndex: number; suspendKey: string; reason?: string },
  ): void {
    const expectation = execution.replayExpectation;

    if (!expectation || expectation.matched) {
      return;
    }

    if (encountered.suspendKey === expectation.suspendKey) {
      if (
        expectation.reason !== undefined &&
        encountered.reason !== expectation.reason
      ) {
        throw new NonDeterministicWorkflowError(
          `Replay for step "${execution.stepId}" reached suspend ` +
            `"${encountered.suspendKey}" with reason "${encountered.reason ?? ''}", ` +
            `expected reason "${expectation.reason}".`,
        );
      }

      expectation.matched = true;

      return;
    }

    if (execution.awaitResults.has(encountered.suspendKey)) {
      return;
    }

    throw new NonDeterministicWorkflowError(
      `Replay for step "${execution.stepId}" reached unexpected suspend ` +
        `"${encountered.suspendKey}" before expected ` +
        `"${expectation.suspendKey}".`,
    );
  }

  private bumpStepAttemptCounter(stepId: string, stepExecId: string): void {
    const parsedAttempt = parseStepExecAttempt(stepId, stepExecId);

    if (parsedAttempt === null) {
      return;
    }

    const previous = this.stepAttempts.get(stepId) ?? 0;

    if (parsedAttempt > previous) {
      this.stepAttempts.set(stepId, parsedAttempt);
    }
  }
}

const buildSuspendKey = (suspendIndex: number, key?: string): string => {
  if (key) {
    return `${USER_KEY_PREFIX}${key}`;
  }

  return `${INDEX_KEY_PREFIX}${suspendIndex}`;
};
/** Prefix a stored key: numeric keys are suspend indexes, anything else is a user key. */
const normalizeStoredSuspendKey = (rawKey: string): string => {
  if (
    rawKey.startsWith(INDEX_KEY_PREFIX) ||
    rawKey.startsWith(USER_KEY_PREFIX)
  ) {
    return rawKey;
  }

  return /^\d+$/.test(rawKey)
    ? `${INDEX_KEY_PREFIX}${rawKey}`
    : `${USER_KEY_PREFIX}${rawKey}`;
};
const normalizeSuspendKey = (
  suspendIndex?: number,
  suspendKey?: string,
): string | undefined => {
  if (typeof suspendKey === 'string' && suspendKey.length > 0) {
    return normalizeStoredSuspendKey(suspendKey);
  }

  if (
    typeof suspendIndex === 'number' &&
    Number.isInteger(suspendIndex) &&
    suspendIndex > 0
  ) {
    return `${INDEX_KEY_PREFIX}${suspendIndex}`;
  }

  return undefined;
};
const normalizeAwaitResults = (
  awaitResults: Record<string, unknown>,
): Map<string, unknown> =>
  new Map(
    Object.entries(awaitResults).map(([rawKey, value]) => [
      normalizeStoredSuspendKey(rawKey),
      value,
    ]),
  );
const pushQueue = <T>(queues: Map<string, T[]>, key: string, value: T) => {
  const queue = queues.get(key) ?? [];

  queue.push(value);
  queues.set(key, queue);
};
/** Dequeue the oldest value; wrapped so queued `undefined` values stay distinguishable. */
const shiftQueue = <T>(
  queues: Map<string, T[]>,
  key: string,
): { value: T } | undefined => {
  const queue = queues.get(key);

  if (!queue || queue.length === 0) {
    return undefined;
  }

  const value = queue.shift() as T;

  if (queue.length === 0) {
    queues.delete(key);
  }

  return { value };
};
const parseStepExecAttempt = (
  stepId: string,
  stepExecId: string,
): number | null => {
  const prefix = `${stepId}#`;

  if (!stepExecId.startsWith(prefix)) {
    return null;
  }

  const numeric = Number.parseInt(stepExecId.slice(prefix.length), 10);

  if (Number.isNaN(numeric) || numeric < 1) {
    return null;
  }

  return numeric;
};
