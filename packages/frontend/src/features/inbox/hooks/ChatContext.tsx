/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { ThreadFull } from "@hexabot-ai/types";
import {
  Dispatch,
  PropsWithChildren,
  createContext,
  use,
  useState,
} from "react";

import { EntityType, Format } from "@/api/types";
import { useGet } from "@/hooks/crud/useGet";
import { resolveEntityId } from "@/shared/workflow/run-debugger/utils";
import { Subscriber } from "@/types/subscriber.types";

interface IChatContext {
  thread: ThreadFull | null;
  subscriber: Subscriber | null;
  setThreadId: Dispatch<string | null>;
}

const ChatContext = createContext<IChatContext>({
  thread: null,
  subscriber: null,
  setThreadId: () => {},
});

export const ChatProvider = ({ children }: PropsWithChildren) => {
  const [threadId, setThreadId] = useState<string | null>(null);
  const { data: threadData } = useGet(
    threadId === null ? "" : threadId,
    {
      entity: EntityType.THREAD,
      format: Format.FULL,
    },
    {
      enabled: threadId !== null,
    },
  );
  const thread = (
    threadId && threadData ? threadData : null
  ) as ThreadFull | null;
  const subscriberId = resolveEntityId(thread?.subscriber);
  const { data: subscriberData } = useGet(
    subscriberId ?? "",
    {
      entity: EntityType.SUBSCRIBER,
      format: Format.FULL,
    },
    {
      enabled: Boolean(subscriberId),
    },
  );
  const subscriber =
    subscriberData ||
    (thread?.subscriber && typeof thread.subscriber !== "string"
      ? thread.subscriber
      : null);
  const context = {
    thread,
    subscriber,
    setThreadId,
  };

  return <ChatContext value={context}>{children}</ChatContext>;
};

export const useChat = () => use(ChatContext);
