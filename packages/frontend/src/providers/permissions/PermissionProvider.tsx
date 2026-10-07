/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Action } from "@hexabot-ai/types";
import { type ReactElement, type ReactNode, useCallback, useMemo } from "react";

import { EntityType } from "@/api/types";
import { useApiClientQuery } from "@/hooks/useApiClient";
import { useAuth } from "@/hooks/useAuth";
import { PermissionContext } from "@/providers/permissions/permission.context";
import { Progress } from "@/shared/displays/Progress";

interface PermissionProviderProps {
  children: ReactNode;
}

export const useUserPermissions = () => {
  const { isAuthenticated } = useAuth();

  return useApiClientQuery("getUserPermissions", {
    enabled: isAuthenticated,
  });
};

export const PermissionProvider = ({
  children,
}: PermissionProviderProps): ReactElement => {
  const { data, isLoading, isFetching } = useUserPermissions();
  const permissionMap = useMemo(
    () =>
      data?.permissions.reduce(
        (acc, { model, action }) => {
          if (!(model in acc)) {
            acc[model] = [];
          }

          acc[model]?.push(action);

          return acc;
        },
        {} as { [key in EntityType]?: Action[] },
      ),
    [data?.permissions],
  );
  const getAllowedActions = useCallback(
    (type: EntityType) => {
      return permissionMap && type in permissionMap ? permissionMap[type] : [];
    },
    [permissionMap],
  );

  if (isLoading || isFetching) return <Progress />;

  return (
    <PermissionContext
      value={{
        getAllowedActions,
      }}
    >
      {children}
    </PermissionContext>
  );
};
