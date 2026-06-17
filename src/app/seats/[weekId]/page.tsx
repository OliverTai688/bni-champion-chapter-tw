import { notFound } from 'next/navigation';
import Link from 'next/link';
import SeatingArranger from '@/components/SeatingArranger';
import { AuthButton } from '@/components/auth-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { loadSeatingEditorState } from '@/server/seating/seating-page-state';

export async function generateMetadata(props: PageProps<'/seats/[weekId]'>) {
  const { weekId } = await props.params;
  return {
    title: `${weekId} 座位安排 | Take Seat`,
    description: '單一活動日期的座位安排與調整工具',
  };
}

export default async function SeatingEditorPage(props: PageProps<'/seats/[weekId]'>) {
  const { weekId } = await props.params;
  const state = await loadSeatingEditorState(weekId);
  if (!state) notFound();

  const { layout, week, heroes, memberRoster, loadedFrom } = state;

  return (
    <main className="min-h-screen bg-background py-16 text-foreground transition-colors">
      <div className="mx-auto mb-8 flex max-w-6xl items-end justify-between px-6">
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-foreground/35">
            {week.chapterName}
          </div>
          <h1 className="mb-2 text-4xl font-bold premium-gradient-text">{week.title}</h1>
          <p className="text-sm text-foreground/50">
            編輯 {week.id} 的活動座位表，支援本機草稿、規則檢查、CSV 與 PDF 匯出。
            {loadedFrom === 'database' ? ' 目前載入 MongoDB 座位表。' : null}
          </p>
        </div>
        <div className="no-print flex items-center gap-4">
          <Link
            href={`/admin/events/${encodeURIComponent(week.id)}`}
            className="inline-flex items-center gap-2 rounded-md border border-foreground/10 px-3 py-2 text-xs font-black text-foreground/70"
          >
            活動營運
          </Link>
          <AuthButton />
          <ThemeToggle />
        </div>
      </div>

      <SeatingArranger
        key={week.id}
        week={week}
        initialLayout={layout}
        initialHeroes={heroes}
        initialMemberRoster={memberRoster}
      />
    </main>
  );
}
