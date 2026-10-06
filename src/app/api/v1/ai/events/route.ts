import { withApiToken } from '@/server/ai/http';
import { listAiEvents } from '@/server/ai/seating-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withApiToken(request, 'seating:read', async () => ({ events: await listAiEvents() }));
}
