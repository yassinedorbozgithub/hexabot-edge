/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

const FIRST_STRONG_CHAR = new RegExp(
  "([\\u0590-\\u08FF\\uFB1D-\\uFDFF\\uFE70-\\uFEFC])|([A-Za-z\\u00C0-\\u02AF\\u0370-\\u03FF\\u0400-\\u04FF])",
);

export const getTextDirection = (text?: string): "rtl" | "ltr" | undefined => {
  const match = text?.match(FIRST_STRONG_CHAR);

  if (!match) return undefined;

  return match[1] ? "rtl" : "ltr";
};
