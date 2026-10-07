/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Language } from "@hexabot-ai/types";
import { Action } from "@hexabot-ai/types";
import { Switch } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { Flag, Plus } from "lucide-react";

import { EntityType } from "@/api/types";
import { isSameEntity } from "@/hooks/crud/helpers";
import { useEntityDelete } from "@/hooks/crud/useEntityDelete";
import { useTanstackQueryClient } from "@/hooks/crud/useTanstack";
import { useUpdate } from "@/hooks/crud/useUpdate";
import { useDialogs } from "@/hooks/useDialogs";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useToast } from "@/hooks/useToast";
import { useTranslate } from "@/hooks/useTranslate";
import {
  ColumnActionType,
  useActionColumns,
} from "@/shared/tables/columns/getColumns";
import { useTimestampColumns } from "@/shared/tables/columns/useTimestampColumns";
import { GenericDataGrid } from "@/shared/tables/GenericDataGrid";

import { LanguageFormDialog } from "./LanguageFormDialog";

export const Languages = () => {
  const { t } = useTranslate();
  const { toast } = useToast();
  const dialogs = useDialogs();
  const timestampColumns = useTimestampColumns<Language>();
  const hasPermission = useHasPermission();
  const { mutate: updateLanguage } = useUpdate(EntityType.LANGUAGE, {
    onError: () => {
      toast.error(t("message.internal_server_error"));
    },
    onSuccess() {
      toast.success(t("message.success_save"));
    },
  });
  const { confirmDeleteOne } = useEntityDelete(EntityType.LANGUAGE);
  const queryClient = useTanstackQueryClient();
  const toggleDefault = (row: Language) => {
    if (!row.isDefault) {
      updateLanguage(
        {
          id: row.id,
          params: {
            isDefault: true,
          },
        },
        {
          onSuccess() {
            queryClient.invalidateQueries({
              predicate: ({ queryKey }) => {
                const [_qType, qEntity] = queryKey;

                return isSameEntity(qEntity, EntityType.LANGUAGE);
              },
            });
          },
        },
      );
    }
  };
  const actionColumns = useActionColumns<Language>(
    EntityType.LANGUAGE,
    [
      {
        action: ColumnActionType.Edit,
        onClick: (row) => {
          dialogs.open(LanguageFormDialog, { defaultValues: row });
        },
        requires: [Action.UPDATE],
      },
      {
        action: ColumnActionType.Delete,
        onClick: ({ id }) => confirmDeleteOne(id),
        requires: [Action.DELETE],
        isDisabled: (row) => row.isDefault,
      },
    ],
    t("label.operations"),
  );
  const columns: GridColDef<Language>[] = [
    { field: "id", headerName: "ID" },
    {
      flex: 2,
      field: "title",
      headerName: t("label.title"),
      disableColumnMenu: true,
      headerAlign: "left",
    },
    {
      flex: 1,
      field: "code",
      headerName: t("label.code"),
      disableColumnMenu: true,
      headerAlign: "left",
    },
    {
      flex: 1,
      field: "isRTL",
      headerName: t("label.is_rtl"),
      disableColumnMenu: true,
      headerAlign: "left",
      valueGetter: (value) => (value ? t("label.yes") : t("label.no")),
    },
    {
      maxWidth: 120,
      field: "isDefault",
      headerName: t("label.is_default"),
      disableColumnMenu: true,
      headerAlign: "left",
      renderCell: (params) => (
        <Switch
          key={params.value}
          checked={params.value}
          slotProps={{ input: { "aria-label": "primary checkbox" } }}
          disabled={
            params.value || !hasPermission(EntityType.LANGUAGE, Action.UPDATE)
          }
          onChange={() => {
            toggleDefault(params.row);
          }}
        />
      ),
    },
    ...timestampColumns,
    actionColumns,
  ];

  return (
    <GenericDataGrid
      entity={EntityType.LANGUAGE}
      buttons={[
        {
          permissionAction: Action.CREATE,
          children: t("button.add"),
          startIcon: <Plus />,
          onClick: () => {
            dialogs.open(LanguageFormDialog, { defaultValues: null });
          },
        },
      ]}
      columns={columns}
      headerIcon={Flag}
      searchParams={{
        $or: ["title", "code"],
        syncUrl: true,
      }}
      headerI18nTitle="title.languages"
    />
  );
};
