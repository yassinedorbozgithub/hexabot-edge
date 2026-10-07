/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import {
  StepType,
  type ConditionalBranch,
  type FlowStep,
} from "@hexabot-ai/agentic";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { useTranslate } from "@/hooks/useTranslate";
import { JsonataFormulaField } from "@/shared/inputs/JsonataFormulaField";

import {
  StepDrawerHeader,
  StepDrawerSaveFooter,
} from "../StepDrawer/StepDrawerParts";
import { useStepDrawerForm } from "../StepDrawer/useStepDrawerForm";
import { withStepDrawerLayout } from "../StepDrawer/withStepDrawerLayout";

const DEFAULT_CONDITION = "=false";

type ConditionalStep = Extract<FlowStep, { conditional: unknown }>;
type ConditionalBranchWithCondition = Extract<
  ConditionalBranch,
  { condition: string; steps: FlowStep[] }
>;
type ConditionalElseBranch = Exclude<
  ConditionalBranch,
  ConditionalBranchWithCondition
>;

const isConditionalStep = (step: unknown): step is ConditionalStep => {
  if (!step || typeof step !== "object" || !("conditional" in step)) {
    return false;
  }

  const conditional = (step as { conditional?: { when?: unknown } })
    .conditional;

  return Boolean(conditional && Array.isArray(conditional.when));
};
const isConditionBranch = (
  branch: ConditionalBranch,
): branch is ConditionalBranchWithCondition => "condition" in branch;
const getConditionValues = (step?: ConditionalStep): string[] => {
  const conditions =
    step?.conditional.when
      .filter(isConditionBranch)
      .map((branch) => branch.condition) ?? [];

  return conditions.length ? conditions : [DEFAULT_CONDITION];
};

type ConditionalFormDrawerContentProps = {
  isOpen: boolean;
  conditions: string[];
  onConditionChange: (index: number, value: string) => void;
  onConditionRemove: (index: number) => void;
  onConditionAdd: () => void;
};

const ConditionalFormDrawerContent = ({
  isOpen,
  conditions,
  onConditionChange,
  onConditionRemove,
  onConditionAdd,
}: ConditionalFormDrawerContentProps) => {
  const { t } = useTranslate();
  const removeConditionLabel = t("button.delete");

  if (!isOpen) {
    return null;
  }

  if (!conditions.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t("visual_editor.conditional_drawer.form.empty_state")}
      </Typography>
    );
  }

  const canRemoveCondition = conditions.length > 1;

  return (
    <Stack spacing={2}>
      {conditions.map((condition, index) => {
        const conditionLabel = t(
          "visual_editor.conditional_drawer.form.condition_label",
          {
            0: index + 1,
          },
        );

        return (
          <Box key={`${index}-${conditions.length}`}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={0.5}
            >
              <Typography variant="subtitle2">{conditionLabel}</Typography>
              <Tooltip title={removeConditionLabel}>
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onConditionRemove(index)}
                    disabled={!canRemoveCondition}
                    aria-label={removeConditionLabel}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            <JsonataFormulaField
              value={condition}
              onChange={(nextValue) => onConditionChange(index, nextValue)}
              helperText={t("visual_editor.conditional_drawer.form.helper")}
              enableExpressionAssist
              fullWidth
            />
          </Box>
        );
      })}

      <Button
        variant="outlined"
        startIcon={<Plus size={16} />}
        onClick={onConditionAdd}
        sx={{ alignSelf: "flex-start" }}
      >
        {t("visual_editor.conditional_drawer.form.add_condition")}
      </Button>
    </Stack>
  );
};
const ConditionalFormDrawerLayout = withStepDrawerLayout(
  ConditionalFormDrawerContent,
);

export const ConditionalFormDrawer = () => {
  const { t } = useTranslate();
  const {
    open,
    isSaving,
    selectedStep,
    formState: conditions,
    setFormState: setConditions,
    saveStep,
  } = useStepDrawerForm({
    stepType: StepType.Conditional,
    isStep: isConditionalStep,
    toFormState: getConditionValues,
  });
  const normalizedConditions = useMemo(
    () => conditions.map((condition) => condition.trim()),
    [conditions],
  );
  const hasInvalidCondition = normalizedConditions.some(
    (condition) => !condition || !condition.startsWith("="),
  );
  const handleSave = () => {
    if (!selectedStep || hasInvalidCondition) {
      return;
    }

    const currentWhen = selectedStep.conditional.when;
    const currentConditionBranches = currentWhen.filter(isConditionBranch);
    const currentElseBranch = currentWhen.find(
      (branch): branch is ConditionalElseBranch => !("condition" in branch),
    );
    const nextConditionBranches: ConditionalBranch[] = normalizedConditions.map(
      (condition, index) => ({
        condition,
        steps: currentConditionBranches[index]?.steps ?? [],
      }),
    );
    const nextElseBranch: ConditionalBranch = currentElseBranch
      ? { ...currentElseBranch, steps: currentElseBranch.steps ?? [] }
      : { else: true, steps: [] };

    saveStep({
      ...selectedStep,
      conditional: {
        ...selectedStep.conditional,
        when: [...nextConditionBranches, nextElseBranch],
      },
    });
  };
  const handleConditionChange = (index: number, value: string) => {
    setConditions((prev) =>
      prev.map((condition, conditionIndex) =>
        conditionIndex === index ? value : condition,
      ),
    );
  };
  const handleConditionRemove = (index: number) => {
    setConditions((prev) =>
      prev.length <= 1
        ? prev
        : prev.filter((_, conditionIndex) => conditionIndex !== index),
    );
  };

  return (
    <ConditionalFormDrawerLayout
      isOpen={open}
      conditions={conditions}
      onConditionChange={handleConditionChange}
      onConditionRemove={handleConditionRemove}
      onConditionAdd={() =>
        setConditions((prev) => [...prev, DEFAULT_CONDITION])
      }
      open={open}
      headerContent={
        <StepDrawerHeader
          title={t("visual_editor.conditional_drawer.title")}
          description={t("visual_editor.conditional_drawer.description")}
        />
      }
      footerContent={
        <StepDrawerSaveFooter
          onClick={handleSave}
          disabled={!selectedStep || hasInvalidCondition || isSaving}
        />
      }
    />
  );
};
