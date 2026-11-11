/** Small helpers shared by the custom functions and the sidebar. No Apps Script services here. */

/** An error whose message is meant for the person reading the cell. */
export class CalcBlocError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "error", status = 0) {
    super(message);
    this.name = "CalcBlocError";
    this.code = code;
    this.status = status;
  }
}

/** Sheets passes "" for an empty cell and undefined for an omitted argument; both mean "not given". */
export function isBlank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

export function text(v: unknown): string {
  if (isBlank(v)) return "";
  if (v instanceof Date) return String(v.getFullYear());
  return String(v).trim();
}

/** Lower-case, accents removed, runs of spaces, dots, underscores and hyphens collapsed to one hyphen. */
export function normalize(v: unknown): string {
  return text(v)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function is2D(v: unknown): v is unknown[][] {
  return Array.isArray(v) && v.every((r) => Array.isArray(r));
}

/** A single value or the top-left value of a range. */
export function first(v: unknown): unknown {
  if (is2D(v)) return v.length && v[0].length ? v[0][0] : "";
  if (Array.isArray(v)) return v.length ? v[0] : "";
  return v;
}

/** Parses an amount from a number, or from text like "65,000" or "$65,000.50". */
export function toAmount(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.replace(/[\s, ']/g, "").replace(/^[^\d.-]+/, "");
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Rounds money to cents so floating-point noise (0.20322400000000002) does not reach the sheet. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Extra API parameters written as "filing_status=mfj; frequency=monthly". Separators: semicolon, comma or new line.
 * Values pass through to the API, which validates them against each country's list.
 */
export function parseOptions(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const s = text(v);
  if (!s) return out;
  for (const part of s.split(/[;,\n]+/)) {
    const p = part.trim();
    if (!p) continue;
    const eq = p.indexOf("=");
    if (eq < 1) throw new CalcBlocError(`Options must look like name=value; got "${p.slice(0, 40)}".`, "bad_options");
    const name = p.slice(0, eq).trim().toLowerCase();
    const value = p.slice(eq + 1).trim();
    if (!/^[a-z][a-z0-9_]{0,40}$/.test(name)) throw new CalcBlocError(`"${name.slice(0, 40)}" is not a valid option name.`, "bad_options");
    out[name] = value;
  }
  return out;
}

/** FNV-1a 32-bit, used to keep cache keys under the 250-character limit. */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
