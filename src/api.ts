import { cacheGet, cacheGetMany, cachePut, type CacheScope } from "./cache";
import { API_BASE, appLink, CACHE_TTL_SECONDS, ERROR_TTL_SECONDS, KEYS_URL, MAX_NEW_REQUESTS_PER_CALL, VERSION } from "./config";
import { currentApiKey } from "./settings";
import { CalcBlocError, errorMessage } from "./util";

/** Error codes that will give the same answer for the same request, so they can be cached for a while. */
const STABLE_ERRORS = new Set([
  "unsupported_country",
  "unsupported_year",
  "unsupported_region",
  "endpoint_not_available",
  "missing_parameter",
  "invalid_parameter",
  "unknown_parameter",
  "duplicate_parameter",
  "bad_parameter",
  "not_found",
]);

export interface ApiRequest {
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string; status: number; retryAfter?: number };

interface ErrorBody {
  error?: { code?: string; message?: string; docs?: string };
}

export function buildUrl(req: ApiRequest): string {
  const qs = Object.entries(req.params ?? {})
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `${API_BASE}${req.path}${qs ? `?${qs}` : ""}`;
}

function waitText(secs: number): string {
  return secs > 5400 ? ` Try again in about ${Math.round(secs / 3600)} hours.` : secs > 0 ? ` Try again in about ${Math.max(1, Math.round(secs / 60))} min.` : "";
}

/**
 * Shown when the API's free allowance without a key (50 requests a day, 5 a minute, per internet address) is used
 * up. The add-on works without a key until then; this asks for a free key and says where to paste it.
 */
export function addKeyMessage(waitSeconds = 0): string {
  return `Add your free API key: the free requests without a key (50 a day, 5 a minute, per internet address) are used up.${waitText(waitSeconds)} Google's servers share internet addresses between many users, so this free allowance can run out sooner than your own use explains. Get a free key (5,000 requests a day) at ${appLink(KEYS_URL)} and paste it in Extensions > CalcBloc > Settings and API key.`;
}

function rateLimitMessage(hasKey: boolean, retryAfter: string | undefined): string {
  const secs = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : 0;
  return hasKey ? `CalcBloc API limit reached for your key (5,000 a day, 60 a minute).${waitText(secs)}` : addKeyMessage(secs);
}

/** True for the error a keyless request gets once the free allowance is used up (the add-on then asks for a key). */
export function isKeyPrompt(e: unknown): boolean {
  return e instanceof CalcBlocError && e.code === "rate_limited" && !currentApiKey();
}

/**
 * Set in the spreadsheet's cache when a request without a key is refused (429) or answered with
 * X-RateLimit-Remaining: 0, so further keyless formulas show the key prompt for a minute instead of each
 * calling the API again.
 */
const NO_KEY_EXHAUSTED = "nokey-exhausted:v1";
/** How long keyless requests are held after the free allowance runs out: short, as Google's addresses vary. */
const NO_KEY_HOLD_SECONDS = 60;

function digits(v: string | undefined): number | undefined {
  return v !== undefined && /^\d+$/.test(v.trim()) ? Number(v.trim()) : undefined;
}

function header(headers: Record<string, unknown>, name: string): string | undefined {
  const k = Object.keys(headers ?? {}).find((h) => h.toLowerCase() === name.toLowerCase());
  return k ? String(headers[k]) : undefined;
}

function toResult<T>(resp: GoogleAppsScript.URL_Fetch.HTTPResponse, hasKey: boolean): ApiResult<T> {
  const status = resp.getResponseCode();
  const body = resp.getContentText();
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    json = undefined;
  }
  if (status >= 200 && status < 300 && json && typeof json === "object") return { ok: true, data: json as T };
  const err = (json as ErrorBody | undefined)?.error;
  if (status === 429) {
    const retry = header(resp.getAllHeaders() as Record<string, unknown>, "Retry-After");
    return { ok: false, status, code: "rate_limited", message: rateLimitMessage(hasKey, retry), retryAfter: retry && /^\d+$/.test(retry) ? Number(retry) : undefined };
  }
  if (status === 401 && err?.code === "api_key_required")
    return { ok: false, status, code: err.code, message: `${err.message ?? "This endpoint needs an API key."} Add your free API key (${appLink(KEYS_URL)}) in Extensions > CalcBloc > Settings and API key.` };
  if (status === 401 || status === 403)
    return { ok: false, status, code: err?.code ?? "unauthorized", message: `${err?.message ?? "The API key was refused."} Check the key in Extensions > CalcBloc > Settings.` };
  if (err?.message) return { ok: false, status, code: err.code ?? "error", message: err.message };
  return { ok: false, status, code: "bad_response", message: `CalcBloc API returned HTTP ${status}. Try again later.` };
}

function fetchParams(key: string): GoogleAppsScript.URL_Fetch.URLFetchRequestOptions {
  const headers: Record<string, string> = { Accept: "application/json", "X-CalcBloc-Client": `google-sheets/${VERSION}` };
  if (key) headers["X-API-Key"] = key;
  return { method: "get", muteHttpExceptions: true, followRedirects: true, headers };
}

/**
 * Fetches several API URLs, answering from the cache where possible and fetching the rest in parallel
 * (UrlFetchApp.fetchAll). Successful answers and stable errors are cached; rate limits and outages are not.
 */
export function getMany<T>(reqs: ApiRequest[], scope: CacheScope): ApiResult<T>[] {
  const urls = reqs.map(buildUrl);
  const cached = cacheGetMany<ApiResult<T>>(scope, urls);
  const todo = [...new Set(urls.filter((u) => cached[u] === undefined))];
  const fresh = new Map<string, ApiResult<T>>();

  const allowed = todo.slice(0, MAX_NEW_REQUESTS_PER_CALL);
  for (const u of todo.slice(MAX_NEW_REQUESTS_PER_CALL))
    fresh.set(u, { ok: false, status: 0, code: "deferred", message: `Not fetched yet: more than ${MAX_NEW_REQUESTS_PER_CALL} new values in one formula. Recalculate (or split the range) to fill the rest.` });

  const key = allowed.length ? currentApiKey() : "";
  const held = allowed.length && !key ? cacheGet<{ retryAfter: number }>("document", NO_KEY_EXHAUSTED) : undefined;
  if (held) {
    // The free allowance without a key ran out moments ago: ask for a key without calling the API again.
    for (const u of allowed) fresh.set(u, { ok: false, status: 429, code: "rate_limited", message: addKeyMessage(held.retryAfter), retryAfter: held.retryAfter });
  } else if (allowed.length) {
    const opts = fetchParams(key);
    let responses: GoogleAppsScript.URL_Fetch.HTTPResponse[] | null = null;
    let failure = "";
    try {
      responses = allowed.length === 1 ? [UrlFetchApp.fetch(allowed[0], opts)] : UrlFetchApp.fetchAll(allowed.map((url) => ({ url, ...opts })));
    } catch (e) {
      failure = errorMessage(e);
    }
    allowed.forEach((u, i) => {
      const r: ApiResult<T> = responses
        ? toResult<T>(responses[i], !!key)
        : { ok: false, status: 0, code: "network", message: `Could not reach the CalcBloc API (${failure.slice(0, 120)}). Try again later.` };
      fresh.set(u, r);
      if (r.ok) cachePut(scope, u, r, CACHE_TTL_SECONDS);
      else if (STABLE_ERRORS.has(r.code)) cachePut(scope, u, r, ERROR_TTL_SECONDS);
      // A short pause after a rate limit, so a sheet full of formulas does not keep retrying; the API asks for
      // Retry-After seconds, capped at a minute so cells fill in soon after a per-minute limit resets.
      else if (r.code === "rate_limited") cachePut(scope, u, r, Math.min(60, Math.max(1, r.retryAfter ?? 60)));
    });
    if (!key && responses) {
      // Free allowance without a key used up (refused, or the last free request answered): hold keyless calls.
      let exhausted: number | undefined;
      responses.forEach((resp, i) => {
        const r = fresh.get(allowed[i])!;
        const hs = resp.getAllHeaders() as Record<string, unknown>;
        if (!r.ok && r.code === "rate_limited") exhausted = Math.max(exhausted ?? 0, r.retryAfter ?? NO_KEY_HOLD_SECONDS);
        else if (digits(header(hs, "X-RateLimit-Remaining")) === 0) exhausted = Math.max(exhausted ?? 0, digits(header(hs, "X-RateLimit-Reset")) ?? NO_KEY_HOLD_SECONDS);
      });
      if (exhausted !== undefined) cachePut("document", NO_KEY_EXHAUSTED, { retryAfter: exhausted }, NO_KEY_HOLD_SECONDS);
    }
  }
  return urls.map((u) => cached[u] ?? fresh.get(u)!);
}

/** One request; throws CalcBlocError with a readable message on failure. */
export function getJson<T>(req: ApiRequest, scope: CacheScope): T {
  const [r] = getMany<T>([req], scope);
  if (!r.ok) throw new CalcBlocError(r.message, r.code, r.status);
  return r.data;
}

/** Calls /countries with a candidate key, bypassing the cache, to confirm the key works. */
export function checkKey(candidate: string): { ok: boolean; message: string; dailyLimit?: number } {
  try {
    const resp = UrlFetchApp.fetch(buildUrl({ path: "/countries" }), fetchParams(candidate));
    const r = toResult<unknown>(resp, true);
    const limit = Number(header(resp.getAllHeaders() as Record<string, unknown>, "X-RateLimit-Limit"));
    if (!r.ok) return { ok: false, message: r.message };
    if (Number.isFinite(limit) && limit > 0 && limit <= 50) return { ok: false, dailyLimit: limit, message: "The API answered, but with the no-key limit (50 a day). The key was not recognised." };
    return { ok: true, dailyLimit: Number.isFinite(limit) ? limit : undefined, message: Number.isFinite(limit) ? `Key works: ${limit.toLocaleString("en-US")} requests a day.` : "Key works." };
  } catch (e) {
    return { ok: false, message: `Could not reach the CalcBloc API: ${errorMessage(e).slice(0, 120)}` };
  }
}
