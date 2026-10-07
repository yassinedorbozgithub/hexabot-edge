/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { NotFoundException } from '@nestjs/common';

export const isEmpty = (value: string): boolean => {
  return value === undefined || value === null || value === '';
};

/**
 * Returns the value, or throws a `NotFoundException` with the given message
 * when it is missing.
 */
export const assertFound = <T>(
  value: T | null | undefined,
  message: string,
): T => {
  if (!value) {
    throw new NotFoundException(message);
  }

  return value;
};
