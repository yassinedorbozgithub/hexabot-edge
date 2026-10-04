/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Menu } from "@hexabot-ai/types";

export type IMenuNode = Menu & {
  call_to_actions?: string[];
};

export type IMenuNodeFull = Menu & {
  call_to_actions?: IMenuNode[];
};
