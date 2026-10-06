'use server';

import { revalidatePath } from 'next/cache';
import { API_SCOPES, createApiToken, revokeApiToken, type ApiScope } from '@/server/ai/api-tokens';
import { fail, isObjectId, ok, text, type ActionState } from '@/server/tbx/action';
import { logOperation } from '@/server/tbx/log';
import { requireLeader } from '@/server/tbx/viewer';

export type TokenState = { ok: boolean; message: string; token?: string } | null;

export async function createApiTokenAction(_prev: TokenState, formData: FormData): Promise<TokenState> {
  try {
    const viewer = await requireLeader();
    const scopes = formData.getAll('scopes').filter((value): value is ApiScope => (API_SCOPES as readonly string[]).includes(String(value)));
    const days = Number.parseInt(text(formData, 'expiresInDays'), 10);
    const { token, record } = await createApiToken({
      name: text(formData, 'name'),
      scopes,
      expiresInDays: Number.isFinite(days) && days > 0 ? Math.min(days, 365) : null,
      createdBy: viewer.leaderName,
    });
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'api_token_created',
      targetType: 'ApiToken',
      targetId: record.id,
      metadata: { name: record.name, scopes: record.scopes, prefix: record.prefix },
    });
    revalidatePath('/console/ai');
    return { ok: true, message: `已建立金鑰「${record.name}」。這是唯一一次顯示完整金鑰，請現在複製保存。`, token };
  } catch (error) {
    return fail(error);
  }
}

export async function revokeApiTokenAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const id = text(formData, 'tokenId');
    if (!isObjectId(id)) throw new Error('找不到這把金鑰。');
    await revokeApiToken(id);
    await logOperation({ actorRole: 'admin', actorName: viewer.leaderName, action: 'api_token_revoked', targetType: 'ApiToken', targetId: id });
    revalidatePath('/console/ai');
    return ok('已停用金鑰，使用它的程式會立即失效。');
  } catch (error) {
    return fail(error);
  }
}
