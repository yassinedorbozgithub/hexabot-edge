/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { TFilterNestedKeysOfType } from '@hexabot-ai/types';

import en from './en/translation.json';
import fr from './fr/translation.json';

export const translations = { en, fr } as const;

export type TLanguage = keyof typeof translations;

export type TTranslationKeys = TFilterNestedKeysOfType<
  (typeof translations)['en']
> &
  TFilterNestedKeysOfType<(typeof translations)['fr']>;

export type TTranslationVariables = Record<string, string | number>;

export const isLanguage = (lang: string): lang is TLanguage =>
  Object.prototype.hasOwnProperty.call(translations, lang);
