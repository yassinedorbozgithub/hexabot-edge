/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type {
  EqParam,
  SearchItem,
  TFilterStringFields,
} from "@hexabot-ai/types";

import { THook, TNestedPaths } from "./base";

export type TParamItem<
  TE extends THook["entity"],
  TF extends THook<{ entity: TE }>["filters"] = THook<{
    entity: TE;
  }>["filters"],
  N = TNestedPaths<TF>,
> = {
  $eq?: { [K in keyof N]?: N[K] }[];
  $iLike?: TFilterStringFields<TF>[];
  $neq?: { [K in keyof TF]?: TF[K] }[];
  $or?: TFilterStringFields<TF>[];
};

export type TBuildParamProps<T> = {
  params?: TFilterStringFields<T>[];
  searchText?: string;
};

export type TBuildInitialParamProps<T> = {
  initialParams?: { [key in keyof T]?: T[key] }[];
};

export interface SearchHookOptions {
  syncUrl?: boolean;
}

export type SearchPayload<
  TE extends THook["entity"],
  TF extends THook<{ entity: TE }>["filters"] = THook<{
    entity: TE;
  }>["filters"],
  N = TNestedPaths<TF>,
> = EqParam<N> & {
  where?: {
    or?: SearchItem<N>[];
  } & SearchItem<N>;
};
