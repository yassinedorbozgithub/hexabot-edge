/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { BaseStub } from "@hexabot-ai/types";

import type { Format } from "@/api/types";

export type IBaseSchema = BaseStub;

export interface IFormat<F = Format> {
  format: F;
}
