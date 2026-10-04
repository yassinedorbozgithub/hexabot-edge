/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

/**
 * Deep clones plain data structures using `structuredClone`.
 */
export const cloneObject = <T>(value: T): T =>
  value == null ? value : structuredClone(value);
