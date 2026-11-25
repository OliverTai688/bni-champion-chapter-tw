import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { isR2Configured, presignAsset } from '@/server/line/archive';

/** Data for 阿麒工作室's group pages (PRD-005 R1, R2). Callers must check leader access first. */

export const GROUP_CATEGORIES = ['chapter_main', 'leadership', 'new_member', 'guest', 'topic', 'other'] as const;
export type GroupCategory = (typeof GROUP_CATEGORIES)[number];

export const GROUP_CATEGORY_LABEL: Record<GroupCategory, string> = {
  chapter_main: '分會主群',
  leadership: '領導團隊',
  new_member: '新夥伴',
  guest: '來賓聯繫',
  topic: '主題小組',
  other: '其他',
};

export function isGroupCategory(value: string): value is GroupCategory {
  return (GROUP_CATEGORIES as readonly string[]).includes(value);
}

const GROUP_KINDS = ['group', 'room'];
const PAGE_SIZE = 50;

export async function listGroups() {
  const [chats, counts] = await Promise.all([
    prisma.lineChat.findMany({ where: { kind: { in: GROUP_KINDS } }, orderBy: { joinedAt: 'desc' } }),
    prisma.lineMessage.groupBy({ by: ['chatId'], _count: { _all: true } }),
  ]);
  const countByChat = new Map(counts.map((row) => [row.chatId, row._count._all]));
  return chats.map((chat) => ({ ...chat, messageCount: countByChat.get(chat.id) ?? 0 }));
}

export async function getGroup(chatId: string) {
  const chat = await prisma.lineChat.findUnique({ where: { id: chatId } });
  if (!chat || !GROUP_KINDS.includes(chat.kind)) return null;
  const messageCount = await prisma.lineMessage.count({ where: { chatId } });
  return { ...chat, messageCount };
}

/** Newest first, 50 at a time. `before` is the sentAt of the last message on the previous page. */
export async function listGroupMessages(chatId: string, options: { query?: string; before?: Date | null }) {
  const where: Prisma.LineMessageWhereInput = { chatId };
  if (options.query) {
    where.OR = [
      { text: { contains: options.query, mode: 'insensitive' } },
      { senderName: { contains: options.query, mode: 'insensitive' } },
      { fileName: { contains: options.query, mode: 'insensitive' } },
    ];
  }
  if (options.before) where.sentAt = { lt: options.before };

  const rows = await prisma.lineMessage.findMany({ where, orderBy: { sentAt: 'desc' }, take: PAGE_SIZE + 1 });
  const page = rows.slice(0, PAGE_SIZE);
  const canSign = isR2Configured();
  const messages = await Promise.all(
    page.map(async (row) => ({
      id: row.id,
      type: row.type,
      text: row.text,
      fileName: row.fileName,
      fileSize: row.fileSize,
      senderName: row.senderName,
      isMember: Boolean(row.memberId),
      mentionsBot: row.mentionsBot,
      attachmentStatus: row.attachmentStatus,
      sentAt: row.sentAt,
      deleted: Boolean(row.deletedAt),
      url: canSign && row.assetId && !row.deletedAt ? await presignAsset(row.assetId) : null,
    })),
  );
  return { messages, nextBefore: rows.length > PAGE_SIZE ? page[page.length - 1].sentAt : null };
}
