import Link from 'next/link';
import { LeaderOnlyNotice } from '@/components/tbx/members/leader-only';
import { Card, Empty, PageHeader } from '@/components/tbx/ui';
import { formatDateTime } from '@/lib/tbx/labels';
import { GROUP_CATEGORY_LABEL, isGroupCategory, listGroups } from '@/server/a-qi/groups';
import { isLeader } from '@/server/tbx/viewer';

export default async function AQiGroupsPage() {
  if (!(await isLeader())) return <LeaderOnlyNotice />;
  const groups = await listGroups();
  const active = groups.filter((group) => !group.leftAt);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="阿麒工作室"
        title="群組"
        description="阿麒加入的 LINE 群組。記錄中的群組，文字、照片和檔案都會保存，只有領導團隊看得到。阿麒之後會從這些訊息整理群組用途和例會資訊。"
      />

      <Card title="群組清單" aside={<span>{active.length} 個群組在線上</span>} bodyClassName="p-0">
        {groups.length === 0 ? (
          <div className="p-4">
            <Empty
              title="阿麒還沒有加入任何群組"
              hint="在 LINE 群組邀請官方帳號「阿麒」。官方帳號後台要先把「加入群組或多人聊天室」設成接受邀請。"
            />
          </div>
        ) : (
          <div className="tb-table-wrap">
            <table className="tb-table">
              <thead>
                <tr>
                  <th>群組</th>
                  <th>用途</th>
                  <th>人數</th>
                  <th>訊息</th>
                  <th>最近一則</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <Link href={`/console/a-qi/groups/${group.id}`} className="font-semibold">
                        {group.name ?? (group.kind === 'room' ? '多人聊天室' : '未命名群組')}
                      </Link>
                      <div className="text-xs text-tb-faint">加入 {formatDateTime(group.joinedAt)}</div>
                    </td>
                    <td className="max-w-[28ch] text-xs">
                      {group.category && isGroupCategory(group.category) ? (
                        <span className="tb-chip tb-chip-plain mr-1">{GROUP_CATEGORY_LABEL[group.category]}</span>
                      ) : null}
                      {group.purpose ?? <span className="text-tb-faint">還不知道</span>}
                      {group.purposeStatus === 'suggested' ? <span className="ml-1 text-tb-faint">（阿麒的推測）</span> : null}
                    </td>
                    <td className="tb-num">{group.memberCount ?? '—'}</td>
                    <td className="tb-num">{group.messageCount}</td>
                    <td className="text-xs text-tb-muted">{group.lastMessageAt ? formatDateTime(group.lastMessageAt) : '—'}</td>
                    <td>
                      {group.leftAt ? (
                        <span className="tb-chip">已離開</span>
                      ) : group.archiveEnabled ? (
                        <span className="tb-chip tb-chip-present">記錄中</span>
                      ) : (
                        <span className="tb-chip tb-chip-plain">未記錄</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
