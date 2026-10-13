/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TranslationProvider } from '../providers/TranslationProvider';
import type { TTranslationKeys } from '../translations';

import { useTranslation } from './useTranslation';

const mockLanguage = vi.fn<() => string>();

vi.mock('../providers/ConfigProvider', () => ({
  useConfig: () => ({ language: mockLanguage() }),
}));

const Probe = ({ k }: { k: TTranslationKeys }) => {
  const { t, language } = useTranslation();

  return <span data-lang={language}>{t(k)}</span>;
};

describe('useTranslation', () => {
  let container: HTMLDivElement;
  let root: Root;
  const render = (k: TTranslationKeys) =>
    act(() =>
      root.render(
        <TranslationProvider>
          <Probe k={k} />
        </TranslationProvider>,
      ),
    );

  beforeEach(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('resolves nested keys in the configured language', () => {
    mockLanguage.mockReturnValue('en');
    render('messages.file_message.download');
    expect(container.textContent).toBe('Download');
  });

  it('falls back to en for an unsupported language', () => {
    mockLanguage.mockReturnValue('xx');
    render('settings.back');
    expect(container.querySelector('span')?.dataset.lang).toBe('en');
    expect(container.textContent).toBe('Back');
  });
});
