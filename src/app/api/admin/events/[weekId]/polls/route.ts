import { handleAdminPollsGET, handleAdminPollsPOST } from '@/server/admin/poll-route-handlers';

export async function GET(_request: Request, context: RouteContext<'/api/admin/events/[weekId]/polls'>) {
  const { weekId } = await context.params;
  return handleAdminPollsGET(weekId);
}

export async function POST(request: Request, context: RouteContext<'/api/admin/events/[weekId]/polls'>) {
  const { weekId } = await context.params;
  return handleAdminPollsPOST(request, weekId);
}
