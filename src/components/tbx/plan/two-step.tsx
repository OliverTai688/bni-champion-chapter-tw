'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Two-step button for destructive changes to local (unsaved) state.
 * For Server Action forms use `ConfirmSubmit` from `@/components/tbx/client` instead.
 */
export function TwoStepButton({
  children,
  confirmText = '確定？',
  onConfirm,
  className,
  disabled,
}: {
  children: ReactNode;
  confirmText?: string;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        type="button"
        className={cn('tb-btn tb-btn-danger tb-btn-sm', className)}
        disabled={disabled}
        onClick={() => setArmed(true)}
      >
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        className={cn('tb-btn tb-btn-danger tb-btn-sm', className)}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmText}
      </button>
      <button type="button" className="tb-btn tb-btn-quiet tb-btn-sm" onClick={() => setArmed(false)}>
        取消
      </button>
    </span>
  );
}
