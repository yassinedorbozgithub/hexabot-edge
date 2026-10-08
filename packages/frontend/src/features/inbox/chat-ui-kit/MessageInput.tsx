/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { SendHorizontal } from "lucide-react";
import React, { useRef, useState } from "react";

import { MessageInputProps } from "./types";

export function MessageInput({
  placeholder = "",
  disabled = false,
  onSend,
}: MessageInputProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const send = () => {
    const editor = editorRef.current;
    const text = editor?.textContent || "";

    if (!editor || !text) return;

    onSend(text);
    editor.innerHTML = "";
    setIsEmpty(true);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 1,
        px: 1,
        py: 1,
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          bgcolor: disabled ? "action.disabledBackground" : "action.hover",
          border: (theme) => `1px solid ${theme.palette.divider}`,
          borderRadius: 1.5,
          px: 1.25,
          py: 0.75,
        }}
      >
        <Box sx={{ maxHeight: 88, overflowY: "auto" }}>
          <Box
            ref={editorRef}
            component="div"
            role="textbox"
            aria-multiline="true"
            aria-disabled={disabled}
            contentEditable={!disabled}
            suppressContentEditableWarning
            data-placeholder={placeholder}
            onInput={() => setIsEmpty(!editorRef.current?.textContent)}
            onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            sx={{
              typography: "body2",
              minHeight: "1.4em",
              lineHeight: 1.4,
              outline: 0,
              border: 0,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              color: disabled ? "text.disabled" : "text.primary",
              "&:empty:before": {
                content: "attr(data-placeholder)",
                color: "text.disabled",
                display: "block",
                cursor: "text",
              },
            }}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-end" }}>
        <IconButton size="small" disabled={disabled || isEmpty} onClick={send}>
          <SendHorizontal size={20} />
        </IconButton>
      </Box>
    </Box>
  );
}
