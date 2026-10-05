/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

/** Plain object guard that rejects arrays and null. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Deep-clone a value with `structuredClone`, falling back to a JSON round-trip
 * and finally to a shallow copy for values neither can handle.
 */
export const cloneValue = <T>(value: T): T => {
  if (value === undefined || value === null) {
    return value;
  }

  try {
    return structuredClone(value);
  } catch {
    // Fall through to JSON clone below.
  }

  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    if (Array.isArray(value)) {
      return [...value] as T;
    }

    return isRecord(value) ? ({ ...value } as T) : value;
  }
};

/** Resolve a nested value by path; array levels only accept numeric keys. */
export const getValueAtPath = (
  value: unknown,
  path: Array<string | number>,
): unknown =>
  path.reduce<unknown>((acc, key) => {
    if (Array.isArray(acc)) {
      return typeof key === 'number' ? acc[key] : undefined;
    }

    return isRecord(acc) ? acc[String(key)] : undefined;
  }, value);
