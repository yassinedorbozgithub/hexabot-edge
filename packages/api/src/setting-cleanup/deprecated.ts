/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { SettingCleanupModule } from './setting-cleanup.module';
import { SettingCleanupService } from './setting-cleanup.service';
import { TExtensionType, THelperSettingGroup, TPruneCriteria } from './types';

/** @deprecated Use `SettingCleanupModule`. */
export const ExtensionModule = SettingCleanupModule;

/** @deprecated Use `SettingCleanupService`. */
export const CleanupService = SettingCleanupService;

/** @deprecated Use `TPruneCriteria`. */
export type TCriteria = TPruneCriteria;

/** @deprecated Use `TExtensionType`. */
export type TExtension = TExtensionType;

/** @deprecated Use `THelperSettingGroup`. */
export type TExtractGroup = THelperSettingGroup;
