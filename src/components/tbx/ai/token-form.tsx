'use client';

import { useActionState, useState } from 'react';
import { Copy, KeyRound } from 'lucide-react';
import { createApiTokenAction, type TokenState } from '@/app/(console)/console/ai/actions';

export function TokenForm({ scopes }: { scopes: Array<{ value: string; label: string }> }) {
  const [state, formAction, pending] = useActionState<TokenState, FormData>(createApiTokenAction, null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex max-w-[560px] flex-col gap-3">
        <label className="tb-label" htmlFor="token-name">
          金鑰名稱
          <input id="token-name" name="name" className="tb-input" placeholder="例如：Claude 排座" maxLength={60} required />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="tb-label">權限</legend>
          {scopes.map((scope) => (
            <label key={scope.value} className="flex items-start gap-2 text-sm" htmlFor={`scope-${scope.value}`}>
              <input id={`scope-${scope.value}`} type="checkbox" name="scopes" value={scope.value} defaultChecked className="mt-1" />
              <span>
                <span className="tb-mono">{scope.value}</span>
                <span className="ml-2 text-tb-muted">{scope.label}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="tb-label" htmlFor="token-days">
          有效天數
          <select id="token-days" name="expiresInDays" className="tb-select" defaultValue="90">
            <option value="30">30 天</option>
            <option value="90">90 天</option>
            <option value="365">365 天</option>
            <option value="0">不過期（不建議）</option>
          </select>
        </label>
        <div>
          <button type="submit" className="tb-btn tb-btn-gold" disabled={pending}>
            <KeyRound className="h-4 w-4" aria-hidden />
            {pending ? '建立中…' : '建立 API 金鑰'}
          </button>
        </div>
      </form>
      {state ? <p className={state.ok ? 'tb-form-ok' : 'tb-form-error'}>{state.message}</p> : null}
      {state?.token ? (
        <div className="flex flex-wrap items-center gap-2">
          <input readOnly value={state.token} aria-label="API 金鑰" className="tb-input min-w-0 flex-1 font-mono text-xs" onFocus={(event) => event.target.select()} />
          <button
            type="button"
            className="tb-btn tb-btn-sm"
            onClick={() => {
              void navigator.clipboard?.writeText(state.token ?? '').then(() => setCopied(true));
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
