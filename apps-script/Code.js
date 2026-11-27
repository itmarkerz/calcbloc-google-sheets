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
 * Tax withheld on a bonus, commission, RSU vest, option exercise or lump sum paid on top of a salary, using the
 * country's official withholding method (CalcBloc API /supplemental-withholding).
 * Data by CalcBloc (calcbloc.com/data).
 *
 * @param {string} country Country code or name, for example "us", "uk", "ca".
 * @param {number} salary Regular gross annual salary in the country's currency.
 * @param {number} amount The bonus or other payment (gross).
 * @param {string} type Optional. "bonus" (default), "commission", "rsu_vest", "option_exercise" or "lump_sum".
 * @param {string} region Optional. State or province, required for the US and Canada, for example "ca" or "on".
 * @param {string} options Optional. "result=totalLiability" (or totalWithheld, difference, netPayment) and other inputs as "name=value; name=value".
 * @return The tax withheld on the payment.
 * @customfunction
 */
function CALCBLOC_BONUS_WITHHOLDING(country, salary, amount, type, region, options) {
  return CalcBlocLib.CALCBLOC_BONUS_WITHHOLDING(country, salary, amount, type, region, options);
}

/**
 * Duties and taxes on one import into the UK, an EU member state, the US or India, from the official tariff
 * (CalcBloc API /import-duty). An estimate, not a customs ruling. Shows an error when the total is incomplete.
 * Data by CalcBloc (calcbloc.com/data).
 *
 * @param {string} destination Importing country, for example "gb", "de", "us" or "in".
 * @param {string} origin Country of origin, for example "cn" or "in".
 * @param {string} code Commodity code, 10 digits (8 for India), for example "0901210000".
 * @param {number} customs_value Customs value in the tariff's currency.
 * @param {string} result Optional. "duties_and_taxes" (default), "customs_duty", "extra_duties", "excise", "import_vat" or "landed_cost".
 * @param {string} options Optional. More inputs as "name=value; name=value", for example "proof_of_origin=true; quantity=100; unit=l".
 * @return The amount in the tariff's currency.
 * @customfunction
 */
function CALCBLOC_IMPORT_DUTY(destination, origin, code, customs_value, result, options) {
  return CalcBlocLib.CALCBLOC_IMPORT_DUTY(destination, origin, code, customs_value, result, options);
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
