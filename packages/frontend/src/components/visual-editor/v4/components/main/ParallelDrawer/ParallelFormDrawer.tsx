/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { StepType, type FlowStep } from "@hexabot-ai/agentic";
import { useMemo } from "react";

import { useTranslate } from "@/hooks/useTranslate";

import {
  StepDrawerHeader,
  StepDrawerSaveFooter,
  type StepOption,
  StepOptionRadioGroup,
} from "../StepDrawer/StepDrawerParts";
import { useStepDrawerForm } from "../StepDrawer/useStepDrawerForm";
import { withStepDrawerLayout } from "../StepDrawer/withStepDrawerLayout";

type ParallelStep = Extract<FlowStep, { parallel: unknown }>;
type ParallelStrategy = "wait_all" | "wait_any";

const DEFAULT_PARALLEL_STRATEGY: ParallelStrategy = "wait_all";
const isParallelStep = (step: unknown): step is ParallelStep => {
  if (!step || typeof step !== "object" || !("parallel" in step)) {
    return false;
  }

  const parallel = (step as { parallel?: { steps?: unknown } }).parallel;

  return Boolean(parallel && Array.isArray(parallel.steps));
};
const getParallelStrategyValue = (step?: ParallelStep): ParallelStrategy => {
  const strategy = step?.parallel.strategy;

  return strategy === "wait_any" ? "wait_any" : DEFAULT_PARALLEL_STRATEGY;
};
const ParallelFormDrawerLayout = withStepDrawerLayout(
  StepOptionRadioGroup<ParallelStrategy>,
);

export const ParallelFormDrawer = () => {
  const { t } = useTranslate();
  const {
    open,
    isSaving,
    selectedStep,
    formState: strategy,
    setFormState: setStrategy,
    saveStep,
  } = useStepDrawerForm({
    stepType: StepType.Parallel,
    isStep: isParallelStep,
    toFormState: getParallelStrategyValue,
  });
  const strategyOptions: StepOption<ParallelStrategy>[] = useMemo(
    () => [
      {
        value: "wait_all",
        label: t("visual_editor.parallel_drawer.form.strategy.wait_all.label"),
        description: t(
          "visual_editor.parallel_drawer.form.strategy.wait_all.description",
        ),
      },
      {
        value: "wait_any",
        label: t("visual_editor.parallel_drawer.form.strategy.wait_any.label"),
        description: t(
          "visual_editor.parallel_drawer.form.strategy.wait_any.description",
        ),
      },
    ],
    [t],
  );
  const handleSave = () => {
    if (!selectedStep) {
      return;
    }

    saveStep({
      ...selectedStep,
      parallel: {
        ...selectedStep.parallel,
        strategy,
        steps: selectedStep.parallel.steps ?? [],
      },
    });
  };

  return (
    <ParallelFormDrawerLayout
      value={strategy}
      options={strategyOptions}
      label={t("visual_editor.parallel_drawer.form.strategy.label")}
      onChange={setStrategy}
      open={open}
      headerContent={
        <StepDrawerHeader
          title={t("visual_editor.parallel_drawer.title")}
          description={t("visual_editor.parallel_drawer.description")}
        />
      }
      footerContent={
        <StepDrawerSaveFooter
          onClick={handleSave}
          disabled={!selectedStep || isSaving}
        />
      }
    />
  );
};
