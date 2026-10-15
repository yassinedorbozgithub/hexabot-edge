/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { ColumnType } from 'typeorm';

import { config } from '@/config';

import type { ColumnKind } from '../dialects';
import { getDialect } from '../dialects';

export const resolveColumnType = (kind: ColumnKind): ColumnType => {
  const dbType = config.database.type;
  const { columnTypes } = getDialect(dbType);

  if (!columnTypes) {
    throw new Error(`SQL column decorators do not support ${dbType}.`);
  }

  return columnTypes[kind];
};
