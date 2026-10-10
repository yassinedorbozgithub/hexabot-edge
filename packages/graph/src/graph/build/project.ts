/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Edge } from "@xyflow/react";

import {
  DEFAULT_NODE_PROPS,
  NODE_AUTO_WIDTH,
} from "../../constants/workflow.constants";
import {
  EEdgeType,
  ENodeType,
  type GraphNode,
  type INodeConfig,
  type TNodeMetricsEntry,
} from "../../types/node.types";
import {
  getWorkflowNodeCardStyleVariables,
  getWorkflowNodeMetrics,
} from "../node-metrics";

import { GraphRegistry } from "./registry";
import type { SemanticNode } from "./types";

const measureText = (text: string, className: string, fallback: number) => {
  if (typeof document === "undefined" || !document.body) {
    return text.length * fallback;
  }

  const host = document.createElement("div");
  const label = document.createElement("span");

  host.className = "workflow-graph";
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;white-space:nowrap;left:-10000px";
  label.className = className;
  label.style.cssText =
    "display:inline-block;width:auto;max-width:none;margin:0;overflow:visible";
  label.textContent = text;
  host.appendChild(label);
  document.body.appendChild(host);

  try {
    return label.getBoundingClientRect().width || text.length * fallback;
  } finally {
    host.remove();
  }
};
const resolveNodeDimensions = (
  node: SemanticNode,
  metrics: TNodeMetricsEntry,
  translate?: (key: string) => string,
) => {
  const dimensions = { ...metrics.dimensions };
  const { card, autoWidth, autoHeight } = metrics;
  const { title, i18nTitle, description } = node.data as {
    title?: string;
    i18nTitle?: string;
    description?: string;
  };
  const hasDescription =
    description && card?.contentVariant === "title-with-description";

  if (autoHeight && hasDescription) {
    dimensions.height = autoHeight.withDescription;
  }

  if (node.type === ENodeType.TASK || !autoWidth || !card) {
    return dimensions;
  }

  const label = i18nTitle
    ? (translate?.(i18nTitle) ?? i18nTitle)
    : title?.replaceAll("_", " ");
  const options = NODE_AUTO_WIDTH;
  const titleWidth =
    options.titleIconWidth +
    options.titleGap +
    measureText(
      label ?? "",
      "workflow-node-title-text",
      options.fallbackTitleCharWidth,
    );
  const descriptionWidth = hasDescription
    ? card.descriptionIndent +
      measureText(
        description,
        "workflow-node-description",
        options.fallbackDescriptionCharWidth,
      )
    : 0;
  const chrome =
    (card.paddingX + card.borderWidth + options.wrapperBorderWidth) * 2 +
    options.safetyMargin;
  const width = Math.ceil(chrome + Math.max(titleWidth, descriptionWidth));

  dimensions.width = Math.min(
    autoWidth.maxWidth,
    Math.max(autoWidth.minWidth, width),
  );

  return dimensions;
};

export const projectSemanticGraph = (
  registry: GraphRegistry,
  config: INodeConfig,
  translate?: (key: string) => string,
): { nodes: GraphNode[]; edges: Edge[] } => {
  const nodes: GraphNode[] = registry.listNodes().map((node) => {
    const metrics = getWorkflowNodeMetrics(node.type, config) ?? {
      dimensions: { width: 0, height: 0 },
    };
    const dimensions = resolveNodeDimensions(node, metrics, translate);

    return {
      ...dimensions,
      ...DEFAULT_NODE_PROPS,
      id: node.id,
      type: node.type,
      selectable: Boolean(node.selectable),
      position: { x: 0, y: 0 },
      // Preserve xyflow handle bounds when controlled nodes are replaced for runtime styling.
      measured: dimensions,
      data: node.data as GraphNode["data"],
      style: getWorkflowNodeCardStyleVariables(metrics.card),
    } as GraphNode;
  });
  const edges: Edge[] = registry.listEdges().map((edge) => ({
    id: edge.id,
    type: EEdgeType.EDGE_WITH_BUTTON,
    ...config.edges?.[EEdgeType.EDGE_WITH_BUTTON],
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label,
    hidden: edge.hidden,
    data: edge.insertPath ? { insertPath: edge.insertPath } : undefined,
  }));

  return { nodes, edges };
};
