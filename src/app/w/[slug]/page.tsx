import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, Ticket } from 'lucide-react';
import { toPublicWeeklyEventDTO } from '@/application/events/mappers';
import { findPublicWeeklyEventBySlug } from '@/server/repositories/weekly-public-event-repository';
import { PublicAttendanceLivePanel } from '@/components/public-attendance-live-panel';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '每週活動頁 | Take Seat',
  description: '公開檢視每週活動狀態與匿名投票入口',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  preview: '預覽中',
  published: '已發布',
  live: '進行中',
  completed: '已結束',
  archived: '已封存',
  hidden: '未公開',
};

export default async function WeeklyPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await findPublicWeeklyEventBySlug(slug);
  if (!event) notFound();

  const dto = toPublicWeeklyEventDTO(event);
  const openPoll = dto.polls.find((poll) => poll.status === 'open');
  const isLive = dto.publicStatus === 'live';
  const statusLabel = STATUS_LABELS[dto.publicStatus] ?? dto.publicStatus;
  const eventDate = new Intl.DateTimeFormat('zh-TW', {
    dateStyle: 'medium',
    timeZone: 'Asia/Taipei',
  }).format(new Date(dto.date));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-8 sm:py-8 lg:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-foreground/35">
            {dto.chapterName}
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              isLive
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border border-foreground/10 bg-foreground/[0.04] text-foreground/60'
            }`}
          >
            {isLive ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
            {statusLabel}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              <CalendarDays className="h-4 w-4" />
              {eventDate} · {dto.meetingLabel}
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-5xl lg:text-6xl">{dto.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-foreground/60 sm:mt-5 sm:text-lg">
              這是本週活動的公開檢視頁。座位與出席資訊只顯示匿名統計；需要參與投票時，請使用現場公布的代號。
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              {openPoll ? (
                <Link
                  href={`/w/${dto.slug}/vote`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-black text-background transition hover:opacity-90 active:scale-[0.99]"
                >
                  <Ticket className="h-4 w-4" />
                  {openPoll.eligibility === 'public' ? '直接公開投票' : '輸入現場代碼投票'}
                </Link>
              ) : null}
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/15 px-4 py-3 text-sm font-bold text-foreground/70 transition hover:bg-foreground/[0.06]"
              >
                返回首頁
              </Link>
            </div>
          </div>

          <PublicAttendanceLivePanel initialEvent={dto} />
        </div>
      </section>
    </main>
  );
}
