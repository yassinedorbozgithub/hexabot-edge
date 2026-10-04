/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { SettingSchemaDefinitions } from "@hexabot-ai/types";
import type { RJSFSchema } from "@rjsf/utils";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const getSchemaTitle = (
  group: string,
  schemas: SettingSchemaDefinitions,
): string | undefined => {
  const rawTitle = (schemas[group]?.schema as RJSFSchema | undefined)?.title;

  if (typeof rawTitle !== "string") {
    return undefined;
  }

  const title = rawTitle.trim();

  return title.length > 0 ? title : undefined;
};

export const resolveSettingsGroupTitle = (
  group: string,
  schemas: SettingSchemaDefinitions,
  t: TranslateFn,
): string => {
  const schemaTitle = getSchemaTitle(group, schemas);

  if (schemaTitle) {
    return schemaTitle;
  }

  return t(`title.${group}`, {
    ns: group,
    defaultValue: group,
  });
};
