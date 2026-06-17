import SeatingArranger from '@/components/SeatingArranger';
import { AuthButton } from '@/components/auth-button';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  CURRENT_MEETING_WEEK,
  CURRENT_SEATING_MEMBER_ROSTER,
  CURRENT_SEATING_HEROES,
  CURRENT_SEATING_LAYOUT,
} from '@/lib/seating-week';

export const metadata = {
  title: '座位安排 | Take Seat',
  description: '智慧座位安排與調整工具',
};

export default async function SeatingPage() {
  const layout = CURRENT_SEATING_LAYOUT;
  const week = CURRENT_MEETING_WEEK;

  return (
    <main className="min-h-screen bg-background text-foreground py-16 transition-colors">
      <div className="max-w-6xl mx-auto px-6 mb-8 flex items-end justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.28em] text-foreground/35 mb-2">
            {week.chapterName}
          </div>
          <h1 className="text-4xl font-bold premium-gradient-text mb-2">{week.title}</h1>
          <p className="text-foreground/50 text-sm">
            以每週例會排座規則為核心，支援本機草稿、規則檢查、CSV 與 PDF 匯出。
          </p>
        </div>
        <div className="flex gap-4 items-center no-print">
          <AuthButton />
          <ThemeToggle />
        </div>
      </div>

      <SeatingArranger
        week={week}
        initialLayout={layout}
        initialHeroes={CURRENT_SEATING_HEROES}
        initialMemberRoster={CURRENT_SEATING_MEMBER_ROSTER}
      />
    </main>
  );
}
