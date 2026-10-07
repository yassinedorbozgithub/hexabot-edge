/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/shared/dialogs";

import { EditUserForm } from "./EditUserForm";

export const EditUserFormDialog = createFormDialog<typeof EditUserForm>(
  EditUserForm,
  {
    editText: "title.manage_roles",
  },
);
