/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { type NodeProps } from "@xyflow/react";
import { type FC } from "react";

import { useWorkflowGraphHost } from "../../contexts/graph-host.context";
import { WorkflowNodeProvider } from "../../contexts/WorkflowNodeProvider";
import { ENodeType, type GraphNode } from "../../types/node.types";

import { GenericNodeContainer } from "./generic/GenericNodeContainer";
import { GenericNodePorts } from "./generic/GenericNodePorts";

export const Group: FC<NodeProps<GraphNode<ENodeType.GROUP>>> = (props) => {
  const { direction } = useWorkflowGraphHost();

  return (
    <WorkflowNodeProvider node={props}>
      <div
        style={
          direction === "horizontal"
            ? {
                width: "calc(100% + 26px)",
                height: "100%",
                marginLeft: "-13px",
              }
            : { height: "calc(100% + 26px)", width: "100%", marginTop: "-13px" }
        }
      >
        <GenericNodeContainer>
          <GenericNodePorts />
        </GenericNodeContainer>
      </div>
    </WorkflowNodeProvider>
  );
};
