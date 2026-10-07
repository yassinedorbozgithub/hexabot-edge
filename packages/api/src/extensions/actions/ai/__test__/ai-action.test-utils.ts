/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { WorkflowRuntimeContext } from '@/workflow/contexts/workflow-runtime.context';

/**
 * Mock for the `ai` module, used as
 * `jest.mock('ai', () => jest.requireActual('./__test__/ai-action.test-utils').createAiSdkMock())`.
 */
export const createAiSdkMock = () => ({
  generateText: jest.fn(),
  stepCountIs: jest.fn((count: number) =>
    jest.fn(({ steps }) => steps.length === count),
  ),
  hasToolCall: jest.fn((toolName: string) =>
    jest.fn(
      ({ steps }) =>
        steps[steps.length - 1]?.toolCalls?.some(
          (toolCall: any) => toolCall.toolName === toolName,
        ) ?? false,
    ),
  ),
  jsonSchema: jest.fn((schema) => ({ wrapped: schema })),
  Output: {
    object: jest.fn(({ schema, name, description }) => ({
      schema,
      name,
      description,
      type: 'object',
    })),
  },
});

export const defaultRetries = {
  max_attempts: 3,
  backoff_ms: 25,
  max_delay_ms: 10_000,
  jitter: 0,
  multiplier: 1,
};

export const createContext = (services: Record<string, unknown> = {}) =>
  ({
    services: {
      logger: { debug: jest.fn() },
      actions: { get: jest.fn() },
      credentials: { findOneValue: jest.fn().mockResolvedValue('test-key') },
      ...services,
    },
  }) as unknown as WorkflowRuntimeContext;

export const createModelBindings = (
  overrides: Partial<{
    provider: string;
    model_id: string;
    api_key: string;
    base_url: string;
    organization: string;
  }> = {},
): any => ({
  model: {
    settings: {
      provider: 'openai',
      model_id: 'gpt-4o-mini',
      api_key: 'test-key',
      base_url: 'https://api.openai.com',
      organization: 'org-1',
      ...overrides,
    },
  },
});
