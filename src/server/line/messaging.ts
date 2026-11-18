import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * LINE Messaging API for the official account 阿麒 (ARC-008 §5).
 * Secrets are read here only; they never reach a Client Component or a log line.
 */

const API = 'https://api.line.me/v2/bot';
const TIMEOUT_MS = 5000;
const MAX_TEXT_LENGTH = 5000;

export interface LineTextMessage {
  type: 'text';
  text: string;
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

async function post(path: string, body: unknown) {
  const token = accessToken();
  if (!token) throw new Error('LINE_MESSAGING_ACCESS_TOKEN is not set.');
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) {
    // The status is enough to debug; the body can echo message content.
    throw new Error(`LINE ${path} failed with ${response.status}`);
  }
}

/** Free and unlimited, but the token works once and only shortly after the event. */
export async function replyMessage(replyToken: string, messages: LineTextMessage[]) {
  await post('/message/reply', { replyToken, messages: messages.slice(0, 5) });
}

/** Counts against the monthly quota; in a group it counts once per member. Use sparingly. */
export async function pushMessage(to: string, messages: LineTextMessage[]) {
  await post('/message/push', { to, messages: messages.slice(0, 5) });
}
