/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/app-components/dialogs";

import { LanguageForm } from "./LanguageForm";

export const LanguageFormDialog = createFormDialog<typeof LanguageForm>(
  LanguageForm,
  {
    addText: "title.new_language",
    editText: "title.edit_language",
  },
);
