/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type {
  Message as MessageEntity,
  MessageFull,
  StdIncomingMessage,
  StdOutgoingMessage,
} from "@hexabot-ai/types";
import { IncomingMessageType, OutgoingMessageType } from "@hexabot-ai/types";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { Theme, alpha } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import DOMPurify from "dompurify";
import { type LucideIcon, Menu, Reply } from "lucide-react";
import { marked } from "marked";
import React, { ReactNode } from "react";

import { ROUTES } from "@/api/api.class";
import { EntityType } from "@/api/types";
import { buildURL } from "@/utils/URL";

import { Message, MessageModel } from "../chat-ui-kit";
import { MessageAttachmentsViewer } from "../components/AttachmentViewer";
import { Carousel } from "../components/Carousel";
import GeolocationMessage from "../components/GeolocationMessage";

const getRefId = (ref?: string | { id: string } | null) =>
  typeof ref === "string" ? ref : ref?.id;

/**
 * @description Two messages are concidered from the same source if they have equal properties of sender, sentBy and recipient.
 */
export function isSubsequent(
  currMessage: MessageFull | MessageEntity | undefined,
  nextMessage: MessageFull | MessageEntity | undefined,
): boolean {
  if (!currMessage) return false;

  if (!nextMessage) return false;

  return (
    getRefId(currMessage.sender) === getRefId(nextMessage.sender) &&
    currMessage.sentBy === nextMessage.sentBy &&
    getRefId(currMessage.recipient) === getRefId(nextMessage.recipient)
  );
}

/**
 * @description Converts markdown to safe HTML for rendering in chat messages
 */
function formatMessageText(text: string, theme: Theme): ReactNode {
  try {
    const safeHtml = DOMPurify.sanitize(
      marked.parse(text, { async: false, gfm: true, breaks: true }),
    );

    return (
      <Box
        component="div"
        dangerouslySetInnerHTML={{
          __html: safeHtml,
        }}
        sx={{
          whiteSpace: "normal",
          "& p": {
            margin: theme.spacing(0.5, 0),
          },
          "& p:first-of-type": {
            marginTop: 0,
          },
          "& p:last-of-type": {
            marginBottom: 0,
          },
          "& ul, & ol": {
            margin: theme.spacing(0.5, 0),
            paddingLeft: theme.spacing(2.5),
          },
          "& pre": {
            margin: theme.spacing(0.5, 0),
            padding: theme.spacing(0.5, 0.75),
            borderRadius: theme.shape.borderRadius,
            overflowX: "auto",
            backgroundColor: alpha(
              theme.palette.text.primary,
              theme.palette.mode === "dark" ? 0.2 : 0.08,
            ),
          },
          "& code": {
            fontSize: "0.9em",
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          },
          "& blockquote": {
            margin: theme.spacing(0.5, 0),
            paddingLeft: theme.spacing(1.5),
            borderLeft: `2px solid ${theme.palette.divider}`,
          },
          "& a": {
            color: "inherit",
            textDecoration: "underline",
            wordBreak: "break-word",
          },
          "& a:hover": {
            opacity: 0.8,
          },
        }}
      />
    );
  } catch (_error) {
    return (
      <Box
        component="div"
        sx={{
          whiteSpace: "normal",
        }}
      >
        {text}
      </Box>
    );
  }
}
/**
 * @description this function constructs the message children basen on message type
 */
export function getMessageContent(
  messageEntity: MessageFull | MessageEntity,
  theme: Theme,
  formattedTimestamp?: string,
  normalizedTimestamp?: string,
): ReactNode[] {
  const message = messageEntity.message;
  const content: ReactNode[] = [];
  const outgoingTimestampColor = theme.vars
    ? `rgba(${theme.vars.palette.primary.contrastTextChannel} / 0.75)`
    : alpha(theme.palette.primary.contrastText, 0.75);
  const incomingTimestampColor = theme.vars
    ? `rgba(${theme.vars.palette.text.primaryChannel} / 0.65)`
    : alpha(theme.palette.text.primary, 0.65);
  const wrapWithTooltip = (
    child: React.ReactElement,
    key: string,
  ): ReactNode => {
    if (!normalizedTimestamp) return child;

    return (
      <Tooltip
        key={key}
        title={normalizedTimestamp}
        arrow
        enterDelay={300}
        leaveDelay={150}
      >
        {child}
      </Tooltip>
    );
  };
  const renderTimestamp = (keySuffix: string) =>
    formattedTimestamp
      ? wrapWithTooltip(
          <Box
            component="span"
            key={`timestamp-${keySuffix}`}
            sx={{
              fontSize: theme.typography.pxToRem(10),
              marginTop: theme.spacing(0.75),
              userSelect: "none",
              float: messageEntity.recipient ? "right" : "left",
              color: messageEntity.recipient
                ? outgoingTimestampColor
                : incomingTimestampColor,
            }}
          >
            {formattedTimestamp}
          </Box>,
          `timestamp-${keySuffix}`,
        )
      : null;
  const pushContent = (key: string, node: ReactNode) =>
    content.push(
      <Message.CustomContent key={key}>
        {node}
        {renderTimestamp(key)}
      </Message.CustomContent>,
    );

  let chips: { title: string }[] = [];
  let ChipsIcon: LucideIcon | null = null;
  const normalizeChips = (items: unknown[]): { title: string }[] =>
    items.flatMap((item) => {
      const title =
        item &&
        typeof item === "object" &&
        "title" in item &&
        typeof (item as { title?: unknown }).title === "string"
          ? (item as { title: string }).title
          : undefined;

      return title ? [{ title }] : [];
    });

  if (!messageEntity.recipient) {
    const incomingMessage = message as StdIncomingMessage;

    switch (incomingMessage.type) {
      case IncomingMessageType.location:
        pushContent(
          `location-${messageEntity.id}`,
          <GeolocationMessage message={incomingMessage} />,
        );
        break;
      case IncomingMessageType.attachment:
        pushContent(
          `attachment-${messageEntity.id}`,
          <MessageAttachmentsViewer message={incomingMessage} />,
        );
        break;
      case IncomingMessageType.text:
      case IncomingMessageType.postback:
      case IncomingMessageType.quickReply:
        pushContent(
          messageEntity.id,
          formatMessageText(incomingMessage.data.text, theme),
        );
        break;
      default:
        break;
    }
  } else {
    const outgoingMessage = message as StdOutgoingMessage;

    switch (outgoingMessage.type) {
      case OutgoingMessageType.text:
        pushContent(
          messageEntity.id,
          formatMessageText(outgoingMessage.data.text, theme),
        );
        break;
      case OutgoingMessageType.quickReply:
        pushContent(
          messageEntity.id,
          formatMessageText(outgoingMessage.data.text, theme),
        );
        chips = normalizeChips(outgoingMessage.data.quickReplies);
        ChipsIcon = Reply;
        break;
      case OutgoingMessageType.buttons:
        pushContent(
          messageEntity.id,
          formatMessageText(outgoingMessage.data.text, theme),
        );
        chips = normalizeChips(outgoingMessage.data.buttons);
        ChipsIcon = Menu;
        break;
      case OutgoingMessageType.attachment:
        pushContent(
          `attachment-${messageEntity.id}`,
          <MessageAttachmentsViewer message={outgoingMessage} />,
        );
        chips = normalizeChips(outgoingMessage.data.quickReplies ?? []);
        ChipsIcon = Reply;
        break;
      case OutgoingMessageType.list:
      case OutgoingMessageType.carousel:
        pushContent(
          `carousel-${messageEntity.id}`,
          <Carousel message={outgoingMessage} />,
        );
        break;
      default:
        break;
    }
  }

  if (chips.length > 0 && ChipsIcon) {
    content.push(
      <Message.Footer sx={{ mt: 0.75 }} key={`chips-${messageEntity.id}`}>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          useFlexGap
          flexWrap="wrap"
        >
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              color: "text.disabled",
            }}
          >
            <ChipsIcon size={16} />
          </Box>
          {chips.map((chip) => (
            <Chip size="small" key={chip.title} label={chip.title} />
          ))}
        </Stack>
      </Message.Footer>,
    );
  }

  return content;
}

/**
 * @description Returns the avatar of the subscriber
 */
export function getAvatarSrc(
  apiUrl: string,
  entity: EntityType.USER | EntityType.SUBSCRIBER,
  id?: string,
) {
  return buildURL(apiUrl, `${ROUTES[entity]}/${id || "bot"}/profile_pic`);
}

export function getMessagePosition(
  currentMessage: MessageFull | MessageEntity,
  previousMessage?: MessageFull | MessageEntity,
  nextMessage?: MessageFull | MessageEntity,
): MessageModel["position"] {
  const joinsPrevious = isSubsequent(previousMessage, currentMessage);
  const joinsNext = isSubsequent(currentMessage, nextMessage);

  if (joinsPrevious) return joinsNext ? "normal" : "last";

  return joinsNext ? "first" : "single";
}
