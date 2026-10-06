import { readJson, withApiToken } from '@/server/ai/http';
import { evaluateGridArrangement } from '@/server/ai/seating-service';

export const dynamic = 'force-dynamic';

/** Checks an arrangement against the rules and attendance without saving it. */
export async function POST(request: Request, context: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await context.params;
  return withApiToken(request, 'seating:read', async () => (await evaluateGridArrangement(eventKey, await readJson(request))).report);
}
