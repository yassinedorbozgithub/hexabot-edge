/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/shared/dialogs";

import { McpServerForm } from "./McpServerForm";

export const McpServerFormDialog = createFormDialog<typeof McpServerForm>(
  McpServerForm,
  {
    addText: "title.new_mcp_server",
    editText: "title.edit_mcp_server",
  },
);
