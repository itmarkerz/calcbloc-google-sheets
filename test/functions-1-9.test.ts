import { beforeEach, describe, expect, it } from "vitest";
import { CALCBLOC_BONUS_WITHHOLDING, CALCBLOC_IMPORT_DUTY } from "../src/functions";
import { requests, setup } from "./helpers";

let env: ReturnType<typeof setup>;
beforeEach(() => {
  env = setup();
});

describe("CALCBLOC_BONUS_WITHHOLDING (recorded live API response, 2026-11-27)", () => {
  it("returns the tax withheld on a US bonus in California, and other summary figures with result=", () => {
    // Live API: supplemental-withholding?country=us&salary=150000&amount=20000&region=ca -> totalWithheld 8236
    expect(CALCBLOC_BONUS_WITHHOLDING("us", 150000, 20000, "", "ca")).toBe(8236);
    expect(CALCBLOC_BONUS_WITHHOLDING("United States", "$150,000", "20,000", "", "California", "result=totalLiability")).toBe(8450);
    expect(CALCBLOC_BONUS_WITHHOLDING("us", 150000, 20000, "", "ca", "result=netPayment")).toBe(11764);
    expect(requests(env.api, "supplemental-withholding")).toBe(1);
  });

  it("checks its inputs before any request", () => {
    expect(() => CALCBLOC_BONUS_WITHHOLDING("us", 150000, "lots", "", "ca")).toThrow(/Amount must be a number/);
    expect(() => CALCBLOC_BONUS_WITHHOLDING("us", 150000, 20000, "", "ca", "result=nope")).toThrow(/No result "nope"/);
    expect(requests(env.api, "supplemental-withholding")).toBe(0);
  });
});

describe("CALCBLOC_IMPORT_DUTY (recorded live API responses, 2026-11-27)", () => {
  it("UK coffee from India with proof of origin: no duty and no VAT, landed cost = customs value", () => {
    expect(CALCBLOC_IMPORT_DUTY("gb", "in", "0901 21 00 00", 1000, "", "proof_of_origin=true")).toBe(0);
    expect(CALCBLOC_IMPORT_DUTY("gb", "in", "0901210000", 1000, "landed_cost", "proof_of_origin=true")).toBe(1000);
  });

  it("an incomplete total (beer without an excise code) is an error, not an understated number", () => {
    expect(() => CALCBLOC_IMPORT_DUTY("gb", "de", "2203000100", 500, "", "quantity=100; unit=l")).toThrow(/incomplete: excise applies to this code/);
    // The customs duty part alone is still available.
    expect(CALCBLOC_IMPORT_DUTY("gb", "de", "2203000100", 500, "customs_duty", "quantity=100; unit=l")).toBe(0);
  });

  it("checks its inputs before any request", () => {
    expect(() => CALCBLOC_IMPORT_DUTY("", "in", "0901210000", 1000)).toThrow(/Destination is required/);
    expect(() => CALCBLOC_IMPORT_DUTY("gb", "in", "coffee", 1000)).toThrow(/commodity code/);
    expect(() => CALCBLOC_IMPORT_DUTY("gb", "in", "0901210000", 0)).toThrow(/Customs value/);
    expect(() => CALCBLOC_IMPORT_DUTY("gb", "in", "0901210000", 1000, "tariff")).toThrow(/No result "tariff"/);
    expect(requests(env.api, "import-duty")).toBe(0);
  });
});
