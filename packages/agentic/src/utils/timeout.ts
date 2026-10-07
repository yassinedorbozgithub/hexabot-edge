/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { getAbortReason, throwIfAborted } from '../errors';

/**
 * Resolves after the specified duration; useful for retry delays.
 * @param durationMs - Number of milliseconds to wait before resolving.
 * @param signal - Optional signal used to cancel the wait.
 * @returns A promise that resolves once the duration elapses.
 */
export const sleep = (
  durationMs: number,
  signal?: AbortSignal,
): Promise<void> => {
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  throwIfAborted(signal);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, durationMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(getAbortReason(signal));
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
};

/**
 * Timeout budget that stops counting down while paused, e.g. while an action
 * is suspended waiting for the workflow to resume. Pauses may overlap; the
 * clock only runs when none is pending. The clock starts on construction.
 */
export class PausableTimeout {
  /** Rejects once the budget is exhausted; never resolves. */
  readonly expired: Promise<never>;

  private remainingMs: number;

  private startedAt = 0;

  private timer?: ReturnType<typeof setTimeout>;

  private pendingPauses = 0;

  private disposed = false;

  private rejectExpired: (error: Error) => void = () => undefined;

  /**
   * @param timeoutMs - Time budget in milliseconds while not paused.
   */
  constructor(readonly timeoutMs: number) {
    this.remainingMs = timeoutMs;
    this.expired = new Promise<never>((_, reject) => {
      this.rejectExpired = reject;
    });
    // Callers may dispose without ever racing `expired`.
    this.expired.catch(() => undefined);
    this.start();
  }

  /**
   * Stop the clock until `until` settles (resolved or rejected).
   * @param until - Promise marking the end of the pause.
   */
  pauseUntil(until: PromiseLike<unknown>): void {
    if (this.disposed) {
      return;
    }

    this.pendingPauses += 1;

    if (this.pendingPauses === 1 && this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
      this.remainingMs = Math.max(
        0,
        this.remainingMs - (Date.now() - this.startedAt),
      );
    }

    const release = () => {
      this.pendingPauses -= 1;

      if (this.pendingPauses === 0) {
        this.start();
      }
    };

    until.then(release, release);
  }

  /** Stop the clock for good; `expired` will never reject afterwards. */
  dispose(): void {
    this.disposed = true;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private start(): void {
    if (this.disposed) {
      return;
    }

    this.startedAt = Date.now();
    this.timer = setTimeout(() => {
      this.disposed = true;
      this.rejectExpired(
        new Error(`Step execution exceeded timeout of ${this.timeoutMs}ms`),
      );
    }, this.remainingMs);
  }
}

/**
 * Wraps a promise and rejects if it does not settle within the timeout.
 * @param promise - Operation that may take longer than the allowed timeout.
 * @param timeout - Maximum time in milliseconds to wait before rejecting, or a
 * {@link PausableTimeout} whose clock can be paused. Either way it is disposed
 * once the wrapped promise settles.
 * @param signal - Optional signal used to cancel the operation.
 * @returns The result of the original promise when it resolves in time.
 * @throws Error when the timeout is exceeded.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout?: number | PausableTimeout,
  signal?: AbortSignal,
): Promise<T> {
  const timer =
    typeof timeout === 'number'
      ? timeout
        ? new PausableTimeout(timeout)
        : undefined
      : timeout;

  if (!timer && !signal) {
    return promise;
  }

  if (signal?.aborted) {
    timer?.dispose();
    // Reject right away without subscribing to the wrapped promise.
    throw getAbortReason(signal);
  }

  let cleanup = () => undefined;
  const guard = new Promise<never>((_, reject) => {
    const onAbort = () => reject(getAbortReason(signal as AbortSignal));

    timer?.expired.catch(reject);
    signal?.addEventListener('abort', onAbort, { once: true });
    cleanup = () => {
      timer?.dispose();
      signal?.removeEventListener('abort', onAbort);
    };
  });

  try {
    return await Promise.race([promise, guard]);
  } finally {
    cleanup();
  }
}
