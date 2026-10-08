/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Workflow } from "@hexabot-ai/types";
import { Box, CircularProgress, Tooltip, Typography } from "@mui/material";
import { Redo2, Save, Settings, Undo2 } from "lucide-react";
import type { MouseEvent } from "react";

import { EntityType } from "@/api/types";
import { useGetFromCache } from "@/hooks/crud/useGet";
import { useTranslate } from "@/hooks/useTranslate";
import { formatSmartDate, normalizeDate } from "@/utils/date";

import { WorkflowTypeBadge } from "../../../../../../shared/workflow/WorkflowTypeBadge";
import { WorkflowActionButtons } from "../WorkflowActionButtons";

import { TitleBarCard, TitleBarIconButton } from "./TitleBarCard";
import { WorkflowMetaInfo } from "./WorkflowMetaInfo";

const BUTTON_CARD_SX = { justifyContent: "center", flexShrink: 0 } as const;

type WorkflowTitleBarProps = {
  workflow: Workflow;
  onEdit?: (workflow: Workflow) => void;
  onOpenMenu: (event: MouseEvent<HTMLElement>, flowId: string) => void;
  onOpenSettings: () => void;
  settingsDisabled?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoDisabled?: boolean;
  redoDisabled?: boolean;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
};

export const WorkflowTitleBar = ({
  workflow,
  onEdit,
  onOpenMenu,
  onOpenSettings,
  settingsDisabled,
  onUndo,
  onRedo,
  undoDisabled,
  redoDisabled,
  onSave,
  saveDisabled,
  saveLoading,
}: WorkflowTitleBarProps) => {
  const { t, i18n } = useTranslate();
  const getVersionFromCache = useGetFromCache(EntityType.WORKFLOW_VERSION);
  const isDraft = !workflow.publishedVersion;
  const statusLabel = isDraft
    ? t("visual_editor.flows_drawer.status.draft")
    : t("visual_editor.flows_drawer.status.published");
  const currentVersion = workflow.currentVersion
    ? getVersionFromCache(workflow.currentVersion)
    : undefined;
  const lastSavedAt =
    currentVersion?.updatedAt ??
    currentVersion?.createdAt ??
    workflow.updatedAt ??
    workflow.createdAt;
  const lastSavedText = lastSavedAt
    ? formatSmartDate(lastSavedAt, i18n.language)
    : t("message.no_data_to_display");
  const lastSavedLabel = t("visual_editor.workflow_title_bar.last_saved", {
    0: lastSavedText,
  });
  const lastSavedExact = lastSavedAt
    ? normalizeDate(i18n.language, lastSavedAt)
    : undefined;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        gap: 1,
        minWidth: 0,
      }}
    >
      <TitleBarCard
        sx={{
          gap: 1,
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth: 0,
            flex: 1,
          }}
        >
          <WorkflowTypeBadge
            workflow={workflow}
            width="32px"
            height="32px"
            padding="4px"
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 0.25,
              minWidth: 0,
              flex: 1,
            }}
          >
            <Tooltip title={workflow.name} arrow>
              <Typography
                variant="subtitle1"
                noWrap
                sx={{
                  maxWidth: 320,
                  fontWeight: 600,
                }}
              >
                {workflow.name}
              </Typography>
            </Tooltip>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <WorkflowActionButtons
            workflow={workflow}
            onEdit={onEdit}
            onOpenMenu={onOpenMenu}
          />
        </Box>
      </TitleBarCard>

      <TitleBarCard sx={{ ...BUTTON_CARD_SX, gap: 0.5 }}>
        <TitleBarIconButton
          label={t("button.undo")}
          onClick={onUndo}
          disabled={undoDisabled}
        >
          <Undo2 size={16} />
        </TitleBarIconButton>
        <TitleBarIconButton
          label={t("button.redo")}
          onClick={onRedo}
          disabled={redoDisabled}
        >
          <Redo2 size={16} />
        </TitleBarIconButton>
      </TitleBarCard>

      <TitleBarCard sx={BUTTON_CARD_SX}>
        <TitleBarIconButton
          label={t("button.save")}
          onClick={onSave}
          disabled={saveDisabled || saveLoading}
          color="warning"
        >
          {saveLoading ? (
            <CircularProgress size={16} thickness={5} />
          ) : (
            <Save size={16} />
          )}
        </TitleBarIconButton>
      </TitleBarCard>

      <TitleBarCard sx={BUTTON_CARD_SX}>
        <TitleBarIconButton
          label={t("visual_editor.workflow_title_bar.settings.open")}
          onClick={onOpenSettings}
          disabled={settingsDisabled}
          color="inherit"
        >
          <Settings size={16} />
        </TitleBarIconButton>
      </TitleBarCard>

      <WorkflowMetaInfo
        isDraft={isDraft}
        statusLabel={statusLabel}
        workflowVersion={currentVersion ?? null}
        lastSavedLabel={lastSavedLabel}
        lastSavedExact={lastSavedExact}
      />
    </Box>
  );
};
