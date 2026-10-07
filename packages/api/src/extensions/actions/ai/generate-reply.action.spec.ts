/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { generateText } from 'ai';

import { ActionService } from '@/actions/actions.service';
import { WorkflowType } from '@/workflow/types';

import {
  createContext,
  createModelBindings,
  defaultRetries,
} from './__test__/ai-action.test-utils';
import { AiGenerateReplyAction } from './generate-reply.action';

jest.mock('ai', () =>
  jest.requireActual('./__test__/ai-action.test-utils').createAiSdkMock(),
);

describe('AiGenerateReplyAction', () => {
  let action: AiGenerateReplyAction;
  let actionService: ActionService;
  const generateTextMock = generateText as jest.MockedFunction<
    typeof generateText
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    actionService = { register: jest.fn() } as unknown as ActionService;
    action = new AiGenerateReplyAction(actionService);
  });

  it('is conversational-only', () => {
    expect(action.name).toBe('ai_generate_reply');
    expect(action.workflowTypes).toEqual([WorkflowType.conversational]);
  });

  it('forwards prompt/history input to buildPrompt and calls generateText', async () => {
    const provider = Object.assign(
      jest.fn().mockReturnValue('model-instance'),
      {
        languageModel: jest.fn(),
      },
    );
    const context = createContext();
    const input = {
      input_mode: 'history' as const,
      messages_limit: 3,
      system: 'system prompt',
    };
    const settings = {
      timeout_ms: 0,
      retries: defaultRetries,
    };

    jest.spyOn(action as any, 'loadProvider').mockResolvedValue(provider);
    jest.spyOn(action as any, 'createModel').mockReturnValue('model-instance');
    const buildPromptSpy = jest
      .spyOn(action as any, 'buildPrompt')
      .mockResolvedValue({
        messages: [{ role: 'user', content: 'Hi' }],
        system: 'system prompt',
      });
    generateTextMock.mockResolvedValue({
      text: 'Generated reply',
      finishReason: 'stop',
      request: {},
      response: {},
      providerMetadata: {},
      warnings: [],
    } as any);

    const result = await action.execute({
      input,
      settings,
      context,
      bindings: createModelBindings(),
    });

    expect(buildPromptSpy).toHaveBeenCalledWith(input, context, []);
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'Hi' }],
        system: 'system prompt',
        model: 'model-instance',
      }),
    );
    expect(result.text).toBe('Generated reply');
  });

  it('throws when the model binding is missing', async () => {
    await expect(
      action.execute({
        input: { input_mode: 'prompt', prompt: 'hi' },
        settings: {
          timeout_ms: 0,
          retries: defaultRetries,
        } as any,
        context: createContext(),
        bindings: {},
      }),
    ).rejects.toThrow('A model is required to run ai_generate_reply.');
  });

  it('throws when the model id is missing', async () => {
    await expect(
      action.execute({
        input: { input_mode: 'prompt', prompt: 'hi' },
        settings: {
          timeout_ms: 0,
          retries: defaultRetries,
        } as any,
        context: createContext(),
        bindings: {
          model: {
            settings: {
              provider: 'openai',
            },
          },
        } as any,
      }),
    ).rejects.toThrow('A model is required to run ai_generate_reply.');
  });
});
