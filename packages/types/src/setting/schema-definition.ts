/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { z } from "zod";

export const settingScopeSchema = z.enum(["global", "extension"]);

export const settingExtensionTypeSchema = z.enum(["action", "helper"]);

export const settingSchemaDefinitionSchema = z.object({
  schema: z.record(z.string(), z.unknown()),
  scope: settingScopeSchema,
  extensionType: settingExtensionTypeSchema.optional(),
  extensionName: z.string().optional(),
});

export const settingSchemaDefinitionsSchema = z.record(
  z.string(),
  settingSchemaDefinitionSchema,
);

export type SettingScope = z.infer<typeof settingScopeSchema>;

export type SettingExtensionType = z.infer<typeof settingExtensionTypeSchema>;

export type SettingSchemaDefinition = z.infer<
  typeof settingSchemaDefinitionSchema
>;

export type SettingSchemaDefinitions = z.infer<
  typeof settingSchemaDefinitionsSchema
>;
