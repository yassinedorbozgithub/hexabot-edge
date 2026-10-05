/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Expression } from 'jsonata';
import jsonata from 'jsonata';

import { isRecord } from '../utils/object';

import type {
  CompiledMapping,
  CompiledValue,
  EvaluationScope,
  ExecutionState,
  JsonataFunctionRegistry,
} from './types';

export type {
  JsonataFunctionConfig,
  JsonataFunctionImplementation,
  JsonataFunctionRegistry,
} from './types';

export type CompileValueOptions = {
  jsonataFunctions?: JsonataFunctionRegistry;
};

/**
 * Rebuild plain arrays and objects so actions never receive references into
 * workflow state. Strings are returned as is: data is never evaluated.
 */
const copyContainers = (
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): unknown => {
  if (!Array.isArray(value) && !isRecord(value)) {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  return Array.isArray(value)
    ? value.map((entry) => copyContainers(entry, seen))
    : Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          copyContainers(entry, seen),
        ]),
      );
};
const registerJsonataFunctions = (
  expression: Expression,
  registry?: JsonataFunctionRegistry,
) => {
  if (!registry) {
    return;
  }

  for (const [name, config] of Object.entries(registry)) {
    if (typeof config === 'function') {
      expression.registerFunction(name, config);
      continue;
    }

    if (config && typeof config.implementation === 'function') {
      expression.registerFunction(
        name,
        config.implementation,
        config.signature,
      );
      continue;
    }

    throw new Error(`Invalid JSONata function config for "${name}"`);
  }
};

/**
 * Prepares a workflow value for evaluation.
 * Strings prefixed with `=` are treated as JSONata expressions, including inside
 * arrays and plain objects; everything else is a literal.
 */
export const compileValue = (
  value: unknown,
  options?: CompileValueOptions,
): CompiledValue => compileNode(value, options, new WeakSet());

const compileNode = (
  value: unknown,
  options: CompileValueOptions | undefined,
  seen: WeakSet<object>,
): CompiledValue => {
  if (typeof value === 'string' && value.startsWith('=')) {
    const expression = jsonata(value.slice(1));
    registerJsonataFunctions(expression, options?.jsonataFunctions);

    return { kind: 'expression', source: value, expression };
  }

  if ((!Array.isArray(value) && !isRecord(value)) || seen.has(value)) {
    return { kind: 'literal', value };
  }
  seen.add(value);

  return Array.isArray(value)
    ? {
        kind: 'array',
        items: value.map((entry) => compileNode(entry, options, seen)),
      }
    : {
        kind: 'object',
        entries: Object.fromEntries(
          Object.entries(value).map(([key, entry]) => [
            key,
            compileNode(entry, options, seen),
          ]),
        ),
      };
};

/**
 * Evaluate a compiled value against the current workflow scope.
 * Expressions are executed via JSONata with the scope exposed as variables; `context`
 * represents the workflow context state, not the context instance itself.
 */
export const evaluateValue = async (
  compiled: CompiledValue,
  scope: EvaluationScope,
): Promise<unknown> => {
  if (compiled.kind === 'literal') {
    return compiled.value;
  }

  if (compiled.kind === 'array') {
    return Promise.all(
      compiled.items.map((item) => evaluateValue(item, scope)),
    );
  }

  if (compiled.kind === 'object') {
    return Object.fromEntries(
      await Promise.all(
        Object.entries(compiled.entries).map(async ([key, entry]) => [
          key,
          await evaluateValue(entry, scope),
        ]),
      ),
    );
  }

  return compiled.expression.evaluate(
    {},
    {
      input: scope.input,
      context: scope.context,
      output: scope.output,
      iteration: scope.iteration,
      accumulator: scope.accumulator,
      result: scope.result,
    },
  );
};

/**
 * Expose the execution state to expressions.
 * `context` is the workflow context state, not the context instance itself.
 */
export const toEvaluationScope = (
  state: ExecutionState,
  context: Record<string, unknown>,
): EvaluationScope => ({
  input: state.input,
  context,
  output: state.output,
  iteration: state.iteration,
  accumulator: state.accumulator,
});

/**
 * Evaluate all entries of a compiled mapping, returning a plain object.
 * Missing mappings resolve to an empty object.
 */
export const evaluateMapping = async (
  mapping: CompiledMapping | undefined,
  scope: EvaluationScope,
): Promise<Record<string, unknown>> => {
  if (!mapping) {
    return {};
  }

  const entries = await Promise.all(
    Object.entries(mapping).map(async ([key, compiled]) => [
      key,
      copyContainers(await evaluateValue(compiled, scope)),
    ]),
  );
  const result: Record<string, unknown> = Object.fromEntries(entries);

  return result;
};
