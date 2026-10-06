import { hasLeaderAccess } from '@/server/auth/access';
import { toAdminSeatingWorkspaceDTO } from '@/application/seating/mappers';
import { findLatestSeatMapByWeekId } from '@/server/repositories/seating-workspace-repository';
import { buildEventAttendanceReport } from '@/server/attendance/attendance-report';
import { buildEventAttendanceWorkbook } from '@/server/attendance/attendance-xlsx';

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

export async function GET(_request: Request, context: RouteContext<'/api/admin/events/[weekId]/attendance-export'>) {
  if (!(await hasAdminAccess())) return unauthorized();

  const { weekId } = await context.params;
  const seatMap = await findLatestSeatMapByWeekId(weekId);
  if (!seatMap) {
    return Response.json(
      {
        error: 'seat_map_not_found',
        message: `No persisted seat map found for weekId ${weekId}.`,
      },
      { status: 404 },
    );
  }

  const dto = toAdminSeatingWorkspaceDTO(seatMap);
  const report = buildEventAttendanceReport(dto);
  const buffer = await buildEventAttendanceWorkbook(report);

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${weekId}-attendance.xlsx"`,
    },
  });
}
