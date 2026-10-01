/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { describe, expect, it } from "vitest";

import { ENodeType } from "../types/workflow-node.types";

import { NODE_DIMENSIONS, NODE_METRICS } from "./workflow.constants";

const CARD_NODE_TYPES: ENodeType[] = [
  ENodeType.BINDING_SINGLE,
  ENodeType.BINDING_MULTI,
  ENodeType.INDICATOR,
  ENodeType.TASK,
  ENodeType.OPERATOR,
];
const DESCRIPTION_MIN_HEIGHT = 18;
const DESCRIPTION_GAP = 6;
const NODE_WRAPPER_BORDER_WIDTH = 2;

describe("workflow node metrics", () => {
  it.each(CARD_NODE_TYPES)(
    "gives %s enough height for card chrome",
    (nodeType) => {
      const { card, dimensions, autoHeight } = NODE_METRICS[nodeType]!;

      expect(card).toBeDefined();
      const chromeHeight =
        (card!.paddingY + card!.borderWidth + NODE_WRAPPER_BORDER_WIDTH) * 2 +
        card!.titleMinHeight;
      const descriptionHeight =
        card!.contentVariant === "title-with-description"
          ? DESCRIPTION_MIN_HEIGHT + DESCRIPTION_GAP
          : 0;

      expect(
        autoHeight?.withDescription ?? dimensions.height,
      ).toBeGreaterThanOrEqual(chromeHeight + descriptionHeight);
      if (autoHeight) {
        expect(dimensions.height).toBeGreaterThanOrEqual(chromeHeight);
      }
    },
  );

  it("derives NODE_DIMENSIONS from NODE_METRICS dimensions", () => {
    Object.entries(NODE_METRICS).forEach(([nodeType, nodeMetrics]) => {
      expect(NODE_DIMENSIONS[nodeType as ENodeType]).toEqual(
        nodeMetrics.dimensions,
      );
    });
  });
});
