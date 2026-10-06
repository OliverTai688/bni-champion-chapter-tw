import type { Metadata } from 'next';
import { ConsoleGate, ConsoleRail } from '@/components/tbx/console-shell';
import { LINE_LOGIN_ENABLED } from '@/auth';
import { getGoogleIdentity, getLineIdentity } from '@/server/auth/access';
import { getViewer } from '@/server/tbx/viewer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '領導團隊中控 | 長冠軍工具箱',
};

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer.leader) {
    return (
      <div className="tbx min-h-screen">
        <ConsoleGate
          googleEmail={(await getGoogleIdentity())?.email ?? null}
          lineName={(await getLineIdentity())?.name ?? null}
          lineEnabled={LINE_LOGIN_ENABLED}
        />
      </div>
    );
  }

  return (
    <div className="tbx min-h-screen md:grid md:grid-cols-[88px_minmax(0,1fr)]">
      <ConsoleRail leaderName={viewer.leaderName} />
      <main className="mx-auto w-full min-w-0 max-w-[1360px] px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
