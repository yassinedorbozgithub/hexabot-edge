/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type {
  Subscriber as SharedSubscriber,
  SubscriberStub as SharedSubscriberStub,
  WithFullName,
} from "@hexabot-ai/types";

export type SubscriberStub = WithFullName<SharedSubscriberStub>;

export type Subscriber = WithFullName<SharedSubscriber>;
