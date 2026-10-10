/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { NodeProps } from "@xyflow/react";
import type { FC } from "react";

import { WorkflowNodeProvider } from "../../contexts/WorkflowNodeProvider";
import { ENodeType, type GraphNode } from "../../types/node.types";

import { GenericNodeContainer } from "./generic/GenericNodeContainer";
import { GenericNodePorts } from "./generic/GenericNodePorts";
import { GenericNodeRightContent } from "./generic/GenericNodeRightContent";
import { GenericNodeTitle } from "./generic/GenericNodeTitle";

export const Operator: FC<NodeProps<GraphNode<ENodeType.OPERATOR>>> = (
  props,
) => {
  return (
    <WorkflowNodeProvider node={props}>
      <GenericNodeContainer>
        <GenericNodeRightContent variant="title-only">
          <GenericNodeTitle />
        </GenericNodeRightContent>
        <GenericNodePorts<ENodeType.OPERATOR>
          getDisabled={({ idx, node }) => !!node.groupName && idx === 0}
        />
      </GenericNodeContainer>
    </WorkflowNodeProvider>
  );
};
