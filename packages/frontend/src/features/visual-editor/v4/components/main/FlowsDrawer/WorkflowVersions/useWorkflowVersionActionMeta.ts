/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { WorkflowVersionAction } from "@hexabot-ai/types";
import type { ChipProps } from "@mui/material";
import { useTheme } from "@mui/material";
import { useCallback } from "react";

import { useTranslate } from "@/hooks/useTranslate";

const ACTION_CHIP_COLORS = {
  [WorkflowVersionAction.create]: "success",
  [WorkflowVersionAction.update]: "info",
  [WorkflowVersionAction.restore]: "warning",
  [WorkflowVersionAction.import]: "secondary",
} as const satisfies Record<WorkflowVersionAction, ChipProps["color"]>;

export const useWorkflowVersionActionMeta = () => {
  const theme = useTheme();
  const { t } = useTranslate();

  return useCallback(
    (action?: WorkflowVersionAction | null) => {
      const chipColor = action ? ACTION_CHIP_COLORS[action] : undefined;

      if (!action || !chipColor) {
        return {
          label: t("visual_editor.workflow_versions.actions.unknown"),
          color: theme.palette.text.secondary,
          chipColor: "default" as ChipProps["color"],
        };
      }

      return {
        label: t(`visual_editor.workflow_versions.actions.${action}`),
        color: theme.palette[chipColor].main,
        chipColor,
      };
    },
    [t, theme],
  );
};
