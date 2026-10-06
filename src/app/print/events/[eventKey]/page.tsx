import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { toAdminSeatingWorkspaceDTO } from '@/application/seating/mappers';
import { SeatingPrintView } from '@/components/seating-print';
import { hasLeaderAccess } from '@/server/auth/access';
import { findLatestSeatMapByWeekId } from '@/server/repositories/seating-workspace-repository';
import { loadSeatingWorkspaceState } from '@/server/seating/seating-page-state';
import { getEventByKey } from '@/server/tbx/events';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '列印座位表 | 長冠軍工具箱', robots: { index: false } };

/**
 * Print / PDF of one event's saved grid seat map. `?view=attendance` prints the
 * attendance report instead. Always reads the database, so the date matches the URL.
 */
export default async function PrintEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventKey: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  if (!(await hasLeaderAccess())) {
    return <p style={{ padding: 40, fontFamily: 'system-ui' }}>需要領導團隊權限，請先登入 /console 再列印。</p>;
  }
  const [{ eventKey }, { view }] = await Promise.all([params, searchParams]);
  const event = await getEventByKey(eventKey);
  if (!event) notFound();

  if (view === 'attendance') {
    const seatMap = await findLatestSeatMapByWeekId(event.weekId);
    if (!seatMap) notFound();
    return <SeatingPrintView attendance={toAdminSeatingWorkspaceDTO(seatMap)} />;
  }

  const state = await loadSeatingWorkspaceState(event.weekId);
  return <SeatingPrintView state={state} autoPrint={Boolean(state)} />;
}
