/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { UserPlus } from "lucide-react";

import { createFormDialog } from "@/app-components/dialogs";

import { CreateUserForm } from "./CreateUserForm";

export const CreateUserFormDialog = createFormDialog<typeof CreateUserForm>(
  CreateUserForm,
  {
    addText: "button.add",
    confirmButtonProps: { startIcon: <UserPlus /> },
  },
);
