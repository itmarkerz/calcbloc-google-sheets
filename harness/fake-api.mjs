// A local stand-in for https://calcbloc.com/api/v1, answering from test/fixtures:
//   /countries                      recorded live response (2026-11-11)
//   /tax-tables/{country}/{year}    tables copied from the calcbloc-data repository (same JSON as the API)
//   /net-salary, /employer-cost     recorded live responses where available (see RECORDED), otherwise a clearly
//                                   marked synthetic response that uses the real result names for that country
// It also applies the API's rate limits (50/day and 5/minute without a key; 5,000/day and 60/minute with one),
// its X-RateLimit-* and Retry-After headers and its error format, so the add-on's caching, pacing and messages
// can be checked offline. `anonymousPerDay` lowers the no-key daily allowance for tests.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FIX = join(dirname(fileURLToPath(import.meta.url)), "..", "test", "fixtures");
const read = (p) => JSON.parse(readFileSync(join(FIX, p), "utf8"));
const countries = read("api/countries.json");

const RECORDED = {
  "net-salary|us|60000|ca": "api/net-salary_us_60000_ca.json",
  "employer-cost|uk|40000|": "api/employer-cost_uk_40000.json",
};

const attribution = (path = "/developers") => ({ source: "CalcBloc", url: `https://calcbloc.com${path}`, required: true, text: "Data by CalcBloc (calcbloc.com)" });
const json = (status, body, headers = {}) => ({ status, body: JSON.stringify(body), headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });
const error = (status, code, message, headers) => json(status, { error: { code, message, docs: "https://calcbloc.com/developers" }, attribution: attribution() }, headers);

/** Synthetic results: round, obviously made-up rates, but the same result keys the real engines return. */
function synthetic(endpoint, c, salary, region) {
  const r2 = (n) => Math.round(n * 100) / 100;
  if (endpoint === "employer-cost") {
    const total = r2(salary * 1.15);
    return { summary: { salary, totalCost: total, monthlyCost: r2(total / 12), multiplier: 1.15 }, results: { totalCost: total, monthlyCost: r2(total / 12), multiplier: 1.15 }, breakdown: null };
  }
  const parts = {
    uk: { incomeTax: 0.15, employeeNi: 0.06 },
    australia: { taxAnnual: 0.2 },
    "new-zealand": { payeAnnual: 0.18, accAnnual: 0.0167 },
    canada: { federalTax: 0.1, provincialTax: 0.05, pension: 0.05, ei: 0.0164 },
    ireland: { incomeTax: 0.2, usc: 0.03, prsi: 0.0415 },
    india: { incomeTax: 0.08, employeePf: 0.05 },
    germany: { wageTax: 0.14, soli: 0, churchTax: 0.0112, pension: 0.093, health: 0.0855 },
    spain: { annualTax: 0.16, socialSecurity: 0.0647 },
    netherlands: { tax: 0.3 },
    france: { incomeTax: 0.06, contributions: 0.22 },
    singapore: { tax: 0.04, cpfEmployee: 0.2 },
    us: {},
  }[c] ?? {};
  const results = Object.fromEntries(Object.entries(parts).map(([k, f]) => [k, r2(salary * f)]));
  let deductions = Object.values(results).reduce((s, x) => s + x, 0);
  let breakdown = null;
  if (c === "us") {
    const fed = r2(salary * 0.1), state = r2(salary * 0.04), fica = r2(salary * 0.0765);
    deductions = fed + state + fica;
    breakdown = { title: "Paycheck breakdown", columns: ["Every 2 weeks", "Per year"], rows: [
      { label: "Gross pay", values: [salary / 26, salary] },
      { label: "Federal income tax", values: [-fed / 26, -fed] },
      { label: "Social Security", values: [-fica / 26, -fica] },
      { label: "State income tax", values: [-state / 26, -state] },
      { label: "Take-home pay", values: [(salary - deductions) / 26, salary - deductions] },
    ] };
    Object.assign(results, { taxesTotal: r2(deductions) });
  }
  const net = r2(salary - deductions);
  results.netAnnual = net;
  return { summary: { grossAnnual: salary, netAnnual: net, totalDeductions: r2(deductions), effectiveRate: salary ? deductions / salary : 0 }, results, breakdown, synthetic: true, notes: ["Synthetic test response: not real tax figures."], region };
}

function tableFile(country, year, region) {
  const meta = countries.countries.find((c) => c.code === country);
  const y = year === "latest" ? meta.current_year : year;
  if (!region) return { file: `tables/${country}/${y}.json`, year: y };
  const reg = meta.endpoints["tax-tables"].regions.find((r) => r.code === region);
  if (!reg) return { bad: true };
  for (const name of [region, reg.name.toLowerCase().replace(/\s+/g, "-")]) {
    const f = `tables/${country}/${y}/${name}.json`;
    if (existsSync(join(FIX, f))) return { file: f, year: y };
  }
  return { file: `tables/${country}/${y}/${region}.json`, year: y };
}

export function createFakeApi({ keys = [], limits = true, clock = { now: () => Date.now() }, anonymousPerDay = 50 } = {}) {
  const usage = new Map(); // tier -> { day, minuteStart, minuteCount }
  const stats = { requests: 0, noKey: 0, byPath: {} };
  const toMidnight = () => Math.max(1, Math.ceil((86400000 - (clock.now() % 86400000)) / 1000));

  function rate(tier) {
    const lim = tier === "free" ? { day: 5000, minute: 60 } : { day: anonymousPerDay, minute: 5 };
    const u = usage.get(tier) ?? { day: 0, minuteStart: clock.now(), minute: 0 };
    if (clock.now() - u.minuteStart >= 60000) Object.assign(u, { minuteStart: clock.now(), minute: 0 });
    usage.set(tier, u);
    if (limits && u.day >= lim.day) return { blocked: `Daily limit of ${lim.day} requests reached.`, retry: toMidnight(), lim };
    if (limits && u.minute >= lim.minute) return { blocked: `Too many requests this minute (limit ${lim.minute}).`, retry: 60, lim };
    u.day++;
    u.minute++;
    return { lim, remaining: lim.day - u.day };
  }

  function handler(url, { headers }) {
    stats.requests++;
    const u = new URL(url);
    const path = u.pathname.replace(/^\/api\/v1/, "");
    stats.byPath[path.split("/")[1]] = (stats.byPath[path.split("/")[1]] ?? 0) + 1;
    const key = Object.entries(headers).find(([k]) => k.toLowerCase() === "x-api-key")?.[1];
    if (!key) stats.noKey++;
    if (key && !keys.includes(key)) return error(401, "invalid_key", "This API key is not valid or has been revoked.");
    const rl = rate(key ? "free" : "anonymous");
    if (rl.blocked) return error(429, "rate_limited", rl.blocked, { "Retry-After": String(rl.retry), "X-RateLimit-Limit": String(rl.lim.day), "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(toMidnight()) });
    const rh = { "X-RateLimit-Limit": String(rl.lim.day), "X-RateLimit-Remaining": String(rl.remaining), "X-RateLimit-Reset": String(toMidnight()) };
    const q = Object.fromEntries(u.searchParams);

    if (path === "/countries") return json(200, countries, rh);

    const tm = path.match(/^\/tax-tables\/([^/]+)\/([^/]+)$/);
    if (tm) {
      const [, country, year] = tm;
      const meta = countries.countries.find((c) => c.code === country);
      if (!meta) return error(400, "unsupported_country", `Country "${country}" is not supported.`);
      if (year !== "latest" && !meta.years_available.includes(year)) return error(404, "unsupported_year", `No ${meta.name} tax tables for "${year}". Years: ${meta.years_available.join(", ")} (or latest).`);
      const t = tableFile(country, year, q.region);
      if (t.bad) return error(400, "invalid_parameter", `Parameter "region" must be one of: ${meta.endpoints["tax-tables"].regions.map((r) => r.code).join(", ")}.`);
      if (!existsSync(join(FIX, t.file))) return error(503, "service_unavailable", `Fixture missing: ${t.file}`);
      return json(200, { ...read(t.file), requested_year: year }, rh);
    }

    const cm = path.match(/^\/(net-salary|employer-cost)$/);
    if (cm) {
      const endpoint = cm[1];
      const meta = countries.countries.find((c) => c.code === q.country);
      if (!q.country) return error(400, "missing_parameter", 'Parameter "country" is required.');
      if (!meta) return error(400, "unsupported_country", `Country "${q.country}" is not supported.`);
      if (!meta.available_endpoints.includes(endpoint))
        return error(400, "unsupported_country", `${endpoint} is not available for ${meta.name} yet. Its tax tables are at ${meta.endpoints["tax-tables"].pageUrl} (API: ${meta.endpoints["tax-tables"].path}). See /api/v1/countries for the endpoints each country supports.`);
      const params = meta.endpoints[endpoint].parameters;
      for (const name of Object.keys(q)) if (name !== "country" && !params.some((p) => p.name === name)) return error(400, "unknown_parameter", `Unknown parameter "${name}" for ${meta.name}.`);
      if (q.year && q.year !== "latest" && q.year !== meta.current_year) return error(400, "unsupported_year", `Calculations use the current tax year (${meta.current_year}) only.`);
      const regionParam = params.find((p) => p.name === "region");
      if (regionParam?.required && !q.region) return error(400, "missing_parameter", `Parameter "region" is required: one of ${regionParam.values.join(", ")}.`);
      if (q.region && regionParam?.values && !regionParam.values.includes(q.region)) return error(400, "invalid_parameter", `Parameter "region" must be one of: ${regionParam.values.join(", ")}.`);
      const salary = Number(q.salary);
      if (!Number.isFinite(salary) || salary < 0) return error(400, "invalid_parameter", 'Parameter "salary" must be a number.');
      const extra = Object.keys(q).filter((k) => !["country", "salary", "region", "year"].includes(k));
      const rec = !extra.length && RECORDED[`${endpoint}|${q.country}|${salary}|${q.region ?? ""}`];
      if (rec) return json(200, read(rec), rh);
      const calculatorUrl = meta.endpoints[endpoint].calculatorUrl;
      return json(200, { endpoint, country: meta.code, countryName: meta.name, year: meta.current_year, requested_year: q.year ?? "latest", currency: meta.currency, inputs: q, ...synthetic(endpoint, meta.code, salary, q.region), calculatorUrl, warnings: [], attribution: attribution(new URL(calculatorUrl).pathname) }, rh);
    }
    return error(404, "not_found", "No such endpoint. See the documentation for the list.");
  }
  return { handler, stats, usage };
}

/** Real HTTP, synchronously (UrlFetchApp is synchronous), for `npm run demo -- --live`. */
export function liveHandler(url, { headers }) {
  const script = `fetch(process.argv[1], { headers: JSON.parse(process.argv[2]) }).then(async (r) => { process.stdout.write(JSON.stringify({ status: r.status, headers: Object.fromEntries(r.headers), body: await r.text() })); }).catch((e) => { process.stdout.write(JSON.stringify({ error: String(e) })); });`;
  const out = JSON.parse(execFileSync(process.execPath, ["-e", script, url, JSON.stringify(headers ?? {})], { encoding: "utf8", timeout: 30000 }));
  if (out.error) throw new Error(out.error);
  return out;
}
