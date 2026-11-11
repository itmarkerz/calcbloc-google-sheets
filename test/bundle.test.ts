// Checks the files clasp would push (dist/), loaded the way Apps Script loads them: one shared global scope.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { DIST, loadBundle, manifest } from "../harness/load-bundle.mjs";
import { setup, TEST_KEY } from "./helpers";

let env: ReturnType<typeof setup>;
let gs: Record<string, (...a: unknown[]) => any>;
beforeEach(() => {
  env = setup();
  gs = loadBundle(env.gas.globals) as never;
});

const code = () => readFileSync(join(DIST, "Code.js"), "utf8");
const customFunctions = () => [...code().matchAll(/\/\*\*([\s\S]*?)\*\/\s*function (\w+)\(/g)].filter((m) => m[1].includes("@customfunction")).map((m) => ({ name: m[2], doc: m[1] }));

describe("manifest (appsscript.json)", () => {
  it("uses V8 and only the three scopes the add-on needs", () => {
    const m = manifest();
    expect(m.runtimeVersion).toBe("V8");
    expect([...m.oauthScopes].sort()).toEqual([
      "https://www.googleapis.com/auth/script.container.ui",
      "https://www.googleapis.com/auth/script.external_request",
      "https://www.googleapis.com/auth/spreadsheets.currentonly",
    ]);
    expect(m.urlFetchWhitelist).toEqual(["https://calcbloc.com/api/"]);
  });
});

describe("custom functions in Code.js", () => {
  it("declares each function as a plain global with JSDoc help, @customfunction and the data credit", () => {
    const fns = customFunctions();
    expect(fns.map((f) => f.name).sort()).toEqual(["CALCBLOC_BAND_TAX", "CALCBLOC_COUNTRIES", "CALCBLOC_EMPLOYER_COST", "CALCBLOC_NET", "CALCBLOC_RATE", "CALCBLOC_TAX"]);
    for (const f of fns) {
      expect(f.doc, f.name).toContain("Data by CalcBloc (calcbloc.com/data)");
      expect(f.doc, f.name).toMatch(/@return/);
      expect(f.name.endsWith("_")).toBe(false);
      expect(typeof gs[f.name], f.name).toBe("function");
    }
  });

  it("documents every parameter the bundle function accepts", () => {
    for (const f of customFunctions()) {
      const params = code().match(new RegExp(`function ${f.name}\\(([^)]*)\\)`))![1].split(",").map((s) => s.trim()).filter(Boolean);
      const documented = [...f.doc.matchAll(/@param \{[^}]+\} (\w+)/g)].map((m) => m[1]);
      expect(documented, f.name).toEqual(params);
    }
  });

  it("computes through the built bundle", () => {
    expect(gs.CALCBLOC_NET("us", 60000, "ca")).toBe(47806.56);
    expect(gs.CALCBLOC_TAX("us", 60000, "ca")).toBe(6823.44);
    expect(gs.CALCBLOC_EMPLOYER_COST("uk", 40000)).toBe(46262.2);
    expect(gs.CALCBLOC_RATE("norway", "general-income", "Individuals")).toBe(0.22);
    expect(gs.CALCBLOC_BAND_TAX("us", 50000)).toBe(5752);
  });
});

describe("menu and sidebar", () => {
  it("onOpen builds the add-on menu without touching properties or the network (works in AuthMode.NONE)", () => {
    const props = env.gas.globals.PropertiesService;
    env.gas.globals.PropertiesService = { getUserProperties: () => { throw new Error("not in NONE mode"); }, getDocumentProperties: () => { throw new Error("not in NONE mode"); } } as never;
    gs = loadBundle(env.gas.globals) as never;
    gs.onOpen({ authMode: "NONE" });
    env.gas.globals.PropertiesService = props;
    const menu = env.gas.spreadsheetApp.menus[0];
    expect(menu.items.filter((i: unknown) => i !== "---").map((i: { caption: string; fn: string }) => [i.caption, i.fn])).toEqual([
      ["Insert tax table", "showInsertTable"],
      ["Settings and API key", "showSettings"],
      ["Function help", "showHelp"],
    ]);
    for (const i of menu.items) if (i !== "---") expect(typeof gs[i.fn]).toBe("function");
    expect(env.gas.fetch.calls).toHaveLength(0);
  });

  it("opens the sidebar on the requested tab", () => {
    gs.showSettings();
    const html = env.gas.spreadsheetApp.sidebars[0];
    expect(html.title).toBe("CalcBloc tax data");
    expect(html.getContent()).toContain('var INITIAL_TAB = "settings"');
    expect(html.getContent()).toContain("Data by CalcBloc (calcbloc.com/data)");
    expect(html.getContent()).toContain('href="https://calcbloc.com/data?utm_source=calcbloc-google-sheets&amp;utm_medium=app&amp;utm_campaign=itmarkerz-oss"');
  });

  it("sidebarInit returns countries and settings, never the key itself", () => {
    env.gas.userProps.setProperty("calcbloc.apiKey", TEST_KEY);
    const res = gs.sidebarInit();
    expect(res.ok).toBe(true);
    expect(res.data.countries.length).toBe(24);
    expect(res.data.countries.find((c: { code: string }) => c.code === "uk").years).toEqual(["2026-27", "2025-26"]);
    expect(JSON.stringify(res)).not.toContain(TEST_KEY);
    expect(res.data.settings.keyHint).toBe("cb_…O5p6");
  });

  it("works without a key, and asks for a free key in the sidebar once the free allowance is used up", () => {
    env = setup({ limits: true, anonymousPerDay: 1 });
    gs = loadBundle(env.gas.globals) as never;
    const first = gs.sidebarInit(); // the one free request
    expect(first.ok).toBe(true);
    expect(first.data.needsKey).toBe(false);
    expect(first.data.countries.length).toBe(24);
    expect(env.gas.fetch.apiKeysSent()).toEqual([null]);
    // Remaining was 0: the table insert is held with the prompt, without a request
    const insert = gs.sidebarInsertTable({ country: "uk", year: "2026-27", region: "" });
    expect(insert).toMatchObject({ ok: false, needsKey: true, message: expect.stringMatching(/^Add your free API key/) });
    expect(env.gas.fetch.calls).toHaveLength(1);
    // after clearing the cache the country list is fetched again and refused (429): settings still load
    gs.sidebarClearCache();
    const second = gs.sidebarInit();
    expect(second.ok).toBe(true);
    expect(second.data.needsKey).toBe(true);
    expect(second.data.countries).toEqual([]);
    expect(second.data.countriesError).toMatch(/^Add your free API key.*calcbloc\.com\/developers\/keys\?utm_source=calcbloc-google-sheets&utm_medium=app&utm_campaign=itmarkerz-oss.*Extensions > CalcBloc > Settings/);
    expect(second.data.settings.hasKey).toBe(false);
    expect(env.gas.fetch.calls).toHaveLength(2);
    gs.showSettings();
    const html = env.gas.spreadsheetApp.sidebars[0].getContent();
    expect(html).toContain('id="needs-key"');
    expect(html).toContain("Add your free API key.");
    expect(html).toContain('href="https://calcbloc.com/developers/keys?utm_source=calcbloc-google-sheets&amp;utm_medium=app&amp;utm_campaign=itmarkerz-oss"');
  });

  it("saves a key only after the API accepts it, and can share it with the spreadsheet", () => {
    const bad = gs.sidebarSaveSettings({ apiKey: "nonsense" });
    expect(bad).toEqual({ ok: false, message: expect.stringMatching(/does not look like a CalcBloc API key/) });
    const revoked = gs.sidebarSaveSettings({ apiKey: "cb_" + "Z".repeat(32) });
    expect(revoked.ok).toBe(false);
    expect(revoked.message).toMatch(/not valid or has been revoked/);
    const ok = gs.sidebarSaveSettings({ apiKey: TEST_KEY, shareKey: true, defaultCountry: "US", defaultRegion: "CA" });
    expect(ok.ok).toBe(true);
    expect(ok.data.message).toMatch(/Saved. Key works: 5,000 requests a day/);
    expect(env.gas.userProps.getProperty("calcbloc.apiKey")).toBe(TEST_KEY);
    expect(env.gas.documentProps.getProperty("calcbloc.sharedApiKey")).toBe(TEST_KEY);
    expect(env.gas.documentProps.getProperty("calcbloc.defaultCountry")).toBe("us");
    expect(gs.CALCBLOC_NET("", 60000)).toBe(47806.56);
    const removed = gs.sidebarSaveSettings({ removeKey: true, shareKey: false });
    expect(removed.data.settings.hasKey).toBe(false);
    expect(env.gas.documentProps.getProperty("calcbloc.sharedApiKey")).toBeNull();
  });

  it("inserts a table from the sidebar and reports errors as messages", () => {
    expect(gs.sidebarInsertTable({ country: "canada", year: "2026", region: "" })).toEqual({ ok: true, data: { sheetName: "CalcBloc Canada 2026", rows: 95, pageUrl: "https://calcbloc.com/canada/tax-tables/2026" } });
    expect(gs.sidebarInsertTable({ country: "atlantis" }).ok).toBe(false);
    expect(gs.sidebarClearCache().ok).toBe(true);
  });
});
