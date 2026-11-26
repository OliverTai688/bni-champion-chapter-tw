import 'server-only';

/**
 * 阿麒's model settings (ARC-009 §8). Values come from env vars the owner sets on Vercel;
 * nothing here is a secret except ANTHROPIC_API_KEY, which is only checked for presence.
 */

export type AgentJob = 'digest' | 'meeting_prep' | 'studio_reply' | 'line_reply' | 'check';
export type AgentTrigger = 'cron' | 'leader' | 'webhook';
export type AgentProviderName = 'anthropic' | 'fake';

const DEFAULT_MODEL_DIGEST = 'claude-haiku-5-5';
const DEFAULT_MODEL_STUDIO = 'claude-sonnet-5-5';
const DEFAULT_DAILY_TOKEN_BUDGET = 2_000_000;

export interface AgentConfig {
  provider: AgentProviderName;
  /** False when the provider has no key: 阿麒 answers「AI 未設定」and skips model work. */
  configured: boolean;
  models: { digest: string; studio: string };
  dailyTokenBudget: number;
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAgentConfig(): AgentConfig {
  const requested = (process.env.AGENT_PROVIDER ?? 'anthropic').trim().toLowerCase();
  // The fake provider answers without a network call. It exists for local checks only.
  const provider: AgentProviderName = requested === 'fake' && process.env.NODE_ENV !== 'production' ? 'fake' : 'anthropic';
  return {
    provider,
    configured: provider === 'fake' || Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    models: {
      digest: process.env.AGENT_MODEL_DIGEST?.trim() || DEFAULT_MODEL_DIGEST,
      studio: process.env.AGENT_MODEL_STUDIO?.trim() || DEFAULT_MODEL_STUDIO,
    },
    dailyTokenBudget: positiveInt(process.env.AGENT_DAILY_TOKEN_BUDGET, DEFAULT_DAILY_TOKEN_BUDGET),
  };
}

/** Reading group messages uses the small model; everything else uses the studio model. */
export function modelForJob(config: AgentConfig, job: AgentJob) {
  return job === 'digest' ? config.models.digest : config.models.studio;
}

export const AI_NOT_CONFIGURED_TEXT = 'AI 未設定。群組記錄和快速指令照常運作。';
