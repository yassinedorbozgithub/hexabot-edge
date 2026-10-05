/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import * as editing from '../dsl/editing';
import {
  safeRenameTaskInDefinition as renameTaskInDefinition,
  type FlowStepPath,
} from '../dsl/editing';
import { issueMessages } from '../dsl/issues';
import { WorkflowDefinition, type FlowStep } from '../dsl/schema';
import { validateWorkflow } from '../dsl/validate';
import { getValueAtPath } from '../utils/object';

import { compileWorkflow, type WorkflowCompileOptions } from './compiler';
import {
  EWorkflowRunStatus,
  type BaseWorkflowContext,
  type WorkflowSnapshot,
} from './context';
import { WorkflowRunner } from './runner';
import type {
  CompiledWorkflow,
  ExecutionState,
  PersistedSuspension,
  WorkflowRunOptions,
} from './types';

export { compileWorkflow } from './compiler';

export { WorkflowEventEmitter } from './events';

export { WorkflowRunner } from './runner';

export type {
  WorkflowResumeResult,
  WorkflowRunOptions,
  WorkflowStartResult,
} from './types';

export type { WorkflowCompileOptions } from './compiler';

class WorkflowRunSuspendedError extends Error {
  public readonly stepId: string;

  public readonly reason?: string;

  public readonly data?: unknown;

  constructor(stepId: string, options?: { reason?: string; data?: unknown }) {
    super(
      `Workflow run suspended at step ${stepId}${options?.reason ? `: ${options.reason}` : ''}`,
    );
    this.name = 'WorkflowRunSuspendedError';
    this.stepId = stepId;
    this.reason = options?.reason;
    this.data = options?.data;
  }
}

/**
 * Entry point for preparing and executing workflows from YAML or object definitions.
 * Instances are thin wrappers around a compiled workflow graph.
 */
export class Workflow {
  private readonly compiled: CompiledWorkflow;

  private constructor(compiled: CompiledWorkflow) {
    this.compiled = compiled;
  }

  /**
   * Create a workflow from an already parsed definition.
   * The definition is validated before compilation to catch schema issues early.
   */
  static fromDefinition(
    definition: WorkflowDefinition,
    options: WorkflowCompileOptions,
  ): Workflow {
    return Workflow.validateAndCompile(definition, options);
  }

  /**
   * Create a workflow from YAML source.
   * YAML is validated and compiled before being wrapped in a {@link Workflow} instance.
   */
  static fromYaml(yaml: string, options: WorkflowCompileOptions): Workflow {
    return Workflow.validateAndCompile(yaml, options);
  }

  /** Validate a YAML string or parsed definition, then compile it. */
  private static validateAndCompile(
    input: string | WorkflowDefinition,
    options: WorkflowCompileOptions,
  ): Workflow {
    const validation = validateWorkflow(input, {
      bindingKinds: options.bindingKinds,
      actions: options.actions,
    });
    if (!validation.success) {
      throw new Error(
        `Workflow validation failed: ${issueMessages(validation.issues).join('; ')}`,
      );
    }

    const compiled = compileWorkflow(validation.data, options);

    return new Workflow(compiled);
  }

  /**
   * Convert a workflow definition to YAML.
   * The definition is validated before serialization.
   */
  static stringifyDefinition(definition: WorkflowDefinition): string {
    return editing.stringifyDefinition(definition);
  }

  /**
   * Resolve a nested value from a workflow definition by path.
   */
  static getValueAtPath(value: unknown, path: FlowStepPath): unknown {
    return getValueAtPath(value, path);
  }

  /**
   * Create a new value with a nested path updated immutably.
   */
  static setValueAtPath<T>(
    value: T,
    path: FlowStepPath,
    nextValue: unknown,
  ): T {
    return editing.setValueAtPath<T>(value, path, nextValue);
  }

  /**
   * Remove a flow step from the definition at the given path, if valid.
   */
  static removeStepAtPath(
    definition: WorkflowDefinition,
    stepPath: FlowStepPath,
  ): WorkflowDefinition | null {
    return editing.removeStepAtPath(definition, stepPath);
  }

  /**
   * Insert a flow step into the definition at the given path, if valid.
   */
  static insertStepAtPath(
    definition: WorkflowDefinition,
    insertPath: FlowStepPath,
    step: FlowStep,
  ): WorkflowDefinition | null {
    return editing.insertStepAtPath(definition, insertPath, step);
  }

  /**
   * Rename a task key and update references in flow steps and output expressions.
   * Returns the definition unchanged when the next name is taken or not snake_case.
   */
  static safeRenameTaskInDefinition(
    definition: WorkflowDefinition,
    currentTaskName: string,
    nextTaskName: string,
  ): WorkflowDefinition {
    return renameTaskInDefinition(definition, currentTaskName, nextTaskName);
  }

  /**
   * Run the workflow until completion or suspension.
   * Throws when a task suspends so callers can capture the state.
   */
  async run(
    inputData: unknown,
    context: BaseWorkflowContext,
    options?: WorkflowRunOptions,
  ): Promise<Record<string, unknown>> {
    const runner = new WorkflowRunner(this.compiled, options);
    const result = await runner.start({
      inputData,
      context,
    });

    if (result.status === EWorkflowRunStatus.FINISHED) {
      return result.output;
    }

    if (result.status === EWorkflowRunStatus.FAILED) {
      throw result.error instanceof Error
        ? result.error
        : new Error(String(result.error));
    }

    context.attachWorkflowRuntime(undefined);
    throw new WorkflowRunSuspendedError(result.step.id, {
      reason: result.reason,
      data: result.data,
    });
  }

  /**
   * Construct a runner without executing, allowing hosts to manage start/resume manually.
   */
  async buildAsyncRunner(
    options?: WorkflowRunOptions,
  ): Promise<WorkflowRunner> {
    return new WorkflowRunner(this.compiled, options);
  }

  /**
   * Rebuild a runner from persisted state and snapshot, useful after restarts.
   */
  async buildRunnerFromState(options: {
    state: ExecutionState;
    context: BaseWorkflowContext;
    snapshot: WorkflowSnapshot;
    suspension?: PersistedSuspension;
    runId?: string;
    lastResumeData?: unknown;
  }): Promise<WorkflowRunner> {
    return WorkflowRunner.fromPersistedState(this.compiled, options);
  }
}
