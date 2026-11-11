# Publishing checklist: Google Workspace Marketplace

Steps to take the add-on from this repository to a public Marketplace listing. **None of these steps have been done.** Each needs the owner's Google account and decisions. Listing text, scope justifications and verification notes are in [marketplace/listing.md](marketplace/listing.md).

## 0. Decisions first

- [ ] Publisher account: which Google account (ideally a Google Workspace account on calcbloc.com) owns the Cloud project, the script and the listing. The publisher must be a collaborator on the script project.
- [ ] Visibility: **Public** (reviewed by Google). This cannot be changed after it is saved.
- [ ] App name and icon (must match across consent screen, listing and add-on menu).
- [ ] Where the privacy policy, terms and help page live on calcbloc.com (proposed `/google-sheets/privacy`, `/google-sheets/terms`, `/google-sheets`).
- [ ] Anonymous API access from Apps Script: Google's outbound addresses are shared, so the 50-a-day anonymous allowance per address will often be used up by others. Options: keep as is and steer users to free keys (current build), raise or exempt limits for the add-on (for example a dedicated key or header recognised by the API), or require a key.

## 1. Code readiness

- [ ] `npm install && npm test` passes (build + all tests).
- [ ] Review `apps-script/appsscript.json`: V8, three scopes, `urlFetchWhitelist: ["https://calcbloc.com/api/"]`, `exceptionLogging: NONE` (switch to `STACKDRIVER` only if error logs are wanted; they could contain request URLs).
- [ ] Bump `VERSION` in `src/config.ts` and `package.json` for the release.
- [ ] Manual test in a real sheet (README, "Test in your own sheet"), including a Test deployment as an Editor add-on, in a second Google account that is not the owner (checks the shared-key path), and with no key (checks the rate-limit message).

## 2. Google Cloud project

- [ ] Create a **standard** Google Cloud project (the default Apps Script project cannot be published), e.g. `calcbloc-sheets-addon`.
- [ ] In Apps Script: Project Settings > Google Cloud Platform (GCP) Project > Change project, enter the project number.
- [ ] Enable the **Google Workspace Marketplace SDK** (and leave the Apps Script API enabled for clasp).

## 3. OAuth consent screen (Google Auth Platform)

- [ ] Branding: app name, user support email, logo (120x120), app home page `https://calcbloc.com`, privacy policy URL, terms URL, authorised domain `calcbloc.com`, developer contact email.
- [ ] Audience: **External**; add test users (owner, reviewers) while unverified.
- [ ] Data access: add exactly the three scopes from the manifest; paste the justifications from the listing file.
- [ ] Verify `calcbloc.com` in Google Search Console with the publishing account.

## 4. OAuth verification

- [ ] Publish the privacy policy and terms pages on calcbloc.com (from PRIVACY.md and TERMS.md), linked from the home page or footer.
- [ ] Record the demo video (see listing notes) and upload it to YouTube as unlisted.
- [ ] Submit for verification (brand + sensitive scopes). Answer follow-up emails from the Google Trust and Safety team.
- [ ] Wait for approval before switching the listing to public (unverified apps show a warning and have a 100-user cap).

## 5. Versioned deployment

- [ ] `npm run build && npx @google/clasp@3 push --force` to the publishing script project.
- [ ] Apps Script: **Deploy > Manage deployments** (or Project history) and create a numbered **version**; note the number.

## 6. Marketplace SDK: App configuration

- [ ] App visibility: Public. Installation settings: individual and admin install.
- [ ] App integration: **Editor add-on**, Sheets; enter the Apps Script **script ID** and the **version** from step 5.
- [ ] OAuth scopes: the same three as the manifest.
- [ ] Developer information: name "CalcBloc", website, email, links.

## 7. Marketplace SDK: Store listing

- [ ] Name, short and detailed descriptions, category, pricing (Free) from the listing file.
- [ ] Icons (32x32, 128x128), card banner (220x140), 1 to 10 screenshots (1280x800, captured in real Sheets).
- [ ] Support links: terms, privacy, support (required); help and report-issue (optional, add Help menu items for Editor add-ons).
- [ ] Regions and languages (all regions, English).

## 8. Submit and review

- [ ] Check the Marketplace review criteria: menu built with `createAddonMenu()` and working when the add-on is not yet enabled in a file (AuthMode.NONE), no errors on first use, clear value without sign-up, accurate listing and screenshots, working links.
- [ ] Click **Publish**. Google reviews public listings; expect several days to a few weeks. Fix and resubmit if asked.
- [ ] After approval: test install from the Marketplace in a fresh account; link the listing from calcbloc.com/developers and calcbloc.com/data.

## 9. Updating later

- Push the new code, create a new script version, and change the version number in the Marketplace SDK App configuration. Code changes in a new version do not need a new listing review unless scopes change; adding a scope requires re-verification and re-authorisation by users.
