/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import {
  PAID_QUOTA_TIERS,
  type LicensePlan,
  type LicenseQuotaTier,
  type LicenseStatus,
  type PaidPlan,
} from '@hexabot-ai/types';

export const resolveLicenseQuotaTier = (
  status: LicenseStatus,
  plan: LicensePlan,
): LicenseQuotaTier => {
  if (status !== 'active') {
    return 'community';
  }

  return PAID_QUOTA_TIERS.has(plan as PaidPlan)
    ? (plan as PaidPlan)
    : 'community';
};
