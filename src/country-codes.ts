/**
 * Country identifiers the CalcBloc API accepts (API 1.7), so formulas can use them before any request is made:
 * the short code (ISO 3166-1 alpha-2 in lower case, with the United Kingdom as "uk" and "gb" also accepted), the
 * ISO code, the English name and a few other names people use. The API key ("new-zealand", "germany") stays valid.
 * Copied from the CalcBloc API's country-codes.ts; the API's /countries response also carries short_code and
 * iso_code, which the add-on uses as well, so countries added later resolve without an update.
 */
import { normalize } from "./util";

interface CodeInfo {
  short: string;
  iso: string;
  /** Extra names people use: English variants, local names. */
  names?: string[];
}

export const COUNTRY_CODES: Record<string, CodeInfo> = {
  us: { short: "us", iso: "US", names: ["usa", "united states", "united states of america", "america"] },
  uk: { short: "uk", iso: "GB", names: ["gb", "gbr", "united kingdom", "great britain", "britain", "england", "scotland", "wales", "northern ireland"] },
  australia: { short: "au", iso: "AU", names: ["aus"] },
  "new-zealand": { short: "nz", iso: "NZ", names: ["nzl", "aotearoa"] },
  canada: { short: "ca", iso: "CA", names: ["can"] },
  ireland: { short: "ie", iso: "IE", names: ["irl", "eire", "republic of ireland"] },
  india: { short: "in", iso: "IN", names: ["ind", "bharat"] },
  germany: { short: "de", iso: "DE", names: ["deu", "deutschland"] },
  spain: { short: "es", iso: "ES", names: ["esp", "espana"] },
  netherlands: { short: "nl", iso: "NL", names: ["nld", "the netherlands", "holland", "nederland"] },
  france: { short: "fr", iso: "FR", names: ["fra"] },
  singapore: { short: "sg", iso: "SG", names: ["sgp"] },
  uae: { short: "ae", iso: "AE", names: ["are", "united arab emirates", "emirates"] },
  italy: { short: "it", iso: "IT", names: ["ita", "italia"] },
  portugal: { short: "pt", iso: "PT", names: ["prt"] },
  belgium: { short: "be", iso: "BE", names: ["bel", "belgie", "belgique"] },
  switzerland: { short: "ch", iso: "CH", names: ["che", "schweiz", "suisse", "svizzera"] },
  denmark: { short: "dk", iso: "DK", names: ["dnk", "danmark"] },
  sweden: { short: "se", iso: "SE", names: ["swe", "sverige"] },
  austria: { short: "at", iso: "AT", names: ["aut", "osterreich"] },
  poland: { short: "pl", iso: "PL", names: ["pol", "polska"] },
  luxembourg: { short: "lu", iso: "LU", names: ["lux"] },
  czechia: { short: "cz", iso: "CZ", names: ["cze", "czech republic", "cesko"] },
  norway: { short: "no", iso: "NO", names: ["nor", "norge"] },
  finland: { short: "fi", iso: "FI", names: ["fin", "suomi"] },
  slovenia: { short: "si", iso: "SI", names: ["svn", "slovenija"] },
  romania: { short: "ro", iso: "RO", names: ["rou"] },
  hungary: { short: "hu", iso: "HU", names: ["hun", "magyarorszag"] },
  slovakia: { short: "sk", iso: "SK", names: ["svk", "slovensko"] },
  greece: { short: "gr", iso: "GR", names: ["grc", "hellas", "ελλαδα"] },
  latvia: { short: "lv", iso: "LV", names: ["lva", "latvija"] },
  croatia: { short: "hr", iso: "HR", names: ["hrv", "hrvatska"] },
  estonia: { short: "ee", iso: "EE", names: ["est", "eesti"] },
  bulgaria: { short: "bg", iso: "BG", names: ["bgr", "българия"] },
  lithuania: { short: "lt", iso: "LT", names: ["ltu", "lietuva"] },
  malta: { short: "mt", iso: "MT", names: ["mlt"] },
  cyprus: { short: "cy", iso: "CY", names: ["cyp", "κυπρος"] },
  iceland: { short: "is", iso: "IS", names: ["isl", "island"] },
  ukraine: { short: "ua", iso: "UA", names: ["ukr", "ukraina", "україна"] },
  liechtenstein: { short: "li", iso: "LI", names: ["lie"] },
  serbia: { short: "rs", iso: "RS", names: ["srb", "srbija", "србија"] },
  turkey: { short: "tr", iso: "TR", names: ["tur", "turkiye", "türkiye"] },
};

let aliasMap: Map<string, string> | undefined;

/** Normalised identifier → API country key, built once. */
function aliases(): Map<string, string> {
  if (aliasMap) return aliasMap;
  const m = new Map<string, string>();
  for (const [key, info] of Object.entries(COUNTRY_CODES)) {
    for (const a of [key, info.short, info.iso, ...(info.names ?? [])]) {
      const k = normalize(a);
      const prev = m.get(k);
      if (prev && prev !== key) throw new Error(`country alias "${a}" maps to both ${prev} and ${key}`);
      m.set(k, key);
    }
  }
  aliasMap = m;
  return m;
}

/** The API country key for a short code, ISO code or other known name (already normalised), or undefined. */
export function countryKeyFor(normalized: string): string | undefined {
  return aliases().get(normalized);
}
