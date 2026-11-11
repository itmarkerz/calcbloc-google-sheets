import { beforeEach, describe, expect, it } from "vitest";
import { cacheClear } from "../src/cache";
import { PROP_DEFAULT_COUNTRY, PROP_DEFAULT_REGION } from "../src/config";
import { CALCBLOC_COUNTRIES, CALCBLOC_EMPLOYER_COST, CALCBLOC_NET, CALCBLOC_TAX, INCOME_TAX_PARTS } from "../src/functions";
import { requests, setup } from "./helpers";

let env: ReturnType<typeof setup>;
beforeEach(() => {
  env = setup();
});

describe("CALCBLOC_NET (recorded live API response, 2026-11-11)", () => {
  it("returns annual take-home pay for a US salary in California", () => {
    // Live API: net-salary?country=us&salary=60000&region=ca -> netAnnual 47806.56
    expect(CALCBLOC_NET("us", 60000, "ca")).toBe(47806.56);
  });

  it("accepts names and formatted amounts as well as codes", () => {
    expect(CALCBLOC_NET("United States", "$60,000", "California")).toBe(47806.56);
    expect(CALCBLOC_NET("USA", "60000", "CA")).toBe(47806.56);
  });

  it("returns another result with options result=...", () => {
    // netPerPeriod 1838.7138… rounded to cents
    expect(CALCBLOC_NET("us", 60000, "ca", "", "result=netPerPeriod")).toBe(1838.71);
    expect(CALCBLOC_NET("us", 60000, "ca", "", "result=marginalRate")).toBe(0.26);
    expect(() => CALCBLOC_NET("us", 60000, "ca", "", "result=nope")).toThrow(/No result "nope". Available: netPerPeriod/);
  });

  it("caches results: the same formula again makes no new request", () => {
    CALCBLOC_NET("us", 60000, "ca");
    const before = requests(env.api);
    expect(CALCBLOC_NET("us", 60000, "ca")).toBe(47806.56);
    expect(CALCBLOC_TAX("us", 60000, "ca")).toBe(6823.44);
    expect(requests(env.api)).toBe(before);
  });

  it("refetches after the cache is cleared", () => {
    CALCBLOC_NET("us", 60000, "ca");
    const n = requests(env.api, "net-salary");
    cacheClear();
    CALCBLOC_NET("us", 60000, "ca");
    expect(requests(env.api, "net-salary")).toBe(n + 1);
  });

  it("fills a range with one formula, one request per distinct salary, blanks stay blank", () => {
    const out = CALCBLOC_NET("uk", [[30000], [""], [45000], [30000], ["abc"]]) as (number | string)[][];
    expect(out).toHaveLength(5);
    expect(typeof out[0][0]).toBe("number");
    expect(out[1][0]).toBe("");
    expect(out[3][0]).toBe(out[0][0]);
    expect(String(out[4][0])).toMatch(/^Error: Salary must be a number/);
    expect(requests(env.api, "net-salary")).toBe(2);
  });

  it("returns an empty cell for a blank salary (so the formula can be filled down)", () => {
    expect(CALCBLOC_NET("uk", "")).toBe("");
  });

  it("uses the spreadsheet's default country and region when the country is blank", () => {
    env.gas.documentProps.setProperty(PROP_DEFAULT_COUNTRY, "us");
    env.gas.documentProps.setProperty(PROP_DEFAULT_REGION, "ca");
    expect(CALCBLOC_NET("", 60000)).toBe(47806.56);
    // The default region applies only to the default country.
    expect(() => CALCBLOC_NET("canada", 60000)).toThrow(/region/i);
  });

  it("explains a missing region where the API requires one", () => {
    expect(() => CALCBLOC_NET("us", 60000)).toThrow(/Parameter "region" is required/);
  });

  it("passes options through to the API, which validates them", () => {
    expect(typeof CALCBLOC_NET("us", 60000, "ny", "", "filing_status=mfj; frequency=monthly")).toBe("number");
    const url = env.gas.fetch.calls.at(-1)!.url;
    expect(url).toContain("filing_status=mfj");
    expect(url).toContain("frequency=monthly");
    expect(() => CALCBLOC_NET("us", 60000, "ny", "", "colour=blue")).toThrow(/Unknown parameter "colour"/);
    expect(() => CALCBLOC_NET("us", 60000, "ny", "", "not an option")).toThrow(/name=value/);
  });

  it("explains that calculations use the current tax year only, without calling the API", () => {
    const n = requests(env.api);
    expect(() => CALCBLOC_NET("uk", 40000, "", "2025-26")).toThrow(/current tax year \(2026-27\) only/);
    expect(requests(env.api)).toBe(n === 0 ? 1 : n); // only /countries, no calculation request
    expect(CALCBLOC_NET("uk", 40000, "", "2026")).toEqual(CALCBLOC_NET("uk", 40000, "", "latest"));
  });

  it("gives a clear message for a tables-only country, pointing to CALCBLOC_BAND_TAX and the tables page", () => {
    expect(() => CALCBLOC_NET("norway", 600000)).toThrow(/not available for Norway yet \(tax tables only\).*CALCBLOC_BAND_TAX\("norway", amount\).*https:\/\/calcbloc\.com\/norway\/tax-tables\/2026/);
    expect(requests(env.api, "net-salary")).toBe(0);
  });

  it("rejects unknown countries with the list of valid codes", () => {
    expect(() => CALCBLOC_NET("atlantis", 1000)).toThrow(/Unknown country "atlantis". Use one of: .*new-zealand/);
  });
});

describe("CALCBLOC_TAX", () => {
  it("adds federal and state income tax for the US (recorded response)", () => {
    // Breakdown: Federal income tax 5,020.08 + State income tax 1,803.36 (FICA and CA SDI excluded)
    expect(CALCBLOC_TAX("us", 60000, "ca")).toBe(6823.44);
  });

  it.each([
    ["uk", "", 50000, 7500],
    ["canada", "on", 100000, 15000],
    ["germany", "", 60000, 9072],
    ["ireland", "", 50000, 10000],
    ["australia", "", 90000, 18000],
    ["new-zealand", "", 80000, 14400],
    ["india", "", 1200000, 96000],
    ["spain", "", 40000, 6400],
    ["netherlands", "", 50000, 15000],
    ["france", "", 45000, 2700],
    ["singapore", "", 100000, 4000],
  ])("reads the income tax parts for %s (synthetic response with the real result names)", (country, region, salary, expected) => {
    expect(CALCBLOC_TAX(country, salary, region)).toBe(expected);
  });

  it("documents what is included for every country that has a calculator", () => {
    const calc = (CALCBLOC_COUNTRIES() as string[][]).slice(1).filter((r) => r[4] === "yes").map((r) => r[0]);
    for (const c of calc) expect(INCOME_TAX_PARTS[c], c).toBeDefined();
  });

  it("does not guess for tables-only countries", () => {
    expect(() => CALCBLOC_TAX("austria", 50000)).toThrow(/tax tables only/);
  });
});

describe("CALCBLOC_EMPLOYER_COST", () => {
  it("returns the total cost for a UK salary (recorded response)", () => {
    // Live API: employer-cost?country=uk&salary=40000 -> totalCost 46262.2
    expect(CALCBLOC_EMPLOYER_COST("uk", 40000)).toBe(46262.2);
    expect(CALCBLOC_EMPLOYER_COST("uk", 40000, "", "", "result=employerNi")).toBe(5249.4);
  });

  it("knows which countries have no employer-cost calculator (from /countries)", () => {
    expect(() => CALCBLOC_EMPLOYER_COST("france", 50000)).toThrow(/Employer cost is not available for France yet/);
  });
});

describe("CALCBLOC_COUNTRIES", () => {
  it("lists every country from the API, not a hard-coded list", () => {
    const rows = CALCBLOC_COUNTRIES() as string[][];
    expect(rows[0]).toEqual(["Code", "Country", "Currency", "Current tax year", "Take-home pay", "Employer cost", "Tax tables"]);
    expect(rows.length - 1).toBe(24);
    expect(rows.find((r) => r[0] === "norway")).toEqual(["norway", "Norway", "NOK", "2026", "no", "no", "https://calcbloc.com/norway/tax-tables/2026"]);
    expect(requests(env.api, "countries")).toBe(1);
    CALCBLOC_COUNTRIES();
    expect(requests(env.api, "countries")).toBe(1);
  });
});
