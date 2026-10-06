/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { useCallback, useMemo } from "react";

import { useToast } from "@/hooks/useToast";
import { useTranslate } from "@/hooks/useTranslate";
import { THook } from "@/types/base";

import { useCreate } from "./useCreate";
import { useUpdate } from "./useUpdate";

export type UpsertCallbacks = {
  onSuccess?: (data: any) => void;
  onError?: () => void;
};

export const useUpsert = <
  TE extends THook["entity"],
  TAttr extends THook["attributes"] = THook<{
    entity: TE;
  }>["attributes"],
  TBasic extends THook["basic"] = THook<{ entity: TE }>["basic"],
>(
  entity: TE,
  // Intentionally `any` to avoid TE/TBasic inference conflicts from the
  // caller's `rest.onSuccess` handler (which is typed per-entity).
  callbacks?: UpsertCallbacks,
) => {
  const { t } = useTranslate();
  const { toast } = useToast();
  const options = useMemo(
    () => ({
      onError: (error: Error) => {
        callbacks?.onError?.();
        toast.error(error);
      },
      onSuccess: (data: TBasic) => {
        callbacks?.onSuccess?.(data);
        toast.success(t("message.success_save"));
      },
    }),
    // callbacks is a stable `rest` object from the form props in practice;
    // memoize on the individual handlers to avoid rebuilding options.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, toast, callbacks?.onSuccess, callbacks?.onError],
  );
  const create = useCreate<TE, TAttr, TBasic>(entity, options as any);
  const update = useUpdate<TE, TAttr, TBasic>(entity, options as any);
  const save = useCallback(
    (
      id: string | null | undefined,
      params: TAttr,
      extraOptions?: Parameters<typeof update.mutate>[1],
    ) => {
      if (id) {
        update.mutate(
          { id, params: params as any } as any,
          extraOptions as any,
        );
      } else {
        create.mutate(params as any, extraOptions as any);
      }
    },
    [create, update],
  );

  return { ...options, create, update, save };
};
