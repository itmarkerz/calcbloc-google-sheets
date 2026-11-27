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
  japan: { short: "jp", iso: "JP", names: ["japan", "jpn", "nippon", "nihon", "日本"] },
  "south-korea": { short: "kr", iso: "KR", names: ["south korea", "kor", "korea", "republic of korea", "대한민국", "한국"] },
  mexico: { short: "mx", iso: "MX", names: ["mexico", "mex", "méxico", "estados unidos mexicanos"] },
  brazil: { short: "br", iso: "BR", names: ["brazil", "bra", "brasil", "república federativa do brasil"] },
  chile: { short: "cl", iso: "CL", names: ["chile", "chl", "república de chile"] },
  colombia: { short: "co", iso: "CO", names: ["colombia", "col", "república de colombia"] },
  argentina: { short: "ar", iso: "AR", names: ["argentina", "arg", "república argentina"] },
  "costa-rica": { short: "cr", iso: "CR", names: ["costa rica", "cri", "república de costa rica"] },
  "saudi-arabia": { short: "sa", iso: "SA", names: ["saudi arabia", "sau", "ksa", "saudi", "kingdom of saudi arabia", "المملكة العربية السعودية", "السعودية"] },
  qatar: { short: "qa", iso: "QA", names: ["qatar", "qat", "state of qatar", "دولة قطر", "قطر"] },
  kuwait: { short: "kw", iso: "KW", names: ["kuwait", "kwt", "state of kuwait", "دولة الكويت", "الكويت"] },
  bahrain: { short: "bh", iso: "BH", names: ["bahrain", "bhr", "kingdom of bahrain", "مملكة البحرين", "البحرين"] },
  oman: { short: "om", iso: "OM", names: ["oman", "omn", "sultanate of oman", "سلطنة عمان", "عمان"] },
  israel: { short: "il", iso: "IL", names: ["israel", "isr", "state of israel", "ישראל", "מדינת ישראל"] },
  "south-africa": { short: "za", iso: "ZA", names: ["south africa", "zaf", "rsa", "republic of south africa", "suid-afrika"] },
  indonesia: { short: "id", iso: "ID", names: ["indonesia", "idn", "republik indonesia"] },
  china: { short: "cn", iso: "CN", names: ["china", "chn", "prc", "people's republic of china", "中国", "中华人民共和国"] },
  malaysia: { short: "my", iso: "MY", names: ["malaysia", "mys", "persekutuan malaysia"] },
  thailand: { short: "th", iso: "TH", names: ["thailand", "tha", "kingdom of thailand", "ประเทศไทย", "ไทย"] },
  vietnam: { short: "vn", iso: "VN", names: ["vietnam", "vnm", "viet nam", "việt nam", "socialist republic of vietnam"] },
  philippines: { short: "ph", iso: "PH", names: ["philippines", "phl", "pilipinas", "republic of the philippines"] },
  pakistan: { short: "pk", iso: "PK", names: ["pakistan", "pak", "islamic republic of pakistan", "پاکستان"] },
  bangladesh: { short: "bd", iso: "BD", names: ["bangladesh", "bgd", "people's republic of bangladesh", "বাংলাদেশ"] },
  "sri-lanka": { short: "lk", iso: "LK", names: ["sri lanka", "lka", "democratic socialist republic of sri lanka", "ceylon", "ශ්‍රී ලංකාව", "இலங்கை"] },
  nepal: { short: "np", iso: "NP", names: ["nepal", "npl", "federal democratic republic of nepal", "नेपाल"] },
  jordan: { short: "jo", iso: "JO", names: ["jordan", "jor", "hashemite kingdom of jordan", "المملكة الأردنية الهاشمية", "الأردن"] },
  tunisia: { short: "tn", iso: "TN", names: ["tunisia", "tun", "republic of tunisia", "tunisie", "الجمهورية التونسية", "تونس"] },
  algeria: { short: "dz", iso: "DZ", names: ["algeria", "dza", "people's democratic republic of algeria", "algérie", "الجزائر", "الجمهورية الجزائرية الديمقراطية الشعبية"] },
  paraguay: { short: "py", iso: "PY", names: ["paraguay", "pry", "república del paraguay", "tetã paraguái"] },
  bolivia: { short: "bo", iso: "BO", names: ["bolivia", "bol", "estado plurinacional de bolivia", "plurinational state of bolivia"] },
  "el-salvador": { short: "sv", iso: "SV", names: ["el salvador", "slv", "república de el salvador", "republic of el salvador"] },
  honduras: { short: "hn", iso: "HN", names: ["honduras", "hnd", "república de honduras", "republic of honduras"] },
  jamaica: { short: "jm", iso: "JM", names: ["jamaica", "jam"] },
  "trinidad-and-tobago": { short: "tt", iso: "TT", names: ["trinidad and tobago", "tto", "trinidad", "tobago", "republic of trinidad and tobago"] },
  egypt: { short: "eg", iso: "EG", names: ["egypt", "egy", "arab republic of egypt", "misr", "مصر", "جمهورية مصر العربية"] },
  nigeria: { short: "ng", iso: "NG", names: ["nigeria", "nga", "federal republic of nigeria"] },
  kenya: { short: "ke", iso: "KE", names: ["kenya", "ken", "republic of kenya", "jamhuri ya kenya"] },
  morocco: { short: "ma", iso: "MA", names: ["morocco", "mar", "kingdom of morocco", "maroc", "royaume du maroc", "المغرب", "المملكة المغربية"] },
  ghana: { short: "gh", iso: "GH", names: ["ghana", "gha", "republic of ghana"] },
  peru: { short: "pe", iso: "PE", names: ["peru", "per", "perú", "republica del peru", "república del perú"] },
  uruguay: { short: "uy", iso: "UY", names: ["uruguay", "ury", "república oriental del uruguay", "republica oriental del uruguay"] },
  ecuador: { short: "ec", iso: "EC", names: ["ecuador", "ecu", "república del ecuador", "republica del ecuador"] },
  panama: { short: "pa", iso: "PA", names: ["panama", "pan", "panamá", "república de panamá", "republica de panama"] },
  "dominican-republic": { short: "do", iso: "DO", names: ["dominican republic", "dom", "república dominicana", "republica dominicana", "rd"] },
  guatemala: { short: "gt", iso: "GT", names: ["guatemala", "gtm", "república de guatemala", "republica de guatemala"] },
  kazakhstan: { short: "kz", iso: "KZ", names: ["kazakhstan", "kaz", "qazaqstan", "казахстан", "қазақстан"] },
  georgia: { short: "ge", iso: "GE", names: ["georgia", "geo", "sakartvelo", "საქართველო"] },
  armenia: { short: "am", iso: "AM", names: ["armenia", "arm", "hayastan", "հայաստան"] },
  azerbaijan: { short: "az", iso: "AZ", names: ["azerbaijan", "aze", "azerbaycan", "azərbaycan"] },
  uzbekistan: { short: "uz", iso: "UZ", names: ["uzbekistan", "uzb", "ozbekiston", "oʻzbekiston", "ўзбекистон"] },
  russia: { short: "ru", iso: "RU", names: ["russia", "rus", "russian federation", "россия", "российская федерация"] },
  tanzania: { short: "tz", iso: "TZ", names: ["tanzania", "tza", "united republic of tanzania", "jamhuri ya muungano wa tanzania"] },
  uganda: { short: "ug", iso: "UG", names: ["uganda", "uga", "republic of uganda", "jamhuri ya uganda"] },
  rwanda: { short: "rw", iso: "RW", names: ["rwanda", "rwa", "republic of rwanda", "repubulika y'u rwanda", "république du rwanda"] },
  ethiopia: { short: "et", iso: "ET", names: ["ethiopia", "eth", "federal democratic republic of ethiopia", "ኢትዮጵያ"] },
  mauritius: { short: "mu", iso: "MU", names: ["mauritius", "mus", "republic of mauritius", "maurice", "république de maurice"] },
  botswana: { short: "bw", iso: "BW", names: ["botswana", "bwa", "republic of botswana", "lefatshe la botswana"] },
  montenegro: { short: "me", iso: "ME", names: ["montenegro", "mne", "crna gora", "црна гора"] },
  "north-macedonia": { short: "mk", iso: "MK", names: ["north macedonia", "mkd", "macedonia", "republic of north macedonia", "северна македонија", "maqedonia e veriut"] },
  albania: { short: "al", iso: "AL", names: ["albania", "alb", "shqiperia", "shqipëria", "republika e shqiperise"] },
  "bosnia-and-herzegovina": { short: "ba", iso: "BA", names: ["bosnia and herzegovina", "bih", "bosnia", "bosna i hercegovina", "босна и херцеговина"] },
  moldova: { short: "md", iso: "MD", names: ["moldova", "mda", "republic of moldova", "republica moldova"] },
  kosovo: { short: "xk", iso: "XK", names: ["kosovo", "xkx", "kosova", "kosovë", "republic of kosovo", "republika e kosovës"] },
  andorra: { short: "ad", iso: "AD", names: ["andorra", "and", "principat d'andorra", "principality of andorra"] },
  monaco: { short: "mc", iso: "MC", names: ["monaco", "mco", "principality of monaco", "principauté de monaco"] },
  "san-marino": { short: "sm", iso: "SM", names: ["san marino", "smr", "repubblica di san marino", "republic of san marino"] },
  "hong-kong": { short: "hk", iso: "HK", names: ["hong kong", "hkg", "hong kong sar", "hong kong sar china", "hksar", "香港"] },
  taiwan: { short: "tw", iso: "TW", names: ["taiwan", "twn", "republic of china", "roc", "臺灣", "台灣", "中華民國"] },
  macao: { short: "mo", iso: "MO", names: ["macao", "mac", "macau", "macao sar", "macao sar china", "澳門", "澳门"] },
  cambodia: { short: "kh", iso: "KH", names: ["cambodia", "khm", "kingdom of cambodia", "កម្ពុជា"] },
  brunei: { short: "bn", iso: "BN", names: ["brunei", "brn", "brunei darussalam", "negara brunei darussalam"] },
  "cote-divoire": { short: "ci", iso: "CI", names: ["côte d’ivoire", "civ", "ivory coast", "cote d'ivoire", "côte d'ivoire", "republic of côte d'ivoire", "république de côte d'ivoire"] },
  senegal: { short: "sn", iso: "SN", names: ["senegal", "sen", "sénégal", "republic of senegal", "république du sénégal"] },
  cameroon: { short: "cm", iso: "CM", names: ["cameroon", "cmr", "cameroun", "republic of cameroon", "république du cameroun"] },
  zambia: { short: "zm", iso: "ZM", names: ["zambia", "zmb", "republic of zambia"] },
  zimbabwe: { short: "zw", iso: "ZW", names: ["zimbabwe", "zwe", "republic of zimbabwe"] },
  namibia: { short: "na", iso: "NA", names: ["namibia", "nam", "republic of namibia"] },
  bahamas: { short: "bs", iso: "BS", names: ["bahamas", "bhs", "the bahamas", "commonwealth of the bahamas"] },
  barbados: { short: "bb", iso: "BB", names: ["barbados", "brb", "bajan"] },
  belize: { short: "bz", iso: "BZ", names: ["belize", "blz", "british honduras"] },
  guyana: { short: "gy", iso: "GY", names: ["guyana", "guy", "co-operative republic of guyana"] },
  suriname: { short: "sr", iso: "SR", names: ["suriname", "sur", "republiek suriname", "republic of suriname"] },
  haiti: { short: "ht", iso: "HT", names: ["haiti", "hti", "haïti", "ayiti", "republic of haiti", "république d'haïti"] },
  kyrgyzstan: { short: "kg", iso: "KG", names: ["kyrgyzstan", "kgz", "kyrgyz republic", "kirghizia", "кыргызстан", "кыргыз республикасы", "киргизия"] },
  tajikistan: { short: "tj", iso: "TJ", names: ["tajikistan", "tjk", "republic of tajikistan", "тоҷикистон", "таджикистан", "ҷумҳурии тоҷикистон"] },
  maldives: { short: "mv", iso: "MV", names: ["maldives", "mdv", "republic of maldives", "ދިވެހިރާއްޖެ", "dhivehi raajje"] },
  bhutan: { short: "bt", iso: "BT", names: ["bhutan", "btn", "kingdom of bhutan", "druk yul", "འབྲུག་ཡུལ།"] },
  myanmar: { short: "mm", iso: "MM", names: ["myanmar", "mmr", "burma", "republic of the union of myanmar", "မြန်မာ"] },
  madagascar: { short: "mg", iso: "MG", names: ["madagascar", "mdg", "republic of madagascar", "repoblikan'i madagasikara", "madagasikara", "république de madagascar"] },
  "dr-congo": { short: "cd", iso: "CD", names: ["dr congo", "cod", "democratic republic of the congo", "drc", "congo-kinshasa", "république démocratique du congo", "rdc"] },
  congo: { short: "cg", iso: "CG", names: ["republic of the congo", "cog", "congo-brazzaville", "république du congo", "congo brazzaville"] },
  malawi: { short: "mw", iso: "MW", names: ["malawi", "mwi", "republic of malawi", "malaŵi", "dziko la malaŵi"] },
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
