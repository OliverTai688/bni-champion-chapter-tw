import Link from 'next/link';
import { ActionForm, ConfirmSubmit, SubmitButton } from '@/components/tbx/client';
import { LeaderOnlyNotice } from '@/components/tbx/members/leader-only';
import {
  EditRoleTermButton,
  NewRoleTermButton,
  type RoleTermMemberOption,
} from '@/components/tbx/members/role-term-dialogs';
import { Card, Empty, PageHeader } from '@/components/tbx/ui';
import { taipeiDateKey } from '@/lib/tbx/labels';
import { listRoleTerms, type RoleTermPhase, type RoleTermRow } from '@/server/tbx/member-admin';
import { listChapterMembers } from '@/server/tbx/members';
import { isLeader } from '@/server/tbx/viewer';
import { deleteRoleTermAction, endRoleTermAction } from './actions';

function TermTable({
  terms,
  phase,
  members,
  today,
}: {
  terms: RoleTermRow[];
  phase: RoleTermPhase;
  members: RoleTermMemberOption[];
  today: string;
}) {
  return (
    <table className="tb-table">
      <thead>
        <tr>
          <th>會員</th>
          <th>職位</th>
          <th>開始</th>
          <th>結束</th>
          <th>備註</th>
          <th aria-label="操作" />
        </tr>
      </thead>
      <tbody>
        {terms.map((term) => (
          <tr key={term.id}>
            <td className="whitespace-nowrap">
              <Link
                href={`/console/members/${term.member.id}`}
                className="font-bold text-tb-text no-underline hover:text-tb-gold"
              >
                {term.member.displayName}
              </Link>
              {term.member.isActive ? null : <span className="tb-chip ml-2">已停用</span>}
            </td>
            <td className="whitespace-nowrap">
              <span className={phase === 'current' ? 'tb-chip tb-chip-gold tb-chip-plain' : 'tb-chip tb-chip-plain'}>
                {term.role}
              </span>
            </td>
            <td className="whitespace-nowrap">
              <span className="tb-mono">{taipeiDateKey(term.startsAt)}</span>
            </td>
            <td className="whitespace-nowrap">
              {term.endsAt ? (
                <span className="tb-mono">{taipeiDateKey(term.endsAt)}</span>
              ) : (
                <span className="text-tb-faint">未定</span>
              )}
            </td>
            <td className="text-tb-muted">{term.note}</td>
            <td>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <EditRoleTermButton
                  term={{
                    id: term.id,
                    memberId: term.memberId,
                    role: term.role,
                    startsOn: taipeiDateKey(term.startsAt),
                    endsOn: term.endsAt ? taipeiDateKey(term.endsAt) : '',
                    note: term.note ?? '',
                  }}
                  members={members}
                  today={today}
                />
                {phase === 'current' ? (
                  <ActionForm action={endRoleTermAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="termId" value={term.id} />
                    <SubmitButton className="tb-btn-sm tb-btn-outline" pendingText="處理中…">
                      結束任期
                    </SubmitButton>
                  </ActionForm>
                ) : null}
                <ActionForm action={deleteRoleTermAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="termId" value={term.id} />
                  <ConfirmSubmit confirmText="確定刪除">刪除</ConfirmSubmit>
                </ActionForm>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function RolesPage() {
  if (!(await isLeader())) return <LeaderOnlyNotice />;

  const [terms, chapterMembers] = await Promise.all([listRoleTerms(), listChapterMembers()]);
  const today = taipeiDateKey();

  // Active chapter members, plus anyone who still has a term on record (so old terms stay editable).
  const members: RoleTermMemberOption[] = chapterMembers.map((member) => ({
    id: member.id,
    displayName: member.displayName,
    adminGroup: member.adminGroup,
    isActive: true,
  }));
  const known = new Set(members.map((member) => member.id));
  for (const term of [...terms.current, ...terms.upcoming, ...terms.past]) {
    if (known.has(term.member.id)) continue;
    known.add(term.member.id);
    members.push({ id: term.member.id, displayName: term.member.displayName, adminGroup: null, isActive: false });
  }

  const total = terms.current.length + terms.upcoming.length + terms.past.length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="/console/settings/roles"
        title="職位與任期"
        description="等會員登入完成驗證後，領導團隊的中控權限會依這裡的任期自動開啟與關閉；目前這份名單只作為紀錄，進入中控仍然使用後台密碼或 Google 登入。"
        actions={<NewRoleTermButton members={members} today={today} />}
      />

      {total === 0 ? (
        <Empty
          title="還沒有任何任期"
          hint="按「新增任期」，選會員與職位，填上這一屆的開始日期。任期結束後會自動移到歷任。"
        />
      ) : (
        <>
          <Card
            title="現任"
            aside={`${terms.current.length} 個職位`}
            bodyClassName={terms.current.length > 0 ? 'tb-table-wrap' : undefined}
          >
            {terms.current.length > 0 ? (
              <TermTable terms={terms.current} phase="current" members={members} today={today} />
            ) : (
              <p className="text-sm text-tb-muted">今天沒有任何進行中的任期。新增任期，或檢查開始與結束日期是否涵蓋今天。</p>
            )}
          </Card>

          {terms.upcoming.length > 0 ? (
            <Card title="即將上任" aside={`${terms.upcoming.length} 個職位`} bodyClassName="tb-table-wrap">
              <TermTable terms={terms.upcoming} phase="upcoming" members={members} today={today} />
            </Card>
          ) : null}

          <Card
            title="歷任"
            aside={`${terms.past.length} 筆`}
            bodyClassName={terms.past.length > 0 ? 'tb-table-wrap' : undefined}
          >
            {terms.past.length > 0 ? (
              <TermTable terms={terms.past} phase="past" members={members} today={today} />
            ) : (
              <p className="text-sm text-tb-muted">還沒有已結束的任期。</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
