import 'server-only';

import { type ApiCaller, type ApiScope, verifyApiToken } from '@/server/ai/api-tokens';
import { AiInputError } from '@/server/ai/seating-service';

export function apiError(status: number, error: string, message: string, details?: unknown) {
  return Response.json({ error, message, ...(details !== undefined ? { details } : {}) }, { status });
}

/** Bearer-token guard and error mapping shared by every /api/v1/ai route. */
export async function withApiToken(request: Request, scope: ApiScope, handler: (caller: ApiCaller) => Promise<unknown>) {
  const caller = await verifyApiToken(request.headers.get('authorization'));
  if (!caller) {
    return apiError(401, 'unauthorized', '需要有效的 API 金鑰：Authorization: Bearer tsk_…（在 /console/ai 建立）。');
  }
  if (!caller.scopes.includes(scope)) return apiError(403, 'forbidden', `這把金鑰沒有 ${scope} 權限。`);
  try {
    return Response.json(await handler(caller));
  } catch (error) {
    if (error instanceof AiInputError) return apiError(error.status, 'invalid_request', error.message, error.details);
    console.error('[ai-api]', error);
    return apiError(500, 'internal_error', '伺服器處理失敗，請稍後再試。');
  }
}

export async function readJson(request: Request) {
  return request.json().catch(() => {
    throw new AiInputError('請求內容不是有效的 JSON。');
  });
}
