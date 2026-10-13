/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { useCallback } from 'react';

import { useTranslations } from '../providers/TranslationProvider';
import type { TTranslationKeys, TTranslationVariables } from '../translations';
import { translations } from '../translations';

const resolveKey = (obj: unknown, path: string): string | undefined => {
  const value = path
    .split('.')
    .reduce<unknown>(
      (acc, part) =>
        typeof acc === 'object' && acc !== null
          ? (acc as Record<string, unknown>)[part]
          : undefined,
      obj,
    );

  return typeof value === 'string' ? value : undefined;
};
// Same `{{var}}` interpolation syntax as i18next in the frontend.
const interpolate = (text: string, variables: TTranslationVariables) =>
  text.replace(/{{\s*(\w+)\s*}}/g, (match, name: string) =>
    name in variables ? String(variables[name]) : match,
  );

export const useTranslation = () => {
  const { language } = useTranslations();
  const t = useCallback(
    (key: TTranslationKeys, variables: TTranslationVariables = {}): string => {
      const text =
        resolveKey(translations[language], key) ??
        resolveKey(translations.en, key) ??
        key;

      return interpolate(text, variables);
    },
    [language],
  );

  return { t, language };
};
