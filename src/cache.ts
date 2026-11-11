import { CACHE_MAX_VALUE_CHARS } from "./config";
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
    const raw = found[fk];
    if (raw == null) continue;
    try {
      out[k] = JSON.parse(raw) as T;
    } catch {
      /* ignore a corrupt entry */
    }
  }
  return out;
}

/** Stores a JSON value; values over the 100 KB CacheService limit are skipped (the next call fetches again). */
export function cachePut(scope: CacheScope, key: string, value: unknown, ttlSeconds: number): boolean {
  const c = store(scope);
  if (!c) return false;
  const raw = JSON.stringify(value);
  if (raw.length > CACHE_MAX_VALUE_CHARS) return false;
  try {
    c.put(fullKey(namespace(c), key), raw, ttlSeconds);
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
