import { hasLeaderAccess } from '@/server/auth/access';
import { buildRangeAttendanceReport } from '@/server/attendance/attendance-range-report';
import { buildRangeAttendanceWorkbook } from '@/server/attendance/attendance-range-xlsx';

async function hasAdminAccess() {
  return hasLeaderAccess();
}

function unauthorized() {
  return Response.json(
    {
      error: 'unauthorized',
      message: 'Google sign-in or admin access is required for attendance export.',
    },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  if (!(await hasAdminAccess())) return unauthorized();

  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (!from || !to) {
    return Response.json(
      {
        error: 'missing_range',
        message: 'Query params "from" and "to" (YYYY-MM-DD) are required.',
      },
      { status: 400 },
    );
  }

  try {
    const report = await buildRangeAttendanceReport(from, to);
    const buffer = await buildRangeAttendanceWorkbook(report);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="attendance-summary-${report.from}_${report.to}.xlsx"`,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: 'invalid_range',
        message: error instanceof Error ? error.message : 'Unable to build attendance export.',
      },
      { status: 400 },
    );
  }
}
