/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Workflow as WorkflowHelper } from "@hexabot-ai/agentic";
import { useEffect, useMemo, useState } from "react";

import { useWorkflow } from "../../../hooks/useWorkflow";
import {
  type OperatorStepType,
  useSelectedOperatorNode,
} from "../../../hooks/useWorkflowSelection";

import { useStepDrawerClose } from "./withStepDrawerLayout";

type UseStepDrawerFormOptions<TStep, TFormState> = {
  stepType: OperatorStepType;
  isStep: (step: unknown) => step is TStep;
  toFormState: (step?: TStep) => TFormState;
};

/**
 * Resolves the selected operator step and keeps a local form state in sync
 * with it each time its drawer opens. `saveStep` writes the edited step back
 * into the workflow definition and closes the drawer.
 *
 * `isStep` and `toFormState` must be stable references (e.g. module-level
 * functions): they are effect dependencies, so inline callbacks would reset
 * the form state on every render.
 */
export const useStepDrawerForm = <TStep, TFormState>({
  stepType,
  isStep,
  toFormState,
}: UseStepDrawerFormOptions<TStep, TFormState>) => {
  const { definition, updateDefinitionState, isSaving } = useWorkflow();
  const selectedOperatorNode = useSelectedOperatorNode(stepType);
  const selectedNodeId = selectedOperatorNode?.id;
  const stepPath = selectedOperatorNode?.stepPath;
  const selectedStep = useMemo(() => {
    if (!definition || !stepPath) {
      return undefined;
    }

    const stepAtPath = WorkflowHelper.getValueAtPath(definition, stepPath);

    return isStep(stepAtPath) ? stepAtPath : undefined;
  }, [definition, stepPath, isStep]);
  const [formState, setFormState] = useState<TFormState>(() => toFormState());
  const open = Boolean(selectedOperatorNode && selectedNodeId);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormState(toFormState(selectedStep));
  }, [open, selectedStep, selectedNodeId, toFormState]);

  const handleClose = useStepDrawerClose();
  const saveStep = (nextStep: TStep) => {
    if (!definition || !stepPath) {
      return;
    }

    updateDefinitionState(
      WorkflowHelper.setValueAtPath(definition, stepPath, nextStep),
    );
    handleClose();
  };

  return { open, isSaving, selectedStep, formState, setFormState, saveStep };
};
