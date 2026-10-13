/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { ReactNode } from 'react';
import React, { createContext, useContext } from 'react';

import type { TLanguage } from '../translations';
import { isLanguage } from '../translations';

import { useConfig } from './ConfigProvider';

interface TranslationContextProps {
  language: TLanguage;
}

interface TranslationProviderProps {
  children: ReactNode;
}

const TranslationContext = createContext<TranslationContextProps | undefined>(
  undefined,
);

export const TranslationProvider: React.FC<TranslationProviderProps> = ({
  children,
}) => {
  const { language } = useConfig();

  return (
    <TranslationContext.Provider
      value={{ language: isLanguage(language) ? language : 'en' }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslations = () => {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error(
      'useTranslations must be used within a TranslationProvider',
    );
  }

  return context;
};
