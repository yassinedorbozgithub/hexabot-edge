/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { HelperName } from '@/helper/types';

export type TExtensionType = 'helper';

export type THelperSettingGroup = HelperName;

export type TPruneCriteria = {
  extensionType: TExtensionType;
  groups: THelperSettingGroup[];
};
