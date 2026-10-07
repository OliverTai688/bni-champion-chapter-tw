import { leaderGuard } from '@/components/tbx/leader-guard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, AutoRefresh, ConfirmSubmit } from '@/components/tbx/client';
import { Card, Empty, RoleChips, Stat, StatusChip } from '@/components/tbx/ui';
import { formatTime } from '@/lib/tbx/labels';
import { getEventByKey } from '@/server/tbx/events';
import { getMeetingRoles } from '@/server/tbx/meeting-roles';
import { listChapterMembers } from '@/server/tbx/members';
import { getAttendance } from '@/server/tbx/participation';
import { quickAttendanceAction, removeGuestAction } from './actions';
import { AddGuestButton, EditAttendanceButton, EditGuestButton } from './attendance-forms';

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'expected', label: '未到' },
  { key: 'substitute', label: '代理' },
  { key: 'absent', label: '請假' },
  { key: 'arrived', label: '已到' },
];

function QuickButton({ eventKey, id, intent, label, gold }: { eventKey: string; id: string; intent: string; label: string; gold?: boolean }) {
  return (
    <ActionForm action={quickAttendanceAction} quietSuccess>
      <input type="hidden" name="eventKey" value={eventKey} />
      <input type="hidden" name="participationId" value={id} />
      <input type="hidden" name="intent" value={intent} />
      <button type="submit" className={gold ? 'tb-btn tb-btn-sm tb-btn-gold' : 'tb-btn tb-btn-sm'}>
        {label}
      </button>
    </ActionForm>
  );
}

export default async function AttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventKey: string }>;
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { eventKey } = await params;
  const denied = await leaderGuard();
  if (denied) return denied;
  const { filter = 'all', q = '' } = await searchParams;
  const event = await getEventByKey(eventKey);
  if (!event) notFound();

  const [{ rows, summary }, members] = await Promise.all([getAttendance(event.id), listChapterMembers()]);
  const memberOptions = members.map((member) => ({ id: member.id, name: member.displayName }));
  const roles = await getMeetingRoles(event.id);
  const memberName = new Map(members.map((member) => [member.id, member.displayName]));
  const base = `/console/events/${encodeURIComponent(event.weekId)}/attendance`;
  const query = q.trim();

  const order: Record<string, number> = { expected: 0, substitute: 1, absent: 2, medical: 2, late: 3, present: 4 };
  const memberRows = rows
    .filter((row) => row.kind === 'member')
    .filter((row) => {
      if (query && !row.displayName.includes(query) && !(row.substituteName ?? '').includes(query)) return false;
      if (filter === 'expected') return row.status === 'expected';
      if (filter === 'substitute') return row.status === 'substitute';
      if (filter === 'absent') return row.status === 'absent' || row.status === 'medical';
      if (filter === 'arrived') return row.status === 'present' || row.status === 'late';
      return true;
    })
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.displayName.localeCompare(b.displayName, 'zh-Hant'));
  const guests = rows.filter((row) => row.kind === 'guest');

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh seconds={15} />

      <div className="tb-card flex flex-wrap gap-y-4 p-4">
        <Stat value={summary.arrived} total={summary.members} label="會員已到" hint={`其中遲到 ${summary.late}`} tone="ok" />
        <Stat value={summary.substitutes} label="代理" hint={`代理人已到 ${summary.substitutesArrived}`} tone="sub" />
        <Stat value={summary.absent} label="請假" tone="bad" />
        <Stat value={summary.expected} label="未到" />
        <Stat value={summary.guestsArrived} total={summary.guests} label="來賓" tone="guest" />
        <Stat value={summary.inRoom} label="現場總人數" hint="投票與抽獎以此為準" tone="gold" />
      </div>

      <Card
        title="會員"
        aside={
          <form className="flex flex-wrap items-center gap-2" action={base}>
            <input type="hidden" name="filter" value={filter} />
            <label className="sr-only" htmlFor="attendance-q">
              搜尋會員
            </label>
            <input id="attendance-q" name="q" defaultValue={query} placeholder="搜尋姓名" className="tb-input h-[30px] min-h-0 w-36" />
            <button type="submit" className="tb-btn tb-btn-sm">
              搜尋
            </button>
          </form>
        }
        bodyClassName="p-0"
      >
        <div className="flex flex-wrap gap-2 border-b border-tb-line px-4 py-3">
          {FILTERS.map((item) => (
            <Link
              key={item.key}
              href={`${base}?filter=${item.key}${query ? `&q=${encodeURIComponent(query)}` : ''}`}
              className={filter === item.key ? 'tb-btn tb-btn-sm tb-btn-outline' : 'tb-btn tb-btn-sm tb-btn-quiet'}
              aria-current={filter === item.key ? 'true' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
        {memberRows.length === 0 ? (
          <div className="p-4">
            <Empty title="沒有符合條件的會員" hint="換一個篩選條件，或清除搜尋文字。" />
          </div>
        ) : (
          <div className="tb-table-wrap">
            <table className="tb-table">
              <thead>
                <tr>
                  <th>會員</th>
                  <th>狀態</th>
                  <th>代理人 / 備註</th>
                  <th>時間</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {memberRows.map((row) => {
                  const arrived = row.status === 'present' || row.status === 'late';
                  return (
                    <tr key={row.id}>
                      <td className="font-bold">
                        <span className="whitespace-nowrap">{row.displayName}</span>
                        <RoleChips roles={roles.get(row.id)?.filter((role) => role.kind !== 'substitute')} className="ml-2" />
                      </td>
                      <td>
                        <StatusChip status={row.status} substituteArrived={Boolean(row.substituteArrivedAt)} />
                      </td>
                      <td className="text-tb-muted">
                        {row.status === 'substitute' ? <span className="font-semibold text-tb-sub">{row.substituteName}</span> : null}
                        {row.note ? <span className="ml-2 text-xs">{row.note}</span> : null}
                      </td>
                      <td className="tb-mono whitespace-nowrap text-tb-faint">
                        {formatTime(row.status === 'substitute' ? row.substituteArrivedAt : row.checkedInAt)}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {row.status === 'expected' ? (
                            <>
                              <QuickButton eventKey={event.weekId} id={row.id} intent="present" label="簽到" gold />
                              <QuickButton eventKey={event.weekId} id={row.id} intent="late" label="遲到" />
                            </>
                          ) : null}
                          {row.status === 'substitute' && !row.substituteArrivedAt ? (
                            <QuickButton eventKey={event.weekId} id={row.id} intent="substitute_arrived" label="代理人到" gold />
                          ) : null}
                          {arrived || (row.status === 'substitute' && row.substituteArrivedAt) ? (
                            <QuickButton eventKey={event.weekId} id={row.id} intent="undo" label="取消簽到" />
                          ) : null}
                          <EditAttendanceButton
                            eventKey={event.weekId}
                            row={{
                              id: row.id,
                              displayName: row.displayName,
                              status: row.status,
                              substituteName: row.substituteName,
                              substituteArrived: Boolean(row.substituteArrivedAt),
                              note: row.note,
                              duties: row.roles,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="來賓" aside={<AddGuestButton eventKey={event.weekId} members={memberOptions} />} bodyClassName="p-0">
        {guests.length === 0 ? (
          <div className="p-4">
            <Empty title="還沒有來賓" hint="事先登記來賓，當天就能直接簽到；來賓也可以在公開簽到頁自己登記。" />
          </div>
        ) : (
          <div className="tb-table-wrap">
            <table className="tb-table">
              <thead>
                <tr>
                  <th>來賓</th>
                  <th>產業 / 公司</th>
                  <th>邀請人</th>
                  <th>執事</th>
                  <th>狀態</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {guests.map((guest) => {
                  const arrived = guest.status === 'present' || guest.status === 'late';
                  return (
                    <tr key={guest.id}>
                      <td className="whitespace-nowrap font-bold">{guest.displayName}</td>
                      <td className="text-tb-muted">{[guest.guestIndustry, guest.guestCompany].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="text-tb-muted">{guest.invitedByMemberId ? memberName.get(guest.invitedByMemberId) ?? '—' : '—'}</td>
                      <td className="text-tb-muted">{guest.hostMemberId ? memberName.get(guest.hostMemberId) ?? '—' : '—'}</td>
                      <td>
                        <StatusChip status={guest.status} guest />
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {arrived ? (
                            <QuickButton eventKey={event.weekId} id={guest.id} intent="undo" label="取消簽到" />
                          ) : (
                            <QuickButton eventKey={event.weekId} id={guest.id} intent="present" label="簽到" gold />
                          )}
                          <EditGuestButton
                            eventKey={event.weekId}
                            members={memberOptions}
                            guest={{
                              id: guest.id,
                              displayName: guest.displayName,
                              guestIndustry: guest.guestIndustry,
                              guestCompany: guest.guestCompany,
                              hostMemberId: guest.hostMemberId,
                              invitedByMemberId: guest.invitedByMemberId,
                              note: guest.note,
                            }}
                          />
                          <ActionForm action={removeGuestAction} quietSuccess>
                            <input type="hidden" name="eventKey" value={event.weekId} />
                            <input type="hidden" name="participationId" value={guest.id} />
                            <ConfirmSubmit confirmText="確定移除">移除</ConfirmSubmit>
                          </ActionForm>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
