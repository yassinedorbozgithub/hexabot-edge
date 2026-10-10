/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { EdgeTypes, NodeTypes } from "@xyflow/react";
import { memo } from "react";

import { EEdgeType, ENodeType } from "../types/node.types";

import { EdgeWithButton } from "./edges/EdgeWithButton";
import { BindingMulti } from "./nodes/BindingMulti";
import { BindingPlaceholder } from "./nodes/BindingPlaceholder";
import { BindingSingle } from "./nodes/BindingSingle";
import { BranchPlaceholder } from "./nodes/BranchPlaceholder";
import { Group } from "./nodes/Group";
import { Indicator } from "./nodes/Indicator";
import { Operator } from "./nodes/Operator";
import { Task } from "./nodes/Task";

export const NODE_TYPES = {
  [ENodeType.BINDING_SINGLE]: memo(BindingSingle),
  [ENodeType.BINDING_MULTI]: memo(BindingMulti),
  [ENodeType.INDICATOR]: memo(Indicator),
  [ENodeType.OPERATOR]: memo(Operator),
  [ENodeType.TASK]: memo(Task),
  [ENodeType.GROUP]: memo(Group),
  [ENodeType.BRANCH_PLACEHOLDER]: memo(BranchPlaceholder),
  [ENodeType.BINDING_PLACEHOLDER]: memo(BindingPlaceholder),
} satisfies NodeTypes;

export const EDGE_TYPES = {
  [EEdgeType.EDGE_WITH_BUTTON]: memo(EdgeWithButton),
} satisfies EdgeTypes;
