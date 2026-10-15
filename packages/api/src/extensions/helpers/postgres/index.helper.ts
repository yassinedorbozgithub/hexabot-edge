/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import './postgres.dialect';

import { Injectable } from '@nestjs/common';

import BaseHelper from '@/helper/lib/base-helper';
import { HelperType } from '@/helper/types';

export const POSTGRES_HELPER_NAME = 'postgres' as const;

/**
 * Adds PostgreSQL support: ships the `pg` driver and registers the
 * `postgres` column types used by the SQL column decorators.
 */
@Injectable()
export default class PostgresHelper extends BaseHelper<
  typeof POSTGRES_HELPER_NAME
> {
  protected readonly type = HelperType.DB;

  protected readonly requiredPackages = ['pg'];

  constructor() {
    super(POSTGRES_HELPER_NAME);
  }
}
