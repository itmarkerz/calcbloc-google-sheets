# CalcBloc for Google Sheets: tax tables and take-home pay functions

A Google Sheets add-on with custom functions for take-home pay, income tax, employer cost and individual tax rates, plus a sidebar that inserts a country's official tax tables into a sheet, each figure with its government source. It runs on [CalcBloc](https://calcbloc.com/?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss)'s sourced data and [public API](https://calcbloc.com/developers?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss).

CalcBloc is a product of [itmarkerz technologies](https://itmarkerz.co.in/?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss).

**Works without sign-up.** Formulas and the sidebar use the CalcBloc API's free allowance without a key: 50 requests a day and 5 a minute per internet address. Google runs every spreadsheet's requests from shared server addresses, so that allowance can run out sooner than your own use explains; when it does, cells and the sidebar say **"Add your free API key"**. A [free API key](https://calcbloc.com/developers/keys?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss) gives 5,000 requests a day and 60 a minute: paste it in **Extensions > CalcBloc > Settings and API key**.

> **Status:** ready for review, not published. Nothing has been submitted to the Google Workspace Marketplace. See [PUBLISHING_CHECKLIST.md](PUBLISHING_CHECKLIST.md).

```text
=CALCBLOC_NET("us", 60000, "ca")                          ->  47,806.56   take-home pay, California, 2026
=CALCBLOC_TAX("us", 60000, "ca")                          ->   6,823.44   federal + state income tax
=CALCBLOC_EMPLOYER_COST("uk", 40000)                      ->  46,262.20   salary + employer NI + pension
=CALCBLOC_RATE("norway", "general-income", "Individuals") ->       22%
=CALCBLOC_BAND_TAX("austria", 40000)                      ->   7,447.20   tax from the 2026 bands
```

## Functions

Every function is documented in the formula helper as you type. Rates come back as decimals (0.22): format the cell as a percentage. Amounts are annual, in the country's currency. Pass a range as the salary (`A2:A50`) and one formula fills the whole column.

| Function | Returns |
| --- | --- |
| `=CALCBLOC_NET(country, gross, [region], [year], [options])` | Estimated annual take-home pay |
| `=CALCBLOC_TAX(country, gross, [region], [year], [options])` | Estimated annual income tax (social security not included) |
| `=CALCBLOC_EMPLOYER_COST(country, salary, [region], [year], [options])` | Salary plus employer social security, payroll taxes, pension and other on-costs |
| `=CALCBLOC_RATE(country, section, label, [year], [region])` | One rate, threshold or amount from the tax tables |
| `=CALCBLOC_BAND_TAX(country, taxable_income, [section], [year], [region])` | Tax on a taxable amount from an official band schedule |
| `=CALCBLOC_COUNTRIES()` | Every country with its currency, current tax year, what can be calculated and its tax-table page |

**Arguments**

- `country`: a code or name: `"us"`, `"uk"`, `"Germany"`, `"new-zealand"`, `"New Zealand"`. Leave it blank to use the spreadsheet's default country (Settings).
- `region`: a state, province or region code or name: `"ca"` or `"California"`, `"on"`, `"scotland"`. Required for the US and Canada (and Australia for employer cost).
- `year`: calculations use each country's current tax year, so leave it blank (or `"latest"`). `CALCBLOC_RATE` and `CALCBLOC_BAND_TAX` also read earlier years, e.g. `"2025-26"`.
- `options`: extra calculator inputs as `"name=value; name=value"`, for example `"filing_status=mfj; children=2"` (US) or `"pension_pct=5"` (UK employer cost). Each country's inputs are listed by the [API's countries endpoint](https://calcbloc.com/api/v1/countries). Add `result=<name>` to return another figure from the calculation, for example `"result=netMonthly"`.

**Examples**

```text
=CALCBLOC_NET("canada", 85000, "on")
=CALCBLOC_NET("us", A2:A20, "ny", , "filing_status=mfj")
=CALCBLOC_NET("uk", 40000, , , "result=netMonthly")
=CALCBLOC_TAX("ireland", 55000)
=CALCBLOC_EMPLOYER_COST("australia", 90000, "nsw")
=CALCBLOC_RATE("uk", "personal-allowance", "Personal Allowance")          -> 12570
=CALCBLOC_RATE("uk", "income-tax-scotland", "Starter rate", , "scotland")  -> 19%
=CALCBLOC_RATE("austria", "income-tax", "#2")                             -> 20%  (second band)
=CALCBLOC_BAND_TAX("us", 50000)                                           -> 5,752 (single filer)
=CALCBLOC_BAND_TAX("us", 50000, "federal-income-tax-mfj")
=CALCBLOC_BAND_TAX("norway", 500000)                                      -> 8,835.40 (trinnskatt)
```

Section ids and row labels are the ones on each country's tax-table page, for example [calcbloc.com/norway/tax-tables/2026](https://calcbloc.com/norway/tax-tables/2026?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss), and in the inserted table. A label can be shortened while it stays unique; `"#3"` picks the third row of a section, which is how unlabelled band rows are reached.

### What CALCBLOC_TAX includes

Income tax as computed by the country's take-home calculator on calcbloc.com:

| Country | Included |
| --- | --- |
| United States | Federal plus state income tax (FICA and state disability insurance not included) |
| United Kingdom | Income Tax (National Insurance and student loan not included) |
| Canada | Federal plus provincial or territorial income tax |
| Australia | Income tax including the Medicare levy |
| New Zealand | PAYE income tax (ACC levy and KiwiSaver not included) |
| Ireland | Income tax after credits (USC and PRSI not included) |
| India | Income tax (TDS) including cess, for the chosen regime |
| Germany | Wage tax plus solidarity surcharge and church tax |
| Spain | Annual IRPF liability (state and regional) |
| Netherlands | Wage tax (loonheffing), which includes national insurance contributions |
| France | Income tax withheld at source |
| Singapore | Income tax for the year of assessment |

### Countries with tax tables only

About half the countries (for example Norway, Austria, Poland and Switzerland) have tax tables on CalcBloc but no take-home calculator yet. For them `CALCBLOC_NET`, `CALCBLOC_TAX` and `CALCBLOC_EMPLOYER_COST` return a clear message with a link to the tables instead of a guess. `CALCBLOC_RATE`, `CALCBLOC_BAND_TAX` and **Insert tax table** work for every country.

`CALCBLOC_BAND_TAX` applies each band's rate to the part of the amount inside that band. It does not apply allowances, credits, surcharges or special rules, which differ by country and are described in the section notes (for example Poland's PLN 3,600 tax-reducing amount, or the Swiss federal rule above CHF 794,000). Use it on taxable income, not gross salary.

## Insert tax table

**Extensions > CalcBloc > Insert tax table** adds a new sheet with every band, threshold and rate for a country, year and (where there are regional tables) region. Each row has its tax year, effective dates, status, official source and source URL, and the date it was last checked. The sheet starts with the credit "Data by CalcBloc (calcbloc.com/data)" and a link to the matching calcbloc.com tax-table page, and ends with the licence line.

## Settings and API key

**Extensions > CalcBloc > Settings and API key**:

- **API key (optional).** Without a key the add-on calls the API anonymously, within its free allowance of 50 requests a day and 5 a minute per internet address. Google runs every spreadsheet's requests from shared server addresses, so other Apps Script users can use up that allowance; once a keyless request is refused (HTTP 429) or the API reports `X-RateLimit-Remaining: 0`, formulas return "Add your free API key: ..." with the [keys link](https://calcbloc.com/developers/keys?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss) and this Settings path, the sidebar shows the same prompt, and keyless requests pause for a minute instead of retrying. A free key gives 5,000 requests a day and 60 a minute and is sent in the `X-API-Key` header. The sidebar checks the key with calcbloc.com before saving it in your Google account's settings for this add-on (user properties). Only its last four characters are ever shown again.
- **Share my key with this spreadsheet.** Custom functions run in a restricted mode in which Google only lets them read the spreadsheet owner's settings. If you edit a sheet someone else owns, tick this so the formulas can use your key; it is then stored with the spreadsheet (document properties), readable only by the add-on.
- **Default country and region.** Saved with the spreadsheet, so every collaborator's formulas give the same results.
- **Clear cached results.** Results are cached for up to 6 hours; this starts fresh.

## How it limits API use

- Tax tables and the country list are cached for 6 hours in the add-on's shared cache (public data), so a sheet full of `CALCBLOC_RATE` or `CALCBLOC_BAND_TAX` cells costs one request per table.
- Calculation results are cached for 6 hours in the spreadsheet's own cache, one request per distinct salary.
- A range formula sends its new requests together, at most 40 per recalculation; the rest of the cells say so and fill in on the next recalculation.
- Errors that will not change (unknown parameter, unsupported country) are cached for an hour; a rate-limit answer is held for up to a minute so a sheet does not keep retrying. Without a key, once the free allowance is used up (429, or `X-RateLimit-Remaining: 0`), every keyless formula in the spreadsheet shows the "Add your free API key" message for a minute without calling the API; saving a key lifts this at once.

## Install for review (clasp)

You need Node.js 20 or later and a Google account. Nothing is published by these steps: the add-on runs only in a test spreadsheet you own.

```bash
npm install
npm test                       # builds dist/ and runs the tests
npm run demo                   # prints sample outputs from the built add-on, offline

npx @google/clasp@3 login      # once; opens a browser to authorise clasp
# Enable the Apps Script API for your account first: https://script.google.com/home/usersettings

# Option A: create a new spreadsheet with a bound script project
npx @google/clasp@3 create-script --type sheets --title "CalcBloc review" --rootDir dist
#   This writes .clasp.json (git-ignored). Then:
npm run build && npx @google/clasp@3 push --force

# Option B: use an existing spreadsheet's script (Extensions > Apps Script > Project settings > Script ID)
cp .clasp.json.example .clasp.json   # paste the Script ID
npm run build && npx @google/clasp@3 push --force
```

`push --force` replaces the script project's files with `dist/` (lib.js, Code.js, Sidebar.html, appsscript.json).

### Test in your own sheet

1. Open the spreadsheet (`npx @google/clasp@3 open-container`, or open it from Drive) and reload the page. A bound script shows its menu under **Extensions** with the project's name: **Extensions > CalcBloc review**.
2. Click **Settings and API key**. The first click asks you to authorise the script; the prompt lists the three scopes in [appsscript.json](apps-script/appsscript.json). Formulas can call the API only after this step (until then they show a permission error).
3. Optionally paste a [free API key](https://calcbloc.com/developers/keys?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss) and save. Without one, formulas use the free allowance (50 requests a day) and ask for a key when it runs out.
4. Try the formulas below in cells. Typing `=CALCBLOC` shows the help text.

   | Cell | Formula | Expected (2026 data) |
   | --- | --- | --- |
   | A1 | `=CALCBLOC_NET("us", 60000, "ca")` | 47806.56 |
   | A2 | `=CALCBLOC_TAX("us", 60000, "ca")` | 6823.44 |
   | A3 | `=CALCBLOC_EMPLOYER_COST("uk", 40000)` | 46262.2 |
   | A4 | `=CALCBLOC_RATE("norway", "general-income", "Individuals")` | 0.22 |
   | A5 | `=CALCBLOC_BAND_TAX("us", 50000)` | 5752 |
   | A6 | `=CALCBLOC_TAX("norway", 600000)` | #ERROR! with a message pointing to CALCBLOC_BAND_TAX and the tables page |
   | A7 | `=CALCBLOC_COUNTRIES()` | a table of all countries |

   Calculation results follow calcbloc.com and can change when the data is updated.
5. Use **Insert tax table** for a country with regions (United States, California) and one without (Norway). Check the credit line, the page link and the source URLs.
6. To test it as an add-on (as Marketplace users would get it): in Apps Script choose **Deploy > Test deployments > Editor add-on**, pick a test document, and open it from there.

## Development

```text
src/            TypeScript: API client, cache, countries, tables, functions, sidebar handlers
apps-script/    Code.js (custom-function declarations and help text), Sidebar.html, appsscript.json
scripts/        build (esbuild to dist/), demo, fixture refresh
harness/        Node stand-ins for UrlFetchApp, CacheService, PropertiesService, SpreadsheetApp, HtmlService
                and a fake CalcBloc API served from test/fixtures
test/           vitest tests, including worked tax examples and tests of the built dist/ files
```

- `npm run build` bundles `src/` into `dist/lib.js` as one global object (`CalcBlocLib`) for the V8 runtime and copies `apps-script/`. Sheets reads custom-function help text from JSDoc on plain global functions, so those live in `apps-script/Code.js` and forward to the bundle.
- `npm test` runs the tests against the source and against the built files loaded the way Apps Script loads them.
- `npm run demo -- --live` makes about 10 real requests to calcbloc.com without a key, or with a free key in `CALCBLOC_API_KEY`. The offline demo also shows the "Add your free API key" message after a (shortened) free allowance. `npm run demo -- --html <folder>` also writes HTML previews of the outputs and the sidebar.
- `npm run fixtures` refreshes the test tables from a local copy of the [calcbloc-data](https://github.com/itmarkerz/calcbloc-data) repository.

## Privacy

The add-on sends only what a formula or the sidebar asks for (country, region, year, salary amount and any options you add, plus your API key if you saved one) to `https://calcbloc.com/api/v1`, the only address it is allowed to contact. It does not read other cells, other files, your name or your email address. Settings are stored with Google (your account's add-on settings and the spreadsheet's add-on settings); results are cached by Google for up to 6 hours. Full text: [PRIVACY.md](PRIVACY.md).

## Data, accuracy and licence

Tax data comes from [CalcBloc](https://calcbloc.com/data?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss): every figure is taken from the official government source named next to it, with the date it was last checked. Results are estimates for planning, not tax, legal or financial advice.

- Data licence: CC BY 4.0. Keep the credit **"Data by CalcBloc (calcbloc.com/data)"** with a link wherever you share or publish figures from this add-on; inserted tables include it.
- Code licence: MIT, copyright itmarkerz technologies (see [LICENSE](LICENSE)).
- API terms: [calcbloc.com/developers/terms](https://calcbloc.com/developers/terms?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss).

## Links

- Website: [calcbloc.com](https://calcbloc.com/?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss)
- Tax tables and downloads: [calcbloc.com/data](https://calcbloc.com/data?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss)
- API documentation and free keys: [calcbloc.com/developers](https://calcbloc.com/developers?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss)

## About

[CalcBloc](https://calcbloc.com/?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss) is built and maintained by [itmarkerz technologies](https://itmarkerz.co.in/?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss), a web and mobile app development company in Kerala, India. The data behind this add-on is at [calcbloc.com/data](https://calcbloc.com/data?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss) and the API documentation at [calcbloc.com/developers](https://calcbloc.com/developers?utm_source=calcbloc-google-sheets&utm_medium=readme&utm_campaign=itmarkerz-oss). The other CalcBloc packages (Python, JavaScript, PHP, R, the MCP server and the dataset itself) are in the [itmarkerz GitHub organization](https://github.com/itmarkerz).
