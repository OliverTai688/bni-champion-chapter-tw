'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, RefreshCw, Search } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { QUICK_PHRASES, VOTE_COMMENT_MAX, countChars } from '@/components/tbx/polls/shared';
import { cn } from '@/lib/utils';
import { castVoteAction, enterVoteCodeAction } from './actions';

export interface VoteCandidate {
  optionId: string;
  label: string;
  arrived: boolean;
  isSelf: boolean;
}

export interface MyVote {
  optionId: string;
  label: string;
  comment: string | null;
  submittedAt: string;
}

export function VoteCodeForm({ eventKey, pollId }: { eventKey: string; pollId: string }) {
  return (
    <ActionForm action={enterVoteCodeAction} className="flex flex-col gap-3">
      <input type="hidden" name="eventKey" value={eventKey} />
      <input type="hidden" name="pollId" value={pollId} />
      <label className="tb-label" htmlFor="vote-code">
        投票碼
        <input
          id="vote-code"
          name="code"
          className="tb-input !min-h-[52px] text-center !text-xl uppercase tracking-[0.2em]"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={12}
          required
        />
      </label>
      <SubmitButton className="tb-btn-lg w-full" pendingText="確認中…">
        確認投票碼
      </SubmitButton>
    </ActionForm>
  );
}

export function VoteWall({
  eventKey,
  pollId,
  candidates,
  arrivedCount,
  myVote,
  voterName,
}: {
  eventKey: string;
  pollId: string;
  candidates: VoteCandidate[];
  arrivedCount: number;
  myVote: MyVote | null;
  voterName: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  // Holds the timestamp of the vote being changed. A saved change gets a new
  // timestamp, which brings the "你投給了" view back without an effect.
  const [changingFrom, setChangingFrom] = useState<string | null>(null);

  if (myVote && changingFrom !== myVote.submittedAt) {
    return (
      <section className="tb-card" aria-label="你的投票">
        <div className="tb-card-body flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-tb-ok" aria-hidden="true" />
          <p className="text-sm text-tb-muted">你投給了</p>
          <p className="text-3xl font-bold leading-tight">{myVote.label}</p>
          {myVote.comment ? (
            <p className="max-w-[32ch] rounded-lg bg-tb-surf2 px-3 py-2 text-[15px]">{myVote.comment}</p>
          ) : null}
          <button
            type="button"
            className="tb-btn tb-btn-lg mt-2 w-full"
            onClick={() => {
              setSelectedId(null);
              setComment('');
              setQuery('');
              setChangingFrom(myVote.submittedAt);
            }}
          >
            改票
          </button>
          <p className="text-xs text-tb-faint">投票結束前都可以改票。投票是匿名的，好話不會顯示是誰寫的。</p>
          <button type="button" className="tb-btn tb-btn-quiet min-h-[44px]" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            看投票是否結束
          </button>
        </div>
      </section>
    );
  }

  const noneArrived = arrivedCount === 0;
  const keyword = query.trim().toLowerCase();
  const visible = candidates.filter((candidate) =>
    keyword ? candidate.label.toLowerCase().includes(keyword) : showAll || noneArrived || candidate.arrived,
  );
  const selected = candidates.find((candidate) => candidate.optionId === selectedId && !candidate.isSelf) ?? null;
  const commentLength = countChars(comment);

  const addPhrase = (phrase: string) => {
    setComment((current) => {
      const trimmed = current.trim();
      if (!trimmed) return phrase;
      if (trimmed.includes(phrase)) return trimmed;
      const next = `${trimmed}、${phrase}`;
      return countChars(next) <= VOTE_COMMENT_MAX ? next : trimmed;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {myVote ? (
        <div className="tb-banner text-sm">
          <span>
            目前投給 <strong>{myVote.label}</strong>，選另一位再送出就會改票。
          </span>
          <button type="button" className="tb-btn min-h-[44px]" onClick={() => setChangingFrom(null)}>
            不改了
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="tb-label" htmlFor="vote-search">
          搜尋會員
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tb-faint" aria-hidden="true" />
            <input
              id="vote-search"
              type="search"
              className="tb-input !min-h-[48px] !pl-9 !text-base"
              placeholder="輸入姓名"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </span>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-x-4 text-sm text-tb-muted">
          {noneArrived ? (
            <span className="py-3">還沒有人簽到，先列出全部 {candidates.length} 位會員。</span>
          ) : (
            <>
              <span>
                已到場 {arrivedCount} 位{voterName ? `・你是 ${voterName}` : ''}
              </span>
              <label htmlFor="vote-show-all" className="flex min-h-[44px] cursor-pointer items-center gap-2 text-tb-text">
                <input
                  id="vote-show-all"
                  type="checkbox"
                  className="h-5 w-5"
                  checked={showAll}
                  onChange={(event) => setShowAll(event.target.checked)}
                />
                顯示全部會員
              </label>
            </>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-tb-line px-4 py-8 text-center text-sm text-tb-muted">
          {keyword ? `找不到「${query.trim()}」，請換個字再找一次。` : '目前沒有可以投票的會員，請勾選「顯示全部會員」。'}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3" aria-label="候選人">
          {visible.map((candidate) => {
            const isSelected = selected?.optionId === candidate.optionId;
            const hint = candidate.isSelf
              ? '不能投給自己'
              : myVote?.optionId === candidate.optionId
                ? '目前投給'
                : !candidate.arrived && !noneArrived
                  ? '未簽到'
                  : null;
            return (
              <li key={candidate.optionId}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  disabled={candidate.isSelf}
                  onClick={() => setSelectedId(isSelected ? null : candidate.optionId)}
                  className={cn(
                    'flex min-h-[60px] w-full flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2 text-center text-[17px] font-bold leading-tight transition-colors',
                    isSelected ? 'border-tb-gold bg-tb-gold-soft text-tb-gold' : 'border-tb-line bg-tb-surf text-tb-text',
                    candidate.isSelf && 'cursor-not-allowed opacity-45',
                  )}
                >
                  <span className="break-all">{candidate.label}</span>
                  {hint ? <span className="text-[11px] font-normal text-tb-faint">{hint}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected ? (
        <>
          {/* Keeps the last rows of the wall reachable above the fixed panel. */}
          <div className="h-[400px]" aria-hidden="true" />
          <section
            className="fixed inset-x-0 bottom-0 z-20 max-h-[85vh] overflow-y-auto border-t border-tb-line bg-tb-surf shadow-[0_-12px_32px_rgba(0,0,0,0.45)]"
            aria-label="確認投票"
          >
            <ActionForm
              action={castVoteAction}
              className="mx-auto flex w-full max-w-[520px] flex-col gap-3 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4"
            >
              <input type="hidden" name="eventKey" value={eventKey} />
              <input type="hidden" name="pollId" value={pollId} />
              <input type="hidden" name="optionId" value={selected.optionId} />
              <div className="flex items-center justify-between gap-3">
                <h2 className="min-w-0 break-all text-xl font-bold" aria-live="polite">
                  投給 {selected.label}
                </h2>
                <button type="button" className="tb-btn tb-btn-quiet min-h-[44px] shrink-0" onClick={() => setSelectedId(null)}>
                  重選
                </button>
              </div>
              <label className="tb-label" htmlFor="vote-comment">
                <span className="flex items-center justify-between gap-2">
                  他哪裡表現不錯？（選填）
                  <span className="tb-mono text-tb-faint">
                    {commentLength}/{VOTE_COMMENT_MAX}
                  </span>
                </span>
                <textarea
                  id="vote-comment"
                  name="comment"
                  className="tb-textarea !text-base"
                  rows={2}
                  maxLength={VOTE_COMMENT_MAX}
                  placeholder="寫一句好話，不會顯示是誰寫的"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="快速短語">
                {QUICK_PHRASES.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    className="min-h-[44px] rounded-full border border-tb-line bg-tb-surf2 px-3 text-sm font-semibold text-tb-text"
                    onClick={() => addPhrase(phrase)}
                  >
                    {phrase}
                  </button>
                ))}
              </div>
              <SubmitButton className="tb-btn-lg w-full" pendingText="送出中…">
                送出投票
              </SubmitButton>
            </ActionForm>
          </section>
        </>
      ) : null}
    </div>
  );
}
