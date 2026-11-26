import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import type {
  AgentModel,
  AgentModelRequest,
  AgentModelResponse,
  AgentStopReason,
  AgentToolCall,
  AgentTurn,
} from '@/server/agent/provider';

/**
 * Claude adapter. Uses the beta Messages endpoint only for server-side refusal fallbacks:
 * when a model declines, the API reruns the same request on a fallback model it picks.
 * Models without fallback support run alone, so the same request shape works for every model.
 */

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const REQUEST_TIMEOUT_MS = 90_000;

let client: Anthropic | null = null;

function getClient() {
  // Reads ANTHROPIC_API_KEY from the environment. The SDK retries 429, 5xx and connection errors.
  client ??= new Anthropic({ maxRetries: 2, timeout: REQUEST_TIMEOUT_MS });
  return client;
}

function toMessages(turns: AgentTurn[]): Anthropic.Beta.BetaMessageParam[] {
  return turns.map((turn): Anthropic.Beta.BetaMessageParam => {
    if (turn.role === 'user') return { role: 'user', content: turn.text };
    if (turn.role === 'tool_results') {
      return {
        role: 'user',
        content: turn.results.map((result) => ({
          type: 'tool_result' as const,
          tool_use_id: result.toolCallId,
          content: result.content,
          ...(result.isError ? { is_error: true } : {}),
        })),
      };
    }
    // Send the assistant turn back exactly as it came, thinking blocks included.
    return { role: 'assistant', content: turn.raw as Anthropic.Beta.BetaContentBlock[] };
  });
}

function stopReasonOf(reason: string | null): AgentStopReason {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'end';
    case 'tool_use':
      return 'tool_use';
    case 'max_tokens':
    case 'model_context_window_exceeded':
      return 'max_tokens';
    case 'refusal':
      return 'refusal';
    case 'pause_turn':
      return 'pause';
    default:
      return 'other';
  }
}

export const anthropicModel: AgentModel = {
  name: 'anthropic',
  async chat(request: AgentModelRequest): Promise<AgentModelResponse> {
    const system: Anthropic.Beta.BetaTextBlockParam[] = [
      // Tools render before system, so this breakpoint caches the tool list and the fixed prompt together.
      { type: 'text', text: request.stableSystem, cache_control: { type: 'ephemeral' } },
    ];
    if (request.dynamicSystem) system.push({ type: 'text', text: request.dynamicSystem });

    const response = await getClient().beta.messages.create(
      {
        model: request.model,
        max_tokens: request.maxTokens,
        betas: [FALLBACK_BETA],
        fallbacks: 'default',
        system,
        messages: toMessages(request.turns),
        ...(request.tools.length > 0
          ? {
              tools: request.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema as Anthropic.Beta.BetaTool.InputSchema,
                strict: true,
              })),
            }
          : {}),
        output_config: {
          ...(request.effort ? { effort: request.effort } : {}),
          ...(request.outputSchema ? { format: { type: 'json_schema' as const, schema: request.outputSchema } } : {}),
        },
      },
      { signal: request.signal },
    );

    const toolCalls: AgentToolCall[] = [];
    const texts: string[] = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') toolCalls.push({ id: block.id, name: block.name, input: block.input });
      else if (block.type === 'text') texts.push(block.text);
    }

    return {
      assistant: { role: 'assistant', text: texts.join('\n').trim(), toolCalls, raw: response.content },
      stopReason: stopReasonOf(response.stop_reason),
      usage: {
        inputTokens: response.usage.input_tokens ?? 0,
        outputTokens: response.usage.output_tokens ?? 0,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
        cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
      },
      model: response.model,
    };
  },
};

/** Short, secret-free description of an API failure for AgentRun.error. */
export function describeAnthropicError(error: unknown) {
  if (error instanceof Anthropic.AuthenticationError) return 'anthropic: authentication failed (check ANTHROPIC_API_KEY)';
  if (error instanceof Anthropic.PermissionDeniedError) return 'anthropic: permission denied';
  if (error instanceof Anthropic.RateLimitError) return 'anthropic: rate limited';
  if (error instanceof Anthropic.BadRequestError) return `anthropic: bad request: ${error.message.slice(0, 300)}`;
  if (error instanceof Anthropic.APIConnectionTimeoutError) return 'anthropic: request timed out';
  if (error instanceof Anthropic.APIConnectionError) return 'anthropic: connection failed';
  if (error instanceof Anthropic.APIError) return `anthropic: ${error.status ?? 'error'} ${error.message.slice(0, 200)}`;
  return null;
}
