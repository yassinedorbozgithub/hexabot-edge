/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

export const humanizeBindingKind = (kind: string): string => {
  const normalized = kind.trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

  if (!normalized) {
    return "Binding";
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};
