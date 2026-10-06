import { headers } from 'next/headers';
import { ActionForm, ConfirmSubmit } from '@/components/tbx/client';
import { TokenForm } from '@/components/tbx/ai/token-form';
import { LeaderOnlyNotice } from '@/components/tbx/members/leader-only';
import { Card, Empty, PageHeader } from '@/components/tbx/ui';
import { formatDateTime } from '@/lib/tbx/labels';
import { API_SCOPES, API_SCOPE_LABEL, listApiTokens } from '@/server/ai/api-tokens';
import { isLeader } from '@/server/tbx/viewer';
import { revokeApiTokenAction } from './actions';

function Code({ children }: { children: string }) {
  return (
    <pre className="tb-mono overflow-x-auto whitespace-pre rounded-lg border border-tb-line bg-tb-surf2 p-3 text-xs leading-relaxed">{children}</pre>
  );
}

export default async function ConsoleAiPage() {
  if (!(await isLeader())) return <LeaderOnlyNotice />;

  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? 'localhost:3000';
  const proto = headerStore.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const origin = `${proto}://${host}`;
  const tokens = await listApiTokens();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="/console/ai"
        title="AI 排座 API"
        description="讓 Claude 或其他 AI 讀取規則、名冊與本週出席，排好座位後寫回系統。每次寫入都會留下新版本與操作紀錄，幹部可以在格狀排座頁檢查與調整。"
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="建立 API 金鑰">
          <TokenForm scopes={API_SCOPES.map((scope) => ({ value: scope, label: API_SCOPE_LABEL[scope] }))} />
        </Card>

        <Card title="金鑰列表" aside={<span>{tokens.length} 把</span>} bodyClassName="p-0">
          {tokens.length === 0 ? (
            <div className="p-4">
              <Empty title="還沒有金鑰" hint="在左邊建立一把，再依下方說明接上 Claude。" />
            </div>
          ) : (
            <div className="tb-table-wrap">
              <table className="tb-table">
                <thead>
                  <tr>
                    <th>名稱</th>
                    <th>權限</th>
                    <th>最後使用</th>
                    <th>狀態</th>
                    <th aria-label="操作" />
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => {
                    const expired = token.expired;
                    const active = !token.revokedAt && !expired;
                    return (
                      <tr key={token.id}>
                        <td>
                          <div className="font-semibold">{token.name}</div>
                          <div className="tb-mono text-xs text-tb-faint">{token.prefix}…</div>
                        </td>
                        <td className="text-xs">{token.scopes.join('、')}</td>
                        <td className="text-xs text-tb-muted">{token.lastUsedAt ? formatDateTime(token.lastUsedAt) : '未使用'}</td>
                        <td>
                          <span className={active ? 'tb-chip tb-chip-present' : 'tb-chip'}>
                            {token.revokedAt ? '已停用' : expired ? '已過期' : token.expiresAt ? `到 ${formatDateTime(token.expiresAt)}` : '有效'}
                          </span>
                        </td>
                        <td>
                          {active ? (
                            <ActionForm action={revokeApiTokenAction} quietSuccess>
                              <input type="hidden" name="tokenId" value={token.id} />
                              <ConfirmSubmit confirmText="確定停用">停用</ConfirmSubmit>
                            </ActionForm>
                          ) : null}
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

      <Card title="接上 Claude（MCP）">
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-tb-muted">
            Claude Code：在終端機執行下面的指令（把 <span className="tb-mono">tsk_…</span> 換成你的金鑰），之後直接說「幫我排 10/08 的座位」。
          </p>
          <Code>{`claude mcp add --transport http take-seat ${origin}/api/mcp \\\n  --header "Authorization: Bearer tsk_..."`}</Code>
          <p className="text-tb-muted">Claude Desktop：設定 › 開發者 › 編輯設定，加入：</p>
          <Code>{`{
  "mcpServers": {
    "take-seat": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${origin}/api/mcp",
               "--header", "Authorization: Bearer tsk_..."]
    }
  }
}`}</Code>
          <p className="text-tb-muted">
            工具：<span className="tb-mono">list_events</span>、<span className="tb-mono">get_seating_context</span>、
            <span className="tb-mono">validate_seating</span>、<span className="tb-mono">save_seating</span>、
            <span className="tb-mono">save_seat_plan</span>。
          </p>
        </div>
      </Card>

      <Card title="REST API">
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-tb-muted">所有請求都要帶 <span className="tb-mono">Authorization: Bearer tsk_…</span>。</p>
          <Code>{`GET  ${origin}/api/v1/ai/events
GET  ${origin}/api/v1/ai/events/{eventKey}/seating           # 規則、名冊、出席、目前座位（grid.version）
POST ${origin}/api/v1/ai/events/{eventKey}/seating/validate  # 只檢查，不儲存
PUT  ${origin}/api/v1/ai/events/{eventKey}/seating           # 存成新版本
PUT  ${origin}/api/v1/ai/events/{eventKey}/seat-plan         # 平面座位表 { assignments: { seatId: participationId } }`}</Code>
          <p className="text-tb-muted">格狀座位的寫入格式（每列 4 格，欄 0-1 是第一張長桌、欄 2-3 是第二張長桌）：</p>
          <Code>{`{
  "baseVersion": 3,
  "reason": "依產業鏈分桌，來賓排前排",
  "topRoles": [{ "role": "主席", "name": "古又帆" }, ...],
  "rows": [
    [{ "name": "葉子豪", "type": "guest", "guestNumber": "賓1" }, null, null, { "name": "郭子郁", "type": "duty" }],
    [{ "name": "蘇冠霖", "type": "host", "hostFor": "賓1" }, "陳平", "陳軾", { "name": "林道元", "type": "sound" }],
    ["蘇子茵", "陳宜均", { "name": "王小明", "type": "proxy" }, null]
  ]
}`}</Code>
          <p className="text-xs text-tb-faint">
            違反規則（例如音控不是剛好一位）時會回 422 並附上檢查結果；確定要存請加 <span className="tb-mono">&quot;force&quot;: true</span>。
            baseVersion 與目前版本不同時回 409，請重新讀取再排。
          </p>
        </div>
      </Card>
    </div>
  );
}
