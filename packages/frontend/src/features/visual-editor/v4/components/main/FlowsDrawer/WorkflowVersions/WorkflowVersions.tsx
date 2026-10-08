/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Timeline } from "@mui/lab";
import { Stack, Typography } from "@mui/material";
import { useCallback } from "react";

import { EntityType, Format } from "@/api/types";
import { useFind } from "@/hooks/crud/useFind";
import { useGetFromCache } from "@/hooks/crud/useGet";
import { useTranslate } from "@/hooks/useTranslate";

import { useWorkflow } from "../../../../hooks/useWorkflow";

import { WorkflowVersionItem } from "./WorkflowVersionItem";
import { WorkflowVersionsState } from "./WorkflowVersionsState";

export const WorkflowVersions = () => {
  const { t } = useTranslate();
  const { workflow } = useWorkflow();
  const getUserFromCache = useGetFromCache(EntityType.USER);
  const {
    data: versions = [],
    isLoading,
    isFetching,
  } = useFind(
    {
      entity: EntityType.WORKFLOW_VERSION,
      format: Format.FULL,
    },
    {
      hasCount: false,
    },
    {
      enabled: !!workflow,
      routeParams: workflow ? { id: workflow.id } : undefined,
    },
  );
  const isBusy = isLoading || isFetching;
  const getUserLabel = useCallback(
    (createdBy: string | null) => {
      if (!createdBy) {
        return t("visual_editor.workflow_versions.system");
      }

      const user = getUserFromCache(createdBy);

      if (!user) {
        return t("visual_editor.workflow_versions.system");
      }

      const email = typeof user.email === "string" ? user.email : "";
      const fullName = `${user.firstName} ${user.lastName}`.trim();

      return (
        fullName || email || t("visual_editor.workflow_versions.unknown_user")
      );
    },
    [getUserFromCache, t],
  );

  return (
    <Stack flex={1} minHeight={0}>
      <Stack px={2} pt={2} pb={1}>
        <Typography variant="subtitle2">
          {t("visual_editor.workflow_versions.title")}
        </Typography>
      </Stack>
      <Stack flex={1} minHeight={0} overflow="auto" px={1} pb={2}>
        {!workflow ? (
          <WorkflowVersionsState state="emptySelection" />
        ) : isBusy ? (
          <WorkflowVersionsState state="loading" />
        ) : versions.length === 0 ? (
          <WorkflowVersionsState state="empty" />
        ) : (
          <Timeline sx={{ m: 0, p: 0 }}>
            {versions.map((version, index) => (
              <WorkflowVersionItem
                key={version.id}
                version={version}
                hasConnector={index < versions.length - 1}
                getUserLabel={getUserLabel}
              />
            ))}
          </Timeline>
        )}
      </Stack>
    </Stack>
  );
};
