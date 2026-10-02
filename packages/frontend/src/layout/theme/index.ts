/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createTheme, Direction, Theme } from "@mui/material/styles";

import type {} from "@mui/lab/themeAugmentation";
import type {} from "@mui/x-data-grid/themeAugmentation";
import { dataDisplayCustomizations } from "./customizations/dataDisplay";
import { datagridCustomizations } from "./customizations/dataGrid";
import { feedbackCustomizations } from "./customizations/feedback";
import { inputsCustomizations } from "./customizations/inputs";
import { labCustomizations } from "./customizations/lab";
import { navigationCustomizations } from "./customizations/navigation";
import { surfacesCustomizations } from "./customizations/surfaces";
import { colorSchemes, shadows, shape, typography } from "./themePrimitives";

const themeOptions = {
  cssVariables: {
    colorSchemeSelector: "data-mui-color-scheme",
    cssVarPrefix: "template",
  },
  colorSchemes,
  typography,
  shadows,
  shape,
  components: {
    ...inputsCustomizations,
    ...dataDisplayCustomizations,
    ...feedbackCustomizations,
    ...navigationCustomizations,
    ...surfacesCustomizations,
    ...datagridCustomizations,
    ...labCustomizations,
  },
};
const themes: Record<Direction, Theme> = {
  ltr: createTheme({ ...themeOptions, direction: "ltr" }),
  rtl: createTheme({ ...themeOptions, direction: "rtl" }),
};

export const getTheme = (direction: Direction): Theme => themes[direction];

export const theme = themes.ltr;
