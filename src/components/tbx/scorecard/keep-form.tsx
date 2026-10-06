'use client';

import { useState, useTransition, type FormEvent, type ReactNode } from 'react';
import type { ActionState } from '@/lib/tbx/action-state';
import { cn } from '@/lib/utils';

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Like `ActionForm`, but the inputs keep what was typed when the action returns an error.
 * (A form bound through the `action` prop is reset by React after every submit, which
 * would throw away a half-edited rule table or a page of name choices.)
 */
export function KeepForm({
  action,
  children,
  className,
  submitLabel,
  pendingText = '處理中…',
  submitClassName,
  footer,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  submitLabel: ReactNode;
  pendingText?: string;
  submitClassName?: string;
  /** Shown next to the submit button. */
  footer?: ReactNode;
}) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setState(await action(null, formData));
    });
  }

  return (
    <form onSubmit={submit} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={cn('tb-btn tb-btn-gold', submitClassName)} disabled={pending}>
          {pending ? pendingText : submitLabel}
        </button>
        {footer}
      </div>
      {state ? (
        <p role="status" className={state.ok ? 'tb-form-ok' : 'tb-form-error'}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
