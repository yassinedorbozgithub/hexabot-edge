/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { defineConfig } from "lint-staged/config";

// Staged files are matched to the closest lint-staged config, so this one only
// covers files outside packages that have their own (root files, docker/,
// .github/, packages/eslint-config, packages/tsconfig).
export default defineConfig({
  "*.{css,json,md,yml,yaml}": "prettier --write",
});
