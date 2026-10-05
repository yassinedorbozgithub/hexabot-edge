/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { isRecord } from '../utils/object';

import type { JsonValue, Settings } from './schema';

/**
 * Deep-merge workflow settings, preferring non-undefined overrides.
 * Nested objects are merged recursively to preserve defaults.
 */
export const mergeSettings = (
  base?: Partial<Settings>,
  override?: Partial<Settings>,
): Partial<Settings> => {
  const merged: Partial<Settings> = { ...(base ?? {}) };

  if (!override) {
    return merged;
  }

  for (const key of Object.keys(override)) {
    const value = override[key];
    const previous = merged[key];

    if (isRecord(previous) && isRecord(value)) {
      merged[key] = mergeSettings(
        previous as Partial<Settings>,
        value as Partial<Settings>,
      ) as JsonValue;
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
};
