import { submitPublicVote } from '@/server/repositories/live-poll-repository';

export async function POST(request: Request, context: RouteContext<'/api/public/events/[slug]/polls/[pollId]/votes'>) {
  const { slug, pollId } = await context.params;
  const body = await request.json().catch(() => null);
  const optionId = typeof body?.optionId === 'string' ? body.optionId : '';
  const token = typeof body?.token === 'string' ? body.token : '';

  try {
    return Response.json(await submitPublicVote(slug, pollId, optionId, token));
  } catch (error) {
    return Response.json(
      {
        error: 'vote_rejected',
        message: error instanceof Error ? error.message : 'Unable to submit vote.',
      },
      { status: 400 },
    );
  }
}
