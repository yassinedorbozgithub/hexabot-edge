/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/app-components/dialogs";

import { MenuForm } from "./MenuForm";

export const MenuFormDialog = createFormDialog<typeof MenuForm>(MenuForm, {
  addText: "title.add_menu_item",
  editText: "title.edit_menu_item",
});
