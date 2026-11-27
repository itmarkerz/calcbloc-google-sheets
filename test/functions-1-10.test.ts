import { beforeEach, describe, expect, it } from "vitest";
import { CALCBLOC_COUNTRIES, CALCBLOC_EMPLOYER_COST, CALCBLOC_NET, CALCBLOC_TAX } from "../src/functions";
import { requests, setup } from "./helpers";

let env: ReturnType<typeof setup>;
beforeEach(() => {
  env = setup();
});

// The responses are real API 1.10.0 responses from the site's own handler (harness/fake-api.mjs, RECORDED).
describe("API 1.10: Denmark, Estonia and Poland (shared take-home engine)", () => {
  it("CALCBLOC_NET by short code, ISO code or name", () => {
    expect(CALCBLOC_NET("dk", 600000)).toBe(383427.85);
    expect(CALCBLOC_NET("EE", 30000)).toBe(24405.6);
    expect(CALCBLOC_NET("Poland", 120000)).toBe(85762.92);
    expect(requests(env.api, "net-salary")).toBe(3);
  });

  it("CALCBLOC_TAX reads the income tax and CALCBLOC_EMPLOYER_COST the total cost", () => {
    expect(CALCBLOC_TAX("dk", 600000)).toBe(167479.19);
    expect(CALCBLOC_TAX("ee", 30000)).toBe(4514.4);
    expect(CALCBLOC_TAX("pl", 120000)).toBe(8465.76);
    expect(CALCBLOC_EMPLOYER_COST("pl", 120000)).toBe(144576);
    expect(CALCBLOC_EMPLOYER_COST("denmark", 600000)).toBe(602376);
  });

  it("passes each country's options to the API, and the API refuses unknown ones", () => {
    expect(typeof CALCBLOC_NET("dk", 500000, "", "", "municipality=101; church=true; atp_hours=1")).toBe("number");
    expect(typeof CALCBLOC_NET("ee", 30000, "", "", "funded_pension=none; pension_age=true")).toBe("number");
    expect(typeof CALCBLOC_EMPLOYER_COST("pl", 100000, "", "", "accident_rate_pct=2.5; commuter=true")).toBe("number");
    expect(() => CALCBLOC_NET("pl", 100000, "", "", "filing_status=mfj")).toThrow(/Unknown parameter "filing_status"/);
  });

  it("CALCBLOC_COUNTRIES lists Denmark, Estonia and Poland with take-home pay and employer cost", () => {
    const rows = CALCBLOC_COUNTRIES() as string[][];
    for (const code of ["denmark", "estonia", "poland"]) {
      const row = rows.find((r) => r[0] === code)!;
      expect(row[4], code).toBe("yes");
      expect(row[5], code).toBe("yes");
    }
    expect(rows.find((r) => r[0] === "fiji")?.[4]).toBe("no");
  });
});
