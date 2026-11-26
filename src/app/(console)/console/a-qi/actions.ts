'use server';

import { revalidatePath } from 'next/cache';
import { A_QI_BASE_PROMPT } from '@/server/agent/prompts';
import { runAgent } from '@/server/agent/run-agent';
import { currentTimeTool } from '@/server/agent/tools';
import { fail, ok, type ActionState } from '@/server/tbx/action';
import { requireLeader } from '@/server/tbx/viewer';

/** One short model call with one tool, so a leader can confirm the key, the model and the tool loop work. */
export async function checkAgentAction(): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const result = await runAgent({
      job: 'check',
      trigger: 'leader',
      stableSystem: A_QI_BASE_PROMPT,
      prompt: '這是連線測試。請先用工具查現在的台灣時間，再用一句話打招呼，並說出現在的日期和時間。',
      tools: [currentTimeTool],
      context: { leaderName: viewer.leaderName },
      maxTokens: 1000,
      effort: 'low',
      timeoutMs: 60_000,
    });
    revalidatePath('/console/a-qi');
    if (result.status === 'not_configured') return fail(new Error(result.text));
    if (result.status === 'failed') return fail(new Error(result.error));
    if (result.status === 'skipped_budget') return fail(new Error('今天的用量已經到上限。'));
    return ok(`阿麒（${result.model}）：${result.text}`);
  } catch (error) {
    return fail(error);
  }
}
