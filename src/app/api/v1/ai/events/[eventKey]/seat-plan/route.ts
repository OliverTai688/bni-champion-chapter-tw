import { readJson, withApiToken } from '@/server/ai/http';
import { saveAiSeatPlan } from '@/server/ai/seating-service';

export const dynamic = 'force-dynamic';

/** Saves who sits where on the event's floor plan: { assignments: { seatId: participationId } }. */
export async function PUT(request: Request, context: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await context.params;
  return withApiToken(request, 'seating:write', async (caller) => saveAiSeatPlan(eventKey, await readJson(request), caller.name));
}
