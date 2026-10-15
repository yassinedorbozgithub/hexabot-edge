/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { ColumnOptions } from 'typeorm';
import { Column } from 'typeorm';

import { resolveColumnType } from './resolve-column-type';

type JsonColumnOptions = Omit<ColumnOptions, 'type'>;

export const JsonColumn = (
  options: JsonColumnOptions = {},
): PropertyDecorator => {
  return Column({
    ...options,
    type: resolveColumnType('json'),
  });
};
