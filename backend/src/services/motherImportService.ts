import ExcelJS from 'exceljs';
import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';

// Bulk import — reads both .xlsx and .csv through ExcelJS (not the `xlsx`/SheetJS
// package on npm, whose published releases carry unpatched Prototype Pollution and
// ReDoS advisories against attacker-supplied files — exactly what an upload endpoint
// hands it). Column order below matches the downloadable template exactly.

export const IMPORT_TEMPLATE_COLUMNS = [
  'Full Name', 'Age', 'Date of Birth (YYYY-MM-DD)', 'Phone', 'Alt Phone', 'Marital Status',
  'National ID', 'Region', 'District', 'Village', 'Address',
  'Children Count', 'Children Living With Her', 'Orphans Under Care', 'Other Dependents',
  'Children Age Range', 'Family Situation', 'Income Source',
  'Vulnerability Reasons (semicolon-separated)', 'Other Reason (if Other selected)',
] as const;

const IMPORT_ALLOWED = new Set([
  'text/csv', 'application/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);
const importFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const isCsvExt = file.originalname.toLowerCase().endsWith('.csv');
  const isXlsxExt = file.originalname.toLowerCase().endsWith('.xlsx');
  (IMPORT_ALLOWED.has(file.mimetype) || isCsvExt || isXlsxExt)
    ? cb(null, true)
    : cb(new Error('Only .xlsx or .csv files are accepted'));
};
export const uploadMothersFile = multer({
  storage: multer.memoryStorage(),
  fileFilter: importFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

export interface ImportRow {
  rowNumber: number;
  fullName?: string;
  age?: number;
  dateOfBirth?: string;
  phone?: string;
  altPhone?: string;
  maritalStatus?: string;
  nationalId?: string;
  region?: string;
  district?: string;
  village?: string;
  address?: string;
  childrenCount?: number;
  childrenLivingWithHer?: number;
  orphansUnderCare?: number;
  otherDependents?: number;
  childrenAgeRange?: string;
  familySituation?: string;
  incomeSource?: string;
  vulnerabilityReasons?: string[];
  otherReasonText?: string;
}

function cell(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'text' in (v as any)) return String((v as any).text);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}
function num(v: string): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

export async function buildTemplateBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Mothers');
  ws.addRow(IMPORT_TEMPLATE_COLUMNS as unknown as string[]);
  ws.getRow(1).font = { bold: true };
  ws.addRow([
    'Amina Yusuf', 34, '1992-03-14', '0611223344', '', 'widowed',
    '', 'Banadir', 'Hodan', 'Wadajir', '',
    5, 5, 2, 0,
    '2-14', 'Lost husband, caring for 5 children alone', 'Small market stall',
    'Caring for Orphans;Single Mother', '',
  ]);
  ws.columns.forEach(c => { c.width = 22; });
  // Force Phone / Alt Phone / National ID to Text format so Excel doesn't
  // silently drop a leading zero when staff type a number into these columns.
  [4, 5, 7].forEach(colIdx => { ws.getColumn(colIdx).numFmt = '@'; });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

// Minimal RFC 4180 CSV line splitter — handles quoted fields, embedded commas,
// and doubled-quote escaping. Deliberately NOT routed through ExcelJS's CSV
// reader: that layer auto-infers numbers and dates from plain text (to mimic
// spreadsheet cell typing), which silently strips leading zeros from phone
// numbers / National IDs and can shift dates by a day across timezones —
// every cell here stays exactly the raw text the file contained.
function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') pushField();
    else if (c === '\n') pushRow();
    else field += c;
  }
  if (field !== '' || row.length > 0) pushRow();
  return rows.filter(r => r.length > 1 || (r[0] ?? '').trim() !== '');
}

function mapRowValues(rowNumber: number, values: string[]): ImportRow | null {
  if (values.every(v => (v ?? '').trim() === '')) return null;
  const [
    fullName, age, dob, phone, altPhone, maritalStatus, nationalId, region, district, village, address,
    childrenCount, childrenLivingWithHer, orphansUnderCare, otherDependents,
    childrenAgeRange, familySituation, incomeSource, vulnReasons, otherReason,
  ] = values.map(v => (v ?? '').trim());

  return {
    rowNumber, fullName, phone, altPhone, maritalStatus, nationalId, region, district, village, address,
    age: num(age), dateOfBirth: dob || undefined,
    childrenCount: num(childrenCount), childrenLivingWithHer: num(childrenLivingWithHer),
    orphansUnderCare: num(orphansUnderCare), otherDependents: num(otherDependents),
    childrenAgeRange, familySituation, incomeSource,
    vulnerabilityReasons: vulnReasons ? vulnReasons.split(';').map(s => s.trim()).filter(Boolean) : [],
    otherReasonText: otherReason || undefined,
  };
}

export async function parseImportFile(buffer: Buffer, filename: string, mimetype: string): Promise<ImportRow[]> {
  const isCsv = filename.toLowerCase().endsWith('.csv') || mimetype.includes('csv');
  const rows: ImportRow[] = [];

  if (isCsv) {
    const lines = parseCsvText(buffer.toString('utf-8'));
    lines.forEach((values, idx) => {
      const rowNumber = idx + 1;
      if (rowNumber === 1) return; // header
      const mapped = mapRowValues(rowNumber, values);
      if (mapped) rows.push(mapped);
    });
    return rows;
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const vals = (row.values as ExcelJS.CellValue[]).slice(1).map(cell); // exceljs rows are 1-indexed, [0] is empty
    const mapped = mapRowValues(rowNumber, vals);
    if (mapped) rows.push(mapped);
  });
  return rows;
}
