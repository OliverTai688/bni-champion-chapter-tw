import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, ClipboardList, ExternalLink, FileText, Vote } from 'lucide-react';
import { AuthButton } from '@/components/auth-button';
import { SeatMapCreatePanel } from '@/components/seat-map-create-panel';
import { ThemeToggle } from '@/components/theme-toggle';
import { listAdminEventSessions, listSeatTemplates } from '@/server/repositories/admin-event-sessions-repository';

export const metadata = {
  title: '座位表管理 | Take Seat',
  description: '管理多個活動日期的座位表',
};

const SEATING_INDEX_DATA_TIMEOUT_MS = 6000;

type SeatingIndexState = {
  sessions: Awaited<ReturnType<typeof listAdminEventSessions>>;
  templates: Awaited<ReturnType<typeof listSeatTemplates>>;
  databaseStatus: 'ready' | 'timeout' | 'error';
};

async function loadSeatingIndexState(): Promise<SeatingIndexState> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const dataPromise = Promise.all([listAdminEventSessions(), listSeatTemplates()])
    .then(([sessions, templates]) => ({
      sessions,
      templates,
      databaseStatus: 'ready' as const,
    }))
    .catch((error) => {
      console.error('[seats] failed to load seating index data', error);
      return {
        sessions: [],
        templates: [],
        databaseStatus: 'error' as const,
      };
    });

  const timeoutPromise = new Promise<SeatingIndexState>((resolve) => {
    timeoutId = setTimeout(() => {
      console.error(`[seats] seating index data load timed out after ${SEATING_INDEX_DATA_TIMEOUT_MS}ms`);
      resolve({
        sessions: [],
        templates: [],
        databaseStatus: 'timeout',
      });
    }, SEATING_INDEX_DATA_TIMEOUT_MS);
  });

  const state = await Promise.race([dataPromise, timeoutPromise]);
  if (timeoutId) clearTimeout(timeoutId);
  return state;
}

export default async function SeatingIndexPage(props: PageProps<'/seats'>) {
  const searchParams = await props.searchParams;
  if (typeof searchParams.weekId === 'string' && searchParams.weekId) {
    redirect(`/seats/${encodeURIComponent(searchParams.weekId)}`);
  }

  const { sessions, templates, databaseStatus } = await loadSeatingIndexState();
  const totalSeats = sessions.reduce((sum, session) => sum + (session.latestSeatMap?.seatCount ?? 0), 0);
  const totalAssigned = sessions.reduce((sum, session) => sum + (session.latestSeatMap?.assignmentCount ?? 0), 0);
  const openPollCount = sessions.reduce((sum, session) => sum + session.openPollCount, 0);

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <section className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-foreground/35">BNI 長冠軍分會</div>
            <h1 className="mt-2 text-4xl font-black">座位表管理</h1>
            <p className="mt-2 max-w-2xl text-sm text-foreground/55">
              先選擇活動日期，再進入單一天的座位編輯器。公開頁、投票與匯出都應綁定到明確的活動座位表。
            </p>
          </div>
          <div className="flex items-center gap-4">
            <AuthButton />
            <ThemeToggle />
          </div>
        </header>

        {databaseStatus !== 'ready' ? (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-black">部署環境暫時無法載入座位資料</div>
              <p className="mt-1 text-xs leading-5">
                請檢查 Vercel 環境變數 DATABASE_URL、MongoDB Atlas Network Access，以及 production 資料庫是否已執行 prisma db push。
                頁面已先以空清單載入，避免公開部署整頁失敗。
              </p>
            </div>
          </div>
        ) : null}

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <Metric label="活動日期" value={sessions.length} />
          <Metric label="座位安排" value={`${totalAssigned}/${totalSeats}`} />
          <Metric label="開放投票" value={openPollCount} />
        </div>

        <SeatMapCreatePanel sessions={sessions} templates={templates} />

        <section className="overflow-hidden rounded-lg border border-foreground/10">
          <div className="hidden grid-cols-[0.9fr_1.35fr_0.75fr_0.75fr_0.75fr_1fr] gap-3 bg-foreground/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-foreground/40 lg:grid">
            <span>Date</span>
            <span>Title</span>
            <span>Seats</span>
            <span>Public</span>
            <span>Polls</span>
            <span>Actions</span>
          </div>

          {sessions.length > 0 ? (
            <div className="divide-y divide-foreground/10">
              {sessions.map((session) => (
                <div key={session.weekId} className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[0.9fr_1.35fr_0.75fr_0.75fr_0.75fr_1fr] lg:items-center">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-foreground/35 lg:hidden">Date</div>
                    <div className="font-black">{session.weekId}</div>
                    <div className="text-xs text-foreground/45">
                      {new Date(session.date).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-foreground/35 lg:hidden">Title</div>
                    <div className="truncate font-black">{session.title}</div>
                    <div className="truncate text-xs text-foreground/45">{session.meetingLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-foreground/35 lg:hidden">Seats</div>
                    {session.latestSeatMap
                      ? `${session.latestSeatMap.assignmentCount}/${session.latestSeatMap.seatCount}`
                      : '尚無'}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-foreground/35 lg:hidden">Public</div>
                    {session.publicStatus}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-foreground/35 lg:hidden">Polls</div>
                    {session.openPollCount} open / {session.pollCount}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/seats/${encodeURIComponent(session.weekId)}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-xs font-black text-background"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      編輯
                    </Link>
                    {session.publicSlug ? (
                      <Link
                        href={`/w/${session.publicSlug}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-foreground/10 px-3 py-2 text-xs font-black text-foreground/65"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        公開頁
                      </Link>
                    ) : null}
                    <Link
                      href={`/admin/events/${encodeURIComponent(session.weekId)}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-foreground/10 px-3 py-2 text-xs font-black text-foreground/65"
                    >
                      <Vote className="h-3.5 w-3.5" />
                      營運
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-10 text-sm text-foreground/50">
              <FileText className="h-4 w-4" />
              尚未建立任何活動座位表。
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] px-4 py-3">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-foreground/35">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
