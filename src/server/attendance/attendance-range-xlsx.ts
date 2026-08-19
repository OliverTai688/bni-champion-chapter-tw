import 'server-only';

import ExcelJS from 'exceljs';
import type { RangeAttendanceReport } from './attendance-range-report';

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
  });
}

export async function buildRangeAttendanceWorkbook(report: RangeAttendanceReport): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Take Seat';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('摘要');
  summarySheet.columns = [{ key: 'label', width: 16 }, { key: 'value', width: 30 }];
  summarySheet.addRows([
    ['起始日期', report.from],
    ['結束日期', report.to],
    ['統計場次數', report.events.length],
  ]);

  const perPersonSheet = workbook.addWorksheet('出席統計');
  perPersonSheet.columns = [
    { header: '姓名', key: 'name', width: 14 },
    { header: '分組', key: 'adminGroup', width: 12 },
    { header: '統計場次', key: 'totalEvents', width: 10 },
    { header: '正常出席', key: 'presentCount', width: 10 },
    { header: '代理次數', key: 'proxyCount', width: 10 },
    { header: '未出席次數', key: 'absentCount', width: 12 },
    { header: '出席率', key: 'attendanceRate', width: 10 },
  ];
  for (const row of report.rows) {
    const attendanceRate = row.totalEvents > 0
      ? `${Math.round(((row.presentCount + row.proxyCount) / row.totalEvents) * 100)}%`
      : '-';
    perPersonSheet.addRow({
      name: row.name,
      adminGroup: row.adminGroup ?? '',
      totalEvents: row.totalEvents,
      presentCount: row.presentCount,
      proxyCount: row.proxyCount,
      absentCount: row.absentCount,
      attendanceRate,
    });
  }
  styleHeaderRow(perPersonSheet.getRow(1));

  const eventSheet = workbook.addWorksheet('活動明細');
  eventSheet.columns = [
    { header: '日期', key: 'date', width: 12 },
    { header: '週次', key: 'title', width: 20 },
    { header: '代理人', key: 'proxies', width: 30 },
    { header: '未出席', key: 'absentees', width: 40 },
  ];
  for (const detail of report.eventDetails) {
    eventSheet.addRow({
      date: detail.date.slice(0, 10),
      title: detail.title,
      proxies: detail.proxies.join('、') || '無',
      absentees: detail.absentees.join('、') || '無',
    });
  }
  styleHeaderRow(eventSheet.getRow(1));

  return workbook.xlsx.writeBuffer();
}
