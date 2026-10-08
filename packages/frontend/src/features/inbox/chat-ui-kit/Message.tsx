/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import Box from "@mui/material/Box";
import { alpha, useTheme } from "@mui/material/styles";
import React, { ReactElement, ReactNode } from "react";

import { MessageCustomContent } from "./MessageCustomContent";
import { MessageFooter } from "./MessageFooter";
import { MessageProps } from "./types";

const AVATAR_SLOT_WIDTH = 42;
const AVATAR_SPACER_WIDTH = 50;
// Matched by name: the shared Avatar imports this module indirectly.
const isAvatarElement = (element: ReactElement) =>
  (element.type as { displayName?: string }).displayName === "Avatar";

type MessageComponent = ((props: MessageProps) => React.JSX.Element) & {
  CustomContent: typeof MessageCustomContent;
  Footer: typeof MessageFooter;
};

function MessageBase({
  model: { direction, position },
  avatarSpacer = false,
  children,
}: MessageProps) {
  const theme = useTheme();
  const childrenArray = React.Children.toArray(children).filter(
    React.isValidElement,
  ) as ReactElement[];

  let avatarElement: ReactElement | undefined;
  const footerElements: ReactElement[] = [];
  const contentElements: ReactNode[] = [];

  childrenArray.forEach((element) => {
    if (!avatarElement && isAvatarElement(element)) {
      avatarElement = element;

      return;
    }

    if (element.type === MessageFooter) {
      footerElements.push(element);

      return;
    }

    contentElements.push(element);
  });

  const isOutgoing = direction === "outgoing";
  const darkIncomingBackground = theme.vars
    ? `rgba(${theme.vars.palette.text.primaryChannel} / 0.14)`
    : alpha(theme.palette.text.primary, 0.14);
  const baseBorderRadius =
    typeof theme.shape.borderRadius === "number"
      ? theme.shape.borderRadius + 4
      : 12;
  const radius = `${baseBorderRadius}px`;
  const isSingle = position === "single";
  const isLast = position === "last";

  return (
    <Box
      component="section"
      sx={{
        display: "flex",
        flexDirection: isOutgoing ? "row-reverse" : "row",
        alignItems: "flex-end",
        width: "fit-content",
        maxWidth: { xs: "92%", sm: "85%" },
        mt: 2,
        [isOutgoing ? "marginInlineStart" : "marginInlineEnd"]: "auto",
        ...(avatarSpacer && {
          [isOutgoing ? "marginInlineEnd" : "marginInlineStart"]:
            `${AVATAR_SPACER_WIDTH}px`,
        }),
      }}
    >
      {avatarElement && (
        <Box
          component="div"
          sx={{
            width: AVATAR_SLOT_WIDTH,
            display: "flex",
            justifyContent: "flex-end",
            [isOutgoing ? "marginInlineStart" : "marginInlineEnd"]: 1,
          }}
        >
          {avatarElement}
        </Box>
      )}
      <Box
        component="div"
        sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}
      >
        <Box
          component="div"
          sx={{
            ...(isOutgoing
              ? {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                }
              : {
                  bgcolor: theme.palette.grey[100],
                  color: "text.primary",
                  ...theme.applyStyles("dark", {
                    bgcolor: darkIncomingBackground,
                  }),
                }),
            p: 2,
            borderStartStartRadius: isOutgoing ? radius : 0,
            borderStartEndRadius: !isOutgoing || isSingle ? radius : 0,
            borderEndStartRadius: isOutgoing || isSingle || isLast ? radius : 0,
            borderEndEndRadius: isOutgoing === isLast ? radius : 0,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            ...theme.typography.body2,
            lineHeight: 1.4,
          }}
        >
          {contentElements}
        </Box>
        {footerElements}
      </Box>
    </Box>
  );
}

MessageBase.displayName = "Message";

export const Message = Object.assign(MessageBase, {
  CustomContent: MessageCustomContent,
  Footer: MessageFooter,
}) as MessageComponent;
