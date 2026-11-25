'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db/prisma';
import { isGroupCategory } from '@/server/a-qi/groups';
import { announceRecording, deleteChatMessages, refreshChatSummary } from '@/server/line/archive';
import { fail, isObjectId, ok, text, type ActionState } from '@/server/tbx/action';
import { logOperation } from '@/server/tbx/log';
import { requireLeader } from '@/server/tbx/viewer';

async function loadGroup(formData: FormData) {
  const id = text(formData, 'chatId');
  if (!isObjectId(id)) throw new Error('找不到這個群組。');
  const chat = await prisma.lineChat.findUnique({ where: { id } });
  if (!chat || (chat.kind !== 'group' && chat.kind !== 'room')) throw new Error('找不到這個群組。');
  return chat;
}

function refresh(chatId: string) {
  revalidatePath('/console/a-qi/groups');
  revalidatePath(`/console/a-qi/groups/${chatId}`);
}

/** Turns recording on or off. The first time a group is recorded, 阿麒 tells the group once (PRD-005 R2.5). */
export async function setRecordingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const chat = await loadGroup(formData);
    const enable = text(formData, 'enable') === 'true';
    if (enable && chat.leftAt) throw new Error('阿麒已經不在這個群組，無法開始記錄。');

    let announced = false;
    if (enable && !chat.recordingAnnouncedAt) {
      try {
        announced = await announceRecording(chat);
      } catch {
        throw new Error('公告沒有發出去，所以還沒開始記錄。請稍後再試，或檢查官方帳號本月的推播則數。');
      }
    }
    await prisma.lineChat.update({ where: { id: chat.id }, data: { archiveEnabled: enable } });
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: enable ? 'line_recording_enabled' : 'line_recording_disabled',
      targetType: 'LineChat',
      targetId: chat.id,
      metadata: { announced },
    });
    refresh(chat.id);
    if (!enable) return ok('已停止記錄。已經記錄的訊息會保留。');
    return ok(announced ? '已開始記錄，並在群組發了公告。' : '已開始記錄。');
  } catch (error) {
    return fail(error);
  }
}

/** A leader sets the group's purpose and type; this overrides 阿麒's guess (PRD-005 R1.3). */
export async function saveGroupProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const chat = await loadGroup(formData);
    const purpose = text(formData, 'purpose');
    const category = text(formData, 'category');
    if (purpose.length > 300) throw new Error('用途說明請在 300 字以內。');
    if (category && !isGroupCategory(category)) throw new Error('請選擇群組類型。');

    await prisma.lineChat.update({
      where: { id: chat.id },
      data: {
        purpose: purpose || null,
        category: category || null,
        purposeStatus: purpose || category ? 'confirmed' : null,
        purposeUpdatedAt: new Date(),
      },
    });
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'line_group_profile_saved',
      targetType: 'LineChat',
      targetId: chat.id,
      metadata: { category: category || null },
    });
    refresh(chat.id);
    return ok('已儲存群組檔案。');
  } catch (error) {
    return fail(error);
  }
}

export async function refreshGroupSummaryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireLeader();
    const chat = await loadGroup(formData);
    if (chat.leftAt) throw new Error('阿麒已經不在這個群組，拿不到最新資料。');
    await refreshChatSummary(chat);
    refresh(chat.id);
    return ok('已更新群組名稱和人數。');
  } catch (error) {
    return fail(error);
  }
}

/** Deletes every recorded message and file of one group (two-step confirm in the page). */
export async function deleteGroupMessagesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const chat = await loadGroup(formData);
    const count = await deleteChatMessages(chat.id);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'line_group_messages_deleted',
      targetType: 'LineChat',
      targetId: chat.id,
      metadata: { count },
    });
    refresh(chat.id);
    return ok(`已刪除 ${count} 則訊息和檔案。`);
  } catch (error) {
    return fail(error);
  }
}
