import type { Metadata } from 'next';
import Link from 'next/link';
import { eventTypeLabel, formatEventDate } from '@/lib/tbx/labels';
import { listUpcomingEvents, upcomingThursdays } from '@/server/tbx/events';
import { listChapterMembers } from '@/server/tbx/members';
import { getViewer } from '@/server/tbx/viewer';
import { LeaveForm, type LeaveEventOption } from './leave-form';

export const metadata: Metadata = { title: '請假／代理登記 | 長冠軍工具箱' };

export default async function LeavePage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event: requested } = await searchParams;
  const [viewer, events, members] = await Promise.all([getViewer(), listUpcomingEvents(12), listChapterMembers()]);

  const options: LeaveEventOption[] = events.map((event) => ({
    key: event.weekId,
    label: `${formatEventDate(event.date)} ${event.title}（${eventTypeLabel(event.eventType)}）`,
  }));
  // Thursdays that have no event yet: registering creates a draft shell, as /pre-leave did.
  const known = new Set(events.map((event) => event.weekId));
  for (const date of upcomingThursdays(5)) {
    if (known.has(date)) continue;
    options.push({ key: date, label: `${formatEventDate(new Date(`${date}T00:00:00.000Z`))} 每週例會（尚未建立）` });
  }
  options.sort((a, b) => a.key.localeCompare(b.key));

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-5 px-4 py-8">
      <div>
        <div className="tb-eyebrow">長冠軍工具箱</div>
        <h1 className="mt-1 text-2xl font-bold">請假／代理登記</h1>
        <p className="mt-1 text-sm text-tb-muted">
          登記後，幹部排座位時就會看到。登記代理人不等於簽到，代理人當天到場還是要簽到。
        </p>
      </div>
      <div className="tb-card p-4">
        <LeaveForm
          events={options}
          members={members.map((member) => ({ id: member.id, name: member.displayName }))}
          me={viewer.member ? { id: viewer.member.id, name: viewer.member.displayName } : null}
          defaultEventKey={requested && options.some((option) => option.key === requested) ? requested : undefined}
        />
      </div>
      <div className="flex justify-between text-sm">
        <Link href="/" className="text-tb-muted">
          回首頁
        </Link>
        <Link href={viewer.member ? '/me' : '/login?next=/leave'} className="text-tb-muted">
          {viewer.member ? '回會員區' : '記住我的身份'}
        </Link>
      </div>
    </main>
  );
}
