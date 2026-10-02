/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { readFileSync } from "node:fs";

import i18next from "i18next";
import { describe, expect, it } from "vitest";

type TranslationTree = { [key: string]: string | TranslationTree };

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const PLACEHOLDER = /\{\{[^}]+\}\}/g;
const loadLocale = (lng: string): TranslationTree =>
  JSON.parse(
    readFileSync(
      new URL(`../../public/locales/${lng}/translation.json`, import.meta.url),
      "utf-8",
    ),
  );
const flatten = (tree: TranslationTree, prefix = ""): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return typeof value === "string"
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});
const en = flatten(loadLocale("en"));
const arTree = loadLocale("ar");
const ar = flatten(arTree);

describe("ar locale", () => {
  it("covers every English key", () => {
    const arBaseKeys = new Set(
      Object.keys(ar).map((key) => key.replace(PLURAL_SUFFIX, "")),
    );
    const missing = Object.keys(en)
      .map((key) => key.replace(PLURAL_SUFFIX, ""))
      .filter((key) => !arBaseKeys.has(key));

    expect(missing).toEqual([]);
  });

  it("has no keys unknown to the English locale", () => {
    const enBaseKeys = new Set(
      Object.keys(en).map((key) => key.replace(PLURAL_SUFFIX, "")),
    );
    const extra = Object.keys(ar).filter(
      (key) => !enBaseKeys.has(key.replace(PLURAL_SUFFIX, "")),
    );

    expect(extra).toEqual([]);
  });

  it("keeps interpolation placeholders", () => {
    const mismatches = Object.entries(en)
      .filter(([key]) => !PLURAL_SUFFIX.test(key))
      .filter(
        ([key, value]) =>
          JSON.stringify(value.match(PLACEHOLDER)?.sort() ?? []) !==
          JSON.stringify(ar[key]?.match(PLACEHOLDER)?.sort() ?? []),
      )
      .map(([key]) => key);

    expect(mismatches).toEqual([]);
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
