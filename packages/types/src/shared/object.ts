/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

export const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

export const cloneWithPrototype = (
  value: Record<string, unknown>,
): Record<string, unknown> => {
  return Object.assign(Object.create(Object.getPrototypeOf(value)), value);
};

export type TFilterNestedKeysOfType<T, U = string> = T extends object
  ? {
      [K in keyof T]: T[K] extends U
        ? `${K & string}`
        : T[K] extends object
          ? Array<any> extends T[K]
            ? never
            : `${K & string}.${TFilterNestedKeysOfType<T[K], U>}`
          : never;
    }[keyof T]
  : never;
