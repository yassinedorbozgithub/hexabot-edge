/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import Box from "@mui/material/Box";
import { ReactNode } from "react";

export function MessageCustomContent({ children }: { children?: ReactNode }) {
  return <Box component="div">{children}</Box>;
}

MessageCustomContent.displayName = "Message.CustomContent";
