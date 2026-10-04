/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { SettingSchemaDefinitions } from "@hexabot-ai/types";
import { describe, expect, it, vi } from "vitest";

import { resolveSettingsGroupTitle } from "./settings.utils";

describe("settings utils", () => {
  describe("resolveSettingsGroupTitle", () => {
    it("returns localized schema title when available", () => {
      const schemas: SettingSchemaDefinitions = {
        "local-storage": {
          schema: {
            title: "Local Storage",
          },
          scope: "extension",
          extensionType: "helper",
          extensionName: "local-storage",
        },
      };
      const t = vi.fn().mockReturnValue("fallback");

      expect(resolveSettingsGroupTitle("local-storage", schemas, t)).toBe(
        "Local Storage",
      );
      expect(t).not.toHaveBeenCalled();
    });

    it("falls back to frontend translation key when schema title is missing", () => {
      const schemas: SettingSchemaDefinitions = {
        custom_group: {
          schema: {},
          scope: "extension",
        },
      };
      const t = vi.fn().mockReturnValue("Custom Group");

      expect(resolveSettingsGroupTitle("custom_group", schemas, t)).toBe(
        "Custom Group",
      );
      expect(t).toHaveBeenCalledWith("title.custom_group", {
        ns: "custom_group",
        defaultValue: "custom_group",
      });
    });
  });
});
