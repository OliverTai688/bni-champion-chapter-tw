import { cookies } from 'next/headers';
import Link from 'next/link';
import { CalendarDays, Clock, ExternalLink, LogIn, Mail, UserRound, Vote } from 'lucide-react';
import { AdminPasswordGate } from '@/components/admin-password-gate';
import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken } from '@/server/admin/admin-access';
import { listAdminEventSessions } from '@/server/repositories/admin-event-sessions-repository';
import { listGoogleLoginRecords } from '@/server/repositories/admin-login-records-repository';

export const metadata = {
  title: 'Admin | Take Seat',
  description: 'Take Seat admin records',
};

export default async function AdminPage() {
  const cookieStore = await cookies();
  const hasAccess = verifyAdminAccessToken(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value);

  if (!hasAccess) return <AdminPasswordGate />;

  const records = await listGoogleLoginRecords();
  const eventSessions = await listAdminEventSessions();
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Taipei',
  });

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-foreground/35">Take Seat Admin</div>
            <h1 className="mt-2 text-3xl font-black">Google 登入紀錄</h1>
            <p className="mt-2 text-sm text-foreground/55">顯示最近的 Google 登入者與時間，資料來源為 OperationLog。</p>
          </div>
          <div className="rounded-md border border-foreground/10 bg-foreground/[0.03] px-3 py-2 text-xs font-bold text-foreground/55">
            最近 {records.length} 筆
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-foreground/10">
          <div className="hidden grid-cols-[1.2fr_1.4fr_0.9fr] gap-3 bg-foreground/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-foreground/40 sm:grid">
            <span>Who</span>
            <span>Email</span>
            <span>Time</span>
          </div>
          {records.length > 0 ? (
            <div className="divide-y divide-foreground/10">
              {records.map((record) => (
                <div key={record.id} className="grid gap-3 px-4 py-4 text-sm sm:grid-cols-[1.2fr_1.4fr_0.9fr]">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserRound className="h-4 w-4 shrink-0 text-foreground/35" />
                    <span className="truncate font-bold">{record.name ?? 'Unknown user'}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 text-foreground/60">
                    <Mail className="h-4 w-4 shrink-0 text-foreground/30" />
                    <span className="truncate">{record.email ?? 'No email recorded'}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 text-foreground/60">
                    <Clock className="h-4 w-4 shrink-0 text-foreground/30" />
                    <time dateTime={record.createdAt} className="truncate">
                      {formatter.format(new Date(record.createdAt))}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-10 text-sm text-foreground/50">
              <LogIn className="h-4 w-4" />
              尚未記錄 Google 登入。
            </div>
          )}
        </div>

        <section className="mt-8 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-foreground/35">Event Operations</div>
              <h2 className="mt-1 text-xl font-black">活動營運入口</h2>
              <p className="mt-1 text-sm text-foreground/55">
                投票、結果、結束投票與匯出都綁定到單一活動日期。新增座位表請回到座位表管理。
              </p>
            </div>
            <Link
              href="/seats"
              className="inline-flex items-center gap-2 rounded-md border border-foreground/10 bg-background/70 px-3 py-2 text-xs font-black text-foreground/70"
            >
              <CalendarDays className="h-4 w-4" />
              座位表管理
            </Link>
          </div>

          {eventSessions.length > 0 ? (
            <div className="divide-y divide-foreground/10 overflow-hidden rounded-md border border-foreground/10 bg-background/70">
              {eventSessions.slice(0, 8).map((session) => (
                <div key={session.weekId} className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1fr_0.7fr_0.7fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-black">{session.title}</div>
                    <div className="truncate text-xs text-foreground/45">{session.weekId} · {session.meetingLabel}</div>
                  </div>
                  <div className="text-foreground/60">
                    {session.latestSeatMap
                      ? `${session.latestSeatMap.assignmentCount}/${session.latestSeatMap.seatCount} 已安排`
                      : '尚無座位圖'}
                  </div>
                  <div className="text-foreground/60">
                    {session.openPollCount} open / {session.pollCount} polls
                  </div>
                  <Link
                    href={`/admin/events/${encodeURIComponent(session.weekId)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-3 py-2 text-xs font-black text-background"
                  >
                    <Vote className="h-4 w-4" />
                    管理活動
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-foreground/10 bg-background/70 px-4 py-6 text-sm text-foreground/45">
              尚未建立活動座位表。請先到 /seats 建立一個日期。
            </div>
          )}

          {eventSessions.length > 8 ? (
            <Link
              href="/seats"
              className="mt-4 inline-flex items-center gap-2 text-xs font-black text-emerald-700 underline decoration-emerald-500/40 underline-offset-4 dark:text-emerald-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              查看全部 {eventSessions.length} 個活動
            </Link>
          ) : null}
        </section>
      </section>
    </main>
  );
}
