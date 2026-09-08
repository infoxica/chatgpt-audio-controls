# v1.2.0 delivery status

Project: Infoxica. Account identities and private service identifiers belong in private release records, never repository files or pull requests.

## Completed
- PR #8 updated at 014dda8: version-change publishing policy, independent Chrome/Edge jobs, per-store retry, ZIP validation.
- Local policy tests and archive validation passed. GitHub run 34205468386 verified packaging successfully.
- Implemented compact/wide layouts, visibility settings, the browser command, assignment/Mac display, recovery and first-use help.
- Added eight complete interface locales and translated new flows, manifest catalogs and store copy for all 17 locales.
- Built the static localized website and separate Pages workflow, including SEO metadata, consent-gated analytics and tagged store links.
- Built the Apps Script survey and private workbook candidate. Server validation/duplicate handling and the two-click client flow have local tests.
- Local checks: typecheck/build; 7 unit tests with 148 assertions; 4 browser integration tests using a loaded Chromium extension and controlled host/site/survey fixtures.
- Windows ZIP validation: 61 entries, manifest version 1.2.0; website and feedback files excluded. Userscript changes are version metadata only.
- Copied supplied CSV exports byte-for-byte to ignored `build/baseline`, with SHA-256 checksums. No baseline data uploaded.
- Draft PR #9 is pushed. GitHub CI run 34211421048 passed verification, browser tests and packaging; website build run 34211421309 passed. Deployments and store jobs were skipped as intended.
- Verified the designated project owner, corrected missing OAuth permissions and enabled the Apps Script API. Created the survey project and uploaded all four generated source files successfully. It is not yet deployed.
- Created the separate website Analytics property and configured its public measurement ID in the website build. Optional account data sharing and enhanced measurement are disabled. Event-scoped custom dimensions cover store, locale and placement. Website loading remains consent-gated; deployed event receipt is not yet verified.
- Inspected store analytics and marked the existing install event as a key event. Treat this as a reporting configuration change, not an acquisition increase or a historical-data correction. Keep account-level analytics and baseline figures in private release records.

## In progress
- Feature branch feature/v1.2.0-release includes PR #8; production configuration and live acceptance remain open.
- Candidate ZIP is available for playback/Mac testing. The uninstall URL is intentionally unset until a real survey write is verified.
- No website deployment, survey deployment, real Sheet writes, Search Console setup, console listing update, store submission or public v1.2.0 availability has been confirmed. The new GA4 property is configured but has received no website data yet.

## External requirements
- PR #8 cannot merge yet: GitHub requires review. Auto-merge is disabled. No administrator bypass used.
- Native Mac acceptance will be performed by the user's friend on the candidate package.
- Google service deployment URLs/IDs must be real, verified values before release packaging.
- Use only the designated project accounts recorded privately. The connected Drive connector belongs to a different account and must not create extension resources. The previous temporary Apps Script login was removed locally; no extension services were created under it.
- Native workbook import through the Drive connector failed due to missing upload MIME metadata. Browser import in the corrected owner profile reached the file chooser but was denied because the ChatGPT extension needs Allow access to file URLs. A new private ChatGPT folder is ready in the owner's Drive; the workbook has not uploaded. The user must enable file access before browser import can continue.
- `config/acceptance.json` keeps live browser, Mac, feedback and website checks false; publishing validation fails closed until recorded evidence supports them.

## Analytics baseline
Baseline exports, account-level metrics and service ownership records remain private. Store analytics measure listing visitors, not extension usage. Do not combine overlapping extracts or infer cohort churn from event totals. Survey respondents are self-selected; reason distributions do not represent all uninstalls.

## Release boundary
Do not merge the release into master or submit stores until configured survey writes, browser checks, and native Mac acceptance are verified. Report submission acceptance separately from public store availability.
