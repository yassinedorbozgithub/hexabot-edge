/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { QueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import type { DefaultError, QueryKey } from '@/types/tanstack.types';

export const useTanstackQuery = <
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  {
    onError,
    onSuccess,
    ...options
  }: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
    onError?: (err: TError | null) => void;
    onSuccess?: (data: TData) => void;
  },
  queryClient?: QueryClient,
) => {
  const result = useQuery(options, queryClient);

  useEffect(() => {
    result.isError && onError?.(result.error);
  }, [result.error, result.isError]);

  useEffect(() => {
    result.isSuccess && onSuccess?.(result.data);
  }, [result.data, result.isSuccess]);

  return result;
};

export {
  useInfiniteQuery as useTanstackInfiniteQuery,
  useMutation as useTanstackMutation,
  useQueryClient as useTanstackQueryClient,
};
