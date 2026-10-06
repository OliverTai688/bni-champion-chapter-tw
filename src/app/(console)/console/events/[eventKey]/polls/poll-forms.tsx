'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { KeyRound, Pencil, Plus } from 'lucide-react';
import { ActionForm, DialogButton, SubmitButton } from '@/components/tbx/client';
import {
  POLL_RESULT_VISIBILITY_LABEL,
  type CreatePollState,
  type PollResultVisibilityKey,
} from '@/components/tbx/polls/shared';
import { cn } from '@/lib/utils';
import { createStarPollAction, updatePollAction } from './actions';

/** Submit button without the gold emphasis, for secondary actions such as 重新開放. */
export function PlainSubmit({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={cn('tb-btn', className)} disabled={pending}>
      {pending ? '處理中…' : children}
    </button>
  );
}

/**
 * Create form for the star poll. Always rendered at the same place on the page
 * so the one-time vote code stays visible after the poll list refreshes.
 */
export function CreateStarPollPanel({ eventKey, hasPolls }: { eventKey: string; hasPolls: boolean }) {
  const [eligibility, setEligibility] = useState<'public' | 'code_required'>('public');
  const [expanded, setExpanded] = useState(false);
  const [state, formAction] = useActionState(async (prev: CreatePollState, formData: FormData) => {
    const next = await createStarPollAction(prev, formData);
    if (next?.ok) setExpanded(false);
    return next;
  }, null);

  const showForm = !hasPolls || expanded;

  return (
    <div className="flex flex-col gap-3">
      {state?.ok ? (
        <div className="tb-banner tb-banner-ok" role="status">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-semibold">{state.message}</p>
            {state.voteCode ? (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                投票碼
                <strong className="tb-num text-3xl tracking-[0.12em]">{state.voteCode}</strong>
                <span className="text-tb-muted">只會顯示這一次，請現在記下來，開放投票時公布給現場會員。</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showForm ? (
        <form
          action={formAction}
          className={cn(
            'flex flex-col gap-4 rounded-xl border border-tb-line px-5 py-5',
            hasPolls ? 'bg-tb-surf' : 'border-dashed',
          )}
        >
          <input type="hidden" name="eventKey" value={eventKey} />
          <div>
            <h2 className="text-base font-bold">{hasPolls ? '再建立一場投票' : '這場活動還沒有長冠軍之星投票'}</h2>
            <p className="mt-1 max-w-[60ch] text-sm text-tb-muted">
              建立後，名冊上所有會員都會成為候選人。會員用手機打開投票頁，點一位會員就能投票，也可以留一句好話。
            </p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-semibold text-tb-muted">誰可以投票</legend>
            <label htmlFor="poll-eligibility-public" className="flex cursor-pointer items-start gap-3 rounded-lg border border-tb-line px-3 py-3">
              <input
                id="poll-eligibility-public"
                type="radio"
                name="eligibility"
                value="public"
                className="mt-1"
                checked={eligibility === 'public'}
                onChange={() => setEligibility('public')}
              />
              <span>
                <span className="block font-semibold">免投票碼</span>
                <span className="block text-sm text-tb-muted">打開投票頁就能投，最快。每支手機一票。</span>
              </span>
            </label>
            <label htmlFor="poll-eligibility-code" className="flex cursor-pointer items-start gap-3 rounded-lg border border-tb-line px-3 py-3">
              <input
                id="poll-eligibility-code"
                type="radio"
                name="eligibility"
                value="code_required"
                className="mt-1"
                checked={eligibility === 'code_required'}
                onChange={() => setEligibility('code_required')}
              />
              <span>
                <span className="block font-semibold">需要投票碼</span>
                <span className="block text-sm text-tb-muted">現場公布投票碼，輸入後才能投。適合連結會被轉傳的場合。</span>
              </span>
            </label>
          </fieldset>

          {eligibility === 'code_required' ? (
            <label className="tb-label max-w-[320px]" htmlFor="poll-code">
              自訂投票碼（選填）
              <input
                id="poll-code"
                name="code"
                className="tb-input tb-mono uppercase"
                maxLength={12}
                autoComplete="off"
                placeholder="留空會自動產生 6 碼"
              />
            </label>
          ) : null}

          <label htmlFor="poll-open-now" className="flex min-h-[36px] cursor-pointer items-center gap-2 text-sm">
            <input id="poll-open-now" type="checkbox" name="openNow" />
            建立後立刻開放投票
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton pendingText="建立中…">建立長冠軍之星投票</SubmitButton>
            {hasPolls ? (
              <button type="button" className="tb-btn tb-btn-quiet" onClick={() => setExpanded(false)}>
                取消
              </button>
            ) : null}
          </div>
          {state && !state.ok ? (
            <p role="status" className="tb-form-error">
              {state.message}
            </p>
          ) : null}
        </form>
      ) : (
        <div>
          <button type="button" className="tb-btn tb-btn-quiet tb-btn-sm" onClick={() => setExpanded(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            再建立一場投票
          </button>
        </div>
      )}
    </div>
  );
}

const VISIBILITY_CHOICES: PollResultVisibilityKey[] = ['after_closed', 'live_public', 'admin_only'];

export function EditPollButton({
  eventKey,
  poll,
}: {
  eventKey: string;
  poll: { id: string; title: string; description: string | null; resultVisibility: PollResultVisibilityKey };
}) {
  const choices = VISIBILITY_CHOICES.includes(poll.resultVisibility)
    ? VISIBILITY_CHOICES
    : [...VISIBILITY_CHOICES, poll.resultVisibility];

  return (
    <DialogButton
      label={
        <>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          編輯
        </>
      }
      title="編輯投票"
      className="tb-btn-sm"
    >
      {(close) => (
        <ActionForm action={updatePollAction} onSuccess={close} className="flex flex-col gap-3">
          <input type="hidden" name="eventKey" value={eventKey} />
          <input type="hidden" name="pollId" value={poll.id} />
          <label className="tb-label" htmlFor={`poll-${poll.id}-title`}>
            投票名稱
            <input
              id={`poll-${poll.id}-title`}
              name="title"
              className="tb-input"
              defaultValue={poll.title}
              maxLength={40}
              required
            />
          </label>
          <label className="tb-label" htmlFor={`poll-${poll.id}-description`}>
            說明（顯示在投票頁，選填）
            <textarea
              id={`poll-${poll.id}-description`}
              name="description"
              className="tb-textarea"
              rows={3}
              maxLength={200}
              defaultValue={poll.description ?? ''}
            />
          </label>
          <label className="tb-label" htmlFor={`poll-${poll.id}-visibility`}>
            結果給會員看的時機
            <select
              id={`poll-${poll.id}-visibility`}
              name="resultVisibility"
              className="tb-select"
              defaultValue={poll.resultVisibility}
            >
              {choices.map((value) => (
                <option key={value} value={value}>
                  {POLL_RESULT_VISIBILITY_LABEL[value]}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-tb-faint">好話只有領導團隊看得到，投票頁不會顯示。</p>
          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton>儲存設定</SubmitButton>
            <button type="button" className="tb-btn tb-btn-quiet" onClick={close}>
              取消
            </button>
          </div>
        </ActionForm>
      )}
    </DialogButton>
  );
}
