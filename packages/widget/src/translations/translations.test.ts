/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { describe, expect, it } from 'vitest';

import { translations } from '.';

const collectKeys = (obj: object, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? collectKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );

describe('translations', () => {
  const enKeys = collectKeys(translations.en).sort();

  it.each(Object.keys(translations))('%s has the same keys as en', (lang) => {
    expect(
      collectKeys(translations[lang as keyof typeof translations]).sort(),
    ).toEqual(enKeys);
  });
});
