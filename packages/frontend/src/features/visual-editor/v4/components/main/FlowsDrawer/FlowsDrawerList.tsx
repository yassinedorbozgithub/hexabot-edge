/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Workflow } from "@hexabot-ai/types";
import {
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, type MouseEvent } from "react";

import { useTranslate } from "@/hooks/useTranslate";

import { FlowListItem } from "./FlowListItem";
import { FlowListContainer } from "./styles";
import type { FlowTypeGroup } from "./types";

type FlowsDrawerListProps = {
  typeGroups: FlowTypeGroup[];
  openTypeKeys: string[];
  onToggleType: (key: string) => void;
  onSelectFlow: (flowId: string) => void;
  onEdit?: (workflow: Workflow) => void;
  onOpenMenu: (event: MouseEvent<HTMLElement>, flowId: string) => void;
  normalizedQuery: string;
  emptyState: string;
  hasMatches: boolean;
};

export const FlowsDrawerList = ({
  typeGroups,
  openTypeKeys,
  onToggleType,
  onSelectFlow,
  onEdit,
  onOpenMenu,
  normalizedQuery,
  emptyState,
  hasMatches,
}: FlowsDrawerListProps) => {
  const { t } = useTranslate();

  return (
    <FlowListContainer>
      <List disablePadding>
        {typeGroups.map((group) => {
          const GroupIcon = group.info.icon;
          const isOpen = openTypeKeys.includes(group.info.key);

          return (
            <Fragment key={group.info.key}>
              <ListItemButton
                onClick={() => onToggleType(group.info.key)}
                dense
                disableGutters
                sx={{ px: 1.5, pt: 1, pb: 0.5 }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    marginInlineEnd: 1,
                    color: "text.secondary",
                  }}
                >
                  <GroupIcon size={14} />
                </ListItemIcon>
                <ListItemText
                  disableTypography
                  primary={
                    <Stack
                      direction="row"
                      alignItems="center"
                      gap={1}
                      minWidth={0}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        color="text.secondary"
                      >
                        {group.label}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {group.items.length}
                      </Typography>
                    </Stack>
                  }
                />
                {isOpen ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </ListItemButton>
              <Collapse in={isOpen} timeout="auto">
                {group.items.map((match) => (
                  <FlowListItem
                    key={match.workflow.id}
                    match={match}
                    normalizedQuery={normalizedQuery}
                    onSelect={onSelectFlow}
                    onEdit={onEdit}
                    onOpenMenu={onOpenMenu}
                  />
                ))}
                {!group.items.length && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 2, py: 0.5, display: "block" }}
                  >
                    {t("visual_editor.flows_drawer.empty.section")}
                  </Typography>
                )}
              </Collapse>
            </Fragment>
          );
        })}
      </List>
      {!hasMatches && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 2, py: 2, display: "block" }}
        >
          {emptyState}
        </Typography>
      )}
    </FlowListContainer>
  );
};
