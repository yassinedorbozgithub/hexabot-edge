/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { CompiledStep, DefDefinitions } from "@hexabot-ai/agentic";
import type { ResizeControlDirection } from "@xyflow/system";
import { useEffect, useState } from "react";

import { EMPTY_WORKFLOW_GRAPH } from "../constants/workflow.constants";
import {
  buildNodesAndEdges,
  getWorkflowDefaultConfig,
} from "../graph/pipeline";
import type {
  WorkflowAction,
  WorkflowBindingCatalog,
  WorkflowGraphData,
} from "../types/node.types";

type UseWorkflowGraphLayoutProps = {
  compiledFlow?: CompiledStep[];
  defs?: DefDefinitions;
  layoutDirection?: ResizeControlDirection;
  actionCatalog: ReadonlyMap<string, WorkflowAction>;
  bindingCatalog: WorkflowBindingCatalog;
  translate?: (key: string) => string;
};

export const useWorkflowGraphLayout = ({
  compiledFlow,
  defs,
  layoutDirection,
  actionCatalog,
  bindingCatalog,
  translate: t,
}: UseWorkflowGraphLayoutProps) => {
  const [graphData, setGraphData] =
    useState<WorkflowGraphData>(EMPTY_WORKFLOW_GRAPH);
  const isEmptyWorkflow =
    Array.isArray(compiledFlow) && compiledFlow.length === 0;
  const isLoading = compiledFlow === undefined;

  useEffect(() => {
    let cancelled = false;

    const layoutGraph = async () => {
      if (!compiledFlow?.length) {
        if (!cancelled) {
          setGraphData(EMPTY_WORKFLOW_GRAPH);
        }

        return;
      }

      try {
        const config = getWorkflowDefaultConfig(layoutDirection);
        const layoutedGraph = await buildNodesAndEdges({
          config,
          flow: compiledFlow,
          defs,
          actionCatalog,
          bindingCatalog,
          translate: t,
        });

        if (!cancelled) {
          setGraphData(layoutedGraph ?? EMPTY_WORKFLOW_GRAPH);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to layout workflow graph:", error);

        if (!cancelled) {
          setGraphData(EMPTY_WORKFLOW_GRAPH);
        }
      }
    };

    void layoutGraph();

    return () => {
      cancelled = true;
    };
  }, [actionCatalog, bindingCatalog, compiledFlow, defs, layoutDirection, t]);

  return {
    graphData,
    isEmptyWorkflow,
    isLoading,
  };
};
