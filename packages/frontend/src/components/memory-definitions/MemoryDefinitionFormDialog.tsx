/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/app-components/dialogs";

import { MemoryDefinitionForm } from "./MemoryDefinitionForm";

export const MemoryDefinitionFormDialog = createFormDialog<
  typeof MemoryDefinitionForm
>(MemoryDefinitionForm, {
  addText: "title.new_memory_definition",
  editText: "title.edit_memory_definition",
});
