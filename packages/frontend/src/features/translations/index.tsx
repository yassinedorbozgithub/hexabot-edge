/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Language, Translation } from "@hexabot-ai/types";
import { Action } from "@hexabot-ai/types";
import { Chip, Stack } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { Languages, RefreshCw } from "lucide-react";

import { EntityType } from "@/api/types";
import { useEntityDelete } from "@/hooks/crud/useEntityDelete";
import { useFind } from "@/hooks/crud/useFind";
import { useApiClientMutation } from "@/hooks/useApiClient";
import { useDialogs } from "@/hooks/useDialogs";
import { useToast } from "@/hooks/useToast";
import { useTranslate } from "@/hooks/useTranslate";
import {
  ColumnActionType,
  useActionColumns,
} from "@/shared/tables/columns/getColumns";
import { useTimestampColumns } from "@/shared/tables/columns/useTimestampColumns";
import { GenericDataGrid } from "@/shared/tables/GenericDataGrid";

import { TranslationFormDialog } from "./TranslationFormDialog";

export const Translations = () => {
  const { t } = useTranslate();
  const { toast } = useToast();
  const dialogs = useDialogs();
  const timestampColumns = useTimestampColumns<Translation>();
  const { data: languages } = useFind(
    { entity: EntityType.LANGUAGE },
    {
      hasCount: false,
    },
  );
  const { deleteAction } = useEntityDelete(EntityType.TRANSLATION);
  const { mutateAsync: checkRefreshTranslations, isPending } =
    useApiClientMutation("refreshTranslations", {
      onError: () => {
        toast.error(t("message.internal_server_error"));
      },
      onSuccess: () => {
        toast.success(t("message.success_translation_refresh"));
      },
    });
  const actionColumns = useActionColumns<Translation>(EntityType.TRANSLATION, [
    {
      action: ColumnActionType.Edit,
      onClick: (row) =>
        dialogs.open(TranslationFormDialog, { defaultValues: row }),
    },
    deleteAction,
  ]);
  const columns: GridColDef<Translation>[] = [
    { flex: 1, field: "str", headerName: t("label.str") },
    {
      maxWidth: 300,
      field: "translations",
      headerName: t("label.translations"),
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" my={1} spacing={1}>
          {languages
            .filter(({ isDefault }) => !isDefault)
            .map((language: Language) => (
              <Chip
                key={language.code}
                color={
                  params.row.translations[language.code] ? "success" : "error"
                }
                label={language.title}
              />
            ))}
        </Stack>
      ),
    },
    ...timestampColumns,
    actionColumns,
  ];

  return (
    <GenericDataGrid
      entity={EntityType.TRANSLATION}
      buttons={[
        {
          permissionAction: Action.CREATE,
          children: t("button.refresh"),
          startIcon: <RefreshCw />,
          onClick: () => {
            checkRefreshTranslations([]);
          },
          disabled: isPending,
        },
      ]}
      columns={columns}
      headerIcon={Languages}
      searchParams={{
        $iLike: ["str"],
        syncUrl: true,
      }}
      headerI18nTitle="title.translations"
    />
  );
};
