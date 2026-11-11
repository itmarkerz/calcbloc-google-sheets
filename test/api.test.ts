import { beforeEach, describe, expect, it } from "vitest";
import { buildUrl, getMany } from "../src/api";
import { MAX_NEW_REQUESTS_PER_CALL, PROP_API_KEY, PROP_SHARED_API_KEY } from "../src/config";
import { CALCBLOC_NET, CALCBLOC_RATE } from "../src/functions";
import { requests, setup, TEST_KEY } from "./helpers";

let env: ReturnType<typeof setup>;
beforeEach(() => {
  env = setup();
});

describe("API key", () => {
  it("sends no key by default (anonymous) and the user's key once saved", () => {
    CALCBLOC_RATE("norway", "general-income", "Individuals");
    expect(env.gas.fetch.apiKeysSent().every((k: string | null) => k === null)).toBe(true);
    env.gas.userProps.setProperty(PROP_API_KEY, TEST_KEY);
    CALCBLOC_NET("uk", 41000);
    expect(env.gas.fetch.apiKeysSent().at(-1)).toBe(TEST_KEY);
  });

  it("in a custom function, falls back to a key shared with the spreadsheet (owner's user properties are empty)", () => {
    env.gas.env.mode = "custom-function";
    env.gas.userProps.setProperty(PROP_API_KEY, TEST_KEY); // the editor's own store: not visible here
    CALCBLOC_NET("uk", 42000);
    expect(env.gas.fetch.apiKeysSent().at(-1)).toBeNull();
    env.gas.documentProps.setProperty(PROP_SHARED_API_KEY, TEST_KEY);
    CALCBLOC_NET("uk", 43000);
    expect(env.gas.fetch.apiKeysSent().at(-1)).toBe(TEST_KEY);
  });

  it("reports a revoked key clearly", () => {
    env.gas.userProps.setProperty(PROP_API_KEY, "cb_" + "x".repeat(32));
    expect(() => CALCBLOC_NET("uk", 40000)).toThrow(/not valid or has been revoked. Check the key in Extensions > CalcBloc > Settings/);
  });
});

describe("rate limits", () => {
  it("anonymous: explains the shared 50/day limit and how to add a free key", () => {
    env = setup({ limits: true });
    const salaries = [[30001], [30002], [30003], [30004], [30005], [30006]];
    const out = CALCBLOC_NET("uk", salaries) as string[][];
    // 5 per minute without a key: /countries + 4 calculations succeed, the rest are told why
    expect(out.filter((r) => typeof r[0] === "number")).toHaveLength(4);
    expect(out[5][0]).toMatch(/^Error: CalcBloc API limit reached. Without a key the API allows 50 requests a day.*calcbloc\.com\/developers\/keys/);
  });

  it("holds a rate-limit error for at most a minute (no retry storm), then the cell fills in", () => {
    env = setup({ limits: true });
    for (let i = 0; i < 4; i++) CALCBLOC_NET("uk", 50000 + i);
    expect(() => CALCBLOC_NET("uk", 60000)).toThrow(/limit reached.*Try again in about 1 min/);
    const n = requests(env.api);
    expect(() => CALCBLOC_NET("uk", 60000)).toThrow(/limit reached/);
    expect(requests(env.api)).toBe(n);
    env.clock.t += 61_000;
    expect(typeof CALCBLOC_NET("uk", 60000)).toBe("number");
  });

  it("with a key, a 100-row column is fetched in batches of at most the per-call cap", () => {
    env = setup({ limits: true });
    env.gas.userProps.setProperty(PROP_API_KEY, TEST_KEY);
    const col = Array.from({ length: 100 }, (_, i) => [20000 + i * 1000]);
    const first = CALCBLOC_NET("uk", col) as (number | string)[][];
    expect(first.filter((r) => typeof r[0] === "number")).toHaveLength(MAX_NEW_REQUESTS_PER_CALL);
    expect(String(first[99][0])).toMatch(/Not fetched yet: more than 40 new values/);
    env.clock.t += 61_000;
    CALCBLOC_NET("uk", col);
    env.clock.t += 61_000;
    const third = CALCBLOC_NET("uk", col) as (number | string)[][];
    expect(third.every((r) => typeof r[0] === "number")).toBe(true);
    expect(requests(env.api, "net-salary")).toBe(100);
  });
});

describe("errors and caching", () => {
  it("caches stable errors (unsupported parameter) but not network failures", () => {
    expect(() => CALCBLOC_NET("us", 60000, "zz")).toThrow(/must be one of/);
    const n = requests(env.api, "net-salary");
    expect(() => CALCBLOC_NET("us", 60000, "zz")).toThrow(/must be one of/);
    expect(requests(env.api, "net-salary")).toBe(n);

    const realFetch = env.gas.globals.UrlFetchApp.fetch;
    env.gas.globals.UrlFetchApp.fetch = () => {
      throw new Error("DNS error: calcbloc.com");
    };
    expect(() => CALCBLOC_NET("uk", 77777)).toThrow(/Could not reach the CalcBloc API \(DNS error/);
    env.gas.globals.UrlFetchApp.fetch = realFetch;
    expect(typeof CALCBLOC_NET("uk", 77777)).toBe("number");
  });

  it("builds stable URLs (sorted parameters, blanks dropped) inside the urlFetchWhitelist prefix", () => {
    expect(buildUrl({ path: "/net-salary", params: { salary: 1, country: "us", region: "", year: undefined } })).toBe("https://calcbloc.com/api/v1/net-salary?country=us&salary=1");
    expect(buildUrl({ path: "/tax-tables/uk/2026-27", params: { region: "scotland" } })).toBe("https://calcbloc.com/api/v1/tax-tables/uk/2026-27?region=scotland");
  });

  it("puts calculation results in the document cache and public tables in the shared script cache", () => {
    getMany([{ path: "/net-salary", params: { country: "uk", salary: 12345 } }], "document");
    CALCBLOC_RATE("norway", "general-income", "Individuals");
    const doc = [...env.gas.documentCache.store.keys()].join(" ");
    const pub = [...env.gas.scriptCache.store.keys()].join(" ");
    expect(doc).toContain("salary=12345");
    expect(pub).not.toContain("salary=");
    expect(pub).toContain("table:v1:norway:2026");
  });
});
