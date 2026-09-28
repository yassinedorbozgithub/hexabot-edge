/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { LicenseFeature } from '@hexabot-ai/types';
import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

import { LicenseFeatureGuard } from '../guards/license-feature.guard';

export const LICENSE_FEATURE_METADATA_KEY = 'license:features';

export const RequiresLicenseFeature = (...features: LicenseFeature[]) =>
  applyDecorators(
    SetMetadata(LICENSE_FEATURE_METADATA_KEY, features),
    UseGuards(LicenseFeatureGuard),
  );
