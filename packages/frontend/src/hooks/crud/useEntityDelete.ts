/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { useCallback, useMemo } from "react";

import { useDialogs } from "@/hooks/useDialogs";
import { useToast } from "@/hooks/useToast";
import { useTranslate } from "@/hooks/useTranslate";
import { ConfirmDialogBody } from "@/shared/dialogs";
import { THook } from "@/types/base";

import { useDelete } from "./useDelete";
import { useDeleteMany } from "./useDeleteMany";

export const useEntityDelete = <TE extends THook["entity"]>(entity: TE) => {
  const { t } = useTranslate();
  const { toast } = useToast();
  const dialogs = useDialogs();
  const options = useMemo(
    () => ({
      onError: (error: Error) => {
        toast.error(error);
      },
      onSuccess: () => {
        toast.success(t("message.item_delete_success"));
      },
    }),
    [t, toast],
  );
  const single = useDelete(entity, options);
  const many = useDeleteMany(entity, options);
  const confirmDeleteOne = useCallback(
    async (id: string) => {
      const isConfirmed = await dialogs.confirm(ConfirmDialogBody);

      if (isConfirmed) {
        single.mutate(id);
      }
    },
    [dialogs, single],
  );
  const confirmDeleteMany = useCallback(
    async (ids: string[]) => {
      const isConfirmed = await dialogs.confirm(ConfirmDialogBody, {
        mode: "selection",
        count: ids.length,
      });

      if (isConfirmed) {
        many.mutate(ids);
      }
    },
    [dialogs, many],
  );

  return {
    deleteOne: single.mutate,
    deleteMany: many.mutate,
    confirmDeleteOne,
    confirmDeleteMany,
    single,
    many,
  };
};
