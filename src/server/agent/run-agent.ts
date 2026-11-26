import 'server-only';

import { prisma } from '@/server/db/prisma';
import { AI_NOT_CONFIGURED_TEXT, getAgentConfig, modelForJob, type AgentJob, type AgentTrigger } from '@/server/agent/config';
import {
  EMPTY_USAGE,
  addUsage,
  type AgentModel,
  type AgentToolResult,
  type AgentTurn,
  type JsonSchema,
} from '@/server/agent/provider';
import { anthropicModel, describeAnthropicError } from '@/server/agent/providers/anthropic';
import { fakeModel } from '@/server/agent/providers/fake';
import { noticeBudgetExceededOnce, tokensUsedToday } from '@/server/agent/runs';
import { toolSpecs, type AgentTool, type AgentToolContext } from '@/server/agent/tools';

/**
 * The agent loop (ARC-008 §7.1): call the model, run the tools it asks for, send the results back,
 * at most `maxRounds` model calls. Every call is recorded in one AgentRun with its token usage.
 */

export interface RunAgentInput {
  job: AgentJob;
  trigger: AgentTrigger;
  stableSystem: string;
  dynamicSystem?: string;
  /** A single request, or a conversation that ends with a user turn. */
  prompt: string | AgentTurn[];
  tools?: AgentTool[];
  context?: AgentToolContext;
  maxRounds?: number;
  maxTokens?: number;
  effort?: 'low' | 'medium' | 'high';
  outputSchema?: JsonSchema;
  timeoutMs?: number;
}

export type RunAgentResult =
  | { status: 'ok'; runId: string; text: string; output: unknown; model: string }
  | { status: 'not_configured'; text: string }
  | { status: 'skipped_budget'; runId: string; used: number; budget: number }
  | { status: 'failed'; runId: string; error: string };

const DEFAULT_MAX_ROUNDS = 5;
const DEFAULT_MAX_TOKENS = 8000;
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TOOL_RESULT_CHARS = 20_000;

function modelFor(provider: string): AgentModel {
  return provider === 'fake' ? fakeModel : anthropicModel;
}

function describeError(error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') return 'timed out';
  return describeAnthropicError(error) ?? (error instanceof Error ? error.message.slice(0, 300) : 'unknown error');
}

async function runTool(tools: AgentTool[], name: string, input: unknown, context: AgentToolContext) {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) return { content: `沒有「${name}」這個工具。`, isError: true };
  try {
    const content = await tool.run(input, context);
    return { content: content.length > MAX_TOOL_RESULT_CHARS ? `${content.slice(0, MAX_TOOL_RESULT_CHARS)}…（已截斷）` : content };
  } catch (error) {
    return { content: `工具執行失敗：${error instanceof Error ? error.message.slice(0, 200) : 'unknown'}`, isError: true };
  }
}

export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const config = getAgentConfig();
  if (!config.configured) return { status: 'not_configured', text: AI_NOT_CONFIGURED_TEXT };

  const requestedModel = modelForJob(config, input.job);

  // Automatic work stops at the daily budget; work a leader asked for still runs (ARC-009 §8).
  if (input.trigger !== 'leader') {
    const { tokens } = await tokensUsedToday();
    if (tokens >= config.dailyTokenBudget) {
      const run = await prisma.agentRun.create({
        data: {
          job: input.job,
          trigger: input.trigger,
          provider: config.provider,
          model: requestedModel,
          status: 'skipped_budget',
          stopReason: null,
          error: null,
          finishedAt: new Date(),
        },
      });
      await noticeBudgetExceededOnce(tokens, config.dailyTokenBudget, input.job);
      return { status: 'skipped_budget', runId: run.id, used: tokens, budget: config.dailyTokenBudget };
    }
  }

  const run = await prisma.agentRun.create({
    data: {
      job: input.job,
      trigger: input.trigger,
      provider: config.provider,
      model: requestedModel,
      status: 'running',
      stopReason: null,
      error: null,
      finishedAt: null,
    },
  });

  const tools = input.tools ?? [];
  const model = modelFor(config.provider);
  const turns: AgentTurn[] = typeof input.prompt === 'string' ? [{ role: 'user', text: input.prompt }] : [...input.prompt];
  const maxRounds = input.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let usage = EMPTY_USAGE;
  let rounds = 0;
  let answeredBy = requestedModel;
  let stopReason: string | null = null;

  const finish = async (status: 'ok' | 'failed', error: string | null) => {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status, error, stopReason, rounds, model: answeredBy, ...usage, finishedAt: new Date() },
    });
  };

  try {
    while (true) {
      if (rounds >= maxRounds) {
        await finish('failed', `stopped after ${maxRounds} model calls`);
        return { status: 'failed', runId: run.id, error: '阿麒查了太多次資料還沒有結論，這次先停下來。' };
      }
      rounds += 1;
      const response = await model.chat({
        model: requestedModel,
        stableSystem: input.stableSystem,
        dynamicSystem: input.dynamicSystem,
        turns,
        tools: toolSpecs(tools),
        maxTokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
        effort: input.effort,
        outputSchema: input.outputSchema,
        signal: controller.signal,
      });
      usage = addUsage(usage, response.usage);
      answeredBy = response.model;
      stopReason = response.stopReason;
      turns.push(response.assistant);

      if (response.stopReason === 'pause') continue;
      if (response.stopReason === 'tool_use' && response.assistant.toolCalls.length > 0) {
        const results: AgentToolResult[] = await Promise.all(
          response.assistant.toolCalls.map(async (call) => ({
            toolCallId: call.id,
            ...(await runTool(tools, call.name, call.input, input.context ?? {})),
          })),
        );
        turns.push({ role: 'tool_results', results });
        continue;
      }
      if (response.stopReason === 'refusal') {
        await finish('failed', 'refusal');
        return { status: 'failed', runId: run.id, error: '這個要求阿麒沒辦法處理。' };
      }
      if (response.stopReason === 'max_tokens') {
        await finish('failed', 'max_tokens');
        return { status: 'failed', runId: run.id, error: '回答太長被截斷了，請把要求拆小一點。' };
      }

      const text = response.assistant.text;
      let output: unknown = null;
      if (input.outputSchema) {
        try {
          output = JSON.parse(text);
        } catch {
          await finish('failed', 'structured output was not valid JSON');
          return { status: 'failed', runId: run.id, error: '阿麒的整理結果格式不對，這次沒有採用。' };
        }
      }
      await finish('ok', null);
      return { status: 'ok', runId: run.id, text, output, model: answeredBy };
    }
  } catch (error) {
    const message = describeError(error);
    console.error('[agent] run failed', input.job, message);
    await finish('failed', message);
    return { status: 'failed', runId: run.id, error: 'AI 暫時無法使用，請稍後再試。' };
  } finally {
    clearTimeout(timer);
  }
}
