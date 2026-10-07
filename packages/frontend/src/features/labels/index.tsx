/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Action, Label } from "@hexabot-ai/types";
import { GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";
import { Tag } from "lucide-react";
import { useState } from "react";

import { EntityType } from "@/api/types";
import { useEntityDelete } from "@/hooks/crud/useEntityDelete";
import { useGetFromCache } from "@/hooks/crud/useGet";
import { useDialogs } from "@/hooks/useDialogs";
import { useTranslate } from "@/hooks/useTranslate";
import {
  ColumnActionType,
  useActionColumns,
} from "@/shared/tables/columns/getColumns";
import { useTimestampColumns } from "@/shared/tables/columns/useTimestampColumns";
import { GenericDataGrid } from "@/shared/tables/GenericDataGrid";

import { LabelFormDialog } from "./LabelFormDialog";

export const Labels = () => {
  const { t } = useTranslate();
  const dialogs = useDialogs();
  const timestampColumns = useTimestampColumns<Label>();
  const { confirmDeleteOne, confirmDeleteMany } = useEntityDelete(
    EntityType.LABEL,
  );
  const actionColumns = useActionColumns<Label>(
    EntityType.LABEL,
    [
      {
        action: ColumnActionType.Edit,
        onClick: (row) => {
          dialogs.open(LabelFormDialog, {
            defaultValues: row,
          });
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
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const getEntityFromCache = useGetFromCache(EntityType.LABEL_GROUP);
  const columns: GridColDef<Label>[] = [
    { field: "id", headerName: "ID" },
    {
      flex: 1,
      field: "title",
      headerName: t("label.title"),
      disableColumnMenu: true,
      headerAlign: "left",
    },
    {
      minWidth: 110,
      field: "group",
      headerName: t("title.group_label"),
      disableColumnMenu: true,
      headerAlign: "center",
      valueGetter: (groupId) => {
        const group = getEntityFromCache(groupId);

        return group?.name;
      },
    },
    {
      flex: 1,
      field: "name",
      headerName: t("label.name"),
      disableColumnMenu: true,
      headerAlign: "left",
    },
    {
      flex: 2,
      field: "description",
      headerName: t("label.description"),
      disableColumnMenu: true,
      headerAlign: "left",
    },
    ...timestampColumns,
    actionColumns,
  ];
  const handleSelectionChange = (selection: GridRowSelectionModel) => {
    setSelectedLabels(selection as string[]);
  };

  return (
    <GenericDataGrid
      entity={EntityType.LABEL}
      buttons={[
        {
          permissionAction: Action.CREATE,
          onClick: () => dialogs.open(LabelFormDialog, { defaultValues: null }),
        },
        {
          permissionAction: Action.DELETE,
          onClick: () => confirmDeleteMany(selectedLabels),
          disabled: !selectedLabels.length,
        },
      ]}
      columns={columns}
      headerIcon={Tag}
      searchParams={{ $or: ["name", "title"], syncUrl: true }}
      headerI18nTitle="title.labels"
      selectionChangeHandler={handleSelectionChange}
    />
  );
};
