/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

export class WorkflowCancellationError extends Error {
  constructor(message = 'Workflow execution was cancelled.') {
    super(message);
    this.name = 'WorkflowCancellationError';
  }
}

export class ParallelSuspensionError extends Error {
  constructor() {
    super('workflow.suspend() is not supported inside a parallel block.');
    this.name = 'ParallelSuspensionError';
  }
}

export class NonDeterministicWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonDeterministicWorkflowError';
  }
}

export const getAbortReason = (signal: AbortSignal): Error => {
  if (signal.reason instanceof Error) {
    return signal.reason;
  }

  if (signal.reason !== undefined) {
    return new WorkflowCancellationError(String(signal.reason));
  }

  return new WorkflowCancellationError();
};

export const throwIfAborted = (signal: AbortSignal): void => {
  if (signal.aborted) {
    throw getAbortReason(signal);
  }
};
