import 'server-only';

import ExcelJS from 'exceljs';
import { attendanceStatusLabel, type EventAttendanceReport } from './attendance-report';

const HEADER_FONT = { bold: true } as const;

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = HEADER_FONT;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
  });
}

export async function buildEventAttendanceWorkbook(report: EventAttendanceReport): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Take Seat';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('摘要');
  summarySheet.columns = [{ key: 'label', width: 16 }, { key: 'value', width: 30 }];
  summarySheet.addRows([
    ['週次', report.title],
    ['日期', report.date.slice(0, 10)],
    ['分會', report.chapterName],
    ['例會', report.meetingLabel],
    [],
    ['總座位', report.summary.totalSeats],
    ['已安排', report.summary.occupiedSeats],
    ['已抵達', report.summary.checkedInCount],
    ['代理人數', report.summary.proxyCount],
    ['未出席人數', report.summary.absentCount],
  ]);

  const overviewSheet = workbook.addWorksheet('出席總覽');
  overviewSheet.columns = [
    { header: '座位', key: 'seatKey', width: 14 },
    { header: '區域', key: 'zone', width: 10 },
    { header: '姓名', key: 'displayName', width: 14 },
    { header: '角色', key: 'role', width: 14 },
    { header: '狀態', key: 'status', width: 12 },
    { header: '代理', key: 'isProxy', width: 8 },
  ];
  for (const seat of report.seats) {
    overviewSheet.addRow({
      seatKey: seat.seatKey,
      zone: seat.zone,
      displayName: seat.displayName,
      role: seat.role ?? '',
      status: attendanceStatusLabel(seat.status),
      isProxy: seat.isProxy ? '是' : '',
    });
  }
  styleHeaderRow(overviewSheet.getRow(1));

  const proxySheet = workbook.addWorksheet('代理人');
  proxySheet.columns = [
    { header: '座位', key: 'seatKey', width: 14 },
    { header: '姓名', key: 'displayName', width: 14 },
    { header: '狀態', key: 'status', width: 12 },
  ];
  for (const seat of report.proxyEntries) {
    proxySheet.addRow({
      seatKey: seat.seatKey,
      displayName: seat.displayName,
      status: attendanceStatusLabel(seat.status),
    });
  }
  styleHeaderRow(proxySheet.getRow(1));
  if (report.proxyEntries.length === 0) {
    proxySheet.addRow(['本次無代理人']);
  }

  const absentSheet = workbook.addWorksheet('未出席');
  absentSheet.columns = [
    { header: '姓名', key: 'name', width: 14 },
    { header: '分組', key: 'adminGroup', width: 12 },
  ];
  for (const member of report.absentMembers) {
    absentSheet.addRow({ name: member.name, adminGroup: member.adminGroup ?? '' });
  }
  styleHeaderRow(absentSheet.getRow(1));
  if (report.absentMembers.length === 0) {
    absentSheet.addRow(['本次全員出席']);
  }

  return workbook.xlsx.writeBuffer();
}
