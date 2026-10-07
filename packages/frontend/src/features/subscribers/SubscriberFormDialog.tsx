/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createFormDialog } from "@/shared/dialogs";

import { SubscriberForm } from "./SubscriberForm";

export const SubscriberFormDialog = createFormDialog<typeof SubscriberForm>(
  SubscriberForm,
  {
    editText: "title.manage_subscribers",
  },
);
