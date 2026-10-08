/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Workflow, WorkflowVersion } from "@hexabot-ai/types";
import { useCallback, useEffect, useRef, useState } from "react";

import { EntityType } from "@/api/types";
import { useUpdate } from "@/hooks/crud/useUpdate";

import {
  resolveRedoIntent,
  resolveUndoIntent,
  shouldClearRedoStack,
} from "../utils/workflow-version-navigation.utils";

type UseWorkflowVersionNavigationArgs = {
  workflow?: Workflow;
  currentVersion?: WorkflowVersion | null;
  isDefinitionDirty: boolean;
  isSaving: boolean;
  revertLocalEdits: () => void;
};

/**
 * Undo/Redo over the workflow version chain: undo moves the workflow
 * `currentVersion` pointer to the version's `parentVersion`, redo moves it
 * forward again through a session-local stack of undone version ids. No new
 * version rows are created — navigation only re-points `currentVersion`.
 */
export const useWorkflowVersionNavigation = ({
  workflow,
  currentVersion,
  isDefinitionDirty,
  isSaving,
  revertLocalEdits,
}: UseWorkflowVersionNavigationArgs) => {
  const [redoStack, setRedoStack] = useState<string[]>([]);
  // Pointer value expected after our own undo/redo PATCH; any other pointer
  // move (commit, restore, publish-by-version, workflow switch) clears redo.
  const expectedPointerRef = useRef<string | null>(null);
  const { mutate: navigateWorkflowVersion, isPending: isNavigatingVersion } =
    useUpdate(EntityType.WORKFLOW);

  useEffect(() => {
    const pointer = workflow?.currentVersion ?? null;

    if (shouldClearRedoStack(expectedPointerRef.current, pointer)) {
      setRedoStack((prev) => (prev.length ? [] : prev));
    }

    expectedPointerRef.current = null;
  }, [workflow?.id, workflow?.currentVersion]);

  const navigate = useCallback(
    (workflowId: string, targetId: string, onSuccess: () => void) => {
      expectedPointerRef.current = targetId;
      navigateWorkflowVersion(
        { id: workflowId, params: { currentVersion: targetId } },
        {
          onSuccess,
          onError: () => {
            expectedPointerRef.current = null;
          },
        },
      );
    },
    [navigateWorkflowVersion],
  );
  const undo = useCallback(() => {
    if (!workflow?.id || isSaving || isNavigatingVersion) {
      return;
    }

    const intent = resolveUndoIntent({ isDefinitionDirty, currentVersion });

    if (!intent) {
      return;
    }

    if (intent.kind === "revert-local") {
      revertLocalEdits();

      return;
    }

    navigate(workflow.id, intent.targetId, () => {
      setRedoStack((prev) => [...prev, intent.previousId]);
    });
  }, [
    workflow?.id,
    isSaving,
    isNavigatingVersion,
    isDefinitionDirty,
    currentVersion,
    revertLocalEdits,
    navigate,
  ]);
  const redo = useCallback(() => {
    if (!workflow?.id || isSaving || isNavigatingVersion) {
      return;
    }

    const intent = resolveRedoIntent({ isDefinitionDirty, redoStack });

    if (!intent) {
      return;
    }

    navigate(workflow.id, intent.targetId, () => {
      setRedoStack((prev) => prev.slice(0, -1));
    });
  }, [
    workflow?.id,
    isSaving,
    isNavigatingVersion,
    isDefinitionDirty,
    redoStack,
    navigate,
  ]);
  const canUndo =
    !isSaving &&
    !isNavigatingVersion &&
    (isDefinitionDirty || !!currentVersion?.parentVersion);
  const canRedo =
    !isSaving &&
    !isNavigatingVersion &&
    !isDefinitionDirty &&
    redoStack.length > 0;

  return { undo, redo, canUndo, canRedo };
};
