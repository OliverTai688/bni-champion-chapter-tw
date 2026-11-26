import 'server-only';

/**
 * Provider-neutral model interface (ARC-008 §7.1). Each adapter converts these shapes to its own API.
 * Assistant turns keep the provider's raw content so thinking blocks go back unchanged in a tool loop.
 */

export type JsonSchema = { [key: string]: unknown };

export interface AgentToolSpec {
  name: string;
  description: string;
  /** JSON schema with `additionalProperties: false` and every property in `required` (strict tool use). */
  inputSchema: JsonSchema;
}

export interface AgentToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface AgentToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export type AgentTurn =
  | { role: 'user'; text: string }
  | { role: 'tool_results'; results: AgentToolResult[] }
  | { role: 'assistant'; text: string; toolCalls: AgentToolCall[]; raw: unknown };

export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface AgentModelRequest {
  model: string;
  /** Fixed text that is the same on every call of a job; it is cached. */
  stableSystem: string;
  /** Text that changes between calls (today's date, the event being prepared). Not cached. */
  dynamicSystem?: string;
  turns: AgentTurn[];
  tools: AgentToolSpec[];
  maxTokens: number;
  effort?: 'low' | 'medium' | 'high';
  /** When set, the final answer must be JSON matching this schema (structured output). */
  outputSchema?: JsonSchema;
  signal?: AbortSignal;
}

export type AgentStopReason = 'end' | 'tool_use' | 'max_tokens' | 'refusal' | 'pause' | 'other';

export interface AgentModelResponse {
  assistant: Extract<AgentTurn, { role: 'assistant' }>;
  stopReason: AgentStopReason;
  usage: AgentUsage;
  /** The model that actually answered (differs from the request when a fallback ran). */
  model: string;
}

export interface AgentModel {
  readonly name: string;
  chat(request: AgentModelRequest): Promise<AgentModelResponse>;
}

export const EMPTY_USAGE: AgentUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

export function addUsage(a: AgentUsage, b: AgentUsage): AgentUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

/** Tokens counted against the daily budget. Cache reads are cheap, so they count as a tenth. */
export function budgetTokens(usage: AgentUsage) {
  return usage.inputTokens + usage.cacheWriteTokens + usage.outputTokens + Math.ceil(usage.cacheReadTokens / 10);
}
