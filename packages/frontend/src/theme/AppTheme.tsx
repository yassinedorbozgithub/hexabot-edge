/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { ThemeProvider } from '@mui/material/styles';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { getTheme } from '.';

export default function AppTheme({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const direction = i18n.dir();

  React.useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
  }, [direction, i18n.language]);

  return (
    <ThemeProvider
      theme={getTheme(direction)}
      disableTransitionOnChange
      defaultMode="light"
    >
      {children}
    </ThemeProvider>
  );
}
