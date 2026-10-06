'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/tbx/action-state';
import { cn } from '@/lib/utils';

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Small inline form for a row button. Errors always show; the success message
 * shows only when `showSuccess` is set, because the list itself already changes.
 */
export function QuietForm({
  action,
  children,
  className,
  showSuccess,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  showSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={cn('inline-flex flex-wrap items-center gap-2', className)}>
      {children}
      {state && !state.ok ? (
        <p role="alert" className="tb-form-error basis-full">
          {state.message}
        </p>
      ) : null}
      {state?.ok && showSuccess ? (
        <p role="status" className="tb-form-ok basis-full">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/**
 * Two-step submit for actions that are not destructive but should not fire on
 * a stray tap (draw, redraw). Must be inside a form.
 */
export function ConfirmButton({
  children,
  confirmText,
  className,
  confirmClassName,
  disabled,
}: {
  children: ReactNode;
  confirmText: string;
  className?: string;
  confirmClassName?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [wasPending, setWasPending] = useState(false);
  const { pending } = useFormStatus();

  // Go back to the first step once the submit finishes.
  if (pending !== wasPending) {
    setWasPending(pending);
    if (!pending) setArmed(false);
  }

  if (!armed) {
    return (
      <button type="button" className={cn('tb-btn tb-btn-sm', className)} disabled={disabled} onClick={() => setArmed(true)}>
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <button type="submit" className={cn('tb-btn tb-btn-sm', confirmClassName ?? className)} disabled={pending}>
        {pending ? '處理中…' : confirmText}
      </button>
      <button type="button" className="tb-btn tb-btn-quiet tb-btn-sm" disabled={pending} onClick={() => setArmed(false)}>
        取消
      </button>
    </span>
  );
}

/** Plain submit button for a row form (move up, move down). */
export function RowSubmit({
  children,
  className,
  disabled,
  label,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  label?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={cn('tb-btn tb-btn-quiet tb-btn-sm', className)} disabled={pending || disabled} aria-label={label}>
      {children}
    </button>
  );
}
