import { checkKey } from "./api";
import { cacheClear } from "./cache";
import { appLink, CREDIT, DATA_URL, DEVELOPERS_URL, KEYS_URL, VERSION } from "./config";
import { getCountries } from "./countries";
import { getSettingsView, saveSettings, validateKey, type SettingsInput } from "./settings";
import { insertTaxTable, type InsertRequest } from "./sheet";
import { errorMessage } from "./util";

/**
 * Menu and sidebar. onOpen may run in AuthMode.NONE (add-on installed but not yet used in this file), where only
 * the menu can be built: no properties, no network. Everything else happens in the menu handlers (AuthMode.FULL).
 */
export function onOpen(_e?: GoogleAppsScript.Events.SheetsOnOpen): void {
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem("Insert tax table", "showInsertTable")
    .addItem("Settings and API key", "showSettings")
    .addSeparator()
    .addItem("Function help", "showHelp")
    .addToUi();
}

export function onInstall(e?: GoogleAppsScript.Events.AddonOnInstall): void {
  onOpen(e as unknown as GoogleAppsScript.Events.SheetsOnOpen);
}

export function showSidebar(tab: "insert" | "settings" | "help"): void {
  const t = HtmlService.createTemplateFromFile("Sidebar");
  (t as unknown as Record<string, string>).tab = tab;
  const html = t.evaluate().setTitle("CalcBloc tax data");
  SpreadsheetApp.getUi().showSidebar(html);
}

type Reply<T> = { ok: true; data: T } | { ok: false; message: string };

function reply<T>(fn: () => T): Reply<T> {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    return { ok: false, message: errorMessage(e) };
  }
}

/** Everything the sidebar needs to draw itself: settings (key masked), countries with years and regions, links. */
export function sidebarInit() {
  return reply(() => ({
    version: VERSION,
    credit: CREDIT,
    links: { data: appLink(DATA_URL), developers: appLink(DEVELOPERS_URL), keys: appLink(KEYS_URL) },
    settings: getSettingsView(),
    countries: getCountries()
      .map((c) => ({ code: c.code, name: c.name, currentYear: c.currentYear, years: c.years, regions: c.regions, tablesOnly: c.tablesOnly, tablesPageUrl: c.tablesPageUrl }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export function sidebarSaveSettings(input: SettingsInput) {
  return reply(() => {
    if (input.apiKey) {
      const key = validateKey(input.apiKey);
      const check = checkKey(key);
      if (!check.ok) throw new Error(check.message);
      const view = saveSettings(input);
      return { settings: view, message: `Saved. ${check.message}` };
    }
    return { settings: saveSettings(input), message: "Saved." };
  });
}

export function sidebarInsertTable(req: InsertRequest) {
  return reply(() => insertTaxTable(req));
}

export function sidebarClearCache() {
  return reply(() => {
    cacheClear();
    return { message: "Cached results cleared. Formulas fetch fresh figures the next time they recalculate." };
  });
}
