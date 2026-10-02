/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { describe, expect, it } from "vitest";

import { getTextDirection } from "./text-direction";

describe("getTextDirection", () => {
  it.each([
    ["admin", "ltr"],
    ["Ünïcode", "ltr"],
    ["المشتركون", "rtl"],
    ["שלום", "rtl"],
    ["123 admin", "ltr"],
    ["42 مشترك", "rtl"],
    ["(admin)", "ltr"],
  ] as const)("resolves %s to %s", (text, direction) => {
    expect(getTextDirection(text)).toBe(direction);
  });

  it.each(["", "12345", "--:--", undefined])(
    "returns undefined without a strong character (%s)",
    (text) => {
      expect(getTextDirection(text)).toBeUndefined();
    },
  );
});
