/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { ChipTypeMap } from '@mui/material';
import { Box, Chip, CircularProgress, TextField } from '@mui/material';
import type {
  AutocompleteProps,
  AutocompleteValue,
} from '@mui/material/Autocomplete';
import Autocomplete from '@mui/material/Autocomplete';
import stringify from 'fast-json-stable-stringify';
import type { ReactNode, Ref } from 'react';
import { useMemo } from 'react';

import { getTextDirection } from '@/utils/text-direction';

import { AlertAdornment } from './AlertAdornment';

type AutoCompleteSelectProps<
  Value,
  Label extends keyof Value = keyof Value,
  Multiple extends boolean | undefined = true,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
> = Omit<
  AutocompleteProps<
    Value,
    Multiple,
    DisableClearable,
    FreeSolo,
    ChipTypeMap['defaultComponent']
  >,
  'renderInput' | 'defaultValue' | 'value' | 'label'
> & {
  value?: Multiple extends true ? string[] : string | null;
  label: ReactNode;
  idKey?: string;
  labelKey: Label;
  onSearch?: (keywords: string) => void;
  inputLabelSx?: unknown;
  error?: boolean;
  required?: boolean;
  helperText?: string | null | undefined;
  noOptionsWarning?: string;
  isDisabledWhenEmpty?: boolean;
};

export const AutoCompleteSelect = <
  Value,
  Label extends keyof Value = keyof Value,
  Multiple extends boolean | undefined = true,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
>({
  label,
  value,
  options = [],
  idKey = 'id',
  labelKey,
  multiple,
  onSearch,
  inputLabelSx,
  error,
  required,
  helperText,
  isOptionEqualToValue = (option, value) => option?.[idKey] === value?.[idKey],
  getOptionLabel = (option) => option?.[String(labelKey)] || option?.[idKey],
  freeSolo,
  limitTags,
  loading,
  noOptionsWarning,
  isDisabledWhenEmpty = true,
  ref,
  ...rest
}: AutoCompleteSelectProps<
  Value,
  Label,
  Multiple,
  DisableClearable,
  FreeSolo
> & { ref?: Ref<HTMLDivElement> }) => {
  type Selected = AutocompleteValue<
    Value,
    Multiple,
    DisableClearable,
    FreeSolo
  >;
  const selected = useMemo(
    () =>
      (freeSolo
        ? value
        : multiple
          ? options.filter((o) => value?.includes(o[idKey]))
          : options.find((o) => o?.[idKey] === value) || null) as Selected,
    [freeSolo, value, multiple, options, idKey],
  );
  const valueDirection =
    !multiple && selected && typeof selected === 'object'
      ? getTextDirection(getOptionLabel(selected as Value))
      : undefined;

  return (
    <Autocomplete<Value, Multiple, DisableClearable, FreeSolo>
      {...rest}
      ref={ref}
      size="small"
      key={`${stringify(options)}_${stringify(value)}`}
      disabled={isDisabledWhenEmpty && !freeSolo && options.length === 0}
      defaultValue={selected}
      multiple={multiple}
      options={options}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      freeSolo={freeSolo}
      loading={loading}
      disableClearable={(rest.disableClearable ?? required) as DisableClearable}
      renderTags={(tags, getTagProps) => {
        const hiddenCount =
          limitTags && tags.length > limitTags ? tags.length - limitTags : 0;

        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {(hiddenCount ? tags.slice(0, limitTags) : tags).map(
              (option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                const label = getOptionLabel(option);

                return label && <Chip key={key} label={label} {...tagProps} />;
              },
            )}
            {hiddenCount > 0 && (
              <Chip sx={{ marginTop: '2px' }} label={`+${hiddenCount}`} />
            )}
          </Box>
        );
      }}
      renderInput={(params) => {
        const { InputProps, InputLabelProps, inputProps, ...rest } = params;

        return (
          <TextField
            {...rest}
            label={label}
            onChange={(e) => onSearch?.(e.target.value)}
            error={error}
            required={required}
            helperText={helperText}
            slotProps={{
              inputLabel: {
                ...InputLabelProps,
                ...(inputLabelSx ? { sx: inputLabelSx } : {}),
              },
              htmlInput: inputProps,
              input: {
                ...InputProps,
                dir: valueDirection,
                endAdornment: (
                  <>
                    {options.length === 0 && !loading && noOptionsWarning && (
                      <AlertAdornment title={noOptionsWarning} type="warning" />
                    )}
                    {loading && <CircularProgress color="inherit" size={20} />}
                    {InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        );
      }}
    />
  );
};
