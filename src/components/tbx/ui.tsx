import type { ReactNode } from 'react';
import { STATUS_LABEL, type ParticipationStatusKey } from '@/lib/tbx/labels';
import { cn } from '@/lib/utils';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="tb-eyebrow">{eyebrow}</div> : null}
        <h1 className="mt-1 text-2xl font-bold leading-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-[68ch] text-sm text-tb-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('tb-card', className)}>
      {title ? (
        <div className="tb-card-head">
          <h2>{title}</h2>
          {aside ? <div className="flex flex-wrap items-center gap-2 text-xs text-tb-muted">{aside}</div> : null}
        </div>
      ) : null}
      <div className={cn(bodyClassName ?? 'tb-card-body')}>{children}</div>
    </section>
  );
}

export function StatusChip({
  status,
  substituteArrived,
  guest,
}: {
  status: ParticipationStatusKey;
  substituteArrived?: boolean;
  guest?: boolean;
}) {
  if (status === 'substitute') {
    return <span className="tb-chip tb-chip-substitute">{substituteArrived ? '代理・已到' : '代理・未到'}</span>;
  }
  if (guest && (status === 'present' || status === 'late')) {
    return <span className="tb-chip tb-chip-guest">來賓・已到</span>;
  }
  return <span className={cn('tb-chip', status !== 'expected' && `tb-chip-${status}`)}>{STATUS_LABEL[status]}</span>;
}

export function Empty({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-tb-line px-6 py-10 text-center">
      <p className="text-base font-bold">{title}</p>
      {hint ? <p className="max-w-[48ch] text-sm text-tb-muted">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Stat({
  value,
  total,
  label,
  hint,
  tone,
}: {
  value: ReactNode;
  total?: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  tone?: 'ok' | 'sub' | 'bad' | 'guest' | 'late' | 'gold';
}) {
  const color = tone ? `var(--tb-${tone})` : 'var(--tb-text)';
  return (
    <div className="flex flex-col gap-1 border-l border-tb-line px-4 first:border-l-0 first:pl-0">
      <span className="tb-num text-[32px] font-semibold" style={{ color }}>
        {value}
        {total !== undefined ? <span className="text-lg text-tb-faint">/{total}</span> : null}
      </span>
      <span className="text-xs text-tb-muted">{label}</span>
      {hint ? <span className="text-[11.5px] text-tb-faint">{hint}</span> : null}
    </div>
  );
}

/** Marks a page that exists in the router but is not built yet. */
export function PlannedPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="規劃中" title={title} description={description} />
      <Empty title="這個工具還沒有開放" hint="路由與位置已經保留，之後會在這裡上線。" />
    </div>
  );
}
