/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { StdEventType } from '@hexabot-ai/types';

import type { ChannelInboundEventContext } from '@/channel/lib/inbound-events';
import type { ChannelName } from '@/channel/types';

import type { Web } from '../../types';

import BaseWebInboundEvent from './base-web-inbound.event';

export class TypingNotificationInboundEvent<
  N extends ChannelName = ChannelName,
> extends BaseWebInboundEvent<N> {
  constructor(
    context: ChannelInboundEventContext<
      N,
      Web.StatusTypingEvent,
      SubscriberChannelDict[N]
    >,
  ) {
    super(context);
  }

  override getEventType(): StdEventType {
    return StdEventType.typing;
  }
}

export default TypingNotificationInboundEvent;
