/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { z } from "zod";

export const helperMetadataSchema = z.object({
  name: z.string(),
});

export type HelperMetadata = z.infer<typeof helperMetadataSchema>;
