/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { IconButton, styled } from "@mui/material";
import { X as CloseIcon } from "lucide-react";
import { MaterialDesignContent, useSnackbar } from "notistack";

// Logical toast action spacing so the close button also works in RTL.
const SnackbarContent = styled(MaterialDesignContent)({
  "& > #notistack-snackbar + div": {
    marginInline: "auto -8px",
    paddingInline: "16px 0",
  },
});

export const snackbarComponents = {
  default: SnackbarContent,
  success: SnackbarContent,
  error: SnackbarContent,
  warning: SnackbarContent,
  info: SnackbarContent,
};

export const SnackbarCloseButton = ({
  snackbarKey,
}: {
  snackbarKey: string | number;
}) => {
  const { closeSnackbar } = useSnackbar();

  return (
    <IconButton onClick={() => closeSnackbar(snackbarKey)} size="small">
      <CloseIcon />
    </IconButton>
  );
};
