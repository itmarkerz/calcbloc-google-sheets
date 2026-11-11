import { getJson } from "./api";
import { cacheGet, cachePut } from "./cache";
import { CACHE_TTL_SECONDS, DEVELOPERS_URL } from "./config";
import { defaultCountry, defaultRegion } from "./settings";
import { CalcBlocError, isBlank, normalize, text } from "./util";

/** The parts of GET /countries the add-on uses. The country list is never hard-coded: it comes from the API. */
export interface Country {
  code: string;
  name: string;
  currency: string;
  currentYear: string;
  years: string[];
  endpoints: string[];
  tablesOnly: boolean;
  tablesPageUrl: string;
  regions: { code: string; name: string }[];
  /** Region codes each calculation endpoint accepts (can differ from the tax-table regions). */
  calcRegions: Record<string, string[]>;
  calculatorUrls: Record<string, string>;
}

interface ApiParam {
  name: string;
  values?: string[];
}
interface ApiCountry {
  code: string;
  name: string;
  currency: string;
  current_year: string;
  years_available?: string[];
  years?: string[];
  available_endpoints?: string[];
  tables_only?: boolean;
  endpoints: Record<string, { calculatorUrl?: string; pageUrl?: string; parameters?: ApiParam[]; regions?: { code: string; name: string }[] }>;
}

export function compactCountries(raw: { countries: ApiCountry[] }): Country[] {
  return raw.countries.map((c) => {
    const calcRegions: Record<string, string[]> = {};
    const calculatorUrls: Record<string, string> = {};
    for (const [name, e] of Object.entries(c.endpoints ?? {})) {
      if (name === "tax-tables") continue;
      if (e.calculatorUrl) calculatorUrls[name] = e.calculatorUrl;
      const region = e.parameters?.find((p) => p.name === "region");
      if (region?.values) calcRegions[name] = region.values;
    }
    const t = c.endpoints?.["tax-tables"];
    return {
      code: c.code,
      name: c.name,
      currency: c.currency,
      currentYear: c.current_year,
      years: c.years_available ?? c.years ?? [c.current_year],
      endpoints: c.available_endpoints ?? Object.keys(c.endpoints ?? {}),
      tablesOnly: c.tables_only ?? !c.endpoints?.["net-salary"],
      tablesPageUrl: t?.pageUrl ?? "",
      regions: t?.regions ?? [],
      calcRegions,
      calculatorUrls,
    };
  });
}

const CACHE_KEY = "countries:v1";

export function getCountries(): Country[] {
  const hit = cacheGet<Country[]>("public", CACHE_KEY);
  if (hit && hit.length) return hit;
  const list = compactCountries(getJson<{ countries: ApiCountry[] }>({ path: "/countries" }, "public"));
  cachePut("public", CACHE_KEY, list, CACHE_TTL_SECONDS);
  return list;
}

/** A few everyday names that differ from the API codes. Unknown input is still matched against the live list. */
const ALIASES: Record<string, string> = { usa: "us", "united-states-of-america": "us", gb: "uk", "great-britain": "uk", "united-kingdom": "uk", nz: "new-zealand", au: "australia" };

/** Accepts a code ("new-zealand"), a name ("New Zealand") or a common alias; blank means the spreadsheet default. */
export function resolveCountry(input: unknown): Country {
  const list = getCountries();
  let q = normalize(input);
  if (!q) {
    q = normalize(defaultCountry());
    if (!q) throw new CalcBlocError("Country is required (for example \"us\" or \"Germany\"), or set a default country in Extensions > CalcBloc > Settings.", "missing_country");
  }
  q = ALIASES[q] ?? q;
  const found = list.find((c) => c.code === q || normalize(c.name) === q);
  if (found) return found;
  throw new CalcBlocError(`Unknown country "${text(input).slice(0, 40)}". Use one of: ${list.map((c) => c.code).join(", ")}. List: ${DEVELOPERS_URL}`, "unsupported_country");
}

/**
 * Turns a region name or code into the code the API expects. Blank uses the spreadsheet's default region when the
 * country is the default country. Anything not recognised is passed through for the API to validate.
 */
export function resolveRegion(country: Country, input: unknown, endpoint?: string): string | undefined {
  let raw = text(input);
  if (isBlank(raw)) {
    if (normalize(defaultCountry()) === country.code && defaultRegion()) raw = defaultRegion();
    else return undefined;
  }
  const q = normalize(raw);
  const accepted = endpoint ? country.calcRegions[endpoint] ?? [] : country.regions.map((r) => r.code);
  if (accepted.includes(q)) return q;
  const byName = country.regions.find((r) => normalize(r.name) === q || r.code === q);
  if (byName && (!endpoint || accepted.length === 0 || accepted.includes(byName.code))) return byName.code;
  if (!endpoint && country.regions.length === 0) throw new CalcBlocError(`${country.name} tax tables have no regional variants.`, "unsupported_region");
  if (!endpoint) throw new CalcBlocError(`Unknown region "${raw.slice(0, 40)}" for ${country.name}. Use one of: ${country.regions.map((r) => r.code).join(", ")}.`, "unsupported_region");
  return q;
}
