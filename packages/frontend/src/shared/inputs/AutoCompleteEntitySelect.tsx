/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { TFilterStringFields } from '@hexabot-ai/types';
import { Action } from '@hexabot-ai/types';
import type { ChipTypeMap } from '@mui/material';
import type {
  AutocompleteProps,
  AutocompleteValue,
} from '@mui/material/Autocomplete';
import type { ReactNode, Ref, SyntheticEvent } from 'react';
import { useCallback, useEffect, useId, useMemo } from 'react';

import type { RouteParams } from '@/api/api.class';
import type { Format } from '@/api/types';
import { QueryType } from '@/api/types';
import { useInfiniteFind } from '@/hooks/crud/useInfiniteFind';
import { useSearch } from '@/hooks/useSearch';
import type { IEntityMapTypes } from '@/types/base';

import { WithEntityButton } from '../buttons/entities/WithEntityButton';
import type { BASE_ADD_DIALOG_MAP } from '../dialogs/dialog.constants';

import { buildAutoCompleteEntityWhere } from './auto-complete-entity-select.utils';
import { AutoCompleteSelect } from './AutoCompleteSelect';

const PAGE_SIZE = 20;

export type AutoCompleteEntitySelectProps<
  Value,
  Label extends keyof Value = keyof Value,
  Multiple extends boolean | undefined = true,
> = Omit<
  AutocompleteProps<
    Value,
    Multiple,
    false,
    false,
    ChipTypeMap['defaultComponent']
  >,
  'renderInput' | 'options' | 'value' | 'defaultValue' | 'label'
> & {
  value?: Multiple extends true ? string[] : string | null;
  label: ReactNode;
  idKey?: string;
  sortKey?: string;
  labelKey: Label;
  entity: keyof IEntityMapTypes;
  format: Format;
  searchFields: string[];
  inputLabelSx?: unknown;
  disableSearch?: boolean;
  error?: boolean;
  helperText?: string | null | undefined;
  preprocess?: (data: Value[]) => Value[];
  noOptionsWarning?: string;
  isDisabledWhenEmpty?: boolean;
  enableEntityAddButton?: boolean;
  disableAutoSelectOnCreate?: boolean;
  routeParams?: RouteParams;
  queryEnabled?: boolean;
  where?: Record<string, unknown>;
};

export const AutoCompleteEntitySelect = <
  Value,
  Label extends keyof Value = keyof Value,
  Multiple extends boolean | undefined = true,
>({
  entity,
  format,
  searchFields,
  disableSearch,
  preprocess,
  idKey = 'id',
  sortKey = 'id',
  labelKey,
  enableEntityAddButton,
  disableAutoSelectOnCreate,
  routeParams,
  queryEnabled = true,
  where,
  ref,
  ...rest
}: AutoCompleteEntitySelectProps<Value, Label, Multiple> & {
  ref?: Ref<HTMLDivElement>;
}) => {
  const { onSearch, searchPayload } = useSearch<typeof entity>(
    disableSearch
      ? {}
      : {
          $or: (searchFields as TFilterStringFields<unknown>) || [
            idKey,
            labelKey,
          ],
        },
  );
  const id = useId();
  const { multiple, value, onChange } = rest;
  const serializedRouteParams = JSON.stringify(routeParams || {});
  const { data, isFetching, fetchNextPage } = useInfiniteFind(
    { entity, format },
    {
      params: {
        where: buildAutoCompleteEntityWhere({
          where,
          searchOrClauses: searchPayload.where?.or,
        }),
      } as any,
      hasCount: false,
    },
    {
      initialPageParam: { limit: PAGE_SIZE, skip: 0 },
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length < PAGE_SIZE
          ? undefined
          : { limit: PAGE_SIZE, skip: allPages.length * PAGE_SIZE },
      placeholderData: (prev) => prev,
      enabled: queryEnabled,
      routeParams,
      queryKey: [
        QueryType.collection,
        entity,
        `autocomplete/${id}/${serializedRouteParams}`,
      ],
    },
  );
  const options = useMemo(() => {
    if (!data) {
      return [];
    }

    // Flatten, dedupe by id (first occurrence wins), then sort
    const seenIds = new Set<unknown>();
    const flattenedData = data.pages
      .flat()
      .filter((item) => {
        const itemId = item?.[idKey];

        if (seenIds.has(itemId)) {
          return false;
        }
        seenIds.add(itemId);

        return true;
      })
      .sort((a, b) => -b[sortKey]?.localeCompare(a[sortKey])) as Value[];

    return preprocess ? preprocess(flattenedData) : flattenedData;
  }, [data, idKey, sortKey, preprocess]);

  useEffect(() => {
    if (queryEnabled) {
      fetchNextPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    queryEnabled,
    serializedRouteParams,
    JSON.stringify(searchPayload),
    JSON.stringify(where || {}),
  ]);

  // Select the newly created entity (appended to the current selection when multiple)
  const handleEntityCreated = useCallback(
    (created: unknown) => {
      const selectedOptions = options.filter((option) =>
        ((value as string[]) || []).includes(
          (option as Record<string, string>)[idKey],
        ),
      );
      const newValue = (
        multiple ? [...selectedOptions, created] : created
      ) as AutocompleteValue<Value, Multiple, false, false>;

      onChange?.({} as SyntheticEvent, newValue, 'selectOption');
    },
    [multiple, value, onChange, options, idKey],
  );

  return (
    <WithEntityButton
      entity={entity as keyof typeof BASE_ADD_DIALOG_MAP}
      permissionAction={Action.CREATE}
      enableEntityAddButton={enableEntityAddButton}
      onEntityCreated={
        disableAutoSelectOnCreate ? undefined : handleEntityCreated
      }
    >
      <AutoCompleteSelect<Value, Label, Multiple>
        ref={ref}
        idKey={idKey}
        labelKey={labelKey}
        options={options}
        onSearch={onSearch}
        loading={isFetching}
        data-multiple={multiple}
        {...rest}
      />
    </WithEntityButton>
  );
};
