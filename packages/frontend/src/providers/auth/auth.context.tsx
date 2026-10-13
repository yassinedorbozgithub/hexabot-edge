/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { ILoginAttributes } from '@hexabot-ai/types';
import type { UseMutationResult } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import { createContext } from 'react';

import type { User } from '@/types/user.types';

export interface AuthContextValue {
  user: User | undefined;
  isAuthenticated: boolean;
  refetchUser: () => Promise<User | undefined>;
  loginMutation: UseMutationResult<
    User,
    Error,
    [payload: ILoginAttributes],
    unknown
  >;
  logoutMutation: UseMutationResult<
    {
      status: 'ok';
    },
    Error,
    [],
    unknown
  >;
  error: Error | null;
  setIsAuthenticated: Dispatch<SetStateAction<boolean>>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  isAuthenticated: false,
  refetchUser: async () => undefined,
  loginMutation: {} as UseMutationResult<
    User,
    Error,
    [payload: ILoginAttributes],
    unknown
  >,
  logoutMutation: {} as UseMutationResult<
    {
      status: 'ok';
    },
    Error,
    [],
    unknown
  >,
  error: null,
  setIsAuthenticated: () => {},
});
