# CalcBloc for Google Sheets: tax tables and take-home pay functions

A Google Sheets add-on with custom functions for take-home pay, income tax and social security, plus a sidebar to pull official 2026 tax tables into a sheet. Built on CalcBloc's sourced data and public API.

> **Status:** in development. This repository will hold the source code; nothing has been released yet.

## Planned functions

- `=CALCBLOC_NET(country, gross, [region], [year])`: estimated take-home pay
- `=CALCBLOC_TAX(country, gross, [region], [year])`: income tax
- `=CALCBLOC_RATE(country, "section", "label")`: a single rate or threshold from the tax tables
- A sidebar to insert a full tax table with its official sources

## Data and licence

Tax data comes from [CalcBloc](https://calcbloc.com/data): every figure is taken from the official government source named next to it, with the date it was last checked. Data licence: CC BY 4.0, credit "Data by CalcBloc (calcbloc.com/data)". Code licence: MIT.

## Links

- Website: [calcbloc.com](https://calcbloc.com)
- Tax tables and downloads: [calcbloc.com/data](https://calcbloc.com/data)
- API documentation: [calcbloc.com/developers](https://calcbloc.com/developers)
