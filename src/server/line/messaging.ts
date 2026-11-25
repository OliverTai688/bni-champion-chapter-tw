import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * LINE Messaging API for the official account 阿麒 (ARC-008 §5).
 * Secrets are read here only; they never reach a Client Component or a log line.
 */

const API = 'https://api.line.me/v2/bot';
const DATA_API = 'https://api-data.line.me/v2/bot';
const TIMEOUT_MS = 5000;
const MAX_TEXT_LENGTH = 5000;

export interface LineQuickReplyItem {
  type: 'action';
  action: { type: 'postback'; label: string; data: string; displayText?: string };
}

export interface LineTextMessage {
  type: 'text';
  text: string;
  quickReply?: { items: LineQuickReplyItem[] };
}

function channelSecret() {
  return process.env.LINE_MESSAGING_CHANNEL_SECRET?.trim() || null;
}

function accessToken() {
  return process.env.LINE_MESSAGING_ACCESS_TOKEN?.trim() || null;
}

export function isMessagingConfigured() {
  return Boolean(channelSecret() && accessToken());
}

/** `x-line-signature` is base64(HMAC-SHA256(channel secret, raw body)). */
export function verifyLineSignature(rawBody: string, signature: string | null) {
  const secret = channelSecret();
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('base64'));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function text(value: string): LineTextMessage {
  return { type: 'text', text: value.length > MAX_TEXT_LENGTH ? `${value.slice(0, MAX_TEXT_LENGTH - 1)}…` : value };
}

/** A text message with buttons under it that send a postback (no free text to parse). */
export function textWithButtons(value: string, buttons: Array<{ label: string; data: string }>): LineTextMessage {
  return {
    ...text(value),
    quickReply: {
      items: buttons.map((button) => ({
        type: 'action',
        action: { type: 'postback', label: button.label, data: button.data, displayText: button.label },
      })),
    },
  };
}

function authHeader() {
  const token = accessToken();
  if (!token) throw new Error('LINE_MESSAGING_ACCESS_TOKEN is not set.');
  return { Authorization: `Bearer ${token}` };
}

async function post(path: string, body: unknown) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) {
    // The status is enough to debug; the body can echo message content.
    throw new Error(`LINE ${path} failed with ${response.status}`);
  }
}

/** GET returning JSON, or null when LINE says the resource is not there (for example a left group). */
async function getJson<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API}${path}`, {
    headers: authHeader(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`LINE GET ${path.split('/').slice(0, 3).join('/')} failed with ${response.status}`);
  return (await response.json()) as T;
}

/** Free and unlimited, but the token works once and only shortly after the event. */
export async function replyMessage(replyToken: string, messages: LineTextMessage[]) {
  await post('/message/reply', { replyToken, messages: messages.slice(0, 5) });
}

/** Counts against the monthly quota; in a group it counts once per member. Use sparingly. */
export async function pushMessage(to: string, messages: LineTextMessage[]) {
  await post('/message/push', { to, messages: messages.slice(0, 5) });
}

export type ChatKind = 'group' | 'room';

/** Group name (rooms have none) and member count, shown in 阿麒工作室. */
export async function getChatSummary(kind: ChatKind, chatId: string) {
  const id = encodeURIComponent(chatId);
  const [summary, count] = await Promise.all([
    kind === 'group' ? getJson<{ groupName?: string }>(`/group/${id}/summary`) : Promise.resolve(null),
    getJson<{ count?: number }>(`/${kind}/${id}/members/count`),
  ]);
  return { name: summary?.groupName ?? null, memberCount: typeof count?.count === 'number' ? count.count : null };
}

/** Display name of someone in a group or room. Null when they left or never added the official account. */
export async function getChatMemberName(kind: ChatKind, chatId: string, userId: string) {
  const profile = await getJson<{ displayName?: string }>(
    `/${kind}/${encodeURIComponent(chatId)}/member/${encodeURIComponent(userId)}`,
  );
  return profile?.displayName ?? null;
}

/**
 * Downloads an image, video, audio or file a user sent. Videos and audio may still be
 * transcoding right after the event; the caller retries. Returns null when the content is not ready.
 */
export async function getMessageContent(messageId: string, maxBytes: number) {
  const response = await fetch(`${DATA_API}/message/${encodeURIComponent(messageId)}/content`, {
    headers: authHeader(),
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  });
  if (response.status === 202 || response.status === 404) return null;
  if (!response.ok) throw new Error(`LINE content download failed with ${response.status}`);
  const declared = Number.parseInt(response.headers.get('content-length') ?? '', 10);
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel();
    return { tooLarge: true as const, size: declared };
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength > maxBytes) return { tooLarge: true as const, size: body.byteLength };
  return { tooLarge: false as const, body, contentType: response.headers.get('content-type') ?? 'application/octet-stream' };
}
