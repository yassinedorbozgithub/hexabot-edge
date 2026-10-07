/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { EWorkflowRunStatus } from "@hexabot-ai/agentic";
import type { WorkflowRun, WorkflowRunFull } from "@hexabot-ai/types";

import { WORKFLOW_STATUS } from "@/constants/workflow.constants";
import { BadgeWithTitle } from "@/shared/displays/Badge";

export type WorkflowRunStatusBadgeProps = {
  workflowRun?: WorkflowRun | WorkflowRunFull | null;
};

export const WorkflowRunStatusBadge = ({
  workflowRun,
}: WorkflowRunStatusBadgeProps) => {
  if (!workflowRun) {
    return null;
  }

  const status =
    (workflowRun?.status as EWorkflowRunStatus) ?? EWorkflowRunStatus.IDLE;
  const { key: _key, ...badgeRest } =
    WORKFLOW_STATUS[status] ?? WORKFLOW_STATUS[EWorkflowRunStatus.IDLE];
  const title = workflowRun?.status ?? status;

  return (
    <BadgeWithTitle
      {...badgeRest}
      title={title}
      isLoading={workflowRun?.status === EWorkflowRunStatus.RUNNING}
    />
  );
};
