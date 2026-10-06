import Form from 'next/form';
import Link from 'next/link';
import { LeaderOnlyNotice } from '@/components/tbx/members/leader-only';
import { Empty, PageHeader } from '@/components/tbx/ui';
import { formatDateTime } from '@/lib/tbx/labels';
import { isObjectId } from '@/server/tbx/action';
import { ACTOR_ROLE_LABEL, isActorRole, listOperationLogs, taipeiDayStart } from '@/server/tbx/member-admin';
import { isLeader } from '@/server/tbx/viewer';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const BASE = '/console/settings/audit';

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function formatMetadata(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await isLeader())) return <LeaderOnlyNotice />;

  const params = await searchParams;
  const action = first(params.action);
  const roleParam = first(params.role);
  const actorRole = isActorRole(roleParam) ? roleParam : '';
  // Ignore dates that are not real YYYY-MM-DD values instead of showing an empty result.
  const from = taipeiDayStart(first(params.from)) ? first(params.from) : '';
  const to = taipeiDayStart(first(params.to)) ? first(params.to) : '';
  const requestedPage = Number.parseInt(first(params.page), 10);

  const { rows, total, page, pageCount, pageSize } = await listOperationLogs({
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
    action,
    actorRole,
    from,
    to,
  });

  const filtered = Boolean(action || actorRole || from || to);
  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (action) query.set('action', action);
    if (actorRole) query.set('role', actorRole);
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    if (target > 1) query.set('page', String(target));
    const text = query.toString();
    return text ? `${BASE}?${text}` : BASE;
  };
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = (page - 1) * pageSize + rows.length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="/console/settings/audit"
        title="操作紀錄"
        description="領導團隊、會員與系統做過的每一次修改，最新的在最上面。這一頁只能查看，不能修改或刪除。"
      />

      {/* Keyed so "清除篩選" also clears what was typed into the uncontrolled fields. */}
      <Form key={`${action}|${actorRole}|${from}|${to}`} action={BASE} className="tb-card flex flex-wrap items-end gap-3 p-4">
        <label className="tb-label min-w-[180px] flex-1" htmlFor="audit-action">
          動作包含
          <input
            id="audit-action"
            name="action"
            type="search"
            className="tb-input"
            defaultValue={action}
            placeholder="例如 member、gift、check_in"
          />
        </label>
        <label className="tb-label w-full sm:w-[140px]" htmlFor="audit-role">
          角色
          <select id="audit-role" name="role" className="tb-select" defaultValue={actorRole}>
            <option value="">全部角色</option>
            {Object.entries(ACTOR_ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="tb-label w-full sm:w-[160px]" htmlFor="audit-from">
          開始日期
          <input id="audit-from" name="from" type="date" className="tb-input" defaultValue={from} />
        </label>
        <label className="tb-label w-full sm:w-[160px]" htmlFor="audit-to">
          結束日期
          <input id="audit-to" name="to" type="date" className="tb-input" defaultValue={to} />
        </label>
        <button type="submit" className="tb-btn">
          套用篩選
        </button>
        {filtered ? (
          <Link href={BASE} className="tb-btn tb-btn-quiet">
            清除篩選
          </Link>
        ) : null}
      </Form>

      {rows.length === 0 ? (
        filtered ? (
          <Empty
            title="沒有符合條件的紀錄"
            hint="放寬日期範圍，或把「動作包含」改短一點再找一次。"
            action={
              <Link href={BASE} className="tb-btn">
                清除篩選
              </Link>
            }
          />
        ) : (
          <Empty title="還沒有任何操作紀錄" hint="之後在中控新增活動、簽到、調整名冊或抽獎時，每一次修改都會記在這裡。" />
        )
      ) : (
        <>
          <div className="tb-card tb-table-wrap">
            <table className="tb-table">
              <thead>
                <tr>
                  <th>時間</th>
                  <th>角色</th>
                  <th>操作者</th>
                  <th>動作</th>
                  <th>對象</th>
                  <th>活動</th>
                  <th>內容</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="whitespace-nowrap">
                      <time className="tb-mono" dateTime={row.createdAt.toISOString()} title={row.createdAt.toISOString()}>
                        {formatDateTime(row.createdAt)}
                      </time>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className={row.actorRole === 'admin' ? 'tb-chip tb-chip-gold tb-chip-plain' : 'tb-chip tb-chip-plain'}>
                        {ACTOR_ROLE_LABEL[row.actorRole]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">{row.actorName || <span className="text-tb-faint">未記錄</span>}</td>
                    <td>
                      <span className="tb-mono">{row.action}</span>
                      {row.reason ? <div className="mt-1 text-xs text-tb-muted">原因：{row.reason}</div> : null}
                    </td>
                    <td className="whitespace-nowrap">
                      {row.targetType}
                      {row.targetId ? (
                        row.targetType === 'Member' && isObjectId(row.targetId) ? (
                          <Link href={`/console/members/${row.targetId}`} className="tb-mono ml-2 text-xs text-tb-muted">
                            {row.targetId.slice(-6)}
                          </Link>
                        ) : (
                          <span className="tb-mono ml-2 text-xs text-tb-faint" title={row.targetId}>
                            {row.targetId.length > 10 ? row.targetId.slice(-6) : row.targetId}
                          </span>
                        )
                      ) : null}
                    </td>
                    <td>
                      {row.session ? (
                        <Link
                          href={`/console/events/${encodeURIComponent(row.session.weekId)}`}
                          className="text-tb-text no-underline hover:text-tb-gold"
                        >
                          {row.session.title}
                        </Link>
                      ) : null}
                    </td>
                    <td className="min-w-[160px]">
                      {row.metadata === null || row.metadata === undefined ? null : (
                        <details>
                          <summary className="cursor-pointer text-xs text-tb-muted">查看內容</summary>
                          <pre className="tb-mono mt-2 max-h-64 max-w-[420px] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-tb-bg p-3 text-xs">
                            {formatMetadata(row.metadata)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="分頁">
            <p className="text-sm text-tb-muted">
              第 {firstRow} 到 {lastRow} 筆，共 {total} 筆（第 {page} / {pageCount} 頁）
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="tb-btn tb-btn-sm">
                  上一頁（較新）
                </Link>
              ) : (
                <span className="tb-btn tb-btn-sm" aria-disabled="true">
                  上一頁（較新）
                </span>
              )}
              {page < pageCount ? (
                <Link href={pageHref(page + 1)} className="tb-btn tb-btn-sm">
                  下一頁（較舊）
                </Link>
              ) : (
                <span className="tb-btn tb-btn-sm" aria-disabled="true">
                  下一頁（較舊）
                </span>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
