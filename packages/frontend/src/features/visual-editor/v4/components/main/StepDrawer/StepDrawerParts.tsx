/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { Save } from "lucide-react";

import { useTranslate } from "@/hooks/useTranslate";
import { DrawerPrimaryFooterAction } from "@/shared/drawers/DrawerPrimaryFooterAction";

export type StepOption<T extends string> = {
  value: T;
  label: string;
  description: string;
};

export const StepDrawerHeader = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <Box minWidth={0}>
    <Typography variant="subtitle1" noWrap>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {description}
    </Typography>
  </Box>
);

export const StepDrawerSaveFooter = ({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) => {
  const { t } = useTranslate();
  const saveLabel = t("button.save");

  return (
    <DrawerPrimaryFooterAction
      label={saveLabel}
      ariaLabel={saveLabel}
      onClick={onClick}
      disabled={disabled}
      startIcon={<Save size={18} />}
    />
  );
};

export const StepOptionRadioGroup = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: StepOption<T>[];
  onChange: (value: T) => void;
}) => (
  <FormControl component="fieldset" fullWidth>
    <FormLabel component="legend">{label}</FormLabel>
    <RadioGroup
      value={value}
      onChange={(event) => {
        const option = options.find(
          (option) => option.value === event.target.value,
        );

        if (option) {
          onChange(option.value);
        }
      }}
    >
      <Stack spacing={1} mt={1}>
        {options.map((option) => (
          <Box
            key={option.value}
            border={(theme) => `1px solid ${theme.palette.divider}`}
            borderRadius={1}
            px={1}
            py={0.5}
          >
            <FormControlLabel
              value={option.value}
              control={<Radio size="small" />}
              label={option.label}
            />
            <Typography variant="body2" color="text.secondary" ml={4}>
              {option.description}
            </Typography>
          </Box>
        ))}
      </Stack>
    </RadioGroup>
  </FormControl>
);
