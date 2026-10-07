/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { MemoryDefinition } from "@hexabot-ai/types";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";

import { EntityType } from "@/api/types";
import { useGetFromCache } from "@/hooks/crud/useGet";
import { useWorkflowActionsCatalog } from "@/providers/workflow-actions/workflow-actions.context";
import { JsonataGlobalsSchemaProvider } from "@/shared/inputs/JsonataFormulaField";

import { useWorkflow } from "../hooks/useWorkflow";
import {
  buildJsonataGlobalsSchema,
  extractMemoryDefinitionIdsFromWorkflowDefinition,
} from "../utils/jsonata-globals-schema.utils";

export const WorkflowJsonataGlobalsSchemaProvider = ({
  children,
}: PropsWithChildren) => {
  const { definition, taskDefinitions, workflow } = useWorkflow();
  const { actionsByName } = useWorkflowActionsCatalog();
  const getMemoryDefinitionFromCache = useGetFromCache(
    EntityType.MEMORY_DEFINITION,
  );
  const memoryDefinitionIds = useMemo(
    () => extractMemoryDefinitionIdsFromWorkflowDefinition(definition),
    [definition],
  );
  const memoryDefinitions = useMemo(
    () =>
      memoryDefinitionIds
        .map((memoryDefinitionId) =>
          getMemoryDefinitionFromCache(memoryDefinitionId),
        )
        .filter((memoryDefinition): memoryDefinition is MemoryDefinition =>
          Boolean(memoryDefinition),
        ),
    [getMemoryDefinitionFromCache, memoryDefinitionIds],
  );
  const globalsSchema = useMemo(
    () =>
      buildJsonataGlobalsSchema({
        definition,
        taskDefinitions,
        actionsByName,
        memoryDefinitions,
        inputSchema: workflow?.inputSchema,
      }),
    [
      actionsByName,
      definition,
      memoryDefinitions,
      taskDefinitions,
      workflow?.inputSchema,
    ],
  );

  return (
    <JsonataGlobalsSchemaProvider globalsSchema={globalsSchema}>
      {children}
    </JsonataGlobalsSchemaProvider>
  );
};
