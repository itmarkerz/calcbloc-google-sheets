import { getJson, getMany, type ApiRequest } from "./api";
import { getCountries, resolveCountry, resolveRegion, type Country } from "./countries";
import { bandTax, defaultBandSection, findRow, findSection, getTable, isBandSection, resolveYear, rowValue, sectionRows, tableName } from "./tables";
import { CalcBlocError, first, is2D, isBlank, normalize, parseOptions, round2, text, toAmount } from "./util";

/** The shape of /net-salary and /employer-cost responses that the functions read. */
export interface CalcResponse {
  country: string;
  year: string;
  currency: string;
  summary: Record<string, number | null>;
  results: Record<string, number>;
  breakdown: { title: string; columns: string[]; rows: { label: string; values: number[] }[] } | null;
  calculatorUrl: string;
}

type Cell = number | string;
type Endpoint = "net-salary" | "employer-cost";

/**
 * What CALCBLOC_TAX adds up for each country, from the calculator engine's own outputs. Income tax only:
 * social security (FICA, National Insurance, CPF, PRSI and so on) is not included. Countries not listed use
 * the generic rule below, so a newly supported country works without a release.
 */
export const INCOME_TAX_PARTS: Record<string, { keys?: string[]; breakdown?: RegExp; includes: string }> = {
  us: { breakdown: /income tax/i, includes: "Federal income tax plus state income tax (and local income tax where the calculator applies one)." },
  uk: { keys: ["incomeTax"], includes: "Income Tax (National Insurance and student loan not included)." },
  australia: { keys: ["taxAnnual"], includes: "Income tax including the Medicare levy (and study loan repayment if help_debt=true is passed)." },
  "new-zealand": { keys: ["payeAnnual"], includes: "PAYE income tax (ACC earners' levy and KiwiSaver not included)." },
  canada: { keys: ["federalTax", "provincialTax"], includes: "Federal plus provincial or territorial income tax (CPP/QPP, EI and QPIP not included)." },
  ireland: { keys: ["incomeTax"], includes: "Income tax after credits (USC and PRSI not included)." },
  india: { keys: ["incomeTax"], includes: "Income tax (TDS) for the chosen regime, including cess." },
  germany: { keys: ["wageTax", "soli", "churchTax"], includes: "Wage tax (Lohnsteuer) plus solidarity surcharge and church tax." },
  spain: { keys: ["annualTax"], includes: "Annual IRPF liability (state and regional)." },
  netherlands: { keys: ["tax"], includes: "Wage tax (loonheffing), which in the Netherlands includes national insurance contributions." },
  france: { keys: ["incomeTax"], includes: "Income tax withheld at source (prélèvement à la source)." },
  singapore: { keys: ["tax"], includes: "Income tax for the year of assessment." },
};

export function incomeTaxOf(country: string, data: CalcResponse): number {
  const rule = INCOME_TAX_PARTS[country];
  const r = data.results ?? {};
  if (rule?.keys && rule.keys.some((k) => typeof r[k] === "number")) return rule.keys.reduce((s, k) => s + (typeof r[k] === "number" ? r[k] : 0), 0);
  const pattern = rule?.breakdown ?? /income tax|^tax\b|paye|payg/i;
  if (!rule?.keys) {
    for (const k of ["incomeTax", "incomeTaxAnnual"]) if (typeof r[k] === "number") return r[k];
  }
  const rows = (data.breakdown?.rows ?? []).filter((row) => pattern.test(row.label) && !/take-home|net pay|before/i.test(row.label));
  if (rows.length) {
    const col = data.breakdown!.columns.findIndex((c) => /year|annual/i.test(c));
    const i = col >= 0 ? col : data.breakdown!.columns.length - 1;
    return rows.reduce((s, row) => s + Math.abs(row.values[i] ?? 0), 0);
  }
  throw new CalcBlocError(`The ${country} calculation did not return an income tax figure. Use CALCBLOC_NET or see ${data.calculatorUrl}`, "no_income_tax");
}

/** Applies fn to a single value or to every cell of a range, so one formula can fill a whole column. */
function mapInput<T>(v: unknown, fn: (x: unknown) => T): T | T[][] {
  return is2D(v) ? v.map((row) => row.map(fn)) : fn(v);
}

interface CalcArgs {
  endpoint: Endpoint;
  label: string;
  country: unknown;
  amount: unknown;
  region: unknown;
  year: unknown;
  options: unknown;
  pick: (c: Country, d: CalcResponse, opts: Record<string, string>) => number;
}

function runCalc(a: CalcArgs): Cell | Cell[][] {
  const country = resolveCountry(first(a.country));
  if (!country.endpoints.includes(a.endpoint)) {
    const hint = a.endpoint === "net-salary" ? ` For tax on a taxable amount from the official bands, use =CALCBLOC_BAND_TAX("${country.code}", amount).` : "";
    throw new CalcBlocError(`${a.label} is not available for ${country.name} yet (tax tables only).${hint} Tables: ${country.tablesPageUrl}`, "unsupported_country");
  }
  const y = text(first(a.year)).toLowerCase();
  if (y && y !== "latest" && y !== "current" && y !== country.currentYear && !country.currentYear.startsWith(`${y}-`)) {
    throw new CalcBlocError(`Calculations use ${country.name}'s current tax year (${country.currentYear}) only. Rates for ${y} are in the tax tables: =CALCBLOC_RATE or Extensions > CalcBloc > Insert tax table.`, "unsupported_year");
  }
  const opts = parseOptions(first(a.options));
  const result = opts.result;
  delete opts.result;
  const region = resolveRegion(country, first(a.region), a.endpoint);

  // Collect one request per distinct amount, then fetch them together.
  const reqFor = new Map<number, ApiRequest>();
  const cellError = new Map<unknown, string>();
  const check = (v: unknown): number | null => {
    if (isBlank(v)) return null;
    const n = toAmount(v);
    if (n === null || n < 0) {
      cellError.set(v, `Salary must be a number of 0 or more; got "${text(v).slice(0, 30)}".`);
      return null;
    }
    if (!reqFor.has(n)) reqFor.set(n, { path: `/${a.endpoint}`, params: { country: country.code, salary: n, region, ...opts } });
    return n;
  };
  const amounts = mapInput(a.amount, check);
  const keys = [...reqFor.keys()];
  const results = getMany<CalcResponse>(keys.map((k) => reqFor.get(k)!), "document");
  const byAmount = new Map(keys.map((k, i) => [k, results[i]]));

  const pickOpts: Record<string, string> = result ? { result } : {};
  const cell = (n: number | null, raw: unknown): Cell => {
    if (n === null) {
      const err = cellError.get(raw);
      if (err) throw new CalcBlocError(err, "bad_salary");
      return "";
    }
    const r = byAmount.get(n)!;
    if (!r.ok) throw new CalcBlocError(r.message, r.code, r.status);
    return round2(a.pick(country, r.data, pickOpts));
  };

  if (!is2D(a.amount)) return cell(amounts as number | null, a.amount);
  // In a range, one bad cell must not hide the others: errors become text in that cell.
  const grid = a.amount as unknown[][];
  return (amounts as (number | null)[][]).map((row, i) =>
    row.map((n, j) => {
      try {
        return cell(n, grid[i][j]);
      } catch (e) {
        return `Error: ${(e as Error).message}`;
      }
    }),
  );
}

function pickResult(d: CalcResponse, key: string, fallback: () => number): number {
  if (!key) return fallback();
  const k = Object.keys(d.results ?? {}).find((x) => x.toLowerCase() === key.toLowerCase());
  if (!k) throw new CalcBlocError(`No result "${key}". Available: ${Object.keys(d.results ?? {}).join(", ")}.`, "unknown_result");
  return d.results[k];
}

const need = (v: number | null | undefined, what: string, d: CalcResponse): number => {
  if (typeof v === "number") return v;
  throw new CalcBlocError(`The calculation did not return ${what}. See ${d.calculatorUrl}`, "missing_result");
};

export function CALCBLOC_NET(country: unknown, gross: unknown, region?: unknown, year?: unknown, options?: unknown): Cell | Cell[][] {
  return runCalc({
    endpoint: "net-salary",
    label: "Take-home pay",
    country,
    amount: gross,
    region,
    year,
    options,
    pick: (_c, d, o) => pickResult(d, o.result, () => need(d.summary?.netAnnual, "net pay", d)),
  });
}

export function CALCBLOC_TAX(country: unknown, gross: unknown, region?: unknown, year?: unknown, options?: unknown): Cell | Cell[][] {
  return runCalc({
    endpoint: "net-salary",
    label: "Income tax on a salary",
    country,
    amount: gross,
    region,
    year,
    options,
    pick: (c, d) => incomeTaxOf(c.code, d),
  });
}

export function CALCBLOC_EMPLOYER_COST(country: unknown, salary: unknown, region?: unknown, year?: unknown, options?: unknown): Cell | Cell[][] {
  return runCalc({
    endpoint: "employer-cost",
    label: "Employer cost",
    country,
    amount: salary,
    region,
    year,
    options,
    pick: (_c, d, o) => pickResult(d, o.result, () => need(d.summary?.totalCost, "the total cost", d)),
  });
}

function tableFor(country: unknown, year: unknown, region: unknown) {
  const c = resolveCountry(first(country));
  const y = resolveYear(c, first(year));
  const r = resolveRegion(c, first(region));
  return getTable(c, y, r);
}

export function CALCBLOC_RATE(country: unknown, section: unknown, label: unknown, year?: unknown, region?: unknown): Cell {
  const table = tableFor(country, year, region);
  const s = findSection(table, first(section));
  return rowValue(findRow(table, s, first(label)));
}

export function CALCBLOC_BAND_TAX(country: unknown, taxableIncome: unknown, section?: unknown, year?: unknown, region?: unknown): Cell | Cell[][] {
  const table = tableFor(country, year, region);
  const s = isBlank(first(section)) ? defaultBandSection(table) : findSection(table, first(section));
  if (!isBandSection(table, s)) throw new CalcBlocError(`${s.id} in ${tableName(table)} is not a band schedule. Band sections: ${table.sections.filter((x) => isBandSection(table, x)).map((x) => x.id).join(", ") || "none"}.`, "not_bands");
  const rows = sectionRows(table, s);
  const one = (v: unknown): Cell => {
    if (isBlank(v)) return "";
    const n = toAmount(v);
    if (n === null || n < 0) throw new CalcBlocError(`Taxable income must be a number of 0 or more; got "${text(v).slice(0, 30)}".`, "bad_amount");
    return round2(bandTax(rows, n));
  };
  if (!is2D(taxableIncome)) return one(taxableIncome);
  return taxableIncome.map((row) =>
    row.map((v) => {
      try {
        return one(v);
      } catch (e) {
        return `Error: ${(e as Error).message}`;
      }
    }),
  );
}

/** Country list for a sheet: code, name, currency, current tax year, what the API can calculate. */
export function CALCBLOC_COUNTRIES(): Cell[][] {
  const head: Cell[] = ["Code", "Country", "Currency", "Current tax year", "Take-home pay", "Employer cost", "Tax tables"];
  const rows = resolveCountryList().map((c) => [c.code, c.name, c.currency, c.currentYear, c.endpoints.includes("net-salary") ? "yes" : "no", c.endpoints.includes("employer-cost") ? "yes" : "no", c.tablesPageUrl]);
  return [head, ...rows];
}

function resolveCountryList(): Country[] {
  return [...getCountries()].sort((a, b) => (normalize(a.name) < normalize(b.name) ? -1 : 1));
}

// ---------------------------------------------------------------------------------------------------------------
// API 1.8 and 1.9: bonus withholding and import duty (one cell each).

interface SupplementalResponse {
  summary: { amount: number; totalWithheld: number; totalLiability: number; difference: number; netPayment: number };
}

const SUPPLEMENTAL_RESULTS = ["totalWithheld", "totalLiability", "difference", "netPayment"] as const;

/** Tax withheld on a bonus or other supplemental payment (GET /supplemental-withholding). result picks another summary figure. */
export function CALCBLOC_BONUS_WITHHOLDING(country: unknown, salary: unknown, amount: unknown, type?: unknown, region?: unknown, options?: unknown): Cell {
  const c = resolveCountry(first(country));
  const s = toAmount(first(salary));
  const a = toAmount(first(amount));
  if (s === null || s < 0) throw new CalcBlocError(`Salary must be a number of 0 or more; got "${text(first(salary)).slice(0, 30)}".`, "bad_salary");
  if (a === null || a < 0) throw new CalcBlocError(`Amount must be a number of 0 or more; got "${text(first(amount)).slice(0, 30)}".`, "bad_amount");
  const opts = parseOptions(first(options));
  const result = opts.result ?? "totalWithheld";
  delete opts.result;
  const key = SUPPLEMENTAL_RESULTS.find((k) => k.toLowerCase() === result.toLowerCase());
  if (!key) throw new CalcBlocError(`No result "${result}". Available: ${SUPPLEMENTAL_RESULTS.join(", ")}.`, "unknown_result");
  const t = text(first(type)).toLowerCase();
  const r = resolveRegion(c, first(region), "supplemental-withholding");
  const d = getJson<SupplementalResponse>(
    { path: "/supplemental-withholding", params: { country: c.code, salary: s, amount: a, ...(t ? { type: t } : {}), ...(r ? { region: r } : {}), ...opts } },
    "document",
  );
  return round2(d.summary[key]);
}

interface ImportDutyResponse {
  totals: { customs_duty: number; extra_duties: number; excise: number; import_vat: number; duties_and_taxes: number; landed_cost: number; currency: string; complete: boolean; incomplete_reasons: string[] };
}

const DUTY_RESULTS = ["duties_and_taxes", "customs_duty", "extra_duties", "excise", "import_vat", "landed_cost"] as const;

/**
 * Duties and taxes on one import (GET /import-duty): UK, EU member states, US, India. When the API marks the totals
 * incomplete (an excise code or exporter-specific duty is missing), the cell shows an error with the reason instead
 * of a number that would understate the cost.
 */
export function CALCBLOC_IMPORT_DUTY(destination: unknown, origin: unknown, code: unknown, customsValue: unknown, result?: unknown, options?: unknown): Cell {
  const dest = text(first(destination)).toLowerCase();
  const orig = text(first(origin)).toLowerCase();
  const hs = text(first(code)).replace(/[\s.]/g, "");
  const v = toAmount(first(customsValue));
  if (!dest) throw new CalcBlocError('Destination is required, for example "gb", "de" or "us".', "missing_destination");
  if (!orig) throw new CalcBlocError('Origin is required, for example "cn" or "in".', "missing_origin");
  if (!/^\d{4,10}$/.test(hs)) throw new CalcBlocError(`Code must be a commodity code of 4 to 10 digits; got "${text(first(code)).slice(0, 20)}".`, "bad_code");
  if (v === null || v <= 0) throw new CalcBlocError("Customs value must be a number above 0.", "bad_amount");
  const want = (text(first(result)) || "duties_and_taxes").toLowerCase();
  const key = DUTY_RESULTS.find((k) => k === want);
  if (!key) throw new CalcBlocError(`No result "${want}". Available: ${DUTY_RESULTS.join(", ")}.`, "unknown_result");
  const opts = parseOptions(first(options));
  const d = getJson<ImportDutyResponse>({ path: "/import-duty", params: { destination: dest, origin: orig, code: hs, customs_value: v, ...opts } }, "document");
  if (!d.totals.complete && key !== "customs_duty") {
    throw new CalcBlocError(`The total is incomplete: ${d.totals.incomplete_reasons.join("; ") || "see calcbloc.com/developers"}.`, "incomplete");
  }
  return round2(d.totals[key]);
}
