/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import i18next from "i18next";
import { describe, expect, it } from "vitest";

import arTree from "../../public/locales/ar/translation.json";
import enTree from "../../public/locales/en/translation.json";

type TranslationTree = { [key: string]: string | TranslationTree };

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const PLACEHOLDER = /\{\{[^}]+\}\}/g;
const flatten = (tree: TranslationTree, prefix = ""): Record<string, string> =>
  Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;

      return typeof value === "string"
        ? [[path, value]]
        : Object.entries(flatten(value, path));
    }),
  );
const en = flatten(enTree);
const ar = flatten(arTree);
const baseKeys = (locale: Record<string, string>) =>
  new Set(Object.keys(locale).map((key) => key.replace(PLURAL_SUFFIX, "")));

describe("ar locale", () => {
  it("has the same translation keys as English", () => {
    expect(baseKeys(ar)).toEqual(baseKeys(en));
  });

  it("keeps interpolation placeholders", () => {
    for (const [key, value] of Object.entries(en)) {
      if (PLURAL_SUFFIX.test(key)) continue;

      expect(ar[key]?.match(PLACEHOLDER)?.sort() ?? [], key).toEqual(
        value.match(PLACEHOLDER)?.sort() ?? [],
      );
    }
  });

  it("resolves Arabic plural forms and RTL direction", async () => {
    const instance = i18next.createInstance();

    await instance.init({
      lng: "ar",
      resources: { ar: { translation: arTree } },
    });

    const key = "visual_editor.workflow_graph.issue_count";

    expect(instance.dir()).toBe("rtl");
    expect(instance.t(key, { count: 0 })).toBe("لا توجد مشكلات");
    expect(instance.t(key, { count: 1 })).toBe("مشكلة واحدة");
    expect(instance.t(key, { count: 2 })).toBe("مشكلتان");
    expect(instance.t(key, { count: 3 })).toBe("3 مشكلات");
    expect(instance.t(key, { count: 11 })).toBe("11 مشكلة");
    expect(instance.t(key, { count: 100 })).toBe("100 مشكلة");
  });
});
