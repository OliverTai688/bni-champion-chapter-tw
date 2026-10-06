import { verifyApiToken, type ApiCaller } from '@/server/ai/api-tokens';
import {
  AiInputError,
  evaluateGridArrangement,
  getSeatingContext,
  listAiEvents,
  saveAiSeatPlan,
  saveGridArrangement,
  SEAT_TYPES,
} from '@/server/ai/seating-service';

// Minimal stateless MCP server (Streamable HTTP transport, JSON responses only).
// Auth: the same `Authorization: Bearer tsk_…` API keys as /api/v1/ai.

export const dynamic = 'force-dynamic';

const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER_INFO = { name: 'take-seat-seating', version: '1.0.0' };

const seatSchema = {
  anyOf: [
    { type: 'null' },
    { type: 'string', description: '會員姓名（等同 type=member）' },
    {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: [...SEAT_TYPES], description: 'member 會員、guest 來賓、host 執事、proxy 代理人、sound 音控、duty 值日生' },
        guestNumber: { type: 'string', description: '來賓編號，例如 賓1（type=guest）' },
        hostFor: { type: 'string', description: '執事服務的來賓編號，例如 賓1（type=host）' },
      },
      required: ['name'],
    },
  ],
};

const arrangementSchema = {
  type: 'object',
  properties: {
    eventKey: { type: 'string', description: '活動代號，每週例會是日期 YYYY-MM-DD' },
    topRoles: {
      type: 'array',
      description: '主持團 5 人（省略則沿用目前的）',
      items: { type: 'object', properties: { role: { type: 'string' }, name: { type: 'string' } }, required: ['role', 'name'] },
    },
    rows: {
      type: 'array',
      description: '主座位，每列最多 4 格：欄 0-1 第一張長桌、欄 2-3 第二張長桌；空位用 null',
      items: { type: 'array', items: seatSchema, maxItems: 4 },
    },
    heroes: { type: 'array', items: { type: 'string' }, description: '英雄榜（省略則沿用）' },
    baseVersion: { type: 'number', description: '你讀到的 grid.version；版本不同會拒絕寫入' },
    reason: { type: 'string', description: '這次調整的說明，會留在版本紀錄' },
    force: { type: 'boolean', description: '違反規則仍要儲存時設為 true' },
  },
  required: ['eventKey', 'rows'],
};

const TOOLS = [
  {
    name: 'list_events',
    description: '列出活動（日期、標題、是否已有格狀座位表或平面座位表）。先用它取得 eventKey。',
    inputSchema: { type: 'object', properties: {} },
    scope: 'seating:read',
  },
  {
    name: 'get_seating_context',
    description: '取得一場活動排座需要的一切：排座規則書、在籍會員（產業、行政分組、幹部職位）、出席與代理、來賓、目前的座位表與規則檢查結果。',
    inputSchema: { type: 'object', properties: { eventKey: { type: 'string' } }, required: ['eventKey'] },
    scope: 'seating:read',
  },
  {
    name: 'validate_seating',
    description: '檢查一份格狀座位安排是否符合規則與本週出席（不會儲存）。',
    inputSchema: arrangementSchema,
    scope: 'seating:read',
  },
  {
    name: 'save_seating',
    description: '把格狀座位安排存成新版本。每次儲存都留下版本與操作紀錄，幹部可在中控的格狀排座頁看到並調整。',
    inputSchema: arrangementSchema,
    scope: 'seating:write',
  },
  {
    name: 'save_seat_plan',
    description: '非例會活動的平面座位表：傳入 { seatId: participationId } 對照（seatId 與 participationId 取自 get_seating_context）。',
    inputSchema: {
      type: 'object',
      properties: {
        eventKey: { type: 'string' },
        assignments: { type: 'object', additionalProperties: { type: 'string' } },
      },
      required: ['eventKey', 'assignments'],
    },
    scope: 'seating:write',
  },
] as const;

type JsonRpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

function result(id: JsonRpcRequest['id'], value: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result: value };
}

function rpcError(id: JsonRpcRequest['id'], code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

function toolText(value: unknown, isError = false) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], ...(isError ? { isError: true } : {}) };
}

async function callTool(caller: ApiCaller, name: string, args: Record<string, unknown>) {
  const tool = TOOLS.find((item) => item.name === name);
  if (!tool) return toolText({ error: `沒有這個工具：${name}` }, true);
  if (!caller.scopes.includes(tool.scope)) return toolText({ error: `API 金鑰沒有 ${tool.scope} 權限。` }, true);

  const eventKey = typeof args.eventKey === 'string' ? args.eventKey : '';
  try {
    switch (tool.name) {
      case 'list_events':
        return toolText({ events: await listAiEvents() });
      case 'get_seating_context':
        return toolText(await getSeatingContext(eventKey));
      case 'validate_seating':
        return toolText((await evaluateGridArrangement(eventKey, args)).report);
      case 'save_seating':
        return toolText(await saveGridArrangement(eventKey, args, caller.name));
      case 'save_seat_plan':
        return toolText(await saveAiSeatPlan(eventKey, args, caller.name));
    }
  } catch (error) {
    if (error instanceof AiInputError) return toolText({ error: error.message, details: error.details }, true);
    console.error('[mcp]', error);
    return toolText({ error: '伺服器處理失敗，請稍後再試。' }, true);
  }
}

async function handle(caller: ApiCaller, message: JsonRpcRequest) {
  const { id, method, params = {} } = message;
  const isNotification = id === undefined;
  switch (method) {
    case 'initialize': {
      const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : SUPPORTED_VERSIONS[0];
      return result(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          'BNI 長冠軍分會排座工具。流程：list_events → get_seating_context → 依 rules 與 attendance 排座 → validate_seating → save_seating（帶 baseVersion）。',
      });
    }
    case 'ping':
      return result(id, {});
    case 'tools/list':
      return result(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case 'tools/call': {
      const name = typeof params.name === 'string' ? params.name : '';
      const args = params.arguments && typeof params.arguments === 'object' ? (params.arguments as Record<string, unknown>) : {};
      return result(id, await callTool(caller, name, args));
    }
    default:
      if (isNotification) return null;
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(request: Request) {
  const caller = await verifyApiToken(request.headers.get('authorization'));
  if (!caller) {
    return Response.json(rpcError(null, -32001, '需要有效的 API 金鑰：Authorization: Bearer tsk_…（在 /console/ai 建立）。'), {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' },
    });
  }

  const body = await request.json().catch(() => undefined);
  if (body === undefined) return Response.json(rpcError(null, -32700, 'Parse error'), { status: 400 });

  const messages: JsonRpcRequest[] = Array.isArray(body) ? body : [body];
  const responses = (await Promise.all(messages.map((message) => handle(caller, message)))).filter(Boolean);
  if (responses.length === 0) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? responses : responses[0]);
}

export async function GET() {
  // No server-initiated stream: this server only answers requests.
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}

export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
