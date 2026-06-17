import { createVoteAccessToken } from '@/server/repositories/live-poll-repository';

export async function POST(request: Request, context: RouteContext<'/api/public/events/[slug]/polls/[pollId]/access'>) {
  const { slug, pollId } = await context.params;
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code : null;

  try {
    return Response.json(await createVoteAccessToken(slug, pollId, code));
  } catch (error) {
    return Response.json(
      {
        error: 'vote_access_denied',
        message: error instanceof Error ? error.message : 'Unable to access this poll.',
      },
      { status: 403 },
    );
  }
}
