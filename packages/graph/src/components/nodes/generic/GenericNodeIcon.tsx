/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { CSSProperties } from "react";

import { useWorkflowNode } from "../../../contexts/node.context";
import { ENodeType } from "../../../types/node.types";

export const GenericNodeIcon = <T extends ENodeType = ENodeType>() => {
  const {
    resolvedTheme: { Icon, iconColor },
  } = useWorkflowNode<T>();

  return (
    <div
      className="workflow-node-icon"
      style={{ "--workflow-node-icon-color": iconColor } as CSSProperties}
    >
      <Icon size="20px" />
    </div>
  );
};
