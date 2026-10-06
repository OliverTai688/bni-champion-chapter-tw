'use client';

import { useState, useTransition, type FormEvent, type ReactNode } from 'react';
import type { ActionState } from '@/lib/tbx/action-state';
import { cn } from '@/lib/utils';

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Like `ActionForm`, for long forms. A form bound with `action={...}` is reset
 * by React after every submit, including one the server rejected, which would
 * throw away a 300-character introduction over one bad field. This one calls
 * the Server Action itself, so what the person typed stays put.
 */
export function KeepValuesForm({
  action,
  children,
  className,
  submitLabel,
  submitClassName,
  onSuccess,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  submitLabel: string;
  submitClassName?: string;
  onSuccess?: () => void;
}) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      let result: ActionState;
      try {
        result = await action(null, formData);
      } catch {
        result = { ok: false, message: '連線中斷，資料還沒儲存。請確認網路後再按一次。' };
      }
      setState(result);
      if (result?.ok) onSuccess?.();
    });
  }

  return (
    <form onSubmit={submit} className={className}>
      {children}
      {state ? (
        <p role="status" className={state.ok ? 'tb-form-ok' : 'tb-form-error'}>
          {state.message}
        </p>
      ) : null}
      <button type="submit" className={cn('tb-btn tb-btn-gold', submitClassName)} disabled={pending}>
        {pending ? '儲存中…' : submitLabel}
      </button>
    </form>
  );
}
