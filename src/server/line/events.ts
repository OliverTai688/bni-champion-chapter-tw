import 'server-only';

import { Prisma } from '@prisma/client';
import { formatEventDate } from '@/lib/tbx/labels';
import { LIFF_ID } from '@/lib/line-client';
import { findMemberByLine } from '@/server/auth/access';
import { prisma } from '@/server/db/prisma';
import { checkInMemberForToday, describeCheckIn, getMemberSeat } from '@/server/tbx/check-in-service';
import { getFocusEvent, isEventToday } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import { replyMessage, text, type LineTextMessage } from '@/server/line/messaging';

/**
 * What 阿麒 does with each webhook event (PRD-003 R3, R4; ARC-008 §5.2).
 * 1:1 chats get quick commands; groups stay quiet unless 阿麒 is mentioned.
 * Who is talking comes only from LINE's userId and MemberIdentity, never from message text.
 */

type Source =
  | { type: 'user'; userId: string }
  | { type: 'group'; groupId: string; userId?: string }
  | { type: 'room'; roomId: string; userId?: string };

export interface LineEvent {
  type: string;
  webhookEventId?: string;
  replyToken?: string;
  source?: Source;
  message?: {
    type: string;
    text?: string;
    mention?: { mentionees?: Array<{ isSelf?: boolean }> };
  };
}

/** Links open inside LINE through LIFF, so the member is signed in automatically. */
export function lineLink(origin: string, path: string) {
  return LIFF_ID ? `https://liff.line.me/${LIFF_ID}${path}` : `${origin}${path}`;
}

function normalize(value: string) {
  return value.replace(/[\s！!。.？?]/g, '').toLowerCase();
}

const COMMANDS = {
  checkIn: ['簽到', '報到'],
  seat: ['座位', '座位表', '座位圖'],
  lottery: ['抽獎', '抽禮物'],
  vote: ['投票', '長冠軍之星'],
  help: ['說明', 'help', '幫助', '選單'],
};

function matches(value: string, words: string[]) {
  return words.includes(normalize(value));
}

function helpText(origin: string) {
  return [
    '我可以幫你：',
    '・打「簽到」：例會當天幫你簽到',
    '・打「座位」：看今天的座位表和你的位子',
    '・打「抽獎」、「投票」：打開今天的活動頁',
    '',
    `今天的活動頁：${lineLink(origin, '/today')}`,
  ].join('\n');
}

function bindText(origin: string) {
  return `還沒綁定你的姓名。請點這裡選擇你的姓名，完成後打「簽到」就會直接幫你簽到：\n${lineLink(origin, '/login?next=/me')}`;
}

/** Records that this event was handled. False when LINE redelivered one we already handled. */
async function firstDelivery(webhookEventId: string | undefined) {
  if (!webhookEventId) return true;
  try {
    await prisma.lineWebhookReceipt.create({ data: { webhookEventId } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
    throw error;
  }
}

async function upsertChat(kind: 'user' | 'group' | 'room', lineId: string, data: { leftAt?: Date | null } = {}) {
  return prisma.lineChat.upsert({
    where: { lineId },
    create: { kind, lineId, name: null, checkInHintKey: null, leftAt: null },
    update: data,
  });
}

async function reply(event: LineEvent, messages: LineTextMessage[]) {
  if (!event.replyToken || messages.length === 0) return;
  await replyMessage(event.replyToken, messages);
}

async function handleUserText(event: LineEvent, userId: string, value: string, origin: string) {
  const member = await findMemberByLine(userId);

  if (matches(value, COMMANDS.checkIn)) {
    if (!member) return reply(event, [text(bindText(origin))]);
    const result = await checkInMemberForToday({ memberId: member.id, method: 'line_chat' });
    const message = describeCheckIn(result);
    const link = result.status === 'checked_in' || result.status === 'already' ? `\n\n今天的座位表：${lineLink(origin, '/today')}` : '';
    return reply(event, [text(`${message}${link}`)]);
  }

  if (matches(value, COMMANDS.seat)) {
    const seat = member ? await getMemberSeat(member.id) : null;
    const when = seat ? (seat.isToday ? '今天' : formatEventDate(seat.date)) : '今天';
    const mine = seat?.seatLabel ? `${member?.displayName}，你${when}的座位是 ${seat.seatLabel}。\n\n` : '';
    return reply(event, [text(`${mine}座位表：${lineLink(origin, '/today')}`)]);
  }

  if (matches(value, COMMANDS.lottery)) return reply(event, [text(`抽獎頁：${lineLink(origin, '/today/lottery')}`)]);
  if (matches(value, COMMANDS.vote)) return reply(event, [text(`投票頁：${lineLink(origin, '/today/vote')}`)]);

  // Free-form questions go to the AI in LINE-007; until then 阿麒 explains what it can do.
  return reply(event, [text(helpText(origin))]);
}

async function handleGroupText(event: LineEvent, chatLineId: string, kind: 'group' | 'room', value: string, origin: string) {
  const mentioned = Boolean(event.message?.mention?.mentionees?.some((item) => item.isSelf));

  if (matches(value, COMMANDS.checkIn)) {
    const today = await getFocusEvent({ publicOnly: true });
    if (!today || !isEventToday(today)) return;
    const chat = await upsertChat(kind, chatLineId);
    if (chat.checkInHintKey === today.weekId) return;
    await prisma.lineChat.update({ where: { id: chat.id }, data: { checkInHintKey: today.weekId } });
    return reply(event, [text(`請點這裡簽到 👉 ${lineLink(origin, '/today/check-in')}\n也可以私訊阿麒打「簽到」。`)]);
  }

  if (mentioned) {
    return reply(event, [text(`我在！今天的活動頁：${lineLink(origin, '/today')}\n簽到、查自己的座位，請私訊我。`)]);
  }
  // Everything else: stay quiet.
}

/** Handles one webhook event. Errors are logged by the caller and do not stop the other events. */
export async function handleLineEvent(event: LineEvent, origin: string) {
  if (!(await firstDelivery(event.webhookEventId))) return;
  const source = event.source;
  if (!source) return;

  if (source.type === 'user') {
    if (event.type === 'follow') {
      await upsertChat('user', source.userId, { leftAt: null });
      const member = await findMemberByLine(source.userId);
      const greeting = `你好，我是阿麒，長冠軍商會的 AI 同行夥伴。\n\n${helpText(origin)}`;
      return reply(event, [text(member ? greeting : `${greeting}\n\n${bindText(origin)}`)]);
    }
    if (event.type === 'unfollow') {
      await upsertChat('user', source.userId, { leftAt: new Date() });
      return;
    }
    if (event.type === 'message') {
      if (event.message?.type !== 'text' || !event.message.text) {
        return reply(event, [text('我目前只看得懂文字訊息。打「說明」可以看我能做什麼。')]);
      }
      return handleUserText(event, source.userId, event.message.text, origin);
    }
    return;
  }

  const kind = source.type;
  const chatLineId = source.type === 'group' ? source.groupId : source.roomId;

  if (event.type === 'join') {
    await upsertChat(kind, chatLineId, { leftAt: null });
    await logOperation({ actorRole: 'system', actorName: '阿麒', action: 'line_bot_joined', targetType: 'LineChat', metadata: { kind } });
    return reply(event, [
      text(
        `大家好，我是阿麒，長冠軍商會的 AI 同行夥伴。\n我會安靜待在群組裡，不會刷訊息；需要我的時候請 @阿麒。\n簽到、查自己的座位，請私訊我，或點這裡：${lineLink(origin, '/today')}`,
      ),
    ]);
  }
  if (event.type === 'leave') {
    await upsertChat(kind, chatLineId, { leftAt: new Date() });
    await logOperation({ actorRole: 'system', actorName: '阿麒', action: 'line_bot_left', targetType: 'LineChat', metadata: { kind } });
    return;
  }
  if (event.type === 'message' && event.message?.type === 'text' && event.message.text) {
    return handleGroupText(event, chatLineId, kind, event.message.text, origin);
  }
}
