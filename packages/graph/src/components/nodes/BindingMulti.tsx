/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { NodeProps } from "@xyflow/react";
import type { FC } from "react";

import { WorkflowNodeProvider } from "../../contexts/WorkflowNodeProvider";
import { ENodeType, type GraphNode } from "../../types/node.types";

import { GenericNodeContainer } from "./generic/GenericNodeContainer";
import { GenericNodeDescription } from "./generic/GenericNodeDescription";
import { GenericNodePorts } from "./generic/GenericNodePorts";
import { GenericNodeRightContent } from "./generic/GenericNodeRightContent";
import { GenericNodeTitle } from "./generic/GenericNodeTitle";

export const BindingMulti: FC<NodeProps<GraphNode<ENodeType.BINDING_MULTI>>> = (
  props,
) => {
  const { data } = props;
  const hasDescription = Boolean(data?.description?.trim());

  return (
    <WorkflowNodeProvider node={props}>
      <GenericNodeContainer className="workflow-node-shell--interactive">
        <GenericNodeRightContent
          variant={hasDescription ? "title-with-description" : "title-only"}
        >
          <GenericNodeTitle />
          {hasDescription ? <GenericNodeDescription /> : null}
        </GenericNodeRightContent>
        <GenericNodePorts />
      </GenericNodeContainer>
    </WorkflowNodeProvider>
  );
};
