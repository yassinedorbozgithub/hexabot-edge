/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { StdIncomingMessage } from '@hexabot-ai/types';
import { IncomingMessageType } from '@hexabot-ai/types';

import type { ChannelInboundEventContext } from '@/channel/lib/inbound-events';
import type { ChannelName } from '@/channel/types';

import type { Web } from '../../../types';

import WebMessageInboundEvent from './web-message.event';

export class TextMessageInboundEvent<
  N extends ChannelName = ChannelName,
> extends WebMessageInboundEvent<
  N,
  Web.InboundMessage<Web.InboundTextMessage>
> {
  constructor(
    context: ChannelInboundEventContext<
      N,
      Web.InboundMessage<Web.InboundTextMessage>,
      SubscriberChannelDict[N]
    >,
    private readonly text: string,
  ) {
    super(context);
  }

  override getMessageType(): IncomingMessageType {
    return IncomingMessageType.text;
  }

  override toStdIncomingMessage(): StdIncomingMessage {
    return {
      type: IncomingMessageType.text,
      data: {
        text: this.text,
      },
    };
  }
}

export default TextMessageInboundEvent;
