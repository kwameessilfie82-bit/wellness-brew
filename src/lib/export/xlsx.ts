import "server-only";

import ExcelJS from "exceljs";

export type ColumnType = "text" | "money" | "int" | "number" | "date" | "datetime" | "bool";
export type Column<R> = { header: string; value: (row: R) => unknown; type?: ColumnType; width?: number };
export type Sheet<R = unknown> = { name: string; columns: Column<R>[]; rows: R[]; note?: string };
/** A sheet with its row type erased, so sheets of different shapes share one array. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySheet = Sheet<any>;

const NUM_FMT: Partial<Record<ColumnType, string>> = {
  money: '#,##0.00',
  int: "#,##0",
  number: "#,##0.##",
  date: "dd mmm yyyy",
  datetime: "dd mmm yyyy hh:mm",
};

function cellValue(v: unknown, type: ColumnType): ExcelJS.CellValue {
  if (v === null || v === undefined || v === "") return null;
  switch (type) {
    case "money":
    case "int":
    case "number": {
      const n = typeof v === "number" ? v : Number.parseFloat(String(v));
      return Number.isFinite(n) ? n : null;
    }
    case "date":
    case "datetime": {
      const d = v instanceof Date ? v : new Date(String(v));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    case "bool":
      return v ? "Yes" : "No";
    default:
      return String(v);
  }
}

/** Excel sheet names: max 31 chars, no []:*?/\ */
function safeSheetName(name: string, used: Set<string>): string {
  const base = name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31).trim() || "Sheet";
  let out = base;
  for (let i = 2; used.has(out.toLowerCase()); i++) out = `${base.slice(0, 28)} ${i}`;
  used.add(out.toLowerCase());
  return out;
}

/**
 * One workbook, one tab per sheet: bold frozen header, filters on, typed cells
 * (numbers stay numbers, dates stay dates) so the owner can sum and sort in Excel.
 */
export async function buildWorkbook(sheets: AnySheet[], title: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Wellness Brew admin";
  wb.title = title;
  wb.created = new Date();
  const used = new Set<string>();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(safeSheetName(sheet.name, used));
    const headerRow = sheet.note ? 3 : 1;
    if (sheet.note) {
      ws.getCell("A1").value = sheet.note;
      ws.getCell("A1").font = { italic: true, color: { argb: "FF666666" } };
    }
    ws.columns = sheet.columns.map((c) => ({
      key: c.header,
      width: c.width ?? Math.min(48, Math.max(10, c.header.length + 4)),
      style: NUM_FMT[c.type ?? "text"] ? { numFmt: NUM_FMT[c.type ?? "text"] } : {},
    }));
    const header = ws.getRow(headerRow);
    sheet.columns.forEach((c, i) => {
      header.getCell(i + 1).value = c.header;
    });
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E7D32" } };
    header.commit();

    for (const r of sheet.rows) {
      ws.addRow(sheet.columns.map((c) => cellValue(c.value(r), c.type ?? "text")));
    }
    if (sheet.rows.length === 0) ws.addRow(["No data"]);

    ws.views = [{ state: "frozen", ySplit: headerRow }];
    if (sheet.columns.length > 0) {
      ws.autoFilter = {
        from: { row: headerRow, column: 1 },
        to: { row: headerRow + Math.max(sheet.rows.length, 1), column: sheet.columns.length },
      };
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Typed sheet helper: infers the row type from `rows` so column callbacks are checked. */
export function sheet<R>(name: string, rows: R[], columns: Column<R>[], note?: string): AnySheet {
  return { name, rows, columns, note };
}
