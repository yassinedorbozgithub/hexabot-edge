/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { IPublicConfig } from '@hexabot-ai/types';

import type { ThemeMode, ThemeOverrides } from '../theme/theme.types';

export type ConfigTransport = 'ws' | 'polling';

export type Config = Pick<IPublicConfig, 'apiUrl' | 'maxUploadSize'> & {
  channel: string;
  sourceId: string;
  language: string;
  transport?: ConfigTransport;
  workflowId?: string;
  instanceId?: string;
  mode?: ThemeMode;
  theme?: ThemeOverrides;
  primaryColor?: string;
};
