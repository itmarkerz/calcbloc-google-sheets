# Google Workspace Marketplace listing (draft)

Draft text and assets for the Marketplace SDK **Store listing** and **App configuration** pages, and for the OAuth consent screen. Nothing here has been submitted.

## App details

**Application name** (50 characters max; must match the OAuth consent screen app name; may not contain "Google"):

> CalcBloc Tax Tables and Take-Home Pay

(37 characters. Alternative: "CalcBloc for Sheets: Tax and Salary", 35.)

**Short description** (200 characters max):

> Take-home pay, income tax and employer cost functions for Sheets, plus official tax tables for 37 countries with a government source link for every figure.

(155 characters. Update the country count if it changes; the add-on itself reads the list from the API.)

**Detailed description** (under 16,000 characters):

> CalcBloc brings sourced tax data into Google Sheets. Work out take-home pay, income tax and the full cost of an employee in a formula, or insert a country's complete tax tables into a sheet, with the official source and the date each figure was last checked.
>
> **Functions**
> - `=CALCBLOC_NET("us", 60000, "ca")`: estimated annual take-home pay
> - `=CALCBLOC_TAX("canada", 85000, "on")`: estimated annual income tax
> - `=CALCBLOC_EMPLOYER_COST("uk", 40000)`: salary plus employer National Insurance, pension and other on-costs
> - `=CALCBLOC_RATE("norway", "general-income", "Individuals")`: any rate, threshold or allowance from the tax tables
> - `=CALCBLOC_BAND_TAX("austria", 40000)`: tax on a taxable amount from the official bands
> - `=CALCBLOC_COUNTRIES()`: every country with its tax year and what can be calculated
>
> Pass a range as the salary and one formula fills a whole column, so salary bands, hiring budgets and offer comparisons take one formula.
>
> **Insert tax table**
> Extensions > CalcBloc > Insert tax table adds a new sheet with every income tax band, threshold, employee contribution and employer rate for a country and tax year, including US states, Canadian provinces and Scotland. Each row links to the government page it comes from.
>
> **Coverage**
> Take-home pay calculations for the United States (all states), United Kingdom, Canada, Australia, New Zealand, Ireland, India, Germany, Spain, the Netherlands, France and Singapore. Tax tables for these and for countries such as Norway, Sweden, Denmark, Austria, Switzerland, Poland, Italy and Portugal.
>
> **Free, no sign-up needed**
> The add-on is free and works straight away without signing up, using the CalcBloc API's free allowance (50 requests a day per internet address). Google's servers are shared by many users, so that allowance can run out sooner; the add-on then asks you to add a free API key. Get one at calcbloc.com/developers/keys (sign up with your email address; the key is shown straight away) and paste it in Extensions > CalcBloc > Settings and API key for 5,000 requests a day. Results are cached so a sheet does not repeat requests.
>
> **Privacy**
> The add-on sends only the inputs of its own formulas (country, region, year, salary), and your API key if you saved one, to calcbloc.com. It does not read your other cells or files, and it has no ads or tracking.
>
> Published by itmarkerz technologies (itmarkerz.co.in), which operates CalcBloc.
>
> Figures are estimates for planning, not tax advice. Data by CalcBloc (calcbloc.com/data), licensed CC BY 4.0.

**Category:** Business Tools, subcategory Accounting & Finance (pick the closest available in the console).

**Pricing:** Free of charge. Works without sign-up; a free CalcBloc API key from https://calcbloc.com/developers/keys raises the limit to 5,000 requests a day.

**Developer / publisher name:** itmarkerz technologies (https://itmarkerz.co.in). CalcBloc is the product name.

**Languages:** English (default).

## Graphic assets (to produce)

| Asset | Size | Content |
| --- | --- | --- |
| Application icon | 32x32 and 128x128 PNG | CalcBloc mark on a plain background (reuse the site's icon artwork) |
| Card banner | 220x140 PNG | Mark + "Tax tables and take-home pay in Sheets" |
| Screenshot 1 | 1280x800, full bleed, square corners | A sheet with a salary column and `CALCBLOC_NET` / `CALCBLOC_TAX` filled down, formula bar showing the formula |
| Screenshot 2 | 1280x800 | The Insert tax table sidebar next to an inserted table (US federal or Norway), credit line and source URLs visible |
| Screenshot 3 | 1280x800 | Formula autocomplete showing the `CALCBLOC_NET` help text |
| Screenshot 4 | 1280x800 | Employer cost comparison across countries with `CALCBLOC_EMPLOYER_COST` |
| Screenshot 5 | 1280x800 | Settings sidebar (API key masked, default country); optionally the "Add your free API key" prompt shown once the free allowance is used up |
| Promo video (optional) | YouTube | 60 to 90 seconds; can reuse the OAuth verification video |

Screenshots must be captured in real Google Sheets (at least one must show the add-on inside Sheets). The HTML previews produced by `npm run demo -- --html` are for review only.

## Support links

| Field | Proposed URL | Status |
| --- | --- | --- |
| Terms of service (required) | `https://calcbloc.com/google-sheets/terms` | Live since 11 November 2026; [TERMS.md](../TERMS.md) is the same text |
| Privacy policy (required) | `https://calcbloc.com/google-sheets/privacy` | Live since 11 November 2026; [PRIVACY.md](../PRIVACY.md) is the same text; must be on the verified domain |
| Support (required) | `https://calcbloc.com/contact?utm_source=calcbloc-google-sheets&utm_medium=listing&utm_campaign=itmarkerz-oss` | Exists |
| Setup / Help (optional) | `https://calcbloc.com/google-sheets?utm_source=calcbloc-google-sheets&utm_medium=listing&utm_campaign=itmarkerz-oss` | Page to be created (install steps, function reference); or link the GitHub README |
| Report issue (optional) | `https://github.com/itmarkerz/calcbloc-google-sheets/issues` | Exists once the repository is public with issues enabled |
| Developer website | `https://calcbloc.com/?utm_source=calcbloc-google-sheets&utm_medium=listing&utm_campaign=itmarkerz-oss` | Exists |

## OAuth scopes and justification

The manifest ([apps-script/appsscript.json](../apps-script/appsscript.json)) declares exactly these scopes. The Marketplace SDK App configuration and the OAuth consent screen must list the same three.

| Scope | Shown to users as | Used for | Why a narrower scope will not do |
| --- | --- | --- | --- |
| `https://www.googleapis.com/auth/script.external_request` | Connect to an external service | `UrlFetchApp` calls to `https://calcbloc.com/api/v1` for tax tables and calculations. `urlFetchWhitelist` restricts requests to that prefix. | No narrower scope exists for outbound HTTPS. |
| `https://www.googleapis.com/auth/spreadsheets.currentonly` | View and manage spreadsheets that this application has been installed in | Insert tax table writes a new sheet in the open spreadsheet. | Already the narrowest Sheets scope: no access to other spreadsheets or Drive. |
| `https://www.googleapis.com/auth/script.container.ui` | Display and run third-party web content in prompts and sidebars inside Google applications | The Extensions menu and the settings / insert-table sidebar. | Required for any sidebar. |

Not requested: Drive, `spreadsheets` (all spreadsheets), user email or profile, `script.scriptapp` (no installable triggers), `script.send_mail`. PropertiesService and CacheService need no scope.

**Justification text for the verification form** (sensitive-scope section):

> CalcBloc for Google Sheets adds custom functions that return take-home pay, income tax and tax rates, and a sidebar that inserts official tax tables. `script.external_request` is needed to fetch this public tax data from our own API at https://calcbloc.com/api/v1 (the manifest's urlFetchWhitelist allows only that address); the request contains only the country, region, year and salary amount written in the user's formula, plus the user's CalcBloc API key in a header if they saved one. `script.container.ui` is needed to show the add-on menu and the sidebar where users insert a tax table and save their optional CalcBloc API key. `spreadsheets.currentonly` lets the add-on write the requested tax table into a new sheet of the spreadsheet the user has open; it never reads other cells, spreadsheets or Drive files. No Google user data leaves Google except the formula inputs listed above.

## OAuth verification notes

- **Expected classification.** `spreadsheets.currentonly` is expected to be non-sensitive. `script.external_request` and `script.container.ui` are expected to appear as sensitive in the Google Auth Platform "Data access" page; confirm when adding them. Sensitive scopes on an external (public) app mean **OAuth verification** (brand verification plus sensitive-scope review) before the Marketplace listing can go public. No restricted scopes are used, so no CASA security assessment.
- **Before submitting verification:** verify `calcbloc.com` in Google Search Console with the same Google account; publish the privacy policy and terms on that domain; make sure the home page links to the privacy policy; use an app name and logo that match the listing; add a support email.
- **Demo video** (unlisted YouTube): show the OAuth consent screen with the app name and the three scopes, then each scope in use without a key: a formula returning a value (external request), the sidebar opening (container UI), and Insert tax table writing a sheet (currentonly); optionally saving a free API key in Settings. Show the browser address bar with the OAuth client id during the consent screen.
- **Unverified state.** Until verification completes, test users see the "Google hasn't verified this app" screen; add reviewers as test users on the consent screen.
- **Typical timing** is a few days to several weeks, plus Marketplace review after that.
