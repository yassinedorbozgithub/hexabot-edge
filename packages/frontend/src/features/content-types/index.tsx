/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Action } from "@hexabot-ai/types";
import type { ContentType } from "@hexabot-ai/types";
import { GridColDef } from "@mui/x-data-grid";
import { BookOpen } from "lucide-react";

import { EntityType } from "@/api/types";
import { useEntityDelete } from "@/hooks/crud/useEntityDelete";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useDialogs } from "@/hooks/useDialogs";
import { useTranslate } from "@/hooks/useTranslate";
import {
  ColumnActionType,
  useActionColumns,
} from "@/shared/tables/columns/getColumns";
import { useTimestampColumns } from "@/shared/tables/columns/useTimestampColumns";
import { GenericDataGrid } from "@/shared/tables/GenericDataGrid";

import { ContentTypeFormDialog } from "./ContentTypeFormDialog";

export const ContentTypes = () => {
  const { t } = useTranslate();
  const router = useAppRouter();
  const dialogs = useDialogs();
  const timestampColumns = useTimestampColumns<ContentType>();
  const { deleteAction } = useEntityDelete(EntityType.CONTENT_TYPE);
  const actionColumns = useActionColumns<ContentType>(EntityType.CONTENT_TYPE, [
    {
      action: ColumnActionType.Content,
      onClick: (row) => router.push(`/content-types/content/${row.id}`),
    },
    {
      action: ColumnActionType.Edit,
      onClick: (row) =>
        dialogs.open(ContentTypeFormDialog, { defaultValues: row }),
    },
    deleteAction,
  ]);
  const columns: GridColDef<ContentType>[] = [
    { flex: 1, field: "name", headerName: t("label.name") },
    ...timestampColumns,
    actionColumns,
  ];

  return (
    <GenericDataGrid
      entity={EntityType.CONTENT_TYPE}
      buttons={[
        {
          permissionAction: Action.CREATE,
          onClick: () =>
            dialogs.open(ContentTypeFormDialog, { defaultValues: null }),
        },
      ]}
      columns={columns}
      headerIcon={BookOpen}
      searchParams={{ $iLike: ["name"], syncUrl: true }}
      headerI18nTitle="title.entities"
    />
  );
};
