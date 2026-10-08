/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { WorkflowVersion } from "@hexabot-ai/types";
import {
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineSeparator,
} from "@mui/lab";
import { Paper } from "@mui/material";

import { useTranslate } from "@/hooks/useTranslate";
import { formatSmartDate, normalizeDate } from "@/utils/date";

import { useWorkflow } from "../../../../hooks/useWorkflow";

import { useWorkflowVersionActionMeta } from "./useWorkflowVersionActionMeta";
import { WorkflowVersionMetaRow } from "./WorkflowVersionMetaRow";

type WorkflowVersionItemProps = {
  version: WorkflowVersion;
  hasConnector: boolean;
  getUserLabel: (createdBy: string | null) => string;
};

export const WorkflowVersionItem = ({
  version,
  hasConnector,
  getUserLabel,
}: WorkflowVersionItemProps) => {
  const { t, i18n } = useTranslate();
  const { language } = i18n;
  const {
    workflow,
    isSaving,
    restoreVersion,
    publishVersion,
    unpublishVersion,
    updateVersionMessage,
  } = useWorkflow();
  const getActionMeta = useWorkflowVersionActionMeta();
  const actionMeta = getActionMeta(version.action);
  const isCurrent = workflow?.currentVersion === version.id;
  const createdAt = version.createdAt ? new Date(version.createdAt) : null;
  const timeLabel = createdAt
    ? formatSmartDate(createdAt, language)
    : t("message.no_data_to_display");
  const exactDate = createdAt ? normalizeDate(language, createdAt) : undefined;
  const createdByLabel = getUserLabel(version.createdBy);
  const canRestore = !isCurrent && Boolean(version.definitionYml);
  const isPublished = version.id === workflow?.publishedVersion;
  const canPublish = Boolean(version.definitionYml) && !isPublished;

  return (
    <TimelineItem
      sx={{
        minHeight: "auto",
        "&::before": {
          flex: 0.35,
          px: 0,
          py: 0.7,
        },
      }}
    >
      <TimelineSeparator>
        <TimelineDot
          variant={isCurrent ? "filled" : "outlined"}
          sx={{
            borderColor: actionMeta.color,
            bgcolor: isCurrent ? actionMeta.color : "background.paper",
            color: isCurrent ? "common.white" : actionMeta.color,
            boxShadow: isCurrent ? "none" : undefined,
          }}
        />
        {hasConnector && <TimelineConnector sx={{ bgcolor: "divider" }} />}
      </TimelineSeparator>
      <TimelineContent sx={{ pt: 1, pb: 1, pr: 1, minWidth: 0 }}>
        <Paper
          variant="spaced"
          sx={(theme) => ({
            "&:hover .workflow-version-actions, &:focus-within .workflow-version-actions":
              {
                opacity: 1,
                pointerEvents: "auto",
                maxHeight: 40,
                mt: 0.75,
                pt: 0.75,
                borderTopColor: theme.palette.divider,
              },
          })}
        >
          <WorkflowVersionMetaRow
            versionNumber={version.version}
            timeLabel={timeLabel}
            exactDate={exactDate}
            actionMeta={actionMeta}
            isCurrent={isCurrent}
            isPublished={isPublished}
            createdByLabel={createdByLabel}
            message={version.message}
            canRestore={canRestore}
            canPublish={canPublish}
            isSaving={isSaving}
            onRestore={() => {
              if (version.definitionYml) {
                restoreVersion(version.id, version.definitionYml);
              }
            }}
            onPublish={() => {
              publishVersion(version.id);
            }}
            onUnpublish={unpublishVersion}
            onUpdateMessage={(nextMessage) => {
              updateVersionMessage(version.id, nextMessage);
            }}
          />
        </Paper>
      </TimelineContent>
    </TimelineItem>
  );
};
