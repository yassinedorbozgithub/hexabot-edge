/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { SubscriberOrmEntity } from '@/chat/entities/subscriber.entity';
import type { InferPlain } from '@/utils/types/dto.types';

declare module 'express-session' {
  interface SessionUser {
    id?: string;
    first_name?: string;
    last_name?: string;
  }

  interface SessionData {
    cookie: Cookie;
    csrfSecret?: string;
    passport?: {
      user?: SessionUser;
    };
    web?: {
      profile?: InferPlain<SubscriberOrmEntity>;
      threadId?: string;
      sourceId?: string;
    };
    anonymous?: boolean;
  }
}
