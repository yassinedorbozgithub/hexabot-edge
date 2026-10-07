/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { FC, ReactNode } from "react";

import { ApiClient } from "@/api/api.class";
import { getApiClientByEntity, useAxiosInstance } from "@/hooks/useApiClient";
import { ApiClientContext } from "@/providers/api-client/apiClient.context";

interface ApiClientContextProps {
  children: ReactNode;
}

export const ApiClientProvider: FC<ApiClientContextProps> = ({ children }) => {
  const axiosInstance = useAxiosInstance();
  const apiClient = new ApiClient(axiosInstance);

  return (
    <ApiClientContext
      value={{
        apiClient,
        getApiClientByEntity: (type) => getApiClientByEntity(type, apiClient),
      }}
    >
      {children}
    </ApiClientContext>
  );
};
