/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/app-components/dialogs";

import { ContentTypeForm } from "./ContentTypeForm";

export const ContentTypeFormDialog = createFormDialog<typeof ContentTypeForm>(
  ContentTypeForm,
  {
    addText: "title.new_content_type",
    editText: "title.edit_content_type",
  },
);
