import { CACHE_MAX_PARTS, CACHE_PART_CHARS } from "./config";
import { hash } from "./util";

/**
 * CacheService wrapper.
 *
 * - "public": the script cache, shared by every user of the add-on. Used only for public reference data (the
 *   country list and tax tables), so one download serves everyone.
 * - "document": the cache of the current spreadsheet. Used for calculation results, because the inputs (salaries)
 *   come from the user's sheet and should not be shared beyond it.
 *
 * Every key carries a namespace number kept in the same cache, so "Clear cached results" in the sidebar can drop
 * everything at once without enumerating keys (CacheService cannot list keys).
 *
 * CacheService rejects values over 100 KB. A longer value is stored as parts under "<key>#<i>" and a head entry
 * "~parts:<n>:<length>" under the key itself, written last so a reader never sees a head without its parts. A head
 * whose parts are missing or incomplete counts as a cache miss.
 */
export type CacheScope = "public" | "document";

const NS_KEY = "calcbloc:ns";

function store(scope: CacheScope): GoogleAppsScript.Cache.Cache | null {
  try {
    if (typeof CacheService === "undefined") return null;
    if (scope === "document") return CacheService.getDocumentCache() ?? CacheService.getScriptCache();
    return CacheService.getScriptCache();
  } catch {
    return null;
  }
}

function namespace(c: GoogleAppsScript.Cache.Cache): string {
  try {
    return c.get(NS_KEY) ?? "0";
  } catch {
    return "0";
  }
}

function fullKey(ns: string, key: string): string {
  const k = `calcbloc:${ns}:${key}`;
  return k.length <= 240 ? k : `calcbloc:${ns}:h:${hash(key)}:${key.length}:${key.slice(0, 120)}`;
}

export function cacheGet<T>(scope: CacheScope, key: string): T | undefined {
  return cacheGetMany<T>(scope, [key])[key];
}

export function cacheGetMany<T>(scope: CacheScope, keys: string[]): Record<string, T | undefined> {
  const out: Record<string, T | undefined> = {};
  const c = store(scope);
  if (!c || !keys.length) return out;
  const ns = namespace(c);
  const map = new Map(keys.map((k) => [fullKey(ns, k), k]));
  let found: Record<string, string> = {};
  try {
    found = c.getAll([...map.keys()]);
  } catch {
    return out;
  }
  for (const [fk, k] of map) {
    let raw: string | null | undefined = found[fk];
    if (raw == null) continue;
    if (raw.startsWith(PARTS)) raw = readParts(c, fk, raw);
    if (raw == null) continue;
    try {
      out[k] = JSON.parse(raw) as T;
    } catch {
      /* ignore a corrupt entry */
    }
  }
  return out;
}

const PARTS = "~parts:";
const partKey = (fk: string, i: number) => `${fk}#${i}`;

function readParts(c: GoogleAppsScript.Cache.Cache, fk: string, head: string): string | null {
  const [n, length] = head.slice(PARTS.length).split(":").map(Number);
  if (!(n > 0 && n <= CACHE_MAX_PARTS)) return null;
  const keys = Array.from({ length: n }, (_, i) => partKey(fk, i));
  try {
    const got = c.getAll(keys);
    if (keys.some((pk) => got[pk] == null)) return null;
    const raw = keys.map((pk) => got[pk]).join("");
    return raw.length === length ? raw : null;
  } catch {
    return null;
  }
}

/** Stores a JSON value, in parts when it is longer than one CacheService entry allows; false when it was not stored. */
export function cachePut(scope: CacheScope, key: string, value: unknown, ttlSeconds: number): boolean {
  const c = store(scope);
  if (!c) return false;
  const raw = JSON.stringify(value);
  const fk = fullKey(namespace(c), key);
  try {
    if (raw.length <= CACHE_PART_CHARS) {
      c.put(fk, raw, ttlSeconds);
      return true;
    }
    const n = Math.ceil(raw.length / CACHE_PART_CHARS);
    if (n > CACHE_MAX_PARTS) return false;
    const parts: Record<string, string> = {};
    for (let i = 0; i < n; i++) parts[partKey(fk, i)] = raw.slice(i * CACHE_PART_CHARS, (i + 1) * CACHE_PART_CHARS);
    c.putAll(parts, ttlSeconds);
    c.put(fk, `${PARTS}${n}:${raw.length}`, ttlSeconds);
    return true;
  } catch {
    return false;
  }
}

/** Starts a new namespace in both caches, which makes every earlier entry unreachable. */
export function cacheClear(): void {
  for (const scope of ["public", "document"] as CacheScope[]) {
    const c = store(scope);
    if (!c) continue;
    try {
      c.put(NS_KEY, String(Date.now()), 21600);
    } catch {
      /* nothing to do */
    }
  }
}
