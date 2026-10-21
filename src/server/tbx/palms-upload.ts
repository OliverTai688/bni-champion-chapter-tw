import 'server-only';

import ExcelJS from 'exceljs';
import {
  PalmsParseError,
  parsePalmsReport,
  parsePalmsSheets,
  type PalmsReport,
  type Sheet,
  type SheetRow,
} from '@/lib/tbx/palms-parser';

function startsWith(bytes: Uint8Array, signature: number[]) {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
}

/** Excel dates carry no zone and exceljs returns them as UTC; keep the wall-clock time PALMS meant. */
function formatExcelDate(value: Date) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return (
    `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}` +
    ` ${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`
  );
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatExcelDate(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if ('richText' in value) return value.richText.map((run) => run.text).join('');
  if ('formula' in value || 'sharedFormula' in value) return cellText(value.result as ExcelJS.CellValue);
  if ('hyperlink' in value) return String(value.text ?? '');
  return '';
}

/** Reads an .xlsx workbook into the same sheet shape the SpreadsheetML reader produces. */
async function readXlsxSheets(buffer: ArrayBuffer): Promise<Sheet[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new PalmsParseError('這個 .xlsx 檔案打不開，可能已損毀。請重新從 BNI Connect 匯出後再上傳。');
  }

  return workbook.worksheets.map((worksheet) => {
    const rows: SheetRow[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: SheetRow = new Map();
      row.eachCell({ includeEmpty: false }, (cell, column) => {
        // exceljs repeats a merged cell's value in every covered cell; SpreadsheetML keeps it in the first only.
        if (cell.isMerged && cell.master.address !== cell.address) return;
        const text = cellText(cell.value).replace(/\r\n?/g, '\n').trim();
        if (text) cells.set(column, { type: cell.value instanceof Date ? 'DateTime' : typeof cell.value, text });
      });
      while (rows.length < rowNumber - 1) rows.push(new Map());
      rows.push(cells);
    });
    return { name: worksheet.name, rows };
  });
}

/** Uploaded PALMS file → report. Accepts the SpreadsheetML `.xls` BNI Connect downloads and an `.xlsx` copy of it. */
export async function parsePalmsUpload(buffer: ArrayBuffer): Promise<PalmsReport> {
  const bytes = new Uint8Array(buffer);

  // .xlsx is a zip archive: PK\x03\x04.
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return parsePalmsSheets(await readXlsxSheets(buffer));

  // An old binary .xls starts with the OLE signature D0 CF 11 E0.
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0])) {
    throw new PalmsParseError(
      '這個檔案是舊版 Excel 的二進位 .xls 格式，系統讀不到。請用 Excel 開啟後「另存新檔」選 .xlsx 再上傳，或直接上傳 BNI Connect 下載的 PALMS 摘要報告原始檔。',
    );
  }

  if (startsWith(bytes, [0xff, 0xfe])) return parsePalmsReport(new TextDecoder('utf-16le').decode(buffer));
  if (startsWith(bytes, [0xfe, 0xff])) return parsePalmsReport(new TextDecoder('utf-16be').decode(buffer));
  return parsePalmsReport(new TextDecoder('utf-8').decode(buffer));
}
