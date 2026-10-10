/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type {
  EIndicatorType,
  GraphNode,
  NodeExecutionState,
  WorkflowExecutionStateMap,
} from "../types/node.types";

type ResolveNodeExecutionStateParams = {
  executionStates: WorkflowExecutionStateMap;
  nodeId: string;
  stepId?: string;
  indicator?: EIndicatorType;
};
const EXECUTION_STATE_PRIORITY: Record<NodeExecutionState, number> = {
  idle: 0,
  running: 1,
  start: 1,
  finish: 2,
  cancelled: 3,
  suspended: 4,
  error: 5,
};

export const resolveNodeExecutionState = ({
  executionStates,
  nodeId,
  stepId,
  indicator,
}: ResolveNodeExecutionStateParams): NodeExecutionState | undefined => {
  const keys: string[] = [];
  const addKey = (key: string | undefined) => {
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  };

  addKey(nodeId);
  addKey(stepId);
  addKey(indicator);

  let latestState:
    | {
        state: NodeExecutionState;
        t: number;
      }
    | undefined;

  keys.forEach((key) => {
    executionStates[key]?.forEach((entry) => {
      if (
        !latestState ||
        entry.t > latestState.t ||
        (entry.t === latestState.t &&
          EXECUTION_STATE_PRIORITY[entry.state] >=
            EXECUTION_STATE_PRIORITY[latestState.state])
      ) {
        latestState = entry;
      }
    });
  });

  return latestState?.state;
};

const resolveRuntimeNodeExecutionState = (
  node: GraphNode,
  executionStates: WorkflowExecutionStateMap,
): NodeExecutionState | undefined => {
  const nodeData = node.data as {
    stepId?: unknown;
    indicator?: unknown;
  };
  const stepId =
    typeof nodeData.stepId === "string" ? nodeData.stepId : undefined;
  const indicator =
    typeof nodeData.indicator === "string"
      ? (nodeData.indicator as EIndicatorType)
      : undefined;

  return resolveNodeExecutionState({
    executionStates,
    nodeId: node.id,
    stepId,
    indicator,
  });
};

export const applyWorkflowExecutionStatesToNodes = (
  nodes: GraphNode[],
  executionStates: WorkflowExecutionStateMap,
): GraphNode[] => {
  if (nodes.length === 0) {
    return nodes;
  }

  let didChange = false;
  const runtimeNodes = nodes.map((node) => {
    const executionState = resolveRuntimeNodeExecutionState(
      node,
      executionStates,
    );
    const currentExecutionState = (
      node.data as { executionState?: NodeExecutionState }
    ).executionState;

    if (currentExecutionState === executionState) {
      return node;
    }

    didChange = true;

    return {
      ...node,
      data: {
        ...node.data,
        executionState,
      } as GraphNode["data"],
    } as GraphNode;
  });

  return didChange ? runtimeNodes : nodes;
};
