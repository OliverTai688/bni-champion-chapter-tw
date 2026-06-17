import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, ClipboardList, ExternalLink, Radio, UsersRound } from 'lucide-react';
import { AdminPasswordGate } from '@/components/admin-password-gate';
import { AdminPollControls } from '@/components/admin-poll-controls';
import { EventPublicationControls } from '@/components/event-publication-controls';
import { SeatTemplateSavePanel } from '@/components/seat-template-save-panel';
import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken } from '@/server/admin/admin-access';
import { listAdminEventSessions } from '@/server/repositories/admin-event-sessions-repository';

export async function generateMetadata(props: PageProps<'/admin/events/[weekId]'>) {
  const { weekId } = await props.params;
  return {
    title: `${weekId} 活動營運 | Take Seat`,
    description: '單一活動的公開頁、投票、結果與匯出管理',
  };
}

export default async function AdminEventPage(props: PageProps<'/admin/events/[weekId]'>) {
  const cookieStore = await cookies();
  const hasAccess = verifyAdminAccessToken(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value);

  if (!hasAccess) return <AdminPasswordGate />;

  const { weekId } = await props.params;
  const sessions = await listAdminEventSessions();
  const session = sessions.find((item) => item.weekId === weekId);
  if (!session) notFound();

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-md border border-foreground/10 px-3 py-2 text-xs font-black text-foreground/70"
          >
            <ArrowLeft className="h-4 w-4" />
            返回 Admin
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/seats"
              className="inline-flex items-center gap-2 rounded-md border border-foreground/10 px-3 py-2 text-xs font-black text-foreground/70"
            >
              <CalendarDays className="h-4 w-4" />
              座位表列表
            </Link>
            <Link
              href={`/seats/${encodeURIComponent(session.weekId)}`}
              className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-xs font-black text-background"
            >
              <ClipboardList className="h-4 w-4" />
              編輯座位
            </Link>
          </div>
        </div>

        <header className="mb-6 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.28em] text-foreground/35">
                Event Operations
              </div>
              <h1 className="mt-2 text-3xl font-black">{session.title}</h1>
              <p className="mt-2 text-sm text-foreground/55">
                {session.chapterName} · {session.weekId} · {session.meetingLabel}
              </p>
            </div>
            {session.publicSlug ? (
              <Link
                href={`/w/${session.publicSlug}`}
                className="inline-flex items-center gap-2 rounded-md border border-foreground/10 bg-background/70 px-3 py-2 text-xs font-black text-foreground/70"
              >
                <ExternalLink className="h-4 w-4" />
                開啟公開頁
              </Link>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Metric
              icon={<UsersRound className="h-4 w-4" />}
              label="座位安排"
              value={session.latestSeatMap ? `${session.latestSeatMap.assignmentCount}/${session.latestSeatMap.seatCount}` : '尚無'}
            />
            <Metric icon={<ExternalLink className="h-4 w-4" />} label="公開狀態" value={session.publicStatus} />
            <Metric icon={<Radio className="h-4 w-4" />} label="投票狀態" value={`${session.openPollCount} open / ${session.pollCount}`} />
          </div>
        </header>

        <EventPublicationControls weekId={session.weekId} embedded />
        <SeatTemplateSavePanel weekId={session.weekId} defaultName={`${session.title} 模板`} />
        <AdminPollControls weekId={session.weekId} />
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-foreground/10 bg-background/70 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-foreground/35">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}
