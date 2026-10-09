/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Action } from "@hexabot-ai/types";
import { IconButtonOwnProps, Stack, Tooltip } from "@mui/material";
import {
  GridActionsCellItem,
  GridColDef,
  GridRenderCellParams,
  GridTreeNodeWithRender,
  GridValidRowModel,
} from "@mui/x-data-grid";
import {
  Eye,
  FileText,
  LucideProps,
  Pencil,
  RefreshCw,
  Shield,
  Tag,
  TestTube,
  Trash2,
  UserCog,
  Wrench,
} from "lucide-react";
import { FunctionComponent } from "react";

import { EntityType } from "@/api/types";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useTranslate } from "@/hooks/useTranslate";
import { TTranslationKeys } from "@/i18n/i18n.types";

export enum ColumnActionType {
  Edit = "Edit",
  Delete = "Delete",
  Manage_Roles = "Manage_Roles",
  Permissions = "Permissions",
  Content = "Content",
  Manage_Labels = "Manage_Labels",
  Annotate = "Annotate",
  Test = "Test",
  Tools = "Tools",
  View = "View",
}

const COLUMN_ACTION_CONFIG_MAP: Record<
  ColumnActionType,
  {
    label: TTranslationKeys;
    icon: FunctionComponent<LucideProps>;
    color?: IconButtonOwnProps["color"];
    requires?: Action[];
  }
> = {
  [ColumnActionType.Edit]: {
    label: "button.edit",
    icon: Pencil,
    color: "warning",
    requires: [Action.UPDATE],
  },
  [ColumnActionType.Delete]: {
    label: "button.delete",
    icon: Trash2,
    color: "error",
    requires: [Action.DELETE],
  },
  [ColumnActionType.Manage_Roles]: {
    label: "button.manage_roles",
    icon: UserCog,
  },
  [ColumnActionType.Permissions]: { label: "button.permissions", icon: Shield },
  [ColumnActionType.Content]: { label: "button.content", icon: FileText },
  [ColumnActionType.Manage_Labels]: {
    label: "title.manage_labels",
    icon: Tag,
  },
  [ColumnActionType.Annotate]: { label: "button.annotate", icon: RefreshCw },
  [ColumnActionType.Test]: { label: "button.test_connection", icon: TestTube },
  [ColumnActionType.Tools]: { label: "button.tools", icon: Wrench },
  [ColumnActionType.View]: { label: "button.view", icon: Eye },
} as const;

export interface ActionColumn<T extends GridValidRowModel> {
  action: ColumnActionType;
  onClick?: (row: T) => void;
  requires?: Action[];
  helperText?: string;
  isDisabled?: (row: T) => boolean;
}

const ACTION_ICON_SIZE = 18;
// Mirrors the button size, gap and cell padding set in theme/customizations/dataGrid.
const ACTION_BUTTON_WIDTH = 40;
const ACTION_BUTTON_GAP = 4;
const ACTION_CELL_PADDING = 24;
const ACTION_COLUMN_MIN_WIDTH = 144;

function StackComponent<T extends GridValidRowModel>({
  actions,
  params,
}: {
  actions: ActionColumn<T>[];
  params: GridRenderCellParams<T, any, any, GridTreeNodeWithRender>;
}) {
  const { t } = useTranslate();

  return (
    <Stack>
      {actions.map(({ action, onClick, requires, helperText, isDisabled }) => {
        const {
          icon: Icon,
          label: labelKey,
          color = "primary",
          requires: defaultRequires = [],
        } = COLUMN_ACTION_CONFIG_MAP[action];
        const label = helperText || t(labelKey);

        return (
          <Tooltip key={action} title={label}>
            <GridActionsCellItem
              icon={<Icon size={ACTION_ICON_SIZE} />}
              label={label}
              showInMenu={false}
              color={color}
              disabled={
                (isDisabled && isDisabled(params.row)) ||
                (params.row.builtin &&
                  (requires ?? defaultRequires).includes(Action.DELETE))
              }
              onClick={() => {
                onClick?.(params.row);
              }}
            />
          </Tooltip>
        );
      })}
    </Stack>
  );
}

export const getActionsColumn = <T extends GridValidRowModel>(
  actions: ActionColumn<T>[],
  headerName: string,
): GridColDef<T> => {
  const width = Math.max(
    ACTION_COLUMN_MIN_WIDTH,
    actions.length * (ACTION_BUTTON_WIDTH + ACTION_BUTTON_GAP) -
      ACTION_BUTTON_GAP +
      ACTION_CELL_PADDING * 2,
  );

  return {
    field: "actions",
    headerName,
    sortable: false,
    flex: 0,
    width,
    resizable: false,
    align: "center",
    headerAlign: "center",
    renderCell: (params) => (
      <StackComponent actions={actions} params={params} />
    ),
  };
};

export const useActionColumns = <T extends GridValidRowModel>(
  type: EntityType,
  actions: ActionColumn<T>[],
  headerName?: string,
) => {
  const { t } = useTranslate();
  const hasPermission = useHasPermission();

  return getActionsColumn(
    actions.filter(
      ({ action, requires = COLUMN_ACTION_CONFIG_MAP[action].requires }) =>
        !requires || requires.every((action) => hasPermission(type, action)),
    ),
    headerName ?? t("label.operations"),
  );
};
