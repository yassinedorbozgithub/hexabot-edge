/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/app-components/dialogs";

import { RoleForm } from "./RoleForm";

export const RoleFormDialog = createFormDialog<typeof RoleForm>(RoleForm, {
  addText: "title.new_role",
  editText: "title.edit_role",
});
