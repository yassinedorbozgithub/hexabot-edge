/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/app-components/dialogs";

import { ContentForm } from "./ContentForm";

export const ContentFormDialog = createFormDialog<typeof ContentForm>(
  ContentForm,
  {
    addText: "title.new_content",
    editText: "title.edit_node",
  },
);
