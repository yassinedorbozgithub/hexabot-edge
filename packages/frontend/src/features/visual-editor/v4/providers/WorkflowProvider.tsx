/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import {
  StepType,
  WorkflowDefinition,
  Workflow as WorkflowHelper,
  extractTaskDefinitions,
  type FlowStep,
  type TaskDefinition,
} from "@hexabot-ai/agentic";
import {
  isSameWorkflowSelection,
  type FlowStepPath,
  type WorkflowSelectionSnapshot,
} from "@hexabot-ai/graph";
import type { WorkflowImportResult } from "@hexabot-ai/types";
import debounce from "@mui/utils/debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseDocument } from "yaml";

import type { WorkflowExportFile } from "@/api/api.class";
import { EntityType, Format, QueryType, RouterType } from "@/api/types";
import { useFind } from "@/hooks/crud/useFind";
import {
  useTanstackMutation,
  useTanstackQueryClient,
} from "@/hooks/crud/useTanstack";
import { useApiClient } from "@/hooks/useApiClient";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useAuth } from "@/hooks/useAuth";
import { useDialogs } from "@/hooks/useDialogs";
import { useQueryState } from "@/hooks/useQueryState";
import { useSafeCallback } from "@/hooks/useSafeCallback";
import { useToast } from "@/hooks/useToast";
import { useTranslate } from "@/hooks/useTranslate";
import type { EntityAttributes } from "@/types/base";

import { ExportCredentialsDialog } from "../components/dialogs/ExportCredentialsDialog";
import { ImportCredentialsDialog } from "../components/dialogs/ImportCredentialsDialog";
import { WorkflowContext } from "../contexts/workflow.context";
import { useWorkflowDefinitionState } from "../hooks/useWorkflowDefinitionState";
import type {
  OperatorStepType,
  WorkflowContextProps,
} from "../types/workflow.types";
import { createBaseDefinition } from "../utils/workflow-definition.utils";

type WorkflowAttributes = EntityAttributes<EntityType.WORKFLOW>;
const EMPTY_GRAPH_SELECTION: WorkflowSelectionSnapshot = {
  nodeIds: [],
  nodes: [],
};
const TRANSFER_CACHE_ENTITIES = new Set<string>([
  EntityType.WORKFLOW,
  EntityType.WORKFLOW_VERSION,
  EntityType.MEMORY_DEFINITION,
  EntityType.MCP_SERVER,
  EntityType.CREDENTIAL,
]);
const OPERATOR_STEP_TEMPLATES: Record<OperatorStepType, () => FlowStep> = {
  [StepType.Conditional]: () => ({
    conditional: {
      when: [
        { condition: "=false", steps: [] },
        { else: true, steps: [] },
      ],
    },
  }),
  [StepType.Loop]: () => ({
    loop: {
      type: "for_each",
      for_each: { item: "item", in: "=[]" },
      steps: [],
    },
  }),
  [StepType.Parallel]: () => ({
    parallel: { strategy: "wait_all", steps: [] },
  }),
};

export const WorkflowProvider: React.FC<WorkflowContextProps> = ({
  children,
  workflow,
}) => {
  const { t } = useTranslate();
  const { toast } = useToast();
  const { apiClient } = useApiClient();
  const dialogs = useDialogs();
  const { refetchUser } = useAuth();
  const queryClient = useTanstackQueryClient();
  const [flowId] = useQueryState("flowId");
  const { data: workflows, isSuccess: isWorkflowsSuccess } = useFind(
    {
      entity: EntityType.WORKFLOW,
      format: Format.FULL,
    },
    {
      hasCount: false,
      initialSortState: [{ field: "createdAt", sort: "asc" }],
    },
  );
  const router = useAppRouter();
  const [graphSelection, setGraphSelectionState] =
    useState<WorkflowSelectionSnapshot>(EMPTY_GRAPH_SELECTION);
  const selectedNodeIds = graphSelection.nodeIds;
  const {
    yaml,
    definition,
    flow,
    definitionStatus,
    definitionIssues,
    updateDefinitionState,
    persistDefinition,
    undo,
    redo,
    canUndo,
    canRedo,
    publishVersion,
    unpublishVersion,
    restoreVersion,
    updateVersionMessage,
    isDefinitionDirty,
    updateWorkflow,
    isSaving,
  } = useWorkflowDefinitionState({
    workflow,
  });
  const taskDefinitions = useMemo(
    () => extractTaskDefinitions(definition?.defs ?? {}),
    [definition?.defs],
  );
  const insertStep = useCallback(
    (
      step: FlowStep,
      insertPath?: FlowStepPath | null,
      base: WorkflowDefinition = definition ?? createBaseDefinition(),
    ) => {
      const insertedDefinition = insertPath
        ? WorkflowHelper.insertStepAtPath(base, insertPath, step)
        : null;

      updateDefinitionState(
        insertedDefinition ?? { ...base, flow: [...(base.flow ?? []), step] },
      );
    },
    [definition, updateDefinitionState],
  );
  const addActionStep = useCallback(
    (
      taskName: string,
      taskDefinition: TaskDefinition,
      insertPath?: FlowStepPath | null,
    ) => {
      const baseDefinition = definition ?? createBaseDefinition();

      insertStep({ do: taskName }, insertPath, {
        ...baseDefinition,
        defs: { ...baseDefinition.defs, [taskName]: taskDefinition },
        outputs: { ...baseDefinition.outputs, result: `=$output.${taskName}` },
      });
    },
    [definition, insertStep],
  );
  const addOperatorStep = useCallback(
    (type: OperatorStepType, insertPath?: FlowStepPath | null) => {
      insertStep(OPERATOR_STEP_TEMPLATES[type](), insertPath);
    },
    [insertStep],
  );
  const updateWorkflowURL = useCallback(
    async (flowId: string, nodeIds: string[] = []) => {
      const nodeParams =
        Array.isArray(nodeIds) && nodeIds.length ? `/${nodeIds.join(",")}` : "";

      if (router.pathname.startsWith(`/${RouterType.WORKFLOW_EDITOR}`)) {
        await router.push(
          `/${RouterType.WORKFLOW_EDITOR}/${flowId}${nodeParams}`,
        );
      }
    },
    [router.pathname, router.push],
  );
  const setGraphSelection = useCallback(
    (nextSelection: WorkflowSelectionSnapshot) => {
      if (isSameWorkflowSelection(graphSelection, nextSelection)) {
        return;
      }

      setGraphSelectionState(nextSelection);

      const hasSameNodeIds =
        graphSelection.nodeIds.length === nextSelection.nodeIds.length &&
        graphSelection.nodeIds.every(
          (nodeId, index) => nodeId === nextSelection.nodeIds[index],
        );

      if (flowId && !hasSameNodeIds) {
        void updateWorkflowURL(flowId, nextSelection.nodeIds);
      }
    },
    [flowId, graphSelection, updateWorkflowURL],
  );
  const removeStepAtPath = useCallback(
    (stepPath: FlowStepPath, nodeId?: string) => {
      if (!definition) {
        return;
      }

      const nextDefinition = WorkflowHelper.removeStepAtPath(
        definition,
        stepPath,
      );

      if (!nextDefinition) {
        return;
      }

      const lastTaskName = Object.keys(
        extractTaskDefinitions(nextDefinition.defs),
      ).at(-1);
      const { result: _result, ...outputs } = nextDefinition.outputs;

      updateDefinitionState({
        ...nextDefinition,
        outputs: lastTaskName
          ? { ...outputs, result: `=$output.${lastTaskName}` }
          : outputs,
      });

      if (!nodeId || !selectedNodeIds.includes(nodeId)) {
        return;
      }

      const nextSelection = selectedNodeIds.filter(
        (selectedNodeId) => selectedNodeId !== nodeId,
      );

      setGraphSelection({
        nodeIds: nextSelection,
        nodes: graphSelection.nodes.filter(
          (selectedNode) => selectedNode.id !== nodeId,
        ),
      });
    },
    [
      definition,
      graphSelection.nodes,
      selectedNodeIds,
      setGraphSelection,
      updateDefinitionState,
    ],
  );
  const debouncedWorkflowUpdate = useSafeCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    debounce((props: Partial<WorkflowAttributes>) => {
      if (flowId) {
        updateWorkflow({
          id: flowId,
          params: props,
        });
      }
    }, 400),
    [flowId],
    (memoizedFn) => {
      memoizedFn.clear();
    },
  );
  const invalidateWorkflowTransferQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      predicate: ({ queryKey }) => {
        const [queryType, queryEntity] = queryKey;

        if (
          queryType !== QueryType.item &&
          queryType !== QueryType.collection &&
          queryType !== QueryType.count
        ) {
          return false;
        }

        if (typeof queryEntity !== "string") {
          return false;
        }

        return TRANSFER_CACHE_ENTITIES.has(queryEntity.split("/")[0]);
      },
    });
  }, [queryClient]);
  const downloadWorkflowFile = useCallback((file: WorkflowExportFile) => {
    if (typeof window === "undefined") {
      return;
    }

    const url = window.URL.createObjectURL(file.blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = file.filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }, []);
  const exportInProgressRef = useRef(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const { mutate: exportWorkflowMutation, isPending: isExportMutationPending } =
    useTanstackMutation<
      WorkflowExportFile,
      Error,
      { workflowId: string; credentialPassword: string | null }
    >({
      mutationFn: ({ workflowId, credentialPassword }) =>
        apiClient.exportWorkflow(workflowId, credentialPassword),
      onSuccess: downloadWorkflowFile,
      onError: (error) => {
        toast.error(error);
      },
      onSettled: () => {
        exportInProgressRef.current = false;
      },
    });
  const isExportingWorkflow = isExportDialogOpen || isExportMutationPending;
  const { mutate: importWorkflowMutation, isPending: isImportingWorkflow } =
    useTanstackMutation<
      WorkflowImportResult,
      Error,
      { file: File; credentialPassword?: string }
    >({
      mutationFn: ({ file, credentialPassword }) =>
        apiClient.importWorkflowBundle(file, credentialPassword),
      onSuccess: (result) => {
        queryClient.setQueryData(
          [QueryType.item, EntityType.WORKFLOW, result.workflow.id],
          result.workflow,
        );
        void invalidateWorkflowTransferQueries();
        void updateWorkflowURL(result.workflow.id);
        void refetchUser();
        toast.success(t("message.workflow_import_success"));

        if (result.integrityVerified) {
          toast.info(t("message.workflow_import_integrity_verified"));
        } else {
          toast.warning(t("message.workflow_import_integrity_not_verified"));
        }

        if (result.warnings.length > 0) {
          toast.warning(
            t("message.workflow_import_warnings", {
              0: result.warnings.length,
            }),
          );
        }
      },
      onError: (error) => {
        toast.error(error);
      },
    });
  const exportWorkflow = useCallback(
    async (workflowId: string) => {
      if (workflowId === flowId && isDefinitionDirty) {
        toast.warning(t("message.workflow_export_save_before"));

        return;
      }

      if (exportInProgressRef.current) {
        return;
      }

      exportInProgressRef.current = true;
      setIsExportDialogOpen(true);
      let exportStarted = false;

      try {
        const credentialPassword = await dialogs.open(ExportCredentialsDialog);

        if (credentialPassword === undefined) {
          return;
        }

        exportWorkflowMutation({ workflowId, credentialPassword });
        exportStarted = true;
      } finally {
        setIsExportDialogOpen(false);

        if (!exportStarted) {
          exportInProgressRef.current = false;
        }
      }
    },
    [dialogs, exportWorkflowMutation, flowId, isDefinitionDirty, t, toast],
  );
  const importWorkflowBundle = useCallback(
    async (file: File) => {
      const hasEncryptedCredentials = parseDocument(await file.text()).hasIn([
        "credentialProtection",
      ]);
      const credentialPassword = hasEncryptedCredentials
        ? await dialogs.open(ImportCredentialsDialog)
        : undefined;

      if (hasEncryptedCredentials && credentialPassword === undefined) {
        return;
      }

      importWorkflowMutation({ file, credentialPassword });
    },
    [dialogs, importWorkflowMutation],
  );

  useEffect(() => {
    if (!isWorkflowsSuccess) return;

    if (!flowId && workflows.length) {
      updateWorkflowURL(workflows.at(-1)?.id || workflows[0].id);
    } else if (flowId && !workflows.some((w) => w.id === flowId)) {
      void router.replace(`/${RouterType.WORKFLOW_EDITOR}/${workflows[0].id}`);
    }
  }, [flowId, workflows, isWorkflowsSuccess, updateWorkflowURL, router]);

  return (
    <WorkflowContext
      value={{
        graphSelection,
        selectedNodeIds,
        setGraphSelection,
        selectedFlowId: flowId,
        direction: workflow?.direction,
        updateWorkflowURL,
        yaml,
        updateDefinitionState,
        workflow,
        workflows,
        updateWorkflow,
        debouncedWorkflowUpdate,
        persistDefinition,
        undo,
        redo,
        canUndo,
        canRedo,
        publishVersion,
        unpublishVersion,
        restoreVersion,
        updateVersionMessage,
        isDefinitionDirty,
        isSaving,
        isExportingWorkflow,
        isImportingWorkflow,
        exportWorkflow,
        importWorkflowBundle,
        addActionStep,
        addOperatorStep,
        removeStepAtPath,
        definition,
        flow,
        definitionStatus,
        definitionIssues,
        taskDefinitions,
      }}
    >
      {children}
    </WorkflowContext>
  );
};
