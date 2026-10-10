/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { describe, expect, it } from "vitest";

import {
  NODE_DEFINITIONS,
  NODE_METRICS,
} from "../../constants/workflow.constants";
import { ENodeType, type TNodeMetricsEntry } from "../../types/node.types";

import { projectSemanticGraph } from "./project";
import { GraphRegistry } from "./registry";

const config = { nodes: NODE_DEFINITIONS, nodeMetrics: NODE_METRICS };
const project = (
  type: ENodeType,
  data: Record<string, unknown>,
  overrides: Partial<TNodeMetricsEntry> = {},
  translate?: (key: string) => string,
) => {
  const registry = new GraphRegistry();

  registry.upsertNode({
    id: "node",
    type,
    data,
    meta: { groupPath: [], level: 0 },
  });

  const settings = {
    ...config,
    nodeMetrics: { [type]: { ...NODE_METRICS[type]!, ...overrides } },
  };

  return projectSemanticGraph(registry, settings, translate).nodes[0]!;
};

describe("content-sized projection", () => {
  it.each([ENodeType.BINDING_SINGLE, ENodeType.BINDING_MULTI])(
    "fits %s height to the visible content",
    (type) => {
      const short = project(type, { title: "Model" });
      const described = project(type, {
        title: "Http Request",
        description: "Performs an HTTP request",
      });

      expect(short.height).toBe(64);
      expect(project(type, { title: "Model", description: "" }).height).toBe(
        64,
      );
      expect(described.height).toBe(76);
      expect(described.measured?.height).toBe(described.height);
    },
  );

  it.each([
    { description: undefined, autoHeight: { withDescription: 80 }, height: 68 },
    {
      description: "Description",
      autoHeight: { withDescription: 80 },
      height: 80,
    },
    { description: undefined, autoHeight: undefined, height: 68 },
    { description: "Description", autoHeight: undefined, height: 68 },
  ])(
    "uses height $height with description=$description and autoHeight=$autoHeight",
    ({ description, autoHeight, height }) => {
      const node = project(
        ENodeType.BINDING_SINGLE,
        { title: "Model", description },
        { dimensions: { width: 200, height: 68 }, autoHeight },
      );

      expect(node.height).toBe(height);
    },
  );

  it("keeps tasks at their configured width even with autoWidth enabled", () => {
    const task = project(
      ENodeType.TASK,
      { title: "A".repeat(100) },
      {
        dimensions: { width: 220, height: 86 },
        autoWidth: { minWidth: 100, maxWidth: 400 },
      },
    );

    expect(task.width).toBe(220);
    expect(task.measured?.width).toBe(220);
  });

  it("grows with content and respects both limits", () => {
    const width = (title: string) =>
      project(ENodeType.INDICATOR, { title }).width!;

    expect(width("Go")).toBe(96);
    expect(width("Start workflow")).toBeGreaterThan(width("Go"));
    expect(width("A".repeat(100))).toBe(256);
  });

  it("measures translated titles and binding descriptions", () => {
    const translated = project(
      ENodeType.INDICATOR,
      { i18nTitle: "message.start" },
      {},
      () => "Go",
    );

    expect(translated.width).toBe(96);
    expect(translated.measured?.width).toBe(translated.width);
    expect(
      project(ENodeType.BINDING_SINGLE, {
        title: "AI",
        description: "Long model description",
      }).width,
    ).toBeGreaterThan(
      project(ENodeType.BINDING_SINGLE, { title: "AI" }).width!,
    );
  });

  it("supports custom limits and disabling auto width", () => {
    const metrics = NODE_METRICS[ENodeType.INDICATOR]!;

    expect(
      project(
        ENodeType.INDICATOR,
        { title: "Go" },
        { autoWidth: { minWidth: 180, maxWidth: 200 } },
      ).width,
    ).toBe(180);
    expect(
      project(ENodeType.INDICATOR, { title: "Go" }, { autoWidth: undefined })
        .width,
    ).toBe(metrics.dimensions.width);
    expect(NODE_METRICS[ENodeType.INDICATOR]).toBe(metrics);
    expect(metrics.dimensions.width).toBe(128);
  });
});
