# Privacy policy: CalcBloc for Google Sheets

**Last updated: 12 November 2026.** Published at [calcbloc.com/google-sheets/privacy](https://calcbloc.com/google-sheets/privacy?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss); this file says the same thing.

The add-on sends only the inputs of its own formulas to calcbloc.com. No tracking, no ads, no selling of data.

This policy covers the CalcBloc add-on for Google Sheets ("the add-on"). The add-on and calcbloc.com are published by [itmarkerz technologies](https://itmarkerz.co.in/?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss), which operates CalcBloc ("we", "us"). The calcbloc.com website and API are covered by the CalcBloc [privacy policy](https://calcbloc.com/privacy?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss); use of the add-on is also governed by its [terms of service](https://calcbloc.com/google-sheets/terms?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss) ([TERMS.md](TERMS.md)).

## Summary

The add-on sends the inputs of its own formulas and sidebar to the CalcBloc API at calcbloc.com, and nothing else. It does not read your other cells, other files, your name or your email address. It has no analytics or advertising, and we do not sell data. An API key is optional: the add-on works without one, within the API's free allowance of 50 requests a day per internet address.

## Permissions the add-on asks for

The add-on asks Google for three permissions (OAuth scopes) and no others:

| Permission | Why |
| --- | --- |
| Connect to an external service<br>`https://www.googleapis.com/auth/script.external_request` | To fetch tax figures from the CalcBloc API. The add-on's manifest only allows addresses that start with `https://calcbloc.com/api/`. |
| View and manage spreadsheets that this application has been installed in<br>`https://www.googleapis.com/auth/spreadsheets.currentonly` | To add a tax table as a new sheet when you choose **Insert tax table**. It covers only the spreadsheet you have open. The add-on reads the names of the existing sheets (to give the new sheet a unique name) and writes only to the new sheet. |
| Display and run third-party web content in prompts and sidebars inside Google applications<br>`https://www.googleapis.com/auth/script.container.ui` | To show the CalcBloc sidebar (inserting tables, settings and function help). |

Custom functions such as `=CALCBLOC_NET("uk", 40000)` receive only the values you pass to them in the formula. The add-on does not read any other cell.

## What is sent to calcbloc.com

When a formula or the sidebar needs data, the add-on sends an HTTPS request to the CalcBloc API containing:

- the country and, where you give them, the region, the tax year (for tax tables) and any options written in the formula;
- for `CALCBLOC_NET`, `CALCBLOC_TAX` and `CALCBLOC_EMPLOYER_COST`, the salary amount in the formula. `CALCBLOC_RATE` and `CALCBLOC_BAND_TAX` work from the downloaded tax table, so the amount you give `CALCBLOC_BAND_TAX` is not sent;
- your CalcBloc API key, if you saved one, in a request header (never in the address);
- the add-on's name and version number, in a request header.

The country, amount and options are part of the request address (for example `/api/v1/net-salary?country=uk&salary=40000`). When you save an API key, the add-on makes one test request with it to check that it works.

Requests are made by Google's servers, not by your computer, so CalcBloc does not receive your device's IP address. No Google account information (name, email address or account id) is sent. Google adds its own standard request headers, such as a user-agent that identifies the request as coming from Google Apps Script.

## What CalcBloc records

- **API request log.** One line per request with the time, the endpoint, the country, the response status and error code, the response time and the public id of the API key (or "anon"). It does not include the amounts, the rest of the request address, the IP address or the key itself.
- **Rate limits.** Request counters are kept per API key id or, without a key, per shortened one-way hash of the requesting address (a Google server). They expire at the end of the minute or the day (UTC) they count.
- **Web server logs.** Our web server keeps a standard access log of requests to calcbloc.com. Each entry includes the full request address, so the inputs listed above (such as the country and the salary amount), together with the requesting Google server's IP address, the time and the user-agent. Requests also pass through Cloudflare, which protects and delivers the site. These logs are used only to run, secure and troubleshoot the service; they cannot be linked to your Google account. Retention is described in the CalcBloc [privacy policy](https://calcbloc.com/privacy?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss).

If you signed up for a free API key on calcbloc.com, the details you gave at signup are covered by the [API and data terms](https://calcbloc.com/developers/terms?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss) and the CalcBloc privacy policy. The add-on does not send them.

## What is stored, and where

The add-on stores data only with Google's Apps Script services, in your Google account or in the spreadsheet:

| What | Where | How long |
| --- | --- | --- |
| Your API key | Your Google account's settings for this add-on (user properties) | Until you remove it in the sidebar. Uninstalling the add-on does not delete saved settings, so remove the key first. |
| Your API key, only if you tick the option to let formulas in this spreadsheet use it | The spreadsheet's settings for this add-on (document properties), readable only by the add-on | Until you untick the option or remove your key while that spreadsheet is open |
| Default country and region | The spreadsheet's settings for this add-on | Until changed or cleared |
| Calculation results, keyed by the request (including its inputs) | The spreadsheet's cache in Google's cache service (the add-on's own cache if Google provides none for the spreadsheet) | Up to 6 hours (error answers up to 1 hour) |
| Country list and tax tables (public data) | The add-on's shared cache | Up to 6 hours |
| Tax tables you insert | A new sheet in your spreadsheet | Until you delete the sheet |

The sidebar never sends your saved key back to the browser; it shows only its last four characters. The add-on keeps no logs of its own, and error reporting to Google Cloud Logging is turned off in its manifest. The sidebar loads Google's standard add-on stylesheet from Google and nothing from calcbloc.com; its links open calcbloc.com in your browser only when you click them, and the website's privacy policy then applies.

## What the add-on does not do

- No analytics, tracking, advertising or profiling.
- No access to other spreadsheets, Drive files, Gmail, contacts or calendar.
- No sale or sharing of data. Requests are handled only by CalcBloc and the providers that deliver them: Google (which runs the add-on), Cloudflare and our hosting provider.
- Google user data obtained through Google APIs is not used to develop, improve or train machine-learning or AI models.

The add-on's use of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Your choices

- Remove your key: **Extensions > CalcBloc > Settings and API key > Remove key**.
- Clear cached results: **Settings and API key > Clear cached results**. Cached answers become unreachable at once.
- Uninstall: in Google Sheets, **Extensions > Add-ons > Manage add-ons**, then remove CalcBloc. You can also remove the add-on's access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).
- Revoke or replace an API key: email [hello@calcbloc.com](mailto:hello@calcbloc.com) from the address you signed up with and quote the key id (it starts with `k_`), as described on the [API key page](https://calcbloc.com/developers/keys?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss).

## Children

The add-on is a business and personal-finance tool and is not directed at children.

## Changes

Changes to this policy will be published on [calcbloc.com/google-sheets/privacy](https://calcbloc.com/google-sheets/privacy?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss) with a new date. Material changes will also be noted in the Marketplace listing.

## Contact

Questions or requests about this policy: [hello@calcbloc.com](mailto:hello@calcbloc.com), or see our [contact page](https://calcbloc.com/contact?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss).

See also the add-on's [terms of service](TERMS.md), and the CalcBloc website [privacy policy](https://calcbloc.com/privacy?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss) and [terms of use](https://calcbloc.com/terms?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss). CalcBloc is a product of [itmarkerz technologies](https://itmarkerz.co.in/?utm_source=calcbloc-google-sheets&utm_medium=docs&utm_campaign=itmarkerz-oss).
