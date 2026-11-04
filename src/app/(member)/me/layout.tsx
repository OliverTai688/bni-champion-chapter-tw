import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MemberTabBar } from '@/components/tbx/member-shell';
import { getViewer } from '@/server/tbx/viewer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '會員區 | 長冠軍工具箱',
};

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  // A leader without a member record (e.g. any Google account while the console is open) has no seat of their own.
  if (!viewer.member) redirect(viewer.leader ? '/console' : '/login?next=/me');

  return (
    <div className="tbx min-h-screen">
      <main className="mx-auto flex w-full max-w-[520px] flex-col gap-4 px-4 pb-28 pt-6">{children}</main>
      <MemberTabBar />
    </div>
  );
}
