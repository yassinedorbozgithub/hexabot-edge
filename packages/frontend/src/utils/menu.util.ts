/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { APP_PAGES, AppPage, MENU_GROUPS } from "@/routes/appPages.config";
import { TMenu } from "@/shared/menus/DashboardSidebar/types/sidebar.types";

/**
 * Menu items are derived from APP_PAGES (single source of truth).
 * To add a page, edit `appPages.config.ts` — not this file.
 * APP_PAGES order defines submenu order within each group.
 */
export const getMenuItems = (ssoEnabled: boolean): TMenu[] => {
  const visible = APP_PAGES.filter(
    (page) => page.menu && !(page.menu.hideWhenSso && ssoEnabled),
  );
  const toMenuItem = ({ path, menu }: AppPage): TMenu => ({
    text: menu!.text,
    href: menu!.href ?? path,
    Icon: menu!.Icon,
    requires: menu!.requires,
  });

  return [
    ...visible.filter((page) => !page.menu!.group).map(toMenuItem),
    ...MENU_GROUPS.map(({ id, text, Icon }) => ({
      text,
      Icon,
      submenuItems: visible
        .filter((page) => page.menu!.group === id)
        .map(toMenuItem),
    })),
  ];
};
