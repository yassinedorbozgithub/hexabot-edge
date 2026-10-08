/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { SxProps, Theme } from "@mui/material/styles";
import { ReactNode } from "react";

export interface MessageModel {
  direction: "incoming" | "outgoing";
  position: "single" | "first" | "normal" | "last";
}

export interface MessageProps {
  model: MessageModel;
  avatarSpacer?: boolean;
  children?: ReactNode;
}

export interface MessageFooterProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export interface MessageListProps {
  children: ReactNode;
  loading?: boolean;
  loadingMore?: boolean;
  onYReachStart?: (container: HTMLDivElement) => void;
}

export interface MessageInputProps {
  placeholder?: string;
  disabled?: boolean;
  onSend: (text: string) => void;
}
