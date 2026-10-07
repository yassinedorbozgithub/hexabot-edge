/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { WorkflowVersion, Workflow } from "@hexabot-ai/types";
import { Stack, Typography } from "@mui/material";

import { useTranslate } from "@/hooks/useTranslate";
import { VersionChip } from "@/shared/displays/VersionChip";
import { WorkflowBadgeWithTitle } from "@/shared/workflow/WorkflowBadgeWithTitle";

type RunMetaSummaryProps = {
  workflow?: Workflow | null;
  workflowVersion?: WorkflowVersion | null;
};

export const RunMetaSummary = ({
  workflow,
  workflowVersion,
}: RunMetaSummaryProps) => {
  const { t } = useTranslate();

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        {workflow ? (
          <WorkflowBadgeWithTitle workflow={workflow} />
        ) : (
          <Typography variant="subtitle1" fontWeight={600}>
            {t("label.unknown")}
          </Typography>
        )}
        <VersionChip version={workflowVersion ?? null} />
      </Stack>
    </Stack>
  );
};
