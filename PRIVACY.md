# Privacy policy: CalcBloc for Google Sheets

**Draft for review. Last updated: 11 November 2026.**

This policy covers the CalcBloc for Google Sheets add-on ("the add-on"). The calcbloc.com website and API are covered by the [CalcBloc privacy policy](https://calcbloc.com/privacy).

## Summary

The add-on sends the inputs of its own formulas and sidebar to the CalcBloc API and nothing else. It does not read your other cells, other files, your name or your email address, and it does not show ads or sell data.

## What the add-on accesses

The add-on asks Google for three permissions (OAuth scopes):

| Permission | Why |
| --- | --- |
| Connect to an external service (`script.external_request`) | To fetch tax figures from `https://calcbloc.com/api/v1`. The add-on's manifest allows no other address. |
| View and manage spreadsheets that this application has been installed in (`spreadsheets.currentonly`) | To write a tax table into a new sheet when you choose **Insert tax table**. Only the spreadsheet you are using; no other files. |
| Display and run third-party web content in prompts and sidebars inside Google applications (`script.container.ui`) | To show the menu and the settings sidebar. |

Custom functions only receive the values you pass to them in a formula. The add-on does not read any other cell.

## What is sent to CalcBloc

When a formula or the sidebar needs data, the add-on sends an HTTPS request to `calcbloc.com` containing:

- the country, region, tax year and any options written in the formula;
- for the calculation functions, the salary amount in the formula;
- your CalcBloc API key, if you saved one (in a request header).

Requests come from Google's servers, not from your computer, so CalcBloc does not see your IP address. No Google account information (name, email, account id) is sent.

On the CalcBloc side, the API's own request log records the endpoint, country, response status, timing and the public id of the key (or "anonymous"); it does not record the amounts, the full address of the request or the key itself. Rate limiting stores a shortened one-way hash of the requesting address (here, a Google server) for up to a day. The hosting provider and the CDN (Cloudflare) may keep standard access logs; see the [CalcBloc privacy policy](https://calcbloc.com/privacy).

## What is stored, and where

All storage uses Google's Apps Script services, inside your Google account or the spreadsheet:

| What | Where | How long |
| --- | --- | --- |
| Your API key | Your Google account's settings for this add-on (user properties) | Until you remove it in the sidebar or uninstall the add-on |
| Your API key, only if you tick "share my key with this spreadsheet" | The spreadsheet's settings for this add-on (document properties), readable only by the add-on | Until you untick it or remove the key |
| Default country and region | The spreadsheet's settings for this add-on | Until changed |
| Calculation results (with the inputs that produced them) | The spreadsheet's cache | Up to 6 hours |
| Country list and tax tables (public data) | The add-on's shared cache | Up to 6 hours |

The sidebar never sends your saved key back to the browser; it shows only its last four characters.

## What the add-on does not do

- No analytics, tracking, advertising or profiling.
- No access to other spreadsheets, Drive files, Gmail, contacts or calendar.
- No transfer of data to anyone other than CalcBloc (and Google, which runs the add-on).
- Google user data obtained through Google APIs is not used to develop, improve or train machine-learning or AI models.

The add-on's use of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Your choices

- Remove your key: **Extensions > CalcBloc > Settings and API key > Remove key**.
- Clear cached results: **Settings and API key > Clear cached results**.
- Uninstall: in Google Sheets, **Extensions > Add-ons > Manage add-ons**, then remove CalcBloc. You can also revoke access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions).
- Revoke an API key at any time from the CalcBloc developer pages.

## Children

The add-on is a business and personal-finance tool and is not directed at children.

## Changes

Changes to this policy will be published here with a new date. Material changes will also be noted in the Marketplace listing.

## Contact

Questions or requests: [calcbloc.com/contact](https://calcbloc.com/contact).
