import { handleLineEvent, type LineEvent } from '@/server/line/events';
import { isMessagingConfigured, verifyLineSignature } from '@/server/line/messaging';

// Webhook of the LINE official account 阿麒 (PLN-007 LINE-004, ARC-008 §5).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isMessagingConfigured()) {
    return Response.json({ error: 'line_messaging_not_configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyLineSignature(rawBody, request.headers.get('x-line-signature'))) {
    return Response.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    const body = JSON.parse(rawBody) as { events?: unknown };
    events = Array.isArray(body.events) ? (body.events as LineEvent[]) : [];
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Quick commands are a few database calls, so they finish well inside LINE's timeout.
  // One bad event must not stop the others, and LINE always gets a 200 for a signed request.
  const origin = new URL(request.url).origin;
  for (const event of events) {
    try {
      await handleLineEvent(event, origin);
    } catch (error) {
      console.error('[line] webhook event failed', event.type, error instanceof Error ? error.message : 'unknown');
    }
  }
  return Response.json({ ok: true });
}
