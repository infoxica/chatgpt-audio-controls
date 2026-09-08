# v1.2.0 delivery status

Project: Infoxica. Account identities and private service identifiers belong in private release records, never repository files or pull requests.

## Completed
- PR #8 updated: version-change publishing policy, independent Chrome/Edge jobs, per-store retry, ZIP validation.
- Local policy tests and archive validation passed. GitHub run 34205468386 verified packaging successfully.
- Implemented compact/wide layouts, visibility settings, the browser command, assignment/Mac display, recovery and first-use help.
- Added eight complete interface locales and translated new flows, manifest catalogs and store copy for all 17 locales.
- Built the static localized website and separate Pages workflow, including SEO metadata, consent-gated analytics and tagged store links.
- Built the Apps Script survey and private workbook candidate. Server validation/duplicate handling and the two-click client flow have local tests.
- Local checks refreshed on 2026-09-08: typecheck, extension/userscript build, 85-page website build, feedback fixture build; 7 unit tests with 148 assertions; 8 browser integration tests using a loaded Chromium extension and controlled host/site/survey fixtures; 6 HTTP tests including malicious redirect/path cases.
- Windows ZIP validation: 61 entries, manifest version 1.2.0; website and feedback files excluded. Userscript changes are version metadata only.
- Copied supplied CSV exports byte-for-byte to ignored `build/baseline`, with SHA-256 checksums. No baseline data uploaded.
- PR #8 and PR #9 merged into develop on 2026-09-08. Post-merge CI run 34244307086 passed. The website refinements and preview security fix are included in the follow-up branch, feature/v1.2.0-website-release.
- Verified the designated project owner, completed OAuth authorization and deployed Apps Script web-app version 1. Owner-only initialization creates/reuses a private native Sheet and signing configuration without printing private values.
- Created the separate website Analytics property and configured its public measurement ID in the website build. Optional account data sharing and enhanced measurement are disabled. Event-scoped custom dimensions cover store, locale and placement. Website loading remains consent-gated; deployed event receipt is not yet verified.
- Inspected store analytics and marked the existing install event as a key event. Treat this as a reporting configuration change, not an acquisition increase or a historical-data correction. Keep account-level analytics and baseline figures in private release records.
- Refined the website with React/Radix navigation, a desktop language grid, consistent Support summaries, localized guides, official store badges and review links. Popup/options now link to the localized website. Markdown mirrors include freshness, sitemap sections and canonical headers in the preview.
- PR #11 merged the initial Pages workflow. Website deployment run 34246921690 succeeded from develop commit befd34e on 2026-09-08. All 85 live HTML pages and Markdown mirrors returned successfully with expected canonical/language metadata; discovery files returned 200. Browser checks passed for images, mobile layout, 17-language navigation, consent rejection and withdrawal.
- Live verification identified a Google tag command-format defect: the loader succeeded but queued array commands did not produce measurement requests. Replacing them with the documented Arguments objects produced a 204 collection response in an isolated browser diagnostic. The source fix and regression check require review and redeployment; GA4 reporting receipt remains unverified.
- The built source fix was then substituted into an isolated live-site browser: both page-view and store-link-click requests received HTTP 204 from Google. Typecheck, website build and all 6 website/survey browser tests passed. This is transport evidence for the candidate fix, not evidence of its production deployment or processed GA4 reports. Reference: https://developers.google.com/tag-platform/gtagjs (the documented gtag command wrapper).
- PR #12 subsequently merged the analytics fix into develop (`cf67ba8`). Pages deployment 34249355659 succeeded. Fresh production checks, without source substitution, received HTTP 204 for page views and store-link clicks with store/locale/placement dimensions. No measurement occurred before acceptance or after withdrawal. Processed GA4 reports remain unverified.
- Deployed survey verification: anonymous access, 17-language selector, English fallback, no preselected reason, all eight reasons, blank optional notes, Japanese-to-Vietnamese switching, Skip, literal formula-like note storage, duplicate retries, and a real server rejection followed by successful retry passed. The Sheet was private to its owner; nine expected rows and reason/language/version/browser summaries were verified. Only those recorded test rows were cleared; the summary returned to zero. No GA requests occurred in the survey tests.
- Configured the verified public uninstall URL and rebuilt the extension. Actual uninstall in isolated Chromium and Microsoft Edge profiles opened the Japanese survey with version 1.2.0 and the expected OS/browser labels; Skip passed. These checks used the installed extension service worker and actual removal, not a mocked uninstall URL. Chrome's installed channel did not load the unpacked candidate through the automation harness; its actual-uninstall check remains open.
- Refreshed local checks for feedback setup: 8 unit tests / 164 assertions, extension build/typecheck and all 8 browser integration tests passed. Owner-only setup tests cover unauthorized callers, repeated initialization, preserved data/signing configuration and unexpected headers.

## Security and candidate verification (2026-09-08)
- Reviewed the pending website, extension-link, build, workflow and test changes. Found and fixed a low-severity open redirect in the preview server; regression tests cover double/encoded slashes, backslashes and control characters. No high or critical findings in this bounded diff review.
- Gitleaks 8.30.1 (download checksum verified): no detected credentials in 173 candidate repository files, 23 reachable Git commits, extension build output or website build output. A separate personal-email check found no matches in candidate source files. Reports and private inputs remain ignored local artifacts.
- `bun audit --json` returned no known dependency advisories. This is a point-in-time result, not proof that dependencies are vulnerability-free.
- Rebuilt and validated `chatgpt-audio-controls-v1.2.0.zip`: 61 entries, version 1.2.0, SHA-256 `d03c7ee580c08661b6030e458fe202f0b55ba137d56c064de0737b5b1ef66cf1`. Website and feedback service files remain outside the extension package.
- Explicit `RELEASE_TAG=v1.2.0` validation correctly fails with `A verified production feedback URL is required.` Live acceptance flags remain false. This ZIP is an acceptance candidate, not a publishable final release.
- Security review and tests are local evidence. They do not establish deployed-service security, native Mac acceptance, public store availability, or removal of historical copies outside reachable local Git history.

## In progress
- The v1.2.0 release includes both the extension and the official website. The follow-up branch targets the merged develop history; production configuration and live acceptance remain open.
- The Pages workflow supports an explicit website-only dispatch from reviewed develop or master code. Other branches and pull requests cannot deploy through this job. The extension publishing workflow and acceptance gates are unchanged. Follow docs/WEBSITE-RELEASE.md for initial workflow setup, website verification and the final extension release sequence.
- The public uninstall URL is configured after confirmed Sheet writes. Rebuilt candidate ZIP validation passed: 61 entries, version 1.2.0, SHA-256 `c8ddeee76c41759503af65386f2587f7f25e8ac48ee8561920e523d17cd14da1`. Earlier ZIP hashes predate this configuration. Release validation now passes service configuration and correctly blocks on the remaining acceptance checks.
- Website and survey deployment are verified. Search Console, processed analytics reporting, console listing updates, live playback acceptance, native Mac acceptance, store submission and public v1.2.0 extension availability remain open.

## External requirements
- Follow-up and release PRs still require the repository's reviews and checks; merging earlier PRs does not authorize bypassing protection.
- Native Mac acceptance will be performed by the user's friend on the candidate package.
- Google service deployment URLs/IDs must be real, verified values before release packaging.
- Use only the designated project accounts recorded privately. The connected Drive connector belongs to a different account and must not create extension resources. The previous temporary Apps Script login was removed locally; no extension services were created under it.
- Native owner-authorized initialization replaced the blocked workbook-import approach. File-upload permission is no longer needed for feedback setup.
- `config/acceptance.json` keeps live browser, Mac, feedback and website checks false; publishing validation fails closed until recorded evidence supports them.

## Analytics baseline
Baseline exports, account-level metrics and service ownership records remain private. Store analytics measure listing visitors, not extension usage. Do not combine overlapping extracts or infer cohort churn from event totals. Survey respondents are self-selected; reason distributions do not represent all uninstalls.

## Release boundary
Do not merge the release into master or submit stores until configured survey writes, browser checks, and native Mac acceptance are verified. Report submission acceptance separately from public store availability.
