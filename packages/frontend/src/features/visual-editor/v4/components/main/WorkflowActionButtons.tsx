/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Workflow } from "@hexabot-ai/types";
import { Box, IconButton, Tooltip } from "@mui/material";
import { MoreHorizontal, Pencil } from "lucide-react";
import type { MouseEvent } from "react";

import { useTranslate } from "@/hooks/useTranslate";

type WorkflowActionButtonsProps = {
  workflow: Workflow;
  onEdit?: (workflow: Workflow) => void;
  onOpenMenu: (event: MouseEvent<HTMLElement>, flowId: string) => void;
  className?: string;
};

export const WorkflowActionButtons = ({
  workflow,
  onEdit,
  onOpenMenu,
  className,
}: WorkflowActionButtonsProps) => {
  const { t } = useTranslate();

  return (
    <Box className={className} display="flex" alignItems="center" gap={0.5}>
      <Tooltip title={t("button.rename")}>
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onEdit?.(workflow);
          }}
        >
          <Pencil size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title={t("button.more")}>
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onOpenMenu(event, workflow.id);
          }}
        >
          <MoreHorizontal size={16} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
