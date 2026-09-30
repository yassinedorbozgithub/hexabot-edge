/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Session, SessionData } from 'express-session';
import 'http';

declare module 'http' {
  interface IncomingMessage {
    session: Session & Partial<SessionData>;
  }
}
