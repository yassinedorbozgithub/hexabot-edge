/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Navigate, IndexRouteObject, NonIndexRouteObject } from "react-router";

import { LayoutProps } from "@/layout";

import { APP_PAGES } from "./appPages.config";

export type RouteObjectItem = (
  Omit<IndexRouteObject, "handle"> | Omit<NonIndexRouteObject, "handle">
) & {
  handle?: Omit<LayoutProps, "children">;
};

/**
 * Routes are derived from APP_PAGES (single source of truth).
 * To add a page, edit `appPages.config.ts` — not this file.
 */
export const routes: RouteObjectItem[] = [
  ...APP_PAGES.map(({ menu: _menu, ...route }) => route),
  {
    path: "*",
    element: <Navigate replace to="/" />,
  },
];
