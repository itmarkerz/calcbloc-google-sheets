import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cacheGet, cachePut } from "../src/cache";
import { CACHE_MAX_PARTS, CACHE_PART_CHARS } from "../src/config";

/** A CacheService stand-in that, like the real one, rejects values over 100 KB (counted in UTF-8 bytes). */
function fakeCache() {
  const m = new Map<string, string>();
  const check = (v: string) => {
    if (new TextEncoder().encode(v).length > 100 * 1024) throw new Error("Argument too large");
  };
  return {
    m,
    get: (k: string) => m.get(k) ?? null,
    getAll: (ks: string[]) => Object.fromEntries(ks.filter((k) => m.has(k)).map((k) => [k, m.get(k)!])),
    put: (k: string, v: string) => (check(v), m.set(k, v)),
    putAll: (o: Record<string, string>) => Object.entries(o).forEach(([k, v]) => (check(v), m.set(k, v))),
  };
}

describe("cache parts", () => {
  let c: ReturnType<typeof fakeCache>;
  beforeEach(() => {
    c = fakeCache();
    (globalThis as any).CacheService = { getScriptCache: () => c, getDocumentCache: () => c };
  });
  afterEach(() => delete (globalThis as any).CacheService);

  it("stores a small value as one entry", () => {
    expect(cachePut("public", "k", { a: 1 }, 60)).toBe(true);
    expect(c.m.size).toBe(1);
    expect(cacheGet("public", "k")).toEqual({ a: 1 });
  });

  it("splits a value over 100 KB (multi-byte text included) into parts and reads it back", () => {
    const value = { rows: Array.from({ length: 9000 }, (_, i) => `Україна ${i} Türkiye Србија`) };
    expect(JSON.stringify(value).length).toBeGreaterThan(CACHE_PART_CHARS * 3);
    expect(cachePut("public", "big", value, 60)).toBe(true);
    expect(c.m.size).toBeGreaterThan(3);
    expect(cacheGet("public", "big")).toEqual(value);
  });

  it("treats a missing part as a cache miss", () => {
    cachePut("public", "big", { s: "x".repeat(CACHE_PART_CHARS * 2 + 5) }, 60);
    const part = [...c.m.keys()].find((k) => k.endsWith("#1"))!;
    c.m.delete(part);
    expect(cacheGet("public", "big")).toBeUndefined();
  });

  it("does not store a value above the part budget", () => {
    expect(cachePut("public", "huge", { s: "x".repeat(CACHE_PART_CHARS * CACHE_MAX_PARTS + 1) }, 60)).toBe(false);
    expect(cacheGet("public", "huge")).toBeUndefined();
  });
});
