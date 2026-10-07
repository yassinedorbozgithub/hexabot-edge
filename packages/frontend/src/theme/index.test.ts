/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import i18n from "i18next";
import { describe, expect, it } from "vitest";

import { getTheme, theme } from ".";

describe("getTheme", () => {
  it.each(["ltr", "rtl"] as const)("builds the %s theme", (direction) => {
    expect(getTheme(direction).direction).toBe(direction);
  });

  it("keeps the default exported theme LTR", () => {
    expect(theme).toBe(getTheme("ltr"));
    expect(theme.direction).toBe("ltr");
  });

  it("returns a stable instance per direction", () => {
    expect(getTheme("rtl")).toBe(getTheme("rtl"));
    expect(getTheme("rtl")).not.toBe(getTheme("ltr"));
  });
});

describe("i18n direction", () => {
  it.each([
    ["en", "ltr"],
    ["fr", "ltr"],
    ["ar", "rtl"],
    ["he", "rtl"],
    ["fa", "rtl"],
    ["ar-TN", "rtl"],
  ] as const)("resolves %s to %s", (lng, direction) => {
    expect(i18n.dir(lng)).toBe(direction);
  });
});
