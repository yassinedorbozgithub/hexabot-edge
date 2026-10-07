/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { stringify as stringifyYaml } from 'yaml';

import { SNAKE_CASE_REGEX } from '../utils/naming';
import { getValueAtPath } from '../utils/object';

import { collectTaskReferences } from './flow-steps';
import {
  TASK_KIND,
  WorkflowDefinitionSchema,
  type FlowStep,
  type WorkflowDefinition,
} from './schema';

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const replaceOutputTaskReferences = (
  source: string,
  currentTaskName: string,
  nextTaskName: string,
): string => {
  if (!source.includes('$output')) {
    return source;
  }

  const escapedTaskName = escapeRegExp(currentTaskName);
  const dotNotationPattern = new RegExp(
    `(\\$output\\.)${escapedTaskName}(?=[^a-zA-Z0-9_]|$)`,
    'g',
  );
  const singleQuotePattern = new RegExp(
    `(\\$output\\s*\\[\\s*')${escapedTaskName}('\\s*\\])`,
    'g',
  );
  const doubleQuotePattern = new RegExp(
    `(\\$output\\s*\\[\\s*")${escapedTaskName}("\\s*\\])`,
    'g',
  );

  return source
    .replace(dotNotationPattern, `$1${nextTaskName}`)
    .replace(singleQuotePattern, `$1${nextTaskName}$2`)
    .replace(doubleQuotePattern, `$1${nextTaskName}$2`);
};
const renameTaskInFlow = (
  steps: WorkflowDefinition['flow'],
  currentTaskName: string,
  nextTaskName: string,
): WorkflowDefinition['flow'] => {
  return steps.map((step): FlowStep => {
    if ('do' in step) {
      return {
        ...step,
        do: step.do === currentTaskName ? nextTaskName : step.do,
      };
    }

    if ('parallel' in step) {
      return {
        ...step,
        parallel: {
          ...step.parallel,
          steps: renameTaskInFlow(
            step.parallel.steps,
            currentTaskName,
            nextTaskName,
          ),
        },
      };
    }

    if ('conditional' in step) {
      return {
        ...step,
        conditional: {
          ...step.conditional,
          when: step.conditional.when.map((branch) => ({
            ...branch,
            steps: renameTaskInFlow(
              branch.steps,
              currentTaskName,
              nextTaskName,
            ),
          })),
        },
      };
    }

    if ('loop' in step) {
      return {
        ...step,
        loop: {
          ...step.loop,
          steps: renameTaskInFlow(
            step.loop.steps,
            currentTaskName,
            nextTaskName,
          ),
        },
      };
    }

    return step;
  });
};
const renameOutputTaskReferencesInValue = (
  value: unknown,
  currentTaskName: string,
  nextTaskName: string,
): unknown => {
  if (typeof value === 'string') {
    return replaceOutputTaskReferences(value, currentTaskName, nextTaskName);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      renameOutputTaskReferencesInValue(item, currentTaskName, nextTaskName),
    );
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>(
    (acc, [key, nestedValue]) => {
      acc[key] = renameOutputTaskReferencesInValue(
        nestedValue,
        currentTaskName,
        nextTaskName,
      );

      return acc;
    },
    {},
  );
};

export const safeRenameTaskInDefinition = (
  definition: WorkflowDefinition,
  currentTaskName: string,
  nextTaskName: string,
): WorkflowDefinition => {
  if (currentTaskName === nextTaskName) {
    return definition;
  }

  if (
    !Object.hasOwn(definition.defs, currentTaskName) ||
    Object.hasOwn(definition.defs, nextTaskName) ||
    !SNAKE_CASE_REGEX.test(nextTaskName)
  ) {
    return definition;
  }

  const currentDefinition = definition.defs[currentTaskName];

  if (!currentDefinition || currentDefinition.kind !== TASK_KIND) {
    return definition;
  }

  const renamedDefs = Object.entries(definition.defs).reduce<
    WorkflowDefinition['defs']
  >((acc, [defName, def]) => {
    acc[defName === currentTaskName ? nextTaskName : defName] = def;

    return acc;
  }, {});
  const definitionWithRenamedFlow: WorkflowDefinition = {
    ...definition,
    defs: renamedDefs,
    flow: renameTaskInFlow(definition.flow, currentTaskName, nextTaskName),
  };

  return renameOutputTaskReferencesInValue(
    definitionWithRenamedFlow,
    currentTaskName,
    nextTaskName,
  ) as WorkflowDefinition;
};

export type FlowStepPath = Array<string | number>;

const getTaskNameFromStep = (step: unknown): string | null => {
  if (!step || typeof step !== 'object') {
    return null;
  }

  const taskName = (step as { do?: unknown }).do;

  return typeof taskName === 'string' ? taskName : null;
};

/**
 * Convert a workflow definition to YAML.
 * The definition is validated before serialization.
 */
export function stringifyDefinition(definition: WorkflowDefinition): string {
  const parsed = WorkflowDefinitionSchema.parse(definition);

  return stringifyYaml(parsed);
}

/**
 * Create a new value with a nested path updated immutably.
 */
export function setValueAtPath<T>(
  value: T,
  path: FlowStepPath,
  nextValue: unknown,
): T {
  if (path.length === 0) {
    return nextValue as T;
  }

  const [key, ...rest] = path;

  if (Array.isArray(value)) {
    if (typeof key !== 'number') {
      return value;
    }
    const nextArray = [...value];

    nextArray[key] = setValueAtPath(value[key], rest, nextValue);

    return nextArray as unknown as T;
  }

  if (value && typeof value === 'object') {
    return {
      ...(value as Record<string, unknown>),
      [String(key)]: setValueAtPath(
        (value as Record<string, unknown>)[String(key)],
        rest,
        nextValue,
      ),
    } as T;
  }

  return value;
}

/**
 * Remove a flow step from the definition at the given path, if valid.
 */
export function removeStepAtPath(
  definition: WorkflowDefinition,
  stepPath: FlowStepPath,
): WorkflowDefinition | null {
  if (!stepPath.length) {
    return null;
  }

  const removeIndex = stepPath.at(-1);

  if (typeof removeIndex !== 'number') {
    return null;
  }

  const stepsPath = stepPath.slice(0, -1);
  const steps = getValueAtPath(definition, stepsPath);

  if (!Array.isArray(steps)) {
    return null;
  }

  if (removeIndex < 0 || removeIndex >= steps.length) {
    return null;
  }

  const removedTaskName = getTaskNameFromStep(steps[removeIndex]);
  const nextSteps = [...steps];

  nextSteps.splice(removeIndex, 1);

  const nextDefinition = setValueAtPath(definition, stepsPath, nextSteps);

  if (
    !removedTaskName ||
    !Object.hasOwn(nextDefinition.defs, removedTaskName)
  ) {
    return nextDefinition;
  }

  if (nextDefinition.defs[removedTaskName]?.kind !== TASK_KIND) {
    return nextDefinition;
  }

  if (
    collectTaskReferences(nextDefinition.flow).some(
      ({ taskId }) => taskId === removedTaskName,
    )
  ) {
    return nextDefinition;
  }

  const { [removedTaskName]: _removedTask, ...remainingDefs } =
    nextDefinition.defs;

  return {
    ...nextDefinition,
    defs: remainingDefs,
  };
}

/**
 * Insert a flow step into the definition at the given path, if valid.
 */
export function insertStepAtPath(
  definition: WorkflowDefinition,
  insertPath: FlowStepPath,
  step: FlowStep,
): WorkflowDefinition | null {
  if (!insertPath.length) {
    return null;
  }

  const insertIndex = insertPath.at(-1);

  if (typeof insertIndex !== 'number') {
    return null;
  }

  const stepsPath = insertPath.slice(0, -1);
  const steps = getValueAtPath(definition, stepsPath);

  if (!Array.isArray(steps)) {
    return null;
  }

  const nextSteps = [...steps];
  const safeIndex = Math.min(Math.max(insertIndex, 0), nextSteps.length);

  nextSteps.splice(safeIndex, 0, step);

  return setValueAtPath(definition, stepsPath, nextSteps);
}
