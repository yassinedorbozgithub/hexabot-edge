/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/app-components/dialogs";

import { SourceForm } from "./SourceForm";

export const SourceFormDialog = createFormDialog<typeof SourceForm>(
  SourceForm,
  {
    addText: "title.new_source",
    editText: "title.edit_source",
  },
);
