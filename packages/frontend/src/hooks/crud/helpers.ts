/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { BaseStub } from "@hexabot-ai/types";
import { normalize } from "normalizr";

import { ENTITY_MAP } from "@/api/entities";
import { EntityType, QueryType } from "@/api/types";
import {
  mergeEntityCachePayload,
  type CacheRecord,
} from "@/hooks/entity-cache.utils";
import { THook } from "@/types/base";

import { useTanstackQueryClient } from "./useTanstack";

export const useNormalizeAndCache = <
  TResult,
  TE extends THook["entity"] = THook["entity"],
  TBasic extends THook["basic"] = THook<{ entity: TE }>["basic"],
  TFull extends THook["full"] = THook<{ entity: TE }>["full"],
  TData = TBasic | TFull,
  TAny extends BaseStub = BaseStub,
>(
  entity: TE,
) => {
  const queryClient = useTanstackQueryClient();

  return (data: TData | TData[]) => {
    if (!(entity in ENTITY_MAP)) {
      throw new Error(`Entity ${entity} is missing in ENTITY_MAP`);
    }

    if (!data) {
      throw new Error(`No data to normalize !`);
    }

    const schemaEntity = ENTITY_MAP[entity];
    const { entities, result } = normalize<
      TAny,
      Record<EntityType, Record<string, TAny>>,
      TResult
    >(data, Array.isArray(data) ? [schemaEntity] : schemaEntity);

    Object.entries(entities).forEach(([entityType, dataDict]) => {
      if (dataDict) {
        Object.entries(dataDict).forEach(([id, newData]) => {
          if (id && newData) {
            queryClient.setQueryData(
              [QueryType.item, entityType, id],
              (previousData: CacheRecord | undefined) => {
                return mergeEntityCachePayload(
                  entityType as EntityType,
                  previousData,
                  newData as CacheRecord,
                );
              },
            );
          }
        });
      }
    });

    return { entities, result };
  };
};

export const isSameEntity = (qEntity: unknown, entity: string) => {
  // We may have entities referencing the same entity type : Menu and Menu/tree
  return typeof qEntity === "string" && qEntity.split("/")[0] === entity;
};
