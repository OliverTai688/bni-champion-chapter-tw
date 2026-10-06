import { readJson, withApiToken } from '@/server/ai/http';
import { getSeatingContext, saveGridArrangement } from '@/server/ai/seating-service';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ eventKey: string }> };

/** Rules, roster, attendance and the current seat map of one event. */
export async function GET(request: Request, context: Context) {
  const { eventKey } = await context.params;
  return withApiToken(request, 'seating:read', () => getSeatingContext(eventKey));
}

/** Saves a new version of the weekly grid seat map. */
export async function PUT(request: Request, context: Context) {
  const { eventKey } = await context.params;
  return withApiToken(request, 'seating:write', async (caller) => saveGridArrangement(eventKey, await readJson(request), caller.name));
}
