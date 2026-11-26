import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { LeaderOnlyNotice } from '@/components/tbx/members/leader-only';
import { Card, Empty, PageHeader, Stat } from '@/components/tbx/ui';
import { formatDateTime } from '@/lib/tbx/labels';
import { prisma } from '@/server/db/prisma';
import { AI_NOT_CONFIGURED_TEXT } from '@/server/agent/config';
import { getAgentStatus } from '@/server/agent/runs';
import { isLeader } from '@/server/tbx/viewer';
import { checkAgentAction } from './actions';

// 阿麒工作室 home. The conversation space (交流區) replaces most of this page in AQ-003.

const JOB_LABEL: Record<string, string> = {
  digest: '讀群組',
  meeting_prep: '例會準備',
  studio_reply: '交流區回覆',
  line_reply: 'LINE 回覆',
  check: '連線測試',
};

const STATUS_LABEL: Record<string, string> = {
  running: '進行中',
  ok: '完成',
  failed: '失敗',
  skipped_budget: '超過今日用量，略過',
};

const TRIGGER_LABEL: Record<string, string> = { cron: '排程', leader: '幹部', webhook: 'LINE' };

function formatTokens(value: number) {
  return value >= 10_000 ? `${Math.round(value / 1000).toLocaleString('zh-TW')}k` : value.toLocaleString('zh-TW');
}

export default async function AQiStudioPage() {
  if (!(await isLeader())) return <LeaderOnlyNotice />;
  const [status, runs] = await Promise.all([
    getAgentStatus(),
    prisma.agentRun.findMany({ orderBy: { startedAt: 'desc' }, take: 15 }),
  ]);
  const overBudget = status.tokensToday >= status.dailyTokenBudget;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="阿麒工作室"
        title="阿麒"
        description="阿麒在這裡整理群組訊息、準備例會的草稿。它做的東西都要幹部採用才會變成正式資料。"
        actions={
          <Link href="/console/a-qi/groups" className="tb-btn tb-btn-sm no-underline">
            群組
          </Link>
        }
      />

      <Card
        title="AI 狀態"
        aside={status.configured ? <span className="tb-chip tb-chip-present">已設定</span> : <span className="tb-chip">AI 未設定</span>}
      >
        <div className="flex flex-col gap-4 text-sm">
          {status.configured ? (
            <>
              <div className="flex flex-wrap gap-y-3">
                <Stat
                  value={formatTokens(status.tokensToday)}
                  total={formatTokens(status.dailyTokenBudget)}
                  label="今天的 token 用量"
                  hint="台灣時間 0 點重算。超過時，排程的工作會略過，幹部按的照常執行。"
                  tone={overBudget ? 'bad' : undefined}
                />
                <Stat value={status.runsToday} label="今天執行次數" />
              </div>
              <p className="text-xs text-tb-muted">
                模型：讀群組 {status.models.digest}・例會準備和交流區 {status.models.studio}
                {status.provider === 'fake' ? '（本機測試用的假模型）' : ''}
              </p>
              <ActionForm action={checkAgentAction}>
                <SubmitButton plain pendingText="阿麒回覆中…">
                  連線測試
                </SubmitButton>
              </ActionForm>
            </>
          ) : (
            <p>
              {AI_NOT_CONFIGURED_TEXT}擁有者在 Vercel 設定 <code>ANTHROPIC_API_KEY</code> 並重新部署後，這裡會顯示用量，也可以做連線測試。
            </p>
          )}
        </div>
      </Card>

      <Card title="最近的工作" bodyClassName="p-0">
        {runs.length === 0 ? (
          <div className="p-4">
            <Empty title="阿麒還沒有做過任何工作" />
          </div>
        ) : (
          <div className="tb-table-wrap">
            <table className="tb-table">
              <thead>
                <tr>
                  <th>時間</th>
                  <th>工作</th>
                  <th>來源</th>
                  <th>模型</th>
                  <th>輸入</th>
                  <th>輸出</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="text-xs text-tb-muted">{formatDateTime(run.startedAt)}</td>
                    <td>{JOB_LABEL[run.job] ?? run.job}</td>
                    <td className="text-xs">{TRIGGER_LABEL[run.trigger] ?? run.trigger}</td>
                    <td className="text-xs">{run.model}</td>
                    <td className="tb-num">
                      {formatTokens(run.inputTokens + run.cacheWriteTokens + run.cacheReadTokens)}
                      {run.cacheReadTokens > 0 ? <div className="text-[11px] text-tb-faint">快取 {formatTokens(run.cacheReadTokens)}</div> : null}
                    </td>
                    <td className="tb-num">{formatTokens(run.outputTokens)}</td>
                    <td className="text-xs">
                      {STATUS_LABEL[run.status] ?? run.status}
                      {run.error ? <div className="max-w-[32ch] break-words text-tb-faint">{run.error}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
