import 'server-only';

import type { AgentModel, AgentModelRequest, AgentModelResponse } from '@/server/agent/provider';

/**
 * Local-only stand-in (AGENT_PROVIDER=fake, never in production). No network call.
 * It calls the first tool that takes no arguments once, then answers with what it got,
 * so the tool loop, AgentRun records and the budget check can be tested without a key.
 */

function approxTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 2));
}

export const fakeModel: AgentModel = {
  name: 'fake',
  async chat(request: AgentModelRequest): Promise<AgentModelResponse> {
    const promptText = [request.stableSystem, request.dynamicSystem ?? '', ...request.turns.map((turn) => JSON.stringify(turn))].join('\n');
    const usage = { inputTokens: approxTokens(promptText), outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0 };
    const alreadyCalled = request.turns.some((turn) => turn.role === 'tool_results');
    const noArgTool = request.tools.find((tool) => {
      const required = (tool.inputSchema.required as unknown[] | undefined) ?? [];
      return required.length === 0;
    });

    if (!alreadyCalled && noArgTool) {
      const call = { id: `fake-${Date.now()}`, name: noArgTool.name, input: {} };
      return { assistant: { role: 'assistant', text: '', toolCalls: [call], raw: [call] }, stopReason: 'tool_use', usage, model: `fake:${request.model}` };
    }

    const lastResult = [...request.turns].reverse().find((turn) => turn.role === 'tool_results');
    const seen = lastResult && lastResult.role === 'tool_results' ? lastResult.results.map((result) => result.content).join(' / ') : '';
    const text = request.outputSchema ? JSON.stringify({ fake: true }) : `（測試回覆）${seen ? `工具結果：${seen.slice(0, 200)}` : '收到。'}`;
    return { assistant: { role: 'assistant', text, toolCalls: [], raw: [{ type: 'text', text }] }, stopReason: 'end', usage, model: `fake:${request.model}` };
  },
};
