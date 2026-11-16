/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

/**
 * Typecheck-only fallback used when the MongoDB helper is not installed
 * (see tsconfig.typecheck.json). The real driver types win when present.
 */
export type Document = Record<string, any>;

export type Filter<_T = Document> = Record<string, any>;

export interface Db {
  [key: string]: any;
  collection<_T = Document>(name: string): any;
}

export type ClientSession = any;

export type MongoClient = any;

export declare const MongoClient: any;
