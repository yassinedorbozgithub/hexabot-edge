/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import Box from "@mui/material/Box";
import { Bug } from "lucide-react";
import { useParams } from "react-router";

import { EntityType, Format } from "@/api/types";
import { useGet } from "@/hooks/crud/useGet";
import { useTranslate } from "@/hooks/useTranslate";
import { PageHeader } from "@/layout/content/PageHeader";
import { WorkflowActionsProvider } from "@/providers/workflow-actions/workflow-actions.context";
import { BackButton } from "@/shared/buttons/BackButton";

import { WorkflowRunDebugger } from "./components/WorkflowRunDebugger";

export const WorkflowRunDebuggerPage = () => {
  const { t } = useTranslate();
  const params = useParams<{
    workflowId?: string;
    initiatorId?: string;
    runId?: string;
  }>();
  const { data: workflow } = useGet(
    params.workflowId || "",
    {
      entity: EntityType.WORKFLOW,
      format: Format.FULL,
    },
    {
      enabled: Boolean(params.workflowId),
    },
  );

  return (
    <WorkflowActionsProvider workflowType={workflow?.type}>
      <PageHeader
        icon={Bug}
        title={t("label.workflow_run_debugger")}
        headerLeftButtons={<BackButton href="/workflow/runs" />}
      />
      <Box
        pt={1}
        display="flex"
        minHeight="calc(100dvh - 182px)"
        maxHeight="calc(100dvh - 182px)"
      >
        <WorkflowRunDebugger {...params} />
      </Box>
    </WorkflowActionsProvider>
  );
};
