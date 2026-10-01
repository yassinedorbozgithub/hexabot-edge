/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

export const GROUP_BASE_ALPHA = 0.22;
export const GROUP_ALPHA_DECAY_PER_LEVEL = 0.05;
export const GROUP_MIN_ALPHA = 0.08;
export const BRANCH_SPREAD_GAP = 32;
export const EXTRA_NODE_OFFSET = 128;
export const EXTRA_NODE_GAP = 32;
export const ELK_NODE_NODE_SPACING = 64;
// Matches "elk.layered.spacing.nodeNodeBetweenLayers" set on the ELK graph, so
// nodes we position ourselves (e.g. a shared convergence node pushed to clear
// real branch content) get the same flow-axis gap ELK uses everywhere else.
export const FLOW_LAYER_GAP = 128;

export const getGroupBackgroundAlpha = (level: number) =>
  Math.max(
    GROUP_MIN_ALPHA,
    GROUP_BASE_ALPHA - level * GROUP_ALPHA_DECAY_PER_LEVEL,
  );
