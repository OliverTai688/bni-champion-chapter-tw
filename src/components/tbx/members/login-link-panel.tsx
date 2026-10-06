'use client';

import { useActionState, useState } from 'react';
import { Copy, Link2 } from 'lucide-react';
import { issueLoginLinkAction, type LoginLinkState } from '@/app/(console)/console/members/actions';

export function LoginLinkPanel({ memberId, hasEmail }: { memberId: string; hasEmail: boolean }) {
  const [state, formAction, pending] = useActionState<LoginLinkState, FormData>(issueLoginLinkAction, null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-tb-muted">
        {hasEmail
          ? '這位會員已登記 Email，可以直接用 Google 登入。換手機或沒有 Google 帳號時，再產生登入連結。'
          : '這位會員還沒登記 Email。產生登入連結後用 LINE 傳給本人，打開後按「確認登入」即可。'}
      </p>
      <form action={formAction}>
        <input type="hidden" name="memberId" value={memberId} />
        <button type="submit" className="tb-btn" disabled={pending}>
          <Link2 className="h-4 w-4" aria-hidden />
          {pending ? '產生中…' : '產生登入連結'}
        </button>
      </form>
      {state ? <p className={state.ok ? 'tb-form-ok' : 'tb-form-error'}>{state.message}</p> : null}
      {state?.link ? (
        <div className="flex flex-wrap items-center gap-2">
          <input readOnly value={state.link} className="tb-input min-w-0 flex-1 font-mono text-xs" aria-label="登入連結" onFocus={(event) => event.target.select()} />
          <button
            type="button"
            className="tb-btn tb-btn-sm"
            onClick={() => {
              void navigator.clipboard?.writeText(state.link ?? '').then(() => setCopied(true));
            }}
          >
            <Copy className="h-4 w-4" aria-hidden />
            {copied ? '已複製' : '複製'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
