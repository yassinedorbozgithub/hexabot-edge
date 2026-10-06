/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Action, Credential } from "@hexabot-ai/types";
import { GridColDef } from "@mui/x-data-grid";
import { KeyRound, Plus } from "lucide-react";

import { ChipEntity } from "@/app-components/displays/ChipEntity";
import {
  ColumnActionType,
  useActionColumns,
} from "@/app-components/tables/columns/getColumns";
import { useTimestampColumns } from "@/app-components/tables/columns/useTimestampColumns";
import { GenericDataGrid } from "@/app-components/tables/GenericDataGrid";
import { useEntityDelete } from "@/hooks/crud/useEntityDelete";
import { useDialogs } from "@/hooks/useDialogs";
import { useTranslate } from "@/hooks/useTranslate";
import { EntityType } from "@/services/types";

import { CredentialFormDialog } from "./CredentialFormDialog";

export const Credentials = () => {
  const { t } = useTranslate();
  const dialogs = useDialogs();
  const timestampColumns = useTimestampColumns<Credential>();
  const { confirmDeleteOne } = useEntityDelete(EntityType.CREDENTIAL);
  const actionColumns = useActionColumns<Credential>(
    EntityType.CREDENTIAL,
    [
      {
        action: ColumnActionType.Edit,
        onClick: (row) => {
          dialogs.open(CredentialFormDialog, { defaultValues: row });
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
  const columns: GridColDef<Credential>[] = [
    { field: "id", headerName: "ID" },
    {
      flex: 1,
      field: "name",
      headerName: t("label.name"),
      disableColumnMenu: true,
      headerAlign: "left",
    },
    {
      flex: 1,
      field: "owner",
      headerName: t("label.owner"),
      disableColumnMenu: true,
      headerAlign: "left",
      renderCell: ({ value }) => (
        <ChipEntity
          entity={EntityType.USER}
          field="firstName"
          id={value}
          key={value}
        />
      ),
    },
    {
      flex: 2,
      field: "value",
      headerName: t("label.value"),
      disableColumnMenu: true,
      headerAlign: "left",
      valueGetter: () => "*************",
    },
    ...timestampColumns,
    actionColumns,
  ];

  return (
    <GenericDataGrid
      entity={EntityType.CREDENTIAL}
      buttons={[
        {
          permissionAction: Action.CREATE,
          children: t("button.add"),
          startIcon: <Plus />,
          onClick: () => {
            dialogs.open(CredentialFormDialog, { defaultValues: null });
          },
        },
      ]}
      columns={columns}
      headerIcon={KeyRound}
      searchParams={{
        $or: ["name"],
        syncUrl: true,
      }}
      headerI18nTitle="title.credentials"
    />
  );
};
