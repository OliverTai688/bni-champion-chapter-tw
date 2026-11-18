import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Empty } from '@/components/tbx/ui';
import { getFocusEvent } from '@/server/tbx/events';

export const metadata: Metadata = { title: '今日活動 | 長冠軍工具箱' };

// Fixed links for the LINE rich menu: they always open the current event, so the menu never changes.
const SECTIONS = new Set(['check-in', 'lottery', 'vote']);

export default async function TodayPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  if (section.length > 1 || (section[0] && !SECTIONS.has(section[0]))) notFound();

  // Today's published event, else the next one. The event pages handle "not today yet" themselves.
  const event = await getFocusEvent({ publicOnly: true });
  if (event) redirect(`/e/${encodeURIComponent(event.weekId)}${section[0] ? `/${section[0]}` : ''}`);

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-5 px-4 py-8">
      <Empty
        title="目前沒有開放的活動"
        hint="幹部發布下一場例會後，這裡就會直接打開活動頁。"
        action={
          <Link href="/me" className="tb-btn">
            前往會員區
          </Link>
        }
      />
    </main>
  );
}
