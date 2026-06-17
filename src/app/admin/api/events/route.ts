import { handleAdminEventSessionsGET, handleAdminEventSessionsPOST } from '@/server/admin/event-session-route-handlers';

export async function GET() {
  return handleAdminEventSessionsGET();
}

export async function POST(request: Request) {
  return handleAdminEventSessionsPOST(request);
}
