import { beforeEach, describe, expect, it } from "vitest";
import { addKeyMessage, buildUrl, getMany } from "../src/api";
import { MAX_NEW_REQUESTS_PER_CALL, PROP_API_KEY, PROP_SHARED_API_KEY } from "../src/config";
import { CALCBLOC_NET, CALCBLOC_RATE } from "../src/functions";
import { requests, setup, TEST_KEY } from "./helpers";

let env: ReturnType<typeof setup>;
beforeEach(() => {
  env = setup();
});

const KEYS_LINK = "https://calcbloc.com/developers/keys?utm_source=calcbloc-google-sheets&utm_medium=app&utm_campaign=itmarkerz-oss";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("API key", () => {
  it("works without a key: anonymous requests return results and send no key header", () => {
    expect(typeof CALCBLOC_RATE("norway", "general-income", "Individuals")).toBe("number");
    expect(typeof CALCBLOC_NET("uk", 41000)).toBe("number");
    expect(env.gas.fetch.apiKeysSent().length).toBeGreaterThan(0);
    expect(env.gas.fetch.apiKeysSent().every((k: string | null) => k === null)).toBe(true);
  });

  it("sends the key in X-API-Key with every request once one is saved", () => {
    env.gas.userProps.setProperty(PROP_API_KEY, TEST_KEY);
    CALCBLOC_RATE("norway", "general-income", "Individuals");
    CALCBLOC_NET("uk", 41000);
    expect(env.gas.fetch.apiKeysSent().length).toBeGreaterThan(0);
    expect(env.gas.fetch.apiKeysSent().every((k: string | null) => k === TEST_KEY)).toBe(true);
    expect(env.api.stats.noKey).toBe(0);
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
  it("without a key, asks for a free API key only after the API answers 429", () => {
    env = setup({ limits: true });
    const salaries = [[30001], [30002], [30003], [30004], [30005], [30006]];
    const out = CALCBLOC_NET("uk", salaries) as string[][];
    // 5 per minute without a key: /countries + 4 calculations succeed, the rest are asked for a key
    expect(out.filter((r) => typeof r[0] === "number")).toHaveLength(4);
    const msg = String(out[5][0]);
    expect(msg).toMatch(/^Error: Add your free API key: the free requests without a key \(50 a day, 5 a minute, per internet address\) are used up\./);
    expect(msg).toContain(KEYS_LINK);
    expect(msg).toContain("Extensions > CalcBloc > Settings and API key");
    expect(msg).toMatch(/Google's servers share internet addresses/);
    expect(msg).toMatch(/5,000 requests a day/);
    // results that came back before the limit carry no prompt
    expect(out.slice(0, 4).every((r) => typeof r[0] === "number")).toBe(true);
  });

  it("without a key, X-RateLimit-Remaining: 0 holds further keyless calls with the prompt (no request)", () => {
    env = setup({ limits: true, anonymousPerDay: 3 });
    expect(typeof CALCBLOC_NET("uk", 30001)).toBe("number"); // /countries + 1 calculation
    expect(typeof CALCBLOC_NET("uk", 30002)).toBe("number"); // the last free request: Remaining 0
    const n = requests(env.api);
    expect(() => CALCBLOC_NET("uk", 30003)).toThrow(new RegExp(`^Add your free API key.*${esc(KEYS_LINK)}`));
    expect(requests(env.api)).toBe(n);
    // adding a key lifts the hold at once
    env.gas.userProps.setProperty(PROP_API_KEY, TEST_KEY);
    expect(typeof CALCBLOC_NET("uk", 30003)).toBe("number");
    expect(env.gas.fetch.apiKeysSent().at(-1)).toBe(TEST_KEY);
  });

  it("with a key, a used-up limit says so without the key prompt", () => {
    env = setup({ limits: true, key: TEST_KEY });
    const col = Array.from({ length: 70 }, (_, i) => [30000 + i]);
    CALCBLOC_NET("uk", col.slice(0, 40)); // /countries + 40 calculations
    const out = CALCBLOC_NET("uk", col.slice(40)) as (number | string)[][];
    expect(out.filter((r) => typeof r[0] === "number")).toHaveLength(19);
    const msg = String(out.at(-1)![0]);
    expect(msg).toMatch(/^Error: CalcBloc API limit reached for your key \(5,000 a day, 60 a minute\)\. Try again in about 1 min/);
    expect(msg).not.toMatch(/Add your free API key/);
  });

  it("formats the key prompt with the wait time", () => {
    expect(addKeyMessage(30)).toMatch(/are used up\. Try again in about 1 min\. Google's/);
    expect(addKeyMessage(8 * 3600)).toMatch(/Try again in about 8 hours\./);
    expect(addKeyMessage()).toContain(KEYS_LINK);
  });

  it("holds a rate-limit error for at most a minute (no retry storm), then the cell fills in", () => {
    env = setup({ limits: true });
    for (let i = 0; i < 4; i++) CALCBLOC_NET("uk", 50000 + i);
    expect(() => CALCBLOC_NET("uk", 60000)).toThrow(/Add your free API key.*Try again in about 1 min/);
    const n = requests(env.api);
    expect(() => CALCBLOC_NET("uk", 60000)).toThrow(/Add your free API key/);
    expect(() => CALCBLOC_NET("uk", 60001)).toThrow(/Add your free API key/);
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
