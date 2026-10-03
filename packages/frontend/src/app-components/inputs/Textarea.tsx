/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { TextField, TextFieldProps } from "@mui/material";

export const Textarea = (props: TextFieldProps) => (
  <TextField multiline minRows="2" {...props} />
);
