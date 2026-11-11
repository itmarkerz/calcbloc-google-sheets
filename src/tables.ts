import { getJson } from "./api";
import { cacheGet, cachePut } from "./cache";
import { CACHE_TTL_SECONDS } from "./config";
import type { Country } from "./countries";
import { CalcBlocError, normalize, text } from "./util";

/** One flat row of GET /tax-tables (the same rows as the CSV download). */
export interface TableRow {
  section_id: string;
  section: string;
  group: string;
  basis: string;
  note: string;
  tax_year: string;
  effective_from: string;
  effective_to: string;
  source_title: string;
  source_url: string;
  retrieved_at: string;
  status: string;
  label: string;
  from: number | null;
  to: number | null;
  rate: number | null;
  value: number | string | null;
  unit: string;
}

export interface Section {
  id: string;
  title: string;
  group: string;
  kind: string;
}

export interface Table {
  country: string;
  countryName: string;
  year: string;
  yearLabel: string;
  region: { code: string; slug: string; name: string } | null;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
  isCurrent: boolean;
  pageUrl: string;
  sections: Section[];
  rows: TableRow[];
}

type RawTable = Omit<Table, "sections" | "rows"> & { sections: (Section & Record<string, unknown>)[]; rows: TableRow[] };

const ROW_FIELDS = ["section_id", "section", "group", "basis", "note", "tax_year", "effective_from", "effective_to", "source_title", "source_url", "retrieved_at", "status", "label", "from", "to", "rate", "value", "unit"] as const;

/**
 * The full JSON is up to ~180 KB, over CacheService's 100 KB limit, because every row repeats its section, note and
 * source. Strings are stored once in a dictionary and rows as arrays of indexes, which brings the largest table
 * to ~30 KB with nothing dropped.
 */
export interface CompactTable {
  v: 1;
  meta: Omit<Table, "sections" | "rows">;
  sections: [string, string, string, string][];
  strings: string[];
  rows: (number | null | [number])[][];
}

export function compactTable(t: RawTable): CompactTable {
  const strings: string[] = [];
  const index = new Map<string, number>();
  const s = (v: string) => {
    let i = index.get(v);
    if (i === undefined) {
      i = strings.length;
      strings.push(v);
      index.set(v, i);
    }
    return i;
  };
  const rows = t.rows.map((r) =>
    ROW_FIELDS.map((f) => {
      const v = (r as unknown as Record<string, unknown>)[f];
      if (v === null || v === undefined) return null;
      if (typeof v === "number") return f === "value" ? [v] as [number] : v; // a numeric value is boxed so it is not read as a string index
      return s(String(v));
    }),
  );
  const { sections, rows: _r, ...meta } = t;
  return {
    v: 1,
    meta: {
      country: meta.country,
      countryName: meta.countryName,
      year: meta.year,
      yearLabel: meta.yearLabel,
      region: meta.region ?? null,
      currency: meta.currency,
      effectiveFrom: meta.effectiveFrom,
      effectiveTo: meta.effectiveTo,
      status: meta.status,
      isCurrent: meta.isCurrent,
      pageUrl: meta.pageUrl,
    },
    sections: sections.map((x) => [x.id, x.title, x.group, x.kind]),
    strings,
    rows,
  };
}

const NUMERIC = new Set(["from", "to", "rate"]);

export function expandTable(c: CompactTable): Table {
  return {
    ...c.meta,
    sections: c.sections.map(([id, title, group, kind]) => ({ id, title, group, kind })),
    rows: c.rows.map((r) => {
      const o: Record<string, unknown> = {};
      ROW_FIELDS.forEach((f, i) => {
        const v = r[i];
        if (v === null || v === undefined) o[f] = f === "value" || NUMERIC.has(f) ? null : "";
        else if (Array.isArray(v)) o[f] = v[0];
        else o[f] = NUMERIC.has(f) ? v : c.strings[v];
      });
      return o as unknown as TableRow;
    }),
  };
}

/** Resolves a year argument ("2026", 2026, "2026-27", "latest" or blank) against the years the API serves. */
export function resolveYear(country: Country, input: unknown): string {
  const y = text(input).toLowerCase();
  if (!y || y === "latest" || y === "current") return country.currentYear;
  if (country.years.includes(y)) return y;
  // "2026" for a country whose tax year is "2026-27"
  const starts = country.years.find((x) => x.startsWith(`${y}-`));
  if (starts) return starts;
  throw new CalcBlocError(`No ${country.name} tax tables for ${y}. Years available: ${country.years.join(", ")}.`, "unsupported_year");
}

export function getTable(country: Country, year: string, region?: string): Table {
  const key = `table:v1:${country.code}:${year}:${region ?? ""}`;
  const hit = cacheGet<CompactTable>("public", key);
  if (hit && hit.v === 1) return expandTable(hit);
  const raw = getJson<RawTable>({ path: `/tax-tables/${encodeURIComponent(country.code)}/${encodeURIComponent(year)}`, params: { region } }, "public");
  const compact = compactTable(raw);
  cachePut("public", key, compact, CACHE_TTL_SECONDS);
  return expandTable(compact);
}

const listOf = (xs: string[], n = 8) => (xs.length > n ? `${xs.slice(0, n).join(", ")}, …` : xs.join(", "));

/** Finds a section by id ("trinnskatt") or title, exactly first, then by a unique partial match. */
export function findSection(table: Table, query: unknown): Section {
  const q = normalize(query);
  if (!q) throw new CalcBlocError(`Section is required. Sections: ${listOf(table.sections.map((s) => s.id), 30)}.`, "missing_section");
  const exact = table.sections.find((s) => s.id === q || normalize(s.title) === q);
  if (exact) return exact;
  const partial = table.sections.filter((s) => s.id.includes(q) || normalize(s.title).includes(q));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) throw new CalcBlocError(`"${text(query).slice(0, 40)}" matches several sections: ${listOf(partial.map((s) => s.id))}. Use the section id.`, "ambiguous_section");
  throw new CalcBlocError(`No section "${text(query).slice(0, 40)}" in ${tableName(table)}. Sections: ${listOf(table.sections.map((s) => s.id), 30)}.`, "unknown_section");
}

export function sectionRows(table: Table, section: Section): TableRow[] {
  return table.rows.filter((r) => r.section_id === section.id);
}

export function tableName(t: Table): string {
  return `${t.countryName}${t.region ? ` (${t.region.name})` : ""} ${t.yearLabel || t.year}`;
}

/** A readable name for a band row without a label, e.g. "13,539 to 21,992". */
export function rowLabel(r: TableRow): string {
  if (r.label) return r.label;
  const n = (x: number) => x.toLocaleString("en-US");
  if (r.from !== null && r.to !== null) return `${n(r.from)} to ${n(r.to)}`;
  if (r.from !== null) return `Over ${n(r.from)}`;
  return "";
}

/**
 * Finds a row by label: exact (case-insensitive) first, then a unique partial match. "#3" (or the number 3)
 * picks the third row of the section, which is how unlabelled band rows are reached.
 */
export function findRow(table: Table, section: Section, label: unknown): TableRow {
  const rows = sectionRows(table, section);
  const raw = text(label);
  const pos = typeof label === "number" ? label : /^#\d+$/.test(raw) ? Number(raw.slice(1)) : NaN;
  if (Number.isInteger(pos)) {
    if (pos >= 1 && pos <= rows.length) return rows[pos - 1];
    throw new CalcBlocError(`Section ${section.id} has ${rows.length} rows; #${pos} is out of range.`, "unknown_row");
  }
  const q = normalize(raw);
  if (!q) throw new CalcBlocError(`Label is required. Rows in ${section.id}: ${listOf(rows.map((r, i) => r.label || `#${i + 1}`))}.`, "missing_label");
  const exact = rows.filter((r) => normalize(r.label) === q);
  if (exact.length === 1) return exact[0];
  const pool = exact.length ? exact : rows.filter((r) => normalize(r.label).includes(q));
  if (pool.length === 1) return pool[0];
  if (pool.length > 1) {
    const idx = pool.map((r) => `#${rows.indexOf(r) + 1}`);
    throw new CalcBlocError(`"${raw.slice(0, 40)}" matches ${pool.length} rows in ${section.id} (${listOf(idx)}). Use a fuller label or a row number like "${idx[0]}".`, "ambiguous_row");
  }
  throw new CalcBlocError(`No row "${raw.slice(0, 40)}" in ${section.id}. Rows: ${listOf(rows.map((r, i) => r.label || `#${i + 1}`))}.`, "unknown_row");
}

/** The cell value of a row: a decimal for rates (format the cell as %), a number for amounts, text otherwise. */
export function rowValue(r: TableRow): number | string {
  if (r.unit === "rate" && r.rate !== null) return r.rate;
  if (r.value !== null && r.value !== undefined) return r.value;
  if (r.rate !== null) return r.rate;
  return "";
}

export function isBandSection(table: Table, s: Section): boolean {
  if (s.kind === "bands") return true;
  const rows = sectionRows(table, s);
  return rows.length > 0 && rows.every((r) => r.from !== null && r.rate !== null);
}

/** The first income-tax band schedule in the table (for example the federal single-filer schedule in the US). */
export function defaultBandSection(table: Table): Section {
  const s = table.sections.find((x) => x.group === "income-tax" && isBandSection(table, x)) ?? table.sections.find((x) => isBandSection(table, x));
  if (!s) throw new CalcBlocError(`${tableName(table)} has no tax band schedule to apply. See ${table.pageUrl}`, "no_bands");
  return s;
}

/**
 * Applies a marginal band schedule to an amount: each band's rate on the part of the amount inside the band.
 * Allowances, credits, surcharges and special rules in the section note are not applied.
 */
export function bandTax(rows: TableRow[], amount: number): number {
  let tax = 0;
  for (const r of rows) {
    if (r.from === null || r.rate === null) continue;
    const top = r.to === null ? Infinity : r.to;
    if (amount > r.from) tax += (Math.min(amount, top) - r.from) * r.rate;
  }
  return tax;
}
