'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/tbx/action-state';
import { cn } from '@/lib/utils';

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function SubmitButton({
  children,
  className,
  pendingText,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={cn('tb-btn tb-btn-gold', className)} disabled={pending || disabled}>
      {pending ? pendingText ?? '處理中…' : children}
    </button>
  );
}

/**
 * Form bound to a Server Action that returns `ActionState`.
 * Shows the returned message and optionally resets or reports success.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  onSuccess,
  hideMessage,
  quietSuccess,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
  hideMessage?: boolean;
  /** Show only failures (for one-click row actions where the page itself shows the result). */
  quietSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!state?.ok) return;
    if (resetOnSuccess) formRef.current?.reset();
    onSuccessRef.current?.();
  }, [state, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children}
      {state && !hideMessage && !(quietSuccess && state.ok) ? (
        <p role="status" className={state.ok ? 'tb-form-ok' : 'tb-form-error'}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** Button that opens a modal dialog. `children` receives a `close` callback. */
export function DialogButton({
  label,
  title,
  className,
  children,
}: {
  label: ReactNode;
  title: string;
  className?: string;
  children: (close: () => void) => ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  // The dialog element follows `open`; nothing reads the ref during render.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button type="button" className={cn('tb-btn', className)} onClick={() => setOpen(true)}>
        {label}
      </button>
      <dialog ref={ref} className="tbx tb-dialog" onClose={() => setOpen(false)} aria-label={title}>
        {open ? (
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-tb-line px-5 py-4">
              <h2 className="text-base font-bold">{title}</h2>
              <button type="button" className="tb-btn tb-btn-quiet tb-btn-sm" onClick={close}>
                關閉
              </button>
            </div>
            <div className="px-5 py-4">{children(close)}</div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

/**
 * Two-step destructive submit: first click asks, second click submits the
 * surrounding form. The browser's confirm() is avoided on purpose.
 */
export function ConfirmSubmit({
  children,
  confirmText = '確定？',
  className,
}: {
  children: ReactNode;
  confirmText?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  if (!armed) {
    return (
      <button type="button" className={cn('tb-btn tb-btn-danger tb-btn-sm', className)} onClick={() => setArmed(true)}>
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button type="submit" className={cn('tb-btn tb-btn-danger tb-btn-sm', className)} disabled={pending}>
        {pending ? '處理中…' : confirmText}
      </button>
      <button type="button" className="tb-btn tb-btn-quiet tb-btn-sm" onClick={() => setArmed(false)}>
        取消
      </button>
    </span>
  );
}

/** Link that marks itself current. `exact` matches only the same path. */
export function NavLink({
  href,
  exact,
  match,
  className,
  children,
  ...rest
}: {
  href: string;
  exact?: boolean;
  /** Path prefix that counts as active when it differs from `href`. */
  match?: string;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
}) {
  const pathname = usePathname();
  const base = match ?? href;
  const active = exact ? pathname === base : pathname === base || pathname.startsWith(`${base}/`);
  return (
    <Link href={href} className={className} aria-current={active ? 'page' : undefined} {...rest}>
      {children}
    </Link>
  );
}

/** Re-fetches the current route's server data on an interval while the tab is visible. */
export function AutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}
