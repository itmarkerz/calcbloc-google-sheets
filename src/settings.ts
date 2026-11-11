import { API_KEY_PATTERN, PROP_API_KEY, PROP_DEFAULT_COUNTRY, PROP_DEFAULT_REGION, PROP_SHARED_API_KEY } from "./config";
import { CalcBlocError, text } from "./util";

/**
 * Where settings live:
 * - The API key is personal: user properties (only this Google account, only this add-on).
 *   Custom functions run in a restricted mode in which getUserProperties() returns the spreadsheet owner's
 *   properties, so a key saved by an editor who is not the owner is not seen by formulas. For that case the
 *   key can optionally be shared with the spreadsheet (document properties, readable by the add-on only).
 * - The default country and region describe the spreadsheet, so they are document properties: every
 *   collaborator's formulas then give the same results.
 */

function userProps(): GoogleAppsScript.Properties.Properties | null {
  try {
    return PropertiesService.getUserProperties();
  } catch {
    return null;
  }
}

function docProps(): GoogleAppsScript.Properties.Properties | null {
  try {
    return PropertiesService.getDocumentProperties();
  } catch {
    return null;
  }
}

function read(p: GoogleAppsScript.Properties.Properties | null, key: string): string {
  try {
    return p?.getProperty(key) ?? "";
  } catch {
    return "";
  }
}

/** The key used for API calls: the user's own, else one shared with this spreadsheet, else "" (no calls are made). */
export function currentApiKey(): string {
  return read(userProps(), PROP_API_KEY) || read(docProps(), PROP_SHARED_API_KEY);
}

export function defaultCountry(): string {
  return read(docProps(), PROP_DEFAULT_COUNTRY);
}

export function defaultRegion(): string {
  return read(docProps(), PROP_DEFAULT_REGION);
}

export interface SettingsView {
  hasKey: boolean;
  keyHint: string;
  keyShared: boolean;
  sharedKeyPresent: boolean;
  defaultCountry: string;
  defaultRegion: string;
}

const hint = (k: string) => (k ? `cb_…${k.slice(-4)}` : "");

/** What the sidebar shows. The key itself never goes back to the browser, only its last four characters. */
export function getSettingsView(): SettingsView {
  const own = read(userProps(), PROP_API_KEY);
  const shared = read(docProps(), PROP_SHARED_API_KEY);
  return {
    hasKey: !!own,
    keyHint: hint(own),
    keyShared: !!own && shared === own,
    sharedKeyPresent: !!shared,
    defaultCountry: defaultCountry(),
    defaultRegion: defaultRegion(),
  };
}

export interface SettingsInput {
  apiKey?: string;
  removeKey?: boolean;
  shareKey?: boolean;
  defaultCountry?: string;
  defaultRegion?: string;
}

export function validateKey(k: string): string {
  const key = text(k);
  if (!API_KEY_PATTERN.test(key)) throw new CalcBlocError("That does not look like a CalcBloc API key (cb_ followed by 32 letters and digits).", "invalid_key");
  return key;
}

export function saveSettings(input: SettingsInput): SettingsView {
  const up = userProps();
  const dp = docProps();
  if (!up || !dp) throw new CalcBlocError("Settings can't be saved here. Open the sidebar from Extensions > CalcBloc.", "no_properties");

  if (input.removeKey) {
    const own = read(up, PROP_API_KEY);
    up.deleteProperty(PROP_API_KEY);
    if (own && read(dp, PROP_SHARED_API_KEY) === own) dp.deleteProperty(PROP_SHARED_API_KEY);
  } else if (text(input.apiKey)) {
    up.setProperty(PROP_API_KEY, validateKey(text(input.apiKey)));
  }

  const own = read(up, PROP_API_KEY);
  if (input.shareKey === true && own) dp.setProperty(PROP_SHARED_API_KEY, own);
  if (input.shareKey === false && own && read(dp, PROP_SHARED_API_KEY) === own) dp.deleteProperty(PROP_SHARED_API_KEY);

  if (input.defaultCountry !== undefined) {
    const c = text(input.defaultCountry).toLowerCase();
    if (c) dp.setProperty(PROP_DEFAULT_COUNTRY, c);
    else dp.deleteProperty(PROP_DEFAULT_COUNTRY);
  }
  if (input.defaultRegion !== undefined) {
    const r = text(input.defaultRegion).toLowerCase();
    if (r) dp.setProperty(PROP_DEFAULT_REGION, r);
    else dp.deleteProperty(PROP_DEFAULT_REGION);
  }
  return getSettingsView();
}
