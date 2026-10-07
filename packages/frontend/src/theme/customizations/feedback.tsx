/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Components, Theme } from "@mui/material/styles";
import { tooltipClasses } from "@mui/material/Tooltip";

import { getNotistackVariantStyles } from "@/utils/toast.utils";

import { gray } from "../themePrimitives";

const ZOOM_AWARE_TOOLTIP_POPPER_CLASSNAME = "zoom-aware-tooltip";
const ZOOM_AWARE_TOOLTIP_BG_COLOR = "rgba(97, 97, 97, 0.92)";
const ZOOM_AWARE_TOOLTIP_MAX_WIDTH_PX = 220;
const ZOOM_AWARE_TOOLTIP_CONTENT_CLASSNAME = "zoom-aware-tooltip__content";

/* eslint-disable import/prefer-default-export */
export const feedbackCustomizations: Components<Theme> = {
  MuiAlert: {
    styleOverrides: {
      standardError: {
        "&.custom-alert": {
          color: "main",
          svg: {
            fill: "transparent",
          },
        },
      },
      root: ({ theme }) => ({
        "&.custom-alert": {
          textAlign: "center",
          background: "transparent",
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "300px",
          position: "relative",
          color: theme.palette.grey[500],
          svg: {
            fill: theme.palette.grey[500],
          },
          "& .MuiAlert-icon ": {
            marginRight: 0,
            padding: 0,
          },
        },
      }),
    },
  },
  MuiDialog: {
    styleOverrides: {
      root: ({ theme }) => ({
        "& .MuiDialog-paper": {
          borderRadius: "10px",
          border: "1px solid",
          borderColor: (theme.vars || theme).palette.divider,
        },
      }),
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      spacing: {
        "& > :not(style) ~ :not(style)": {
          marginLeft: 0,
          marginInlineStart: 8,
        },
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        "& .MuiIconButton-root": {
          top: "10px",
          insetInlineEnd: "10px",
          position: "absolute",
          borderRadius: "50%",
        },
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: ({ theme }) => ({
        height: 8,
        borderRadius: 8,
        backgroundColor: gray[200],
        ...theme.applyStyles("dark", {
          backgroundColor: gray[800],
        }),
      }),
    },
  },
  MuiTooltip: {
    styleOverrides: {
      popper: ({ theme }) => ({
        [`&.${ZOOM_AWARE_TOOLTIP_POPPER_CLASSNAME}`]: {
          pointerEvents: "none",
          zIndex: theme.zIndex.tooltip,
          [`& .${tooltipClasses.tooltip}`]: {
            backgroundColor: ZOOM_AWARE_TOOLTIP_BG_COLOR,
            overflow: "visible",
          },
          [`& .${ZOOM_AWARE_TOOLTIP_CONTENT_CLASSNAME}`]: {
            display: "inline-block",
            maxWidth: `${ZOOM_AWARE_TOOLTIP_MAX_WIDTH_PX}px`,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
          [`& .${tooltipClasses.arrow}`]: {
            color: ZOOM_AWARE_TOOLTIP_BG_COLOR,
          },
        },
      }),
    },
  },
  MuiCssBaseline: {
    styleOverrides: (theme) => {
      return `${getNotistackVariantStyles(theme)}
        .notistack-MuiContent > #notistack-snackbar + div {
          margin-inline: auto -8px;
          padding-inline: 16px 0;
        }
      `;
    },
  },
};
