/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { ColumnOptions } from 'typeorm';
import { Column } from 'typeorm';

import { resolveColumnType } from './resolve-column-type';

type EnumColumnOptions = Omit<ColumnOptions, 'type' | 'enum'> & {
  enum: NonNullable<ColumnOptions['enum']>;
};

export const EnumColumn = (options: EnumColumnOptions): PropertyDecorator => {
  if (!options?.enum) {
    throw new Error('EnumColumn requires the enum option to be provided.');
  }

  return Column({
    ...options,
    type: resolveColumnType('enum'),
  });
};
