/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/app-components/dialogs";

import { CredentialForm } from "./CredentialForm";

export const CredentialFormDialog = createFormDialog<typeof CredentialForm>(
  CredentialForm,
  {
    addText: "title.new_credential",
    editText: "title.edit_credential",
  },
);
