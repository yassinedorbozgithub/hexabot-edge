/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { TFilterNestedKeysOfType } from "@hexabot-ai/types";
import type { TOptionsBase } from "i18next";
import type { FieldPathByValue } from "react-hook-form";

import type en from "../../public/i18n/en.translations.json";
import type fr from "../../public/i18n/fr.translations.json";

export type TTranslation = typeof en & typeof fr;

export type TTranslationPrefix = keyof TTranslation;

export type TTranslationKeys = FieldPathByValue<typeof en, string> &
  FieldPathByValue<typeof fr, string>;

export type TTranslationSubKeys<P extends TTranslationPrefix> =
  FieldPathByValue<TTranslation[P], string>;

export type TNestedTranslation<T extends keyof TTranslation> =
  TFilterNestedKeysOfType<TTranslation[T]>;

export type TOptionsBaseExtended = TOptionsBase & { 0?: string | number };

export type TTranslateProps = {
  <K extends keyof TTranslation, N = TNestedTranslation<K>>(
    prop1: K,
    prop2: N & TNestedTranslation<K>,
    prop3?: TOptionsBase & object,
  ): string;
  <K extends TTranslationKeys>(
    prop1: K,
    prop2?: TOptionsBaseExtended & object,
  ): string;
};
