/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Setting } from "@hexabot-ai/types";
import { createContext, type ReactElement, ReactNode } from "react";

import { EntityType } from "@/api/types";
import { useFind } from "@/hooks/crud/useFind";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/shared/displays/Progress";

export const SettingsContext = createContext<{
  settings: { [key: string]: Setting[] } | undefined;
}>({ settings: undefined });

SettingsContext.displayName = "SettingsContext";

interface SettingsProviderProps {
  children: ReactNode;
}

export const useLoadSettings = () => {
  const { isAuthenticated } = useAuth();
  const { data: settings, ...rest } = useFind(
    { entity: EntityType.SETTING },
    {
      hasCount: false,
    },
    {
      enabled: isAuthenticated,
    },
  );

  return {
    ...rest,
    data:
      settings?.reduce((acc, curr) => {
        const group = acc[curr.group] || [];

        group.push(curr);
        acc[curr.group] = group;

        return acc;
      }, {}) || {},
  };
};

export const SettingsProvider = ({
  children,
}: SettingsProviderProps): ReactElement => {
  const { data, isLoading } = useLoadSettings();

  if (isLoading) return <Progress />;

  return (
    <SettingsContext
      value={{
        settings: data,
      }}
    >
      {children}
    </SettingsContext>
  );
};
