/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

/**
 * Slim `monaco-editor` entry, aliased in `vite.config.mts`.
 *
 * The package's main entry registers every language and bundles the
 * TypeScript, CSS and HTML services; the app only edits YAML, JSON and
 * JSONata (registered at runtime), so this keeps the full editor core and
 * adds just those languages.
 */

import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js";
import { languages } from "monaco-editor/esm/vs/editor/edcore.main.js";
import * as json from "monaco-editor/esm/vs/language/json/monaco.contribution.js";

export * from "monaco-editor/esm/vs/editor/edcore.main.js";
export { createWebWorker } from "monaco-editor/esm/vs/common/workers.js";
export { json };

// Same wiring as the package entry, which exposes it as `monaco.languages.json`.
Object.assign(languages, { json });
