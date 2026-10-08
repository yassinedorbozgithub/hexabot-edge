/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Action } from "@hexabot-ai/types";
import type { Content } from "@hexabot-ai/types";
import { Switch } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { BookOpen } from "lucide-react";

import { EntityType } from "@/api/types";
import { isSameEntity } from "@/hooks/crud/helpers";
import { useEntityDelete } from "@/hooks/crud/useEntityDelete";
import { useGet, useGetFromCache } from "@/hooks/crud/useGet";
import { useImport } from "@/hooks/crud/useImport";
import { useTanstackQueryClient } from "@/hooks/crud/useTanstack";
import { useUpsert } from "@/hooks/crud/useUpsert";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useDialogs } from "@/hooks/useDialogs";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useToast } from "@/hooks/useToast";
import { useTranslate } from "@/hooks/useTranslate";
import { BackButton } from "@/shared/buttons/BackButton";
import FileUploadButton from "@/shared/inputs/FileInput";
import {
  ColumnActionType,
  useActionColumns,
} from "@/shared/tables/columns/getColumns";
import { useTimestampColumns } from "@/shared/tables/columns/useTimestampColumns";
import { GenericDataGrid } from "@/shared/tables/GenericDataGrid";

import { ContentFormDialog } from "./ContentFormDialog";

export const Contents = () => {
  const { t } = useTranslate();
  const { toast } = useToast();
  const { query } = useAppRouter();
  const timestampColumns = useTimestampColumns<Content>();
  const queryClient = useTanstackQueryClient();
  const dialogs = useDialogs();
  const hasPermission = useHasPermission();
  const { mutate: updateContent } = useUpsert(EntityType.CONTENT).update;
  const { confirmDeleteOne } = useEntityDelete(EntityType.CONTENT);
  const getEntityFromCache = useGetFromCache(EntityType.CONTENT_TYPE);
  const actionColumns = useActionColumns<Content>(
    EntityType.CONTENT,
    [
      {
        action: ColumnActionType.Edit,
        onClick: (row) => {
          dialogs.open(ContentFormDialog, {
            defaultValues: row,
            presetValues: contentType,
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
  const { data: contentType } = useGet(String(query.id), {
    entity: EntityType.CONTENT_TYPE,
  });
  const { mutate: importDataset, isPending } = useImport(
    EntityType.CONTENT,
    {
      onError: () => {
        toast.error(t("message.import_failed"));
      },
      onSuccess: (data) => {
        queryClient.removeQueries({
          predicate: ({ queryKey }) => {
            const [_qType, qEntity] = queryKey;

            return isSameEntity(qEntity, EntityType.CONTENT);
          },
        });

        if (data.length) {
          toast.success(t("message.success_import"));
        } else {
          toast.error(t("message.import_duplicated_data"));
        }
      },
    },
    { idTargetContentType: contentType?.id },
  );
  const handleImportChange = (file: File) => {
    importDataset(file);
  };
  const columns: GridColDef<Content>[] = [
    { field: "title", headerName: t("label.title"), flex: 1 },
    {
      field: "contentType",
      headerName: t("label.entity"),
      flex: 1,
      valueGetter: (entityId) => {
        const contentType = getEntityFromCache(entityId);

        return contentType?.name;
      },
    },
    {
      maxWidth: 120,
      field: "status",
      headerName: t("label.status"),
      disableColumnMenu: true,
      headerAlign: "left",
      renderCell: (params) => (
        <Switch
          checked={params.value}
          color="primary"
          slotProps={{ input: { "aria-label": "primary checkbox" } }}
          disabled={!hasPermission(EntityType.CONTENT, Action.UPDATE)}
          onChange={() => {
            updateContent({
              id: params.row.id,
              params: {
                status: !params.row.status,
              },
            });
          }}
        />
      ),
    },
    ...timestampColumns,
    actionColumns,
  ];

  return (
    <GenericDataGrid
      entity={EntityType.CONTENT}
      buttons={[
        {
          permissionAction: Action.CREATE,
          onClick: () =>
            dialogs.open(ContentFormDialog, {
              presetValues: contentType,
            }),
        },
        {
          permissionAction: Action.CREATE,
          children: (
            <FileUploadButton
              accept="text/csv"
              label={t("button.import")}
              onChange={handleImportChange}
              isLoading={isPending}
            />
          ),
        },
      ]}
      columns={columns}
      headerIcon={BookOpen}
      searchParams={{
        $eq: [{ "contentType.id": query.id?.toString() }],
        $iLike: ["title"],
        syncUrl: true,
      }}
      headerI18nTitle="title.entities"
      headerTitleChip={contentType?.name}
      headerLeftButtons={<BackButton href="/content-types" />}
    />
  );
};
