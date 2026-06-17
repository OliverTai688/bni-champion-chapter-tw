import { handleAdminPollPATCH } from '@/server/admin/poll-route-handlers';

export async function PATCH(request: Request, context: RouteContext<'/admin/api/events/[weekId]/polls/[pollId]'>) {
  const { weekId, pollId } = await context.params;
  return handleAdminPollPATCH(request, weekId, pollId);
}
