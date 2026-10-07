/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Action } from "@hexabot-ai/types";
import type { Role } from "@hexabot-ai/types";
import { GridColDef } from "@mui/x-data-grid";
import { ShieldCheck } from "lucide-react";

import { EntityType } from "@/api/types";
import { useEntityDelete } from "@/hooks/crud/useEntityDelete";
import { useDialogs } from "@/hooks/useDialogs";
import { useTranslate } from "@/hooks/useTranslate";
import {
  ColumnActionType,
  useActionColumns,
} from "@/shared/tables/columns/getColumns";
import { useTimestampColumns } from "@/shared/tables/columns/useTimestampColumns";
import { GenericDataGrid } from "@/shared/tables/GenericDataGrid";

import { PermissionBodyDialog } from "./PermissionsBodyDialog";
import { RoleFormDialog } from "./RoleFormDialog";

export const Roles = () => {
  const { t } = useTranslate();
  const dialogs = useDialogs();
  const timestampColumns = useTimestampColumns<Role>();
  const { confirmDeleteOne } = useEntityDelete(EntityType.ROLE);
  const actionColumns = useActionColumns<Role>(
    EntityType.ROLE,
    [
      {
        action: ColumnActionType.Permissions,
        onClick: (row) =>
          dialogs.open(
            PermissionBodyDialog,
            { defaultValues: row },
            {
              hasButtons: false,
            },
          ),
      },
      {
        action: ColumnActionType.Edit,
        onClick: (row) => {
          dialogs.open(RoleFormDialog, { defaultValues: row });
        },
        requires: [Action.UPDATE],
      },
      {
        action: ColumnActionType.Delete,
        onClick: ({ id }) => confirmDeleteOne(id),
        requires: [Action.DELETE],
      },
    ],
    t("label.operations"),
  );
  const columns: GridColDef<Role>[] = [
    { field: "id", headerName: "ID" },
    {
      flex: 3,
      field: "name",
      headerName: t("label.name"),
      sortable: false,
      disableColumnMenu: true,
    },
    ...timestampColumns,
    actionColumns,
  ];

  return (
    <GenericDataGrid
      entity={EntityType.ROLE}
      buttons={[
        {
          permissionAction: Action.CREATE,
          children: t("button.add"),
          onClick: () => {
            dialogs.open(RoleFormDialog, { defaultValues: null });
          },
        },
      ]}
      columns={columns}
      headerIcon={ShieldCheck}
      searchParams={{
        $iLike: ["name"],
        syncUrl: true,
      }}
      headerI18nTitle="title.roles"
    />
  );
};
