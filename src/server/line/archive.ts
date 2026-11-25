import 'server-only';

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { LineChat } from '@prisma/client';
import { after } from 'next/server';
import { findMemberByLine } from '@/server/auth/access';
import { prisma } from '@/server/db/prisma';
import { createR2Client, getR2Config } from '@/server/storage/r2-client';
import { getChatMemberName, getChatSummary, getMessageContent, pushMessage, text, type ChatKind } from '@/server/line/messaging';

/**
 * Recording of LINE group messages (PRD-005 R2, ARC-009 §4).
 * Text is written during the webhook; names and files are fetched after the response.
 * Nothing here is shown outside /console/a-qi.
 */

export const ATTACHMENT_TYPES = ['image', 'video', 'audio', 'file'] as const;
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
const CONTENT_RETRIES = 3;

export const RECORDING_NOTICE =
  '📝 我會記錄這個群組的文字、照片和檔案，用來整理例會資訊（例如來賓、請假、代理）。只有分會領導團隊看得到。想刪除自己在群組的訊息，請私訊我「刪除我的群組訊息」。';

export interface GroupMessageInput {
  lineMessageId: string;
  type: string;
  text?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  /** 'external' content (e.g. an image a LINE partner app sent) cannot be downloaded through the API. */
  externalContent?: boolean;
  lineUserId?: string | null;
  mentionsBot: boolean;
  sentAt: Date;
}

export function isR2Configured() {
  return ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'].every((name) => Boolean(process.env[name]));
}

function isAttachment(type: string) {
  return (ATTACHMENT_TYPES as readonly string[]).includes(type);
}

/** Runs `task` after the response inside a request, or right away in a script. Errors are logged, never thrown. */
function later(label: string, task: () => Promise<unknown>) {
  const run = async () => {
    try {
      await task();
    } catch (error) {
      console.error(`[line] ${label} failed`, error instanceof Error ? error.message : 'unknown');
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}

/** Saves one group message. Duplicate deliveries of the same message are ignored. */
export async function recordGroupMessage(chat: LineChat, input: GroupMessageInput) {
  const member = input.lineUserId ? await findMemberByLine(input.lineUserId) : null;
  const attachment = isAttachment(input.type);
  const status = !attachment ? null : input.externalContent || !isR2Configured() ? 'not_stored' : 'pending';

  const existing = await prisma.lineMessage.findUnique({ where: { lineMessageId: input.lineMessageId }, select: { id: true } });
  if (existing) return;

  const row = await prisma.lineMessage.create({
    data: {
      chatId: chat.id,
      lineMessageId: input.lineMessageId,
      lineUserId: input.lineUserId ?? null,
      memberId: member?.id ?? null,
      senderName: member?.displayName ?? null,
      type: input.type,
      text: input.text ?? null,
      fileName: input.fileName ?? null,
      fileSize: input.fileSize ?? null,
      attachmentStatus: status,
      assetId: null,
      mentionsBot: input.mentionsBot,
      sentAt: input.sentAt,
      expiresAt: null,
      deletedAt: null,
    },
  });
  await prisma.lineChat.update({ where: { id: chat.id }, data: { lastMessageAt: input.sentAt } });

  if (!member && input.lineUserId) {
    const userId = input.lineUserId;
    later('sender name', () => fillSenderName(chat, row.id, userId));
  }
  if (status === 'pending') {
    later('attachment', async () => {
      try {
        await storeAttachment(chat, row.id);
      } catch (error) {
        await prisma.lineMessage.update({ where: { id: row.id }, data: { attachmentStatus: 'failed' } });
        throw error;
      }
    });
  }
}

/** Non-members: reuse the last name seen in this chat, otherwise ask LINE once. */
async function fillSenderName(chat: LineChat, rowId: string, lineUserId: string) {
  const known = await prisma.lineMessage.findFirst({
    where: { chatId: chat.id, lineUserId, senderName: { not: null }, id: { not: rowId } },
    orderBy: { sentAt: 'desc' },
    select: { senderName: true },
  });
  const name = known?.senderName ?? (await getChatMemberName(chat.kind as ChatKind, chat.lineId, lineUserId));
  if (name) await prisma.lineMessage.update({ where: { id: rowId }, data: { senderName: name } });
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mp4': 'm4a',
  'application/pdf': 'pdf',
};

function extensionFor(contentType: string, fileName: string | null) {
  const fromName = fileName?.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase();
  return fromName ?? EXTENSIONS[contentType.split(';')[0].trim()] ?? 'bin';
}

async function storeAttachment(chat: LineChat, rowId: string) {
  const row = await prisma.lineMessage.findUnique({ where: { id: rowId } });
  if (!row || row.deletedAt) return;

  let content: Awaited<ReturnType<typeof getMessageContent>> = null;
  for (let attempt = 0; attempt < CONTENT_RETRIES && !content; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
    content = await getMessageContent(row.lineMessageId, MAX_ATTACHMENT_BYTES);
  }
  if (!content) {
    await prisma.lineMessage.update({ where: { id: rowId }, data: { attachmentStatus: 'failed' } });
    return;
  }
  if (content.tooLarge) {
    await prisma.lineMessage.update({ where: { id: rowId }, data: { attachmentStatus: 'too_large', fileSize: content.size } });
    return;
  }

  const config = getR2Config();
  const month = row.sentAt.toISOString().slice(0, 7);
  const key = `line/${chat.id}/${month}/${row.lineMessageId}.${extensionFor(content.contentType, row.fileName)}`;
  await createR2Client(config).send(
    new PutObjectCommand({ Bucket: config.bucketName, Key: key, Body: content.body, ContentType: content.contentType }),
  );
  const asset = await prisma.asset.upsert({
    where: { bucket_key: { bucket: config.bucketName, key } },
    create: {
      provider: 'r2',
      bucket: config.bucketName,
      key,
      contentType: content.contentType,
      byteSize: content.body.byteLength,
      visibility: 'private',
      purpose: 'line_message',
    },
    update: { contentType: content.contentType, byteSize: content.body.byteLength },
  });

  // The sender may have asked for deletion while the file was downloading.
  const latest = await prisma.lineMessage.findUnique({ where: { id: rowId }, select: { deletedAt: true } });
  if (latest?.deletedAt) {
    await deleteAssets([asset.id]);
    return;
  }
  await prisma.lineMessage.update({
    where: { id: rowId },
    data: { assetId: asset.id, attachmentStatus: 'stored', fileSize: content.body.byteLength },
  });
}

/** Short-lived link to a stored attachment, for leaders in 阿麒工作室 only. */
export async function presignAsset(assetId: string) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.purpose !== 'line_message') return null;
  const config = getR2Config();
  return getSignedUrl(createR2Client(config), new GetObjectCommand({ Bucket: asset.bucket, Key: asset.key }), {
    expiresIn: config.presignedUrlTtlSeconds,
  });
}

async function deleteAssets(assetIds: string[]) {
  if (assetIds.length === 0) return;
  const assets = await prisma.asset.findMany({ where: { id: { in: assetIds }, purpose: 'line_message' } });
  if (assets.length === 0) return;
  const client = createR2Client();
  for (const asset of assets) {
    await client.send(new DeleteObjectCommand({ Bucket: asset.bucket, Key: asset.key }));
  }
  await prisma.asset.deleteMany({ where: { id: { in: assets.map((asset) => asset.id) } } });
}

const REMOVED_CONTENT = {
  text: null,
  fileName: null,
  senderName: null,
  lineUserId: null,
  memberId: null,
  assetId: null,
} as const;

/**
 * R2.6: removes everything one LINE user said in recorded groups. Rows stay as "deleted" markers
 * so later notes can show that a source was removed. Files are deleted after the response.
 */
export async function deleteMessagesOfUser(lineUserId: string) {
  const rows = await prisma.lineMessage.findMany({
    where: { lineUserId, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true, assetId: true },
  });
  if (rows.length === 0) return 0;
  const assetIds = rows.flatMap((row) => (row.assetId ? [row.assetId] : []));
  await prisma.lineMessage.updateMany({
    where: { id: { in: rows.map((row) => row.id) } },
    data: { ...REMOVED_CONTENT, deletedAt: new Date() },
  });
  if (assetIds.length > 0) later('delete files', () => deleteAssets(assetIds));
  return rows.length;
}

/** Deletes a whole group's record, files included (leaders, two-step confirm). */
export async function deleteChatMessages(chatId: string) {
  const rows = await prisma.lineMessage.findMany({ where: { chatId }, select: { assetId: true } });
  const assetIds = rows.flatMap((row) => (row.assetId ? [row.assetId] : []));
  if (assetIds.length > 0 && isR2Configured()) await deleteAssets(assetIds);
  const { count } = await prisma.lineMessage.deleteMany({ where: { chatId } });
  await prisma.lineChat.update({ where: { id: chatId }, data: { lastMessageAt: null, digestedUntil: null } });
  return count;
}

/** Name and member count from LINE. Left groups keep what was last seen. */
export async function refreshChatSummary(chat: Pick<LineChat, 'id' | 'kind' | 'lineId' | 'leftAt'>) {
  if (chat.kind !== 'group' && chat.kind !== 'room') return;
  if (chat.leftAt) return;
  const summary = await getChatSummary(chat.kind, chat.lineId);
  await prisma.lineChat.update({
    where: { id: chat.id },
    data: {
      ...(summary.name ? { name: summary.name } : {}),
      ...(summary.memberCount !== null ? { memberCount: summary.memberCount } : {}),
    },
  });
}

export function refreshChatSummaryLater(chat: Pick<LineChat, 'id' | 'kind' | 'lineId' | 'leftAt'>) {
  later('chat summary', () => refreshChatSummary(chat));
}

/**
 * R2.5: a group 阿麒 joined before recording existed is told once, the first time a leader
 * turns recording on. This is a push, so it uses the monthly quota once per group member.
 */
export async function announceRecording(chat: LineChat) {
  if (chat.recordingAnnouncedAt || chat.leftAt) return false;
  await pushMessage(chat.lineId, [text(`各位好，我是阿麒。\n${RECORDING_NOTICE}`)]);
  await prisma.lineChat.update({ where: { id: chat.id }, data: { recordingAnnouncedAt: new Date() } });
  return true;
}
