/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import Box from "@mui/material/Box";

import { MessageFooterProps } from "./types";

export function MessageFooter({ children, sx }: MessageFooterProps) {
  return (
    <Box
      component="div"
      sx={[
        {
          display: "flex",
          typography: "caption",
          mt: 0.5,
          mx: 0.5,
          color: "text.secondary",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

MessageFooter.displayName = "Message.Footer";
