/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createContext, useContext } from "react";

import { ENodeType, type IWorkflowNodeContext } from "../types/node.types";

export const WorkflowNodeContext = createContext<IWorkflowNodeContext | null>(
  null,
);

export const useWorkflowNode = <T extends ENodeType = ENodeType>() => {
  const context = useContext(WorkflowNodeContext);

  if (context === null) {
    throw new Error(
      "useWorkflowNode must be used within an WorkflowNodeProvider",
    );
  }

  return context as IWorkflowNodeContext<T>;
};
