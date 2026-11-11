// Runs the built add-on (dist/) outside Google, with the Apps Script services mocked, and prints what the
// formulas and the "Insert tax table" command produce.
//
//   npm run demo                         offline: recorded API responses and tables from test/fixtures
//   npm run demo -- --live               real calls to https://calcbloc.com/api/v1 (about 8 requests; set
//                                        CALCBLOC_API_KEY to use a key instead of the 50-a-day anonymous allowance)
//   npm run demo -- --html <folder>      also writes sheet.html and sidebar.html previews to <folder>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFakeApi, liveHandler } from "../harness/fake-api.mjs";
import { createGas } from "../harness/gas-mocks.mjs";
import { loadBundle, manifest } from "../harness/load-bundle.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const live = args.includes("--live");
const htmlDir = args.includes("--html") ? resolve(args[args.indexOf("--html") + 1] ?? "preview") : null;

const fake = createFakeApi({ limits: false });
const gas = createGas({ handler: live ? liveHandler : fake.handler, whitelist: manifest().urlFetchWhitelist, htmlDir: join(root, "apps-script") });
if (live && process.env.CALCBLOC_API_KEY) gas.userProps.setProperty("calcbloc.apiKey", process.env.CALCBLOC_API_KEY);
const g = loadBundle(gas.globals);

console.log(`CalcBloc for Google Sheets ${g.CalcBlocLib.VERSION}: local demo (${live ? "LIVE API" : "offline fixtures"})\n`);

const SAMPLES = [
  ['=CALCBLOC_NET("us", 60000, "ca")', () => g.CALCBLOC_NET("us", 60000, "ca"), "recorded live response"],
  ['=CALCBLOC_TAX("us", 60000, "ca")', () => g.CALCBLOC_TAX("us", 60000, "ca"), "federal 5,020.08 + state 1,803.36"],
  ['=CALCBLOC_NET("us", 60000, "ca", , "result=netPerPeriod")', () => g.CALCBLOC_NET("us", 60000, "ca", "", "result=netPerPeriod"), "biweekly paycheck"],
  ['=CALCBLOC_EMPLOYER_COST("uk", 40000)', () => g.CALCBLOC_EMPLOYER_COST("uk", 40000), "recorded live response"],
  ['=CALCBLOC_RATE("norway", "general-income", "Individuals")', () => g.CALCBLOC_RATE("norway", "general-income", "Individuals"), "22% tax on general income"],
  ['=CALCBLOC_RATE("uk", "personal-allowance", "Personal Allowance")', () => g.CALCBLOC_RATE("uk", "personal-allowance", "Personal Allowance"), "2026-27"],
  ['=CALCBLOC_RATE("uk", "income-tax-scotland", "Starter rate", , "scotland")', () => g.CALCBLOC_RATE("uk", "income-tax-scotland", "Starter rate", "", "scotland"), "regional table"],
  ['=CALCBLOC_BAND_TAX("us", 50000)', () => g.CALCBLOC_BAND_TAX("us", 50000), "1,240 + 4,512"],
  ['=CALCBLOC_BAND_TAX("norway", 500000)', () => g.CALCBLOC_BAND_TAX("norway", 500000), "trinnskatt 1,567.40 + 7,268.00"],
  ['=CALCBLOC_BAND_TAX("austria", 40000)', () => g.CALCBLOC_BAND_TAX("austria", 40000), "1,690.60 + 4,339.80 + 1,416.80"],
  ['=CALCBLOC_TAX("norway", 600000)', () => g.CALCBLOC_TAX("norway", 600000), "tables-only country"],
  ['=CALCBLOC_NET("uk", 40000, , "2025-26")', () => g.CALCBLOC_NET("uk", 40000, "", "2025-26"), "earlier year"],
];
if (!live) SAMPLES.splice(3, 0, ['=CALCBLOC_NET("canada", A2:A4, "on")  with 50000, 75000, 100000', () => g.CALCBLOC_NET("canada", [[50000], [75000], [100000]], "on"), "range in, column out (synthetic offline figures)"]);

const results = [];
for (const [formula, fn, note] of SAMPLES) {
  let out;
  try {
    out = fn();
  } catch (e) {
    out = `#ERROR! ${e.message}`;
  }
  results.push({ formula, out, note });
  const shown = Array.isArray(out) ? out.map((r) => r.join(", ")).join(" | ") : out;
  console.log(`${formula}\n  -> ${shown}${note ? `   (${note})` : ""}\n`);
}

// Insert tax table, as the sidebar does
const ins = g.sidebarInsertTable({ country: "norway", year: "2026", region: "" });
const sheet = gas.spreadsheetApp.spreadsheet.getSheetByName(ins.data?.sheetName);
console.log(`Insert tax table (Norway 2026): ${JSON.stringify(ins)}`);
const grid = sheet ? sheet.dump() : [];
for (const row of grid.slice(0, 9)) console.log("  " + row.slice(0, 7).map((c) => String(c).slice(0, 38)).join(" | "));
console.log(`  … ${grid.length} rows in total; last row: ${grid.at(-1)?.[0]}\n`);

const calls = gas.fetch.calls.length;
console.log(`HTTP requests made: ${calls}. Running everything again uses the cache:`);
for (const [, fn] of SAMPLES) {
  try {
    fn();
  } catch {
    /* same errors as above */
  }
}
console.log(`HTTP requests after the second run: ${gas.fetch.calls.length} (no new requests).\n`);

if (htmlDir) {
  mkdirSync(htmlDir, { recursive: true });
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const cell = (v) => {
    const m = String(v).match(/^=HYPERLINK\("([^"]+)","([^"]+)"\)$/);
    if (m) return `<a href="${esc(m[1])}">${esc(m[2])}</a>`;
    if (typeof v === "number" && v < 1 && v > 0) return `${+(v * 100).toFixed(4)}%`;
    if (typeof v === "number") return v.toLocaleString("en-US");
    return esc(v);
  };
  const formulas = results
    .map((r) => `<tr><td><code>${esc(r.formula)}</code></td><td class="num">${Array.isArray(r.out) ? r.out.map((x) => cell(x[0])).join("<br>") : String(r.out).startsWith("#ERROR") ? `<span class="err">#ERROR!</span><div class="tip">${esc(String(r.out).slice(8))}</div>` : cell(r.out)}</td><td class="note">${esc(r.note)}</td></tr>`)
    .join("\n");
  const table = grid
    .slice(0, 22)
    .map((row, i) => `<tr class="${i === 4 ? "head" : ""}">${row.slice(0, 8).map((c) => `<td>${cell(c)}</td>`).join("")}<td>${cell(row[14] ?? "")}</td></tr>`)
    .join("\n");
  writeFileSync(
    join(htmlDir, "sheet.html"),
    `<!doctype html><meta charset="utf-8"><title>CalcBloc for Google Sheets: demo output</title>
<style>body{font:13px Arial,sans-serif;margin:16px;color:#202124}h1{font-size:18px}h2{font-size:15px;margin-top:24px}table{border-collapse:collapse;width:100%}td{border:1px solid #e0e0e0;padding:4px 6px;vertical-align:top}.num{text-align:right;white-space:nowrap}.note{color:#5f6368}.err{color:#c5221f;font-weight:bold}.tip{color:#c5221f;font-size:11px;max-width:420px;white-space:normal;text-align:left}tr.head td{font-weight:bold;background:#eef2ff}code{font-size:12px}a{color:#1a56db}.src{color:#5f6368}</style>
<h1>CalcBloc for Google Sheets: local demo (${live ? "live API" : "offline fixtures"})</h1>
<p class="src">Output of <code>npm run demo</code>: the built add-on run outside Google with mocked Apps Script services. Data by CalcBloc (calcbloc.com/data).</p>
<h2>Custom functions</h2><table><tr class="head"><td>Formula</td><td>Result</td><td>Note</td></tr>${formulas}</table>
<h2>Extensions &gt; CalcBloc &gt; Insert tax table (Norway 2026, first rows of ${grid.length})</h2><table>${table}</table>`,
  );
  // Sidebar preview: the real Sidebar.html with google.script.run answered by the bundle.
  const init = g.sidebarInit();
  const sidebar = readFileSync(join(root, "apps-script", "Sidebar.html"), "utf8")
    .replace("<?= tab ?>", args.includes("--tab") ? args[args.indexOf("--tab") + 1] : "insert")
    .replace(
      "<script>",
      `<script>var google={script:{run:(function(){var h={};var r={withSuccessHandler:function(f){h.s=f;return r},withFailureHandler:function(f){h.f=f;return r},sidebarInit:function(){setTimeout(function(){h.s(${JSON.stringify(init)})})},sidebarInsertTable:function(){setTimeout(function(){h.s(${JSON.stringify(ins)})})},sidebarSaveSettings:function(){},sidebarClearCache:function(){}};return r})()}};</script>\n<script>`,
    );
  writeFileSync(join(htmlDir, "sidebar.html"), `<div style="width:300px">${sidebar}</div>`);
  console.log(`Wrote ${join(htmlDir, "sheet.html")} and ${join(htmlDir, "sidebar.html")}`);
}
