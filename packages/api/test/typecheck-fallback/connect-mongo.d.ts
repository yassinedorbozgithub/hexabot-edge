/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

/**
 * Typecheck-only fallback used when the MongoDB helper is not installed
 * (see tsconfig.typecheck.json). The real package types win when present.
 */
declare const MongoStore: any;

export = MongoStore;
