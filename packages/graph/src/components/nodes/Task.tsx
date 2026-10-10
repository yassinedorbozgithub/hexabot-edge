/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { NodeProps } from "@xyflow/react";
import { FC } from "react";

import { WorkflowNodeProvider } from "../../contexts/WorkflowNodeProvider";
import { ENodeType, GraphNode } from "../../types/node.types";

import { GenericNodeContainer } from "./generic/GenericNodeContainer";
import { GenericNodeDescription } from "./generic/GenericNodeDescription";
import { GenericNodePorts } from "./generic/GenericNodePorts";
import { GenericNodeRightContent } from "./generic/GenericNodeRightContent";
import { GenericNodeTitle } from "./generic/GenericNodeTitle";

export const Task: FC<NodeProps<GraphNode<ENodeType.TASK>>> = (props) => (
  <WorkflowNodeProvider node={props}>
    <GenericNodeContainer>
      <GenericNodeRightContent variant="title-with-description">
        <GenericNodeTitle />
        <GenericNodeDescription />
      </GenericNodeRightContent>
      <GenericNodePorts />
    </GenericNodeContainer>
  </WorkflowNodeProvider>
);
