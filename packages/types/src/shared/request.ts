/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

export interface PageQueryDto {
  skip?: number;
  limit?: number;
  sort?: string;
}

export interface ICsrf {
  _csrf: string;
}
