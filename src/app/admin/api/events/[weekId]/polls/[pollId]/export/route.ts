import { handleAdminPollExportGET } from '@/server/admin/poll-route-handlers';

export async function GET(_request: Request, context: RouteContext<'/admin/api/events/[weekId]/polls/[pollId]/export'>) {
  const { weekId, pollId } = await context.params;
  return handleAdminPollExportGET(weekId, pollId);
}
