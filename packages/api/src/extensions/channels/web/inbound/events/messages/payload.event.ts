/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type {
  IncomingMessageType,
  Payload,
  StdIncomingMessage,
} from '@hexabot-ai/types';

import type { ChannelInboundEventContext } from '@/channel/lib/inbound-events';
import type { ChannelName } from '@/channel/types';

import type { Web } from '../../../types';

import WebMessageInboundEvent from './web-message.event';

export abstract class PayloadMessageInboundEvent<
  N extends ChannelName = ChannelName,
> extends WebMessageInboundEvent<
  N,
  Web.InboundMessage<Web.IncomingPayloadMessage>
> {
  constructor(
    context: ChannelInboundEventContext<
      N,
      Web.InboundMessage<Web.IncomingPayloadMessage>,
      SubscriberChannelDict[N]
    >,
    private readonly messageType:
      IncomingMessageType.postback | IncomingMessageType.quickReply,
    private readonly payloadValue: string,
    private readonly text: string,
  ) {
    super(context);
  }

  override getMessageType(): IncomingMessageType {
    return this.messageType;
  }

  override getPayload(): Payload | string {
    return this.payloadValue;
  }

  override toStdIncomingMessage(): StdIncomingMessage {
    return {
      type: this.messageType,
      data: {
        payload: this.payloadValue,
        text: this.text,
      },
    };
  }
}

export default PayloadMessageInboundEvent;
