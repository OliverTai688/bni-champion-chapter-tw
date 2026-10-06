import { STATUS_LABEL, STATUS_PALMS, formatDateTime } from '@/lib/tbx/labels';
import { getEventByKey } from '@/server/tbx/events';
import { getAttendance } from '@/server/tbx/participation';
import { isLeader } from '@/server/tbx/viewer';

function cell(value: string | number | null | undefined) {
  let text = value === null || value === undefined ? '' : String(value);
  // Names typed on the public check-in page must not run as spreadsheet formulas.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n']/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(_request: Request, context: { params: Promise<{ eventKey: string }> }) {
  if (!(await isLeader())) {
    return Response.json({ error: 'unauthorized', message: '需要領導團隊權限。' }, { status: 401 });
  }

  const { eventKey } = await context.params;
  const event = await getEventByKey(eventKey);
  if (!event) return Response.json({ error: 'not_found', message: '找不到這場活動。' }, { status: 404 });

  const { rows } = await getAttendance(event.id);
  const lines = [
    ['類別', '姓名', '狀態', 'PALMS', '代理人', '代理人到場', '簽到時間', '產業', '公司', '備註'].join(','),
    ...rows.map((row) =>
      [
        row.kind === 'guest' ? '來賓' : '會員',
        row.displayName,
        STATUS_LABEL[row.status],
        row.kind === 'guest' ? '' : STATUS_PALMS[row.status],
        row.substituteName,
        row.status === 'substitute' ? (row.substituteArrivedAt ? '是' : '否') : '',
        formatDateTime(row.status === 'substitute' ? row.substituteArrivedAt : row.checkedInAt),
        row.guestIndustry,
        row.guestCompany,
        row.note,
      ]
        .map(cell)
        .join(','),
    ),
  ];

  // BOM so Excel opens the UTF-8 file with the right encoding.
  return new Response(`﻿${lines.join('\r\n')}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="attendance-${event.weekId}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
