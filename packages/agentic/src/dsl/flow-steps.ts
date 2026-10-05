/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { FlowStep } from './schema';

type TaskReference = {
  taskId: string;
  path: Array<string | number>;
};

/** List every `do` reference in a flow with its path in the definition. */
export const collectTaskReferences = (
  steps: FlowStep[],
  basePath: Array<string | number> = ['flow'],
): TaskReference[] => {
  const refs: TaskReference[] = [];

  steps.forEach((step, index) => {
    const stepPath = [...basePath, index];

    if ('do' in step) {
      refs.push({ taskId: step.do, path: [...stepPath, 'do'] });

      return;
    }

    if ('parallel' in step) {
      refs.push(
        ...collectTaskReferences(step.parallel.steps, [
          ...stepPath,
          'parallel',
          'steps',
        ]),
      );

      return;
    }

    if ('conditional' in step) {
      step.conditional.when.forEach((branch, branchIndex) => {
        refs.push(
          ...collectTaskReferences(branch.steps, [
            ...stepPath,
            'conditional',
            'when',
            branchIndex,
            'steps',
          ]),
        );
      });

      return;
    }

    if ('loop' in step) {
      refs.push(
        ...collectTaskReferences(step.loop.steps, [
          ...stepPath,
          'loop',
          'steps',
        ]),
      );
    }
  });

  return refs;
};
