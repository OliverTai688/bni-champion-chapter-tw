import 'server-only';

import { taipeiDateKey } from '@/lib/tbx/labels';
import { prisma } from '@/server/db/prisma';
import { getAgentConfig } from '@/server/agent/config';
import { budgetTokens } from '@/server/agent/provider';
import { logOperation } from '@/server/tbx/log';

/** Daily token budget (ARC-009 §8). Days run on Taiwan time. */

export function taipeiDayStart(now: Date = new Date()) {
  return new Date(`${taipeiDateKey(now)}T00:00:00+08:00`);
}

export async function tokensUsedToday(now: Date = new Date()) {
  const { _sum, _count } = await prisma.agentRun.aggregate({
    where: { startedAt: { gte: taipeiDayStart(now) } },
    _sum: { inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheWriteTokens: true },
    _count: { _all: true },
  });
  return {
    tokens: budgetTokens({
      inputTokens: _sum.inputTokens ?? 0,
      outputTokens: _sum.outputTokens ?? 0,
      cacheReadTokens: _sum.cacheReadTokens ?? 0,
      cacheWriteTokens: _sum.cacheWriteTokens ?? 0,
    }),
    runs: _count._all,
  };
}

const BUDGET_NOTICE_ACTION = 'agent_budget_exceeded';

/**
 * Tells leaders once a day that automatic work stopped for the budget.
 * Until 交流區 exists (AQ-003) the notice is an operation log entry.
 */
export async function noticeBudgetExceededOnce(used: number, budget: number, job: string) {
  const already = await prisma.operationLog.findFirst({
    where: { action: BUDGET_NOTICE_ACTION, createdAt: { gte: taipeiDayStart() } },
    select: { id: true },
  });
  if (already) return false;
  await logOperation({
    actorRole: 'system',
    actorName: '阿麒',
    action: BUDGET_NOTICE_ACTION,
    targetType: 'AgentRun',
    metadata: { used, budget, job },
  });
  return true;
}

export interface AgentStatus {
  configured: boolean;
  provider: string;
  models: { digest: string; studio: string };
  dailyTokenBudget: number;
  tokensToday: number;
  runsToday: number;
  lastRun: { job: string; status: string; startedAt: Date } | null;
}

export async function getAgentStatus(): Promise<AgentStatus> {
  const config = getAgentConfig();
  const [today, lastRun] = await Promise.all([
    tokensUsedToday(),
    prisma.agentRun.findFirst({ orderBy: { startedAt: 'desc' }, select: { job: true, status: true, startedAt: true } }),
  ]);
  return {
    configured: config.configured,
    provider: config.provider,
    models: config.models,
    dailyTokenBudget: config.dailyTokenBudget,
    tokensToday: today.tokens,
    runsToday: today.runs,
    lastRun,
  };
}
