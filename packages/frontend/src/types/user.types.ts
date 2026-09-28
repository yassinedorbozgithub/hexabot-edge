/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type {
  ILicense,
  User as SharedUser,
  UserStub as SharedUserStub,
} from "@hexabot-ai/types";

export type UserStub = SharedUserStub & {
  fullName?: string;
  license?: ILicense;
};

export interface IProfileAttributes extends Partial<UserStub> {
  password?: string;
  password2?: string;
  avatar?: File | null;
}

export type User = SharedUser & {
  fullName?: string;
  license?: ILicense;
};
