/**
 * CalcBloc for Google Sheets: custom functions, menu and sidebar entry points.
 *
 * Sheets reads the help text below for its formula autocomplete, so each custom function is declared here as a
 * plain global function and forwards to CalcBlocLib (built from src/ into lib.js).
 *
 * Data by CalcBloc (calcbloc.com/data), licence CC BY 4.0. Code: MIT licence.
 */

/**
 * Estimated annual take-home pay for a gross annual salary, from the CalcBloc take-home pay calculator for that
 * country (current tax year). Accepts a range of salaries and returns one result per cell.
 * Data by CalcBloc (calcbloc.com/data).
 *
 * @param {string} country Country code or name, for example "us", "uk", "Germany", "new-zealand". Blank uses the default country from Settings.
 * @param {number} gross Gross annual salary in the country's currency (India: annual CTC). A cell or a range.
 * @param {string} region Optional. State, province or region, for example "ca" or "California" (required for the US and Canada).
 * @param {string} year Optional. Tax year; calculations use the current year only, so leave blank or use "latest".
 * @param {string} options Optional. Extra calculator inputs as "name=value; name=value", for example "filing_status=mfj". Add "result=netMonthly" to return another result.
 * @return Annual take-home pay (net salary).
 * @customfunction
 */
function CALCBLOC_NET(country, gross, region, year, options) {
  return CalcBlocLib.CALCBLOC_NET(country, gross, region, year, options);
}

/**
 * Estimated annual income tax on a gross annual salary (national plus state or regional income tax where they
 * apply; social security not included), from the CalcBloc take-home pay calculator for that country.
 * Data by CalcBloc (calcbloc.com/data).
 *
 * @param {string} country Country code or name, for example "us", "canada", "ireland".
 * @param {number} gross Gross annual salary in the country's currency. A cell or a range.
 * @param {string} region Optional. State, province or region, for example "ny" or "on".
 * @param {string} year Optional. Tax year; calculations use the current year only.
 * @param {string} options Optional. Extra calculator inputs as "name=value; name=value".
 * @return Annual income tax.
 * @customfunction
 */
function CALCBLOC_TAX(country, gross, region, year, options) {
  return CalcBlocLib.CALCBLOC_TAX(country, gross, region, year, options);
}

/**
 * Total annual cost of employing someone on a salary: salary plus employer social security, payroll taxes,
 * pension and other on-costs, from the CalcBloc employer cost calculator for that country.
 * Data by CalcBloc (calcbloc.com/data).
 *
 * @param {string} country Country code or name, for example "uk", "australia", "us".
 * @param {number} salary Gross annual salary in the country's currency. A cell or a range.
 * @param {string} region Optional. State or region, for example "nsw" (required for the US, Canada and Australia).
 * @param {string} year Optional. Tax year; calculations use the current year only.
 * @param {string} options Optional. Extra calculator inputs as "name=value; name=value", for example "pension_pct=5".
 * @return Total annual employer cost.
 * @customfunction
 */
function CALCBLOC_EMPLOYER_COST(country, salary, region, year, options) {
  return CalcBlocLib.CALCBLOC_EMPLOYER_COST(country, salary, region, year, options);
}

/**
 * One rate, threshold or amount from the official tax tables, with its source listed on calcbloc.com. Rates come
 * back as decimals (format the cell as a percentage).
 * Data by CalcBloc (calcbloc.com/data).
 *
 * @param {string} country Country code or name, for example "norway".
 * @param {string} section Section id or title, for example "general-income" or "trinnskatt".
 * @param {string} label Row label, for example "Individuals", or "#2" for the second row (unlabelled band rows).
 * @param {string} year Optional. Tax year, for example "2026" or "2025-26". Blank for the current year.
 * @param {string} region Optional. Region for regional tables, for example "ca" for California or "scotland".
 * @return The rate (decimal), amount or text in that row.
 * @customfunction
 */
function CALCBLOC_RATE(country, section, label, year, region) {
  return CalcBlocLib.CALCBLOC_RATE(country, section, label, year, region);
}

/**
 * Tax on a taxable amount from an official band schedule (each band's rate on the part of the amount inside it).
 * Allowances, credits and surcharges are not applied: read the section's notes on calcbloc.com. Works for every
 * country with tax tables, including those without a take-home calculator.
 * Data by CalcBloc (calcbloc.com/data).
 *
 * @param {string} country Country code or name, for example "austria".
 * @param {number} taxable_income Taxable income for the schedule's basis (see the table). A cell or a range.
 * @param {string} section Optional. Band section id, for example "federal-income-tax-mfj". Blank uses the first income tax schedule.
 * @param {string} year Optional. Tax year. Blank for the current year.
 * @param {string} region Optional. Region for regional schedules, for example "scotland".
 * @return Tax from the band schedule.
 * @customfunction
 */
function CALCBLOC_BAND_TAX(country, taxable_income, section, year, region) {
  return CalcBlocLib.CALCBLOC_BAND_TAX(country, taxable_income, section, year, region);
}

/**
 * The countries CalcBloc covers, with currency, current tax year, what can be calculated and the tax-table page.
 * Data by CalcBloc (calcbloc.com/data).
 *
 * @return A table with a header row.
 * @customfunction
 */
function CALCBLOC_COUNTRIES() {
  return CalcBlocLib.CALCBLOC_COUNTRIES();
}

/** Builds the Extensions > CalcBloc menu. */
function onOpen(e) {
  CalcBlocLib.onOpen(e);
}

/** Runs when the add-on is installed from the Marketplace. */
function onInstall(e) {
  CalcBlocLib.onInstall(e);
}

function showInsertTable() {
  CalcBlocLib.showSidebar("insert");
}

function showSettings() {
  CalcBlocLib.showSidebar("settings");
}

function showHelp() {
  CalcBlocLib.showSidebar("help");
}

/** Called by the sidebar (google.script.run). */
function sidebarInit() {
  return CalcBlocLib.sidebarInit();
}

function sidebarSaveSettings(input) {
  return CalcBlocLib.sidebarSaveSettings(input);
}

function sidebarInsertTable(request) {
  return CalcBlocLib.sidebarInsertTable(request);
}

function sidebarClearCache() {
  return CalcBlocLib.sidebarClearCache();
}
