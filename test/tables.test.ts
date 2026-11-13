import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { CALCBLOC_BAND_TAX, CALCBLOC_RATE } from "../src/functions";
import { bandTax, compactTable, expandTable } from "../src/tables";
import { requests, setup } from "./helpers";
import { CACHE_MAX_PARTS, CACHE_PART_CHARS } from "../src/config";

const HERE = dirname(fileURLToPath(import.meta.url));
let env: ReturnType<typeof setup>;
beforeEach(() => {
  env = setup();
});

describe("CALCBLOC_RATE", () => {
  it("returns a rate as a decimal", () => {
    expect(CALCBLOC_RATE("norway", "general-income", "Individuals")).toBe(0.22);
    expect(CALCBLOC_RATE("Norway", "Tax on general income", "individuals")).toBe(0.22);
  });

  it("returns amounts and thresholds", () => {
    expect(CALCBLOC_RATE("uk", "personal-allowance", "Personal Allowance")).toBe(12570);
    expect(CALCBLOC_RATE("us", "fica-employee", "Social Security wage base")).toBe(184500);
    expect(CALCBLOC_RATE("us", "fica-employee", "Social Security rate")).toBe(0.062);
  });

  it("reaches unlabelled band rows by position", () => {
    expect(CALCBLOC_RATE("austria", "income-tax", "#2")).toBe(0.2);
    expect(CALCBLOC_RATE("austria", "income-tax", 3)).toBe(0.3);
    expect(() => CALCBLOC_RATE("austria", "income-tax", "#99")).toThrow(/has 7 rows; #99 is out of range/);
  });

  it("reads earlier years and regional tables", () => {
    expect(CALCBLOC_RATE("uk", "income-tax-scotland", "Starter rate", "", "scotland")).toBe(0.19);
    expect(CALCBLOC_RATE("uk", "income-tax-scotland", "Starter rate", "2026", "Scotland")).toBe(0.19);
    expect(typeof CALCBLOC_RATE("uk", "personal-allowance", "Personal Allowance", "2025-26")).toBe("number");
    expect(typeof CALCBLOC_RATE("us", "state-income-tax-single", "#1", "", "California")).toBe("number");
  });

  it("fetches each table once and answers every later cell from the cache", () => {
    CALCBLOC_RATE("norway", "general-income", "Individuals");
    CALCBLOC_RATE("norway", "trinnskatt", "Trinn 1");
    CALCBLOC_BAND_TAX("norway", 500000, "trinnskatt");
    expect(requests(env.api, "tax-tables")).toBe(1);
  });

  it("explains what to type when a section or label is not found or ambiguous", () => {
    expect(() => CALCBLOC_RATE("norway", "nothing", "x")).toThrow(/No section "nothing" in Norway 2026. Sections: general-income, trinnskatt/);
    expect(() => CALCBLOC_RATE("norway", "general-income", "Finnmark")).toThrow(/matches \d+ rows in general-income \(#\d/);
    expect(() => CALCBLOC_RATE("norway", "general-income", "zzz")).toThrow(/No row "zzz" in general-income. Rows: Individuals/);
    expect(() => CALCBLOC_RATE("norway", "general-income", "Individuals", "1999")).toThrow(/No Norway tax tables for 1999. Years available: 2026/);
    expect(() => CALCBLOC_RATE("norway", "general-income", "Individuals", "", "oslo")).toThrow(/no regional variants/);
  });
});

describe("CALCBLOC_BAND_TAX worked examples (hand-computed from the official schedules)", () => {
  it("US federal, single filer, 2026: taxable income 50,000", () => {
    // 12,400 x 10% + (50,000 - 12,400) x 12% = 1,240 + 4,512 = 5,752
    expect(CALCBLOC_BAND_TAX("us", 50000)).toBe(5752);
    expect(CALCBLOC_BAND_TAX("us", 50000, "federal-income-tax-single")).toBe(5752);
  });

  it("UK (England, Wales, NI rates) 2026-27: taxable income 50,000 after the Personal Allowance", () => {
    // 37,700 x 20% + 12,300 x 40% = 7,540 + 4,920 = 12,460
    expect(CALCBLOC_BAND_TAX("uk", 50000)).toBe(12460);
  });

  it("Scotland 2026-27: taxable income 40,000", () => {
    // 3,967 x 19% + 12,989 x 20% + 14,136 x 21% + 8,908 x 42% = 753.73 + 2,597.80 + 2,968.56 + 3,741.36 = 10,061.45
    expect(CALCBLOC_BAND_TAX("uk", 40000, "", "", "scotland")).toBe(10061.45);
  });

  it("Canada federal 2026: taxable income 117,045", () => {
    // 58,523 x 14% + 58,522 x 20.5% = 8,193.22 + 11,997.01 = 20,190.23
    expect(CALCBLOC_BAND_TAX("canada", 117045)).toBe(20190.23);
  });

  it("Norway trinnskatt 2026: personal income 500,000 (tables-only country)", () => {
    // (318,300 - 226,100) x 1.7% + (500,000 - 318,300) x 4.0% = 1,567.40 + 7,268.00 = 8,835.40
    expect(CALCBLOC_BAND_TAX("norway", 500000)).toBe(8835.4);
  });

  it("Austria 2026: taxable income 40,000", () => {
    // 8,453 x 20% + 14,466 x 30% + 3,542 x 40% = 1,690.60 + 4,339.80 + 1,416.80 = 7,447.20
    expect(CALCBLOC_BAND_TAX("austria", 40000)).toBe(7447.2);
  });

  it("Poland 2026: 100,000 gives 12,000 before the PLN 3,600 tax-reducing amount (credits are not applied)", () => {
    expect(CALCBLOC_BAND_TAX("poland", 100000)).toBe(12000);
  });

  it("works on a range and keeps going past a bad cell", () => {
    expect(CALCBLOC_BAND_TAX("austria", [[0], [13539], [""], ["x"], [21992]])).toEqual([[0], [0], [""], ['Error: Taxable income must be a number of 0 or more; got "x".'], [1690.6]]);
  });

  it("refuses sections that are not band schedules", () => {
    expect(() => CALCBLOC_BAND_TAX("norway", 1000, "general-income")).toThrow(/is not a band schedule. Band sections: trinnskatt/);
  });

  it("bandTax handles an open top band and amounts below the first threshold", () => {
    const rows = [
      { from: 0, to: 10, rate: 0 },
      { from: 10, to: null, rate: 0.5 },
    ] as never[];
    expect(bandTax(rows, 5)).toBe(0);
    expect(bandTax(rows, 30)).toBe(10);
  });
});

describe("compact cache format", () => {
  const dir = join(HERE, "fixtures", "tables");
  const files = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : [join(d, f)]));

  it("round-trips every fixture table without losing a field", () => {
    for (const f of files(dir)) {
      const raw = JSON.parse(readFileSync(f, "utf8"));
      const back = expandTable(JSON.parse(JSON.stringify(compactTable(raw))));
      expect(back.rows.length).toBe(raw.rows.length);
      raw.rows.forEach((r: Record<string, unknown>, i: number) => {
        for (const [k, v] of Object.entries(r)) expect((back.rows[i] as unknown as Record<string, unknown>)[k], `${f} row ${i} ${k}`).toEqual(v ?? (["from", "to", "rate", "value"].includes(k) ? null : ""));
      });
      expect(back.pageUrl).toBe(raw.pageUrl);
    }
  });

  // The full dataset lives in the sibling calcbloc-data repository; checked when it is present.
  const data = join(HERE, "..", "..", "calcbloc-data", "tables");
  it.runIf(existsSync(data))("keeps every compact table in the dataset within the cache part budget", () => {
    let largest = 0;
    for (const f of files(data).filter((x) => x.endsWith(".json") && !x.endsWith("manifest.json"))) {
      const size = JSON.stringify(compactTable(JSON.parse(readFileSync(f, "utf8")))).length;
      largest = Math.max(largest, size);
      expect(size, f).toBeLessThan(CACHE_PART_CHARS * CACHE_MAX_PARTS);
    }
    expect(largest).toBeGreaterThan(10000);
  });
});
