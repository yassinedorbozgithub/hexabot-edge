/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { WithFullName } from "@hexabot-ai/types";

type NameableEntity = WithFullName<{
  firstName: string;
  lastName: string;
}>;

export const applyFullNameDerivedFields = <T extends NameableEntity>(
  entity: T,
): T & { fullName: string } => {
  return {
    ...entity,
    fullName: `${entity.firstName} ${entity.lastName}`,
  };
};
