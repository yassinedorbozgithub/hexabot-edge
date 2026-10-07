/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/shared/dialogs";

import { TranslationForm } from "./TranslationForm";

export const TranslationFormDialog = createFormDialog<typeof TranslationForm>(
  TranslationForm,
  {
    editText: "title.update_translation",
  },
);
