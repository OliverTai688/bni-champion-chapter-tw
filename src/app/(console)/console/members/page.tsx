import Form from 'next/form';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { ActionForm, ConfirmSubmit, SubmitButton } from '@/components/tbx/client';
import { LeaderOnlyNotice } from '@/components/tbx/members/leader-only';
import { EditMemberButton, NewMemberButton } from '@/components/tbx/members/member-dialogs';
import { toMemberFormValues } from '@/components/tbx/members/member-values';
import { Card, Empty, PageHeader } from '@/components/tbx/ui';
import { formatDateTime } from '@/lib/tbx/labels';
import {
  UNGROUPED,
  getMemberRosterMeta,
  listMembersForAdmin,
  listUncategorizedMembers,
  type MemberStatusFilter,
} from '@/server/tbx/member-admin';
import { isLeader } from '@/server/tbx/viewer';
import { setMemberActiveAction, setMemberCategoryAction, syncMemberDirectoryAction } from './actions';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function readStatus(value: string): MemberStatusFilter {
  return value === 'inactive' || value === 'all' ? value : 'active';
}

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await isLeader())) return <LeaderOnlyNotice />;

  const params = await searchParams;
  const q = first(params.q);
  const group = first(params.group);
  const status = readStatus(first(params.status));
  const filtered = Boolean(q || group || status !== 'active');

  const [members, meta, uncategorized] = await Promise.all([
    listMembersForAdmin({ q, group, status }),
    getMemberRosterMeta(),
    listUncategorizedMembers(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="/console/members"
        title="會員名冊"
        description={`在籍 ${meta.active} 位、停用 ${meta.inactive} 位。會員會出現在座位表、出席與投票紀錄裡，所以名冊只能停用，不會刪除。`}
        actions={
          <>
            <ActionForm action={syncMemberDirectoryAction} className="flex flex-wrap items-center gap-2">
              <SubmitButton className="tb-btn-outline" pendingText="同步中…">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                從靜態名冊同步
              </SubmitButton>
            </ActionForm>
            <NewMemberButton groups={meta.groups} />
          </>
        }
      />

      {/* Keyed so "清除篩選" also clears what was typed into the uncontrolled fields. */}
      <Form key={`${q}|${group}|${status}`} action="/console/members" className="tb-card flex flex-wrap items-end gap-3 p-4">
        <label className="tb-label min-w-[180px] flex-1" htmlFor="members-q">
          搜尋
          <input
            id="members-q"
            name="q"
            type="search"
            className="tb-input"
            defaultValue={q}
            placeholder="姓名、產業、公司或別名"
          />
        </label>
        <label className="tb-label w-full sm:w-[160px]" htmlFor="members-group">
          行政分組
          <select id="members-group" name="group" className="tb-select" defaultValue={group}>
            <option value="">全部分組</option>
            {meta.groups.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={UNGROUPED}>未分組</option>
          </select>
        </label>
        <label className="tb-label w-full sm:w-[130px]" htmlFor="members-status">
          狀態
          <select id="members-status" name="status" className="tb-select" defaultValue={status}>
            <option value="active">在籍</option>
            <option value="inactive">停用</option>
            <option value="all">全部</option>
          </select>
        </label>
        <button type="submit" className="tb-btn">
          套用篩選
        </button>
        {filtered ? (
          <Link href="/console/members" className="tb-btn tb-btn-quiet">
            清除篩選
          </Link>
        ) : null}
      </Form>

      {members.length === 0 ? (
        meta.total === 0 ? (
          <Empty
            title="名冊還沒有會員"
            hint="按上方「從靜態名冊同步」把現有的會員名單帶進來，或用「新增會員」逐位建立。"
          />
        ) : (
          <Empty
            title="沒有符合條件的會員"
            hint="換一個關鍵字，或把狀態改成「全部」再找一次。"
            action={
              <Link href="/console/members" className="tb-btn">
                清除篩選
              </Link>
            }
          />
        )
      ) : (
        <div className="tb-card tb-table-wrap">
          <table className="tb-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>行政分組</th>
                <th>產業</th>
                <th>公司</th>
                <th>角色標籤</th>
                <th>目前職位</th>
                <th>狀態</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="whitespace-nowrap">
                    <Link
                      href={`/console/members/${member.id}`}
                      className="font-bold text-tb-text no-underline hover:text-tb-gold"
                    >
                      {member.displayName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-tb-muted">{member.adminGroup || '未分組'}</td>
                  <td>{member.industry || <span className="text-tb-faint">未填</span>}</td>
                  <td>{member.company || <span className="text-tb-faint">未填</span>}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {member.roles.map((role) => (
                        <span key={role} className="tb-chip tb-chip-plain">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {member.activeRoles.map((role, index) => (
                        <span key={`${role}-${index}`} className="tb-chip tb-chip-gold tb-chip-plain">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className={member.isActive ? 'tb-chip tb-chip-present' : 'tb-chip'}>
                      {member.isActive ? '在籍' : '停用'}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <EditMemberButton member={toMemberFormValues(member)} groups={meta.groups} />
                      <ActionForm action={setMemberActiveAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="memberId" value={member.id} />
                        <input type="hidden" name="active" value={member.isActive ? '0' : '1'} />
                        {member.isActive ? (
                          <ConfirmSubmit confirmText="確定停用">停用</ConfirmSubmit>
                        ) : (
                          <SubmitButton className="tb-btn-sm tb-btn-outline" pendingText="恢復中…">
                            恢復
                          </SubmitButton>
                        )}
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card
        title="未分類名單"
        aside={uncategorized.length > 0 ? <span className="tb-chip tb-chip-gold">待處理 {uncategorized.length}</span> : null}
        bodyClassName={uncategorized.length > 0 ? 'tb-table-wrap' : undefined}
      >
        {uncategorized.length === 0 ? (
          <p className="text-sm text-tb-muted">
            目前沒有待分類的名字。之後座位表上出現名冊以外的名字（來賓、代理人、打錯的名字）時，會列在這裡等你判斷。
          </p>
        ) : (
          <>
            <p className="px-4 pt-4 text-sm text-tb-muted">
              這些名字是舊的座位表功能自動建立的：只要有名字被放上座位，就會多一筆，裡面可能有來賓、代理人或打錯的名字。是會員就按「設為會員」加入名冊；不是就按「標記為非會員」，之後不會再出現在這裡。
            </p>
            <table className="tb-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th className="num">出現在座位</th>
                  <th>建立時間</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {uncategorized.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap font-bold">{row.displayName}</td>
                    <td className="num">{row.seatCount} 次</td>
                    <td className="whitespace-nowrap text-tb-muted">
                      <span className="tb-mono">{formatDateTime(row.createdAt)}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <ActionForm action={setMemberCategoryAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="memberId" value={row.id} />
                          <input type="hidden" name="category" value="member" />
                          <SubmitButton className="tb-btn-sm">設為會員</SubmitButton>
                        </ActionForm>
                        <ActionForm action={setMemberCategoryAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="memberId" value={row.id} />
                          <input type="hidden" name="category" value="guest" />
                          <SubmitButton className="tb-btn-sm tb-btn-quiet">標記為非會員</SubmitButton>
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  );
}
