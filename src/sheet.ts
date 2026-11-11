import { CREDIT, DATA_URL, LICENCE } from "./config";
import { resolveCountry, resolveRegion } from "./countries";
import { getTable, resolveYear, rowLabel, tableName, type Table } from "./tables";

export const TABLE_HEADER = ["Section", "Group", "Label", "From", "To", "Rate", "Value", "Unit", "Basis", "Tax year", "Effective from", "Effective to", "Status", "Source", "Source URL", "Last checked"];

const formula = (s: string) => s.replace(/"/g, '""');
const link = (url: string, label: string) => `=HYPERLINK("${formula(url)}","${formula(label)}")`;
/** setValues turns text starting with = (or + - @) into a formula; a leading apostrophe keeps data as text. */
const asText = (v: string | number) => (typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : v);

/**
 * The cells for a tax table: a title block with the credit and links, one row per band or value, and a footer.
 * Kept separate from the Sheets calls so it can be tested and reused.
 */
export function tableGrid(t: Table): { values: (string | number)[][]; formats: string[][]; headerRow: number } {
  const width = TABLE_HEADER.length;
  const pad = (r: (string | number)[]) => [...r, ...Array(width - r.length).fill("")];
  const moneyFmt = "#,##0.##";
  const values: (string | number)[][] = [
    pad([`${tableName(t)} tax tables (${t.currency})`]),
    pad([link(DATA_URL, CREDIT), link(t.pageUrl, `Full table with notes: ${t.pageUrl.replace(/^https:\/\//, "")}`)]),
    pad([`Effective ${t.effectiveFrom} to ${t.effectiveTo}. Status: ${t.status}${t.isCurrent ? "" : " (earlier year, kept for reference)"}. Rates are decimals shown as percentages. Each row links to its official source.`]),
    pad([]),
    TABLE_HEADER,
  ];
  const headerRow = values.length; // 1-based row number of the header
  for (const r of t.rows) {
    values.push(
      [
        r.section,
        r.group,
        rowLabel(r),
        r.from ?? "",
        r.to ?? "",
        r.rate ?? "",
        r.value ?? "",
        r.unit,
        r.basis,
        r.tax_year,
        r.effective_from,
        r.effective_to,
        r.status,
        r.source_title,
        r.source_url,
        r.retrieved_at,
      ].map(asText),
    );
  }
  values.push(pad([]));
  values.push(pad([`${CREDIT}. Licence ${LICENCE}: keep this credit and the link when you share or publish these figures.`, link(DATA_URL, "calcbloc.com/data")]));

  const formats = values.map((row, i) => {
    if (i < headerRow) return row.map(() => "@");
    const r = t.rows[i - headerRow];
    return row.map((_, j) => {
      if (!r) return "@";
      if (j === 3 || j === 4) return moneyFmt;
      if (j === 5) return "0.00##%";
      if (j === 6) return typeof r.value === "number" ? (r.unit === "money" ? moneyFmt : "0.####") : "@";
      return "@";
    });
  });
  // Formula cells must not be forced to plain text, or Sheets shows the formula instead of the link.
  formats[1] = formats[1].map(() => "General");
  formats[formats.length - 1] = formats[formats.length - 1].map(() => "General");
  return { values, formats, headerRow };
}

function uniqueSheetName(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, base: string): string {
  const name = base.slice(0, 90);
  if (!ss.getSheetByName(name)) return name;
  for (let i = 2; i < 100; i++) if (!ss.getSheetByName(`${name} (${i})`)) return `${name} (${i})`;
  return `${name} ${Date.now()}`;
}

export interface InsertRequest {
  country: string;
  year?: string;
  region?: string;
}

/** Writes the table to a new sheet in the open spreadsheet and selects it. */
export function insertTaxTable(req: InsertRequest): { sheetName: string; rows: number; pageUrl: string } {
  const country = resolveCountry(req.country);
  const year = resolveYear(country, req.year);
  const region = resolveRegion(country, req.region);
  const t = getTable(country, year, region);
  const { values, formats, headerRow } = tableGrid(t);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.insertSheet(uniqueSheetName(ss, `CalcBloc ${t.countryName}${t.region ? ` ${t.region.name}` : ""} ${t.year}`));
  const range = sheet.getRange(1, 1, values.length, TABLE_HEADER.length);
  range.setNumberFormats(formats);
  range.setValues(values);
  sheet.getRange(1, 1).setFontWeight("bold").setFontSize(13);
  sheet.getRange(headerRow, 1, 1, TABLE_HEADER.length).setFontWeight("bold").setBackground("#eef2ff");
  sheet.setFrozenRows(headerRow);
  sheet.setColumnWidths(1, 3, 220);
  sheet.setColumnWidth(9, 220);
  sheet.setColumnWidth(14, 260);
  sheet.setColumnWidth(15, 260);
  ss.setActiveSheet(sheet);
  return { sheetName: sheet.getName(), rows: t.rows.length, pageUrl: t.pageUrl };
}
