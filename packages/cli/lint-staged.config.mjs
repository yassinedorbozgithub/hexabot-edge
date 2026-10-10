/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { defineConfig } from "lint-staged/config";

export default defineConfig({
  "*.ts": "eslint --fix --config eslint.config-staged.cjs",
  "*.{css,json,md,yml,yaml}": "prettier --write",
});
