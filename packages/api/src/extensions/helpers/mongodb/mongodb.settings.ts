/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import z from 'zod';

import { createSettingGroup } from '@/setting/create-setting-group';

export const MONGODB_HELPER_NAME = 'mongodb' as const;

export const mongodbSettingsSchema = z
  .strictObject({
    enabled: z.boolean().default(false).meta({ title: 'Enabled' }),
    database: z.string().min(1).default('hexabot').meta({ title: 'Database' }),
    uri: z
      .string()
      .default('')
      .meta({
        title: 'Connection URI credential',
        description:
          'Credential containing the full MongoDB connection URI. Changes require a restart.',
        'ui:widget': 'AutoCompleteWidget',
        'ui:options': {
          entity: 'Credential',
          valueKey: 'id',
          labelKey: 'name',
          enableEntityAddButton: true,
        },
      }),
  })
  .meta({
    title: 'MongoDB',
    description:
      'Shared MongoDB connection for extensions. Settings apply on restart.',
  });

declare global {
  interface RuntimeSettingRegistry {
    [MONGODB_HELPER_NAME]: typeof mongodbSettingsSchema;
  }
}

export const MongoDBSettingsGroup = createSettingGroup({
  group: MONGODB_HELPER_NAME,
  schema: mongodbSettingsSchema,
  scope: 'extension',
  extensionType: 'helper',
  extensionName: MONGODB_HELPER_NAME,
});
