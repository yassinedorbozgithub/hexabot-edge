/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { MenuType } from "@hexabot-ai/types";

export interface IMenuNode {
  type: MenuType;
  url?: string;
  title: string;
  payload?: string;
  _parent?: IMenuNode;
  call_to_actions?: IMenuNode[];
}
