import { beforeEach, describe, expect, it } from "vitest";
import { cachePut } from "../src/cache";
import { COUNTRY_CODES, countryKeyFor } from "../src/country-codes";
import { compactCountries, getCountries, resolveCountry } from "../src/countries";
import { CALCBLOC_BAND_TAX, CALCBLOC_NET } from "../src/functions";
import { normalize } from "../src/util";
import { setup } from "./helpers";

let env: ReturnType<typeof setup>;
beforeEach(() => {
  env = setup();
});

describe("country codes table", () => {
  it("covers all 134 country keys (133 released + Belgium, held), each with a distinct lower-case short code and upper-case ISO code", () => {
    const entries = Object.entries(COUNTRY_CODES);
    expect(entries).toHaveLength(134);
    const shorts = entries.map(([, v]) => v.short);
    expect(new Set(shorts).size).toBe(134);
    for (const [, v] of entries) {
      expect(v.short).toMatch(/^[a-z]{2}$/);
      expect(v.iso).toMatch(/^[A-Z]{2}$/);
    }
    expect(COUNTRY_CODES.uk).toMatchObject({ short: "uk", iso: "GB" });
  });

  it("maps every key, short code and ISO code back to its key", () => {
    for (const [key, v] of Object.entries(COUNTRY_CODES)) {
      expect(countryKeyFor(normalize(key))).toBe(key);
      expect(countryKeyFor(normalize(v.short))).toBe(key);
      expect(countryKeyFor(normalize(v.iso))).toBe(key);
    }
    expect(countryKeyFor("gb")).toBe("uk");
    expect(countryKeyFor(normalize("Türkiye"))).toBe("turkey");
    expect(countryKeyFor("atlantis")).toBeUndefined();
  });
});

describe("resolveCountry", () => {
  it("accepts, for every live country, the old key, the short code, the ISO code and the English name, in any case", () => {
    const live = getCountries();
    expect(live.length).toBeGreaterThan(20);
    for (const c of live) {
      const info = COUNTRY_CODES[c.code];
      expect(info, `${c.code} is in the codes table`).toBeDefined();
      for (const input of [c.code, c.code.toUpperCase(), info.short, info.short.toUpperCase(), info.iso, info.iso.toLowerCase(), c.name, c.name.toUpperCase(), c.name.toLowerCase()]) {
        expect(resolveCountry(input).code, input).toBe(c.code);
      }
    }
  });

  it("resolves de, fr, gb, uk and nz", () => {
    expect(resolveCountry("de").code).toBe("germany");
    expect(resolveCountry("DE").code).toBe("germany");
    expect(resolveCountry("fr").code).toBe("france");
    expect(resolveCountry("FR").code).toBe("france");
    expect(resolveCountry("gb").code).toBe("uk");
    expect(resolveCountry("GB").code).toBe("uk");
    expect(resolveCountry("uk").code).toBe("uk");
    expect(resolveCountry("nz").code).toBe("new-zealand");
    expect(resolveCountry("new-zealand").code).toBe("new-zealand");
    expect(resolveCountry(" New Zealand ").code).toBe("new-zealand");
    expect(resolveCountry("Deutschland").code).toBe("germany");
    expect(resolveCountry("USA").code).toBe("us");
  });

  it("uses short_code and iso_code from /countries, so countries the built-in table does not know still resolve", () => {
    const list = compactCountries({
      countries: [
        { code: "atlantis", name: "Atlantis", currency: "ATL", current_year: "2026", short_code: "xa", iso_code: "XA", endpoints: { "tax-tables": { regions: [] } } },
      ],
    });
    expect(list[0]).toMatchObject({ shortCode: "xa", isoCode: "XA" });
    cachePut("public", "countries:v1", list, 3600);
    expect(resolveCountry("xa").code).toBe("atlantis");
    expect(resolveCountry("XA").code).toBe("atlantis");
    expect(resolveCountry("Atlantis").code).toBe("atlantis");
    // a known code for a country the live list does not have is still refused, with the valid codes
    expect(() => resolveCountry("de")).toThrow(/Unknown country "de". Use one of: atlantis/);
  });

  it("formulas take short and ISO codes: the request uses the API key", () => {
    expect(CALCBLOC_BAND_TAX("at", 40000)).toBe(7447.2);
    expect(CALCBLOC_BAND_TAX("AT", 40000)).toBe(7447.2);
    expect(env.gas.fetch.calls.at(-1)!.url).toContain("/tax-tables/austria/");
    expect(CALCBLOC_NET("US", 60000, "ca")).toBe(47806.56);
  });
});
