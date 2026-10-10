/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { WORKFLOW_TRANSFER_RESOURCE_KIND_PATTERN } from '@hexabot-ai/types';

import type {
  WorkflowResourceRefKind,
  WorkflowResourceRefMetadata,
} from './types';

export const WORKFLOW_RESOURCE_REF_METADATA_KEY = 'x-hexabot:resourceRef';

export const workflowResourceRef = (
  kind: WorkflowResourceRefKind,
): {
  [WORKFLOW_RESOURCE_REF_METADATA_KEY]: WorkflowResourceRefMetadata;
} => ({
  [WORKFLOW_RESOURCE_REF_METADATA_KEY]: { kind },
});

export const isWorkflowResourceRefKind = (
  value: unknown,
): value is WorkflowResourceRefKind => {
  return (
    typeof value === 'string' &&
    WORKFLOW_TRANSFER_RESOURCE_KIND_PATTERN.test(value)
  );
};
