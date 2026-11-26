import 'server-only';

import type { AgentToolSpec } from '@/server/agent/provider';

/**
 * Tools 阿麒 can call (ARC-009 §7.1). The server picks the tool set for each job; the model
 * cannot reach tools outside it. No tool writes official data: seat maps, group messages and
 * pushes only change through a leader's server action.
 */

export interface AgentToolContext {
  /** Leader who started the work, when a leader did. Tools never take "who" from model input. */
  leaderName?: string | null;
  chatId?: string | null;
  eventKey?: string | null;
}

export interface AgentTool extends AgentToolSpec {
  /** Returns text (usually JSON) for the model. Throwing marks the result as an error. */
  run(input: unknown, context: AgentToolContext): Promise<string>;
}

/** Schema helper: strict tool use needs `additionalProperties: false` and every property required. */
export function objectSchema(properties: Record<string, Record<string, unknown>> = {}) {
  return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
}

export function toolSpecs(tools: AgentTool[]): AgentToolSpec[] {
  return tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
}

/** A read-only tool every job may use. Later batches add the digest and studio tool sets. */
export const currentTimeTool: AgentTool = {
  name: 'get_current_time',
  description: '取得現在的台灣時間（日期、星期、時間）。',
  inputSchema: objectSchema(),
  async run() {
    const now = new Date();
    const format = new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return JSON.stringify({ taipei: format.format(now), iso: now.toISOString() });
  },
};
