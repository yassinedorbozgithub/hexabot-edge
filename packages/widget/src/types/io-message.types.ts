/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type {
  IOIncomingMessage as ServerIOIncomingMessage,
  IOOutgoingMessage as ServerIOOutgoingMessage,
} from "@hexabot-ai/types";

// The shared contracts are named from the server's point of view: what the
// server sends out is what the widget receives, and vice versa.
export type IOIncomingMessage<T = unknown> = ServerIOOutgoingMessage<T>;

export type IOOutgoingMessage<T = unknown> = ServerIOIncomingMessage<T>;
