/** Fixed settings for the add-on. Everything country-specific comes from the API at run time. */

export const VERSION = "0.1.0";
export const SITE = "https://calcbloc.com";
export const API_BASE = `${SITE}/api/v1`;
export const DATA_URL = `${SITE}/data`;
export const DEVELOPERS_URL = `${SITE}/developers`;
export const KEYS_URL = `${SITE}/developers/keys`;
export const API_TERMS_URL = `${SITE}/developers/terms`;

/**
 * Referral tag for calcbloc.com links the add-on shows to people (inserted-table credit and page links, sidebar
 * links), so the site's analytics can tell the visit came from this add-on. API calls and data stay plain.
 */
export const APP_UTM = "utm_source=calcbloc-google-sheets&utm_medium=app&utm_campaign=itmarkerz-oss";
export function appLink(url: string): string {
  if (!/^https:\/\/(www\.)?calcbloc\.com([/?#]|$)/.test(url) || /[?&]utm_source=/.test(url)) return url;
  const hashAt = url.indexOf("#");
  let base = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : url.slice(hashAt);
  if (/^https:\/\/[^/?]+$/.test(base)) base += "/";
  return `${base}${base.includes("?") ? "&" : "?"}${APP_UTM}${hash}`;
}

/** The credit line required by the data licence (CC BY 4.0). Shown next to every inserted table and in function help. */
export const CREDIT = "Data by CalcBloc (calcbloc.com/data)";
export const LICENCE = "CC BY 4.0";

/** CacheService keeps values for at most 6 hours. Tax data changes a few times a year, so the maximum is used. */
export const CACHE_TTL_SECONDS = 21600;
/** Errors that will not change soon (unsupported country, bad parameter) are cached for an hour to save quota. */
export const ERROR_TTL_SECONDS = 3600;
/** CacheService rejects values over 100 KB. */
export const CACHE_MAX_VALUE_CHARS = 100 * 1024 - 64;

/**
 * Larger values are split into parts of this many characters. A third of the limit, so a part stays under 100 KB even
 * when every character takes three bytes in UTF-8 (CacheService counts bytes). Since the API allows 1 MB responses,
 * a compact tax table can pass 100 KB.
 */
export const CACHE_PART_CHARS = Math.floor(CACHE_MAX_VALUE_CHARS / 3);

/** At most this many parts per value (about 1 MB of compact JSON); anything larger is not cached. */
export const CACHE_MAX_PARTS = 30;

/**
 * Upper bound on new (uncached) API calls in one custom-function call. A custom function must finish in 30 seconds,
 * and the free key allows 60 requests a minute; cells over the limit say so and fill in on the next recalculation.
 */
export const MAX_NEW_REQUESTS_PER_CALL = 40;

/** Free API keys look like cb_ followed by 32 letters and digits. */
export const API_KEY_PATTERN = /^cb_[A-Za-z0-9]{32}$/;

export const PROP_API_KEY = "calcbloc.apiKey";
export const PROP_SHARED_API_KEY = "calcbloc.sharedApiKey";
export const PROP_DEFAULT_COUNTRY = "calcbloc.defaultCountry";
export const PROP_DEFAULT_REGION = "calcbloc.defaultRegion";
