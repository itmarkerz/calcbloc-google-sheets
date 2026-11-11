import { beforeEach, describe, expect, it } from "vitest";
import { CREDIT } from "../src/config";
import { insertTaxTable, TABLE_HEADER, tableGrid } from "../src/sheet";
import { setup } from "./helpers";

let env: ReturnType<typeof setup>;
beforeEach(() => {
  env = setup();
});

describe("Insert tax table", () => {
  it("writes a new sheet with title, credit link, page link, header, every row with its source, and a footer credit", () => {
    const res = insertTaxTable({ country: "norway" });
    expect(res).toEqual({ sheetName: "CalcBloc Norway 2026", rows: 98, pageUrl: "https://calcbloc.com/norway/tax-tables/2026" });
    const ss = env.gas.spreadsheetApp.spreadsheet;
    const sheet = ss.getSheetByName("CalcBloc Norway 2026")!;
    expect(ss.getActiveSheet()).toBe(sheet);
    const rows = sheet.dump();
    expect(rows[0][0]).toBe("Norway 2026 tax tables (NOK)");
    expect(rows[1][0]).toBe(`=HYPERLINK("https://calcbloc.com/data?utm_source=calcbloc-google-sheets&utm_medium=app&utm_campaign=itmarkerz-oss","${CREDIT}")`);
    expect(rows[1][1]).toBe('=HYPERLINK("https://calcbloc.com/norway/tax-tables/2026?utm_source=calcbloc-google-sheets&utm_medium=app&utm_campaign=itmarkerz-oss","Full table with notes: calcbloc.com/norway/tax-tables/2026")');
    expect(rows[4]).toEqual(TABLE_HEADER);
    expect(sheet.frozenRows).toBe(5);
    const data = rows.slice(5, 5 + 98);
    expect(data.every((r: unknown[]) => String(r[14]).startsWith("https://"))).toBe(true);
    const ind = data.find((r: unknown[]) => r[2] === "Individuals")!;
    expect(ind[5]).toBe(0.22);
    expect(ind[14]).toBe("https://www.skatteetaten.no/satser/alminnelig-inntekt/");
    const footer = rows.at(-1)!;
    expect(footer[0]).toContain(CREDIT);
    expect(footer[0]).toContain("CC BY 4.0");
    expect(footer[1]).toBe('=HYPERLINK("https://calcbloc.com/data?utm_source=calcbloc-google-sheets&utm_medium=app&utm_campaign=itmarkerz-oss","calcbloc.com/data")');
  });

  it("formats rates as percentages and keeps formula cells as formulas", () => {
    insertTaxTable({ country: "austria" });
    const sheet = env.gas.spreadsheetApp.spreadsheet.getSheetByName("CalcBloc Austria 2026")!;
    expect(sheet.formats.get("6,6")).toBe("0.00##%");
    expect(sheet.formats.get("2,1")).toBe("General");
    // unlabelled band rows get a readable label
    expect(sheet.dump()[5][2]).toBe("0 to 13,539");
  });

  it("inserts regional and earlier-year tables and never overwrites an existing sheet", () => {
    expect(insertTaxTable({ country: "uk", region: "scotland" }).sheetName).toBe("CalcBloc United Kingdom Scotland 2026-27");
    expect(insertTaxTable({ country: "uk", region: "scotland" }).sheetName).toBe("CalcBloc United Kingdom Scotland 2026-27 (2)");
    expect(insertTaxTable({ country: "uk", year: "2025-26" }).sheetName).toBe("CalcBloc United Kingdom 2025-26");
    const earlier = env.gas.spreadsheetApp.spreadsheet.getSheetByName("CalcBloc United Kingdom 2025-26")!.dump();
    expect(earlier[2][0]).toContain("earlier year, kept for reference");
  });

  it("keeps data that starts with = + - or @ as text, so table content can never become a formula", () => {
    const row = { section_id: "s", section: "=IMPORTXML(1)", group: "other", basis: "", note: "", tax_year: "2026", effective_from: "", effective_to: "", source_title: "-", source_url: "https://example.org/", retrieved_at: "", status: "verified", label: "+5%", from: null, to: null, rate: null, value: "@x", unit: "text" };
    const t = { country: "x", countryName: "X", year: "2026", yearLabel: "2026", region: null, currency: "EUR", effectiveFrom: "", effectiveTo: "", status: "verified", isCurrent: true, pageUrl: "https://calcbloc.com/x", sections: [], rows: [row] };
    const { values, headerRow } = tableGrid(t);
    expect(values[headerRow].slice(0, 7)).toEqual(["'=IMPORTXML(1)", "other", "'+5%", "", "", "", "'@x"]);
    expect(values[headerRow][13]).toBe("'-");
  });
});
