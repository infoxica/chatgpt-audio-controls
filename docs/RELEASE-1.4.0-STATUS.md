# v1.4.0 release candidate

## Acceptance continuation — 2026-11-02

[Current evidence and blockers](RELEASE-ACCEPTANCE-2026-11-02.md) supersede the historical deployment/validation status below. PR #24 is merged and the website was deployed. Two acceptance defects are corrected locally: website document direction and Escape dismissal/focus in wide player popovers. Version remains 1.4.0; public extension rollout is still blocked by incomplete final-platform acceptance and the repository's production-promotion requirements.

## Optional support and reminders — 2026-11-01

Implemented localized GitHub Sponsors sections and private usage-based review/support requests in the extension and userscript. [Support acceptance notes](SUPPORT-ACCEPTANCE-1.4.0.md) record tests, verified one-time checkout amounts, screenshots and remaining live acceptance. The package and website are rebuilt locally at 1.4.0. Historical hashes below do not describe these updated artifacts; publication and acceptance flags remain unchanged.

## Subsequent localization audit — 2026-11-01

All 19 requested languages already existed among 33 catalogs. The [localization audit](LOCALIZATION-AUDIT-1.4.0.md) records corrected UI labels/audio terminology, locale aliases, and RTL accessibility, with rebuilt extension/userscript artifacts and current test evidence. The preparation results and hashes below are retained as historical evidence for the earlier snapshot, not the newly modified source. Version and live acceptance flags are unchanged.

## Release preparation — 2026-11-01

Prepared the current uncommitted `feature/movable-controls-1.4.0` checkout as a local **1.4.0 candidate**. [Release notes](RELEASE-NOTES-1.4.0.md) and [the handoff](RELEASE-HANDOFF-1.4.0.md) are ready. The handoff directory `build/release-preparation-1.4.0/` contains five hashed artifacts (extension, userscript, website, production-configured feedback dry run, store inputs), a source fingerprint and the validation logs.

- Frozen dependency installation, application and feedback type checks, extension/userscript packaging, 165-page website build, local and production-configured feedback dry runs, 33-locale listing generation, version validation and 77-entry archive validation passed.
- **43 unit/integration tests passed, with 3,190 assertions; six HTTP tests passed.**
- **All 61 browser scenarios were verified across the full run and targeted reruns**: 50 extension/userscript and 11 website/feedback cases. The initial full run had 57 passes and four failures. Both five-second toast cases passed after freezing the test clock; the 132-page guide audit passed with a two-minute test budget; the language-grid case passed after re-entering its hover menu following viewport resize. Assertions were preserved. Logs retain the initial failures and successful reruns.
- Fixed the CI build/test order: exact delivered-userscript parity now runs after the build, so a fresh checkout has the required generated files. Validated workflow YAML and ordering locally. No exact-commit remote CI run is claimed; local Bun is 1.4.3 and CI pins 1.3.9.
- `RELEASE_TAG=v1.4.0 bun run release:check` **correctly remains blocked** by incomplete acceptance. All seven acceptance flags remain false. Live platform checks, translation review, refreshed provider-sized screenshots and verified website/feedback deployment are still required.

No commit, push, tag, deployment, store submission or signing enrollment was performed. Older sections below are historical evidence; this preparation record supersedes their current-candidate validation counts.

## Left sidebar alignment — 2026-10-31

Live Edge DOM inspection confirmed a roughly 52px visible app rail with a hidden 288px navigation panel that still reports layout bounds. Obstacles now exclude transparent ancestors and use ancestor-clipped bounds; the app sidebar container is recognized by its current ID as well as its test ID. Rendering and drag destinations share these bounds. Saved preferences and preview presentation are unchanged.

The regression fixture reproduced the old displacement (332px instead of 60px). Both distributions now pass all three left presets in both pill orders with collapsed, clipped, expanded, re-collapsed and fully hidden sidebars; cancellation preserves preferences. Fourteen neighboring browser cases also passed, alongside 11 geometry/content-parity tests, type checking, version/build and 77-entry ZIP validation. The rebuilt 1.4.0 artifacts remain local; the updated build has not received a new live-browser or Android acceptance pass.

## Theme selector refinement — 2026-10-31

Popup and dashboard now share a compact sun/moon/monitor selector in Light, Dark, System order. Selected styling, localized tooltips/accessibility labels, native radio-keyboard navigation and 44px coarse-pointer targets are included. Theme persistence, cross-page synchronization and system-following behavior are unchanged. Type checking/package build and three relevant settings/theme/responsive browser cases passed; this does not constitute a new actual-toolbar acceptance pass.

## Dock seam refinement — 2026-10-31

The expanded dock now fills the empty spaces outside the composer's rounded top corners, producing a continuous surface. The extension-owned, pointer-transparent fill follows the native corner dimensions and background; it never paints inside the native composer silhouette or changes its border, radius or shadow. It disappears on collapse/fallback/hide, moves with dragging, and is included in destination previews. Preferences and version remain unchanged.

Rebuilt both distributions and the ZIP. Type checking/build, 11 geometry/parity tests, 14 relevant browser cases and ZIP validation passed. Pixel checks cover light/dark at 320, 390, 768 and 1366px; input access, unchanged native styles, collapse, dragging, menus and fallback were checked in fixtures. No new live-browser acceptance or publication is claimed. Artifact hashes below reflect this rebuild.

Prepared locally on 2026-10-29; player/settings polish rebuilt on 2026-10-30. This document describes the candidate in this checkout, not the version available in a browser store.

## Delivered changes

- Compact 48px native-colored pills and an icon-only circle. Moving beyond 8 CSS pixels starts group dragging. The shared preset catalog contains original placement, four corner L layouts, two vertical side-center layouts and composer docking. Each edge layout supports either pill order; original/dock contents can also swap.
- Fitting destinations use exact resulting shapes. The circle's destination drives both hit testing and magnetic attraction: a 24px capture range with at most 12px pull. Dedicated pill grips expose only the other content slot. Escape, pointer cancellation, viewport changes and invalid drops restore without saving.
- Transform-only travel settles drops/swaps in 220ms, reset in 280ms, and collapse/expand in 200ms. New interactions interrupt transitions; reduced motion removes magnetic movement and animated travel. Icons are never stretched by orientation changes.
- Composer docking is flush above the painted input surface, matches its width/color without overriding native borders, corner radii or shadows. Desktop uses one row; narrow screens use two rows with secondary controls behind a compact button. Below 768px only composer docking is offered. Its collapsed 32×28px branded tab clears the native corner radius by 6px and uses the right side for LTR and left for RTL. Visual viewport, safe areas, composer resizing and navigation bounds determine fitting; temporary fallback never overwrites preferences.
- Keyboard-accessible preset, pill-order and reset settings. Version-2 desktop/narrow preferences retain the storage key `cgpt-ra-layout-v1` for migration in extension local storage or userscript localStorage. Compatible corner/side layouts migrate; unsupported desktop combinations become original, narrow profiles become composer. Completed saves are acknowledged; failures show an error.
- Responsive popup/dashboard, wrapping translated labels, 44 CSS-pixel player hit areas and tap-operated, bounded popovers.
- Thirty-three interface catalogs: existing 17 plus Bengali, Marathi, Telugu, Tamil, Arabic, Persian, Hebrew, Polish, Hungarian, Swedish, Czech, Ukrainian, Catalan, Greek, Romanian and Norwegian Bokmål. New translations remain subject to native-speaker review. Arabic, Persian and Hebrew use RTL only within owned interfaces. Timestamps, shortcut combinations and horizontal progress remain LTR; vertical progress runs bottom-to-top. Physical dock coordinates do not mirror.
- Synchronized `notifyDownloadReady`, default on. Full retained-payload readiness triggers one polite success toast per session, with Download and dismissal. The five-second timer pauses for pointer hover and keyboard focus. Replacement/navigation/disposal clears it; rejected or aborted retention does not notify. Downloads reuse retained bytes.
- Fifteen localized browser commands. Only the existing visibility command has a suggested binding. Commands and page shortcuts share player actions, honor the shortcut preference, and route to the active tab's ChatGPT bridge. Help displays actual assigned bindings. Command API absence is supported; assignment is desktop-only.
- The standalone userscript is generated from the same player, localization and CSS source, with a local settings dialog. The extension retains its popup, dashboard and browser command integration.
- Generated website (165 pages), feedback resources and 33 interface-locale store-copy inputs. ChatGPT still supplies audio language and voices.
- Open settings sections replace card shells; theme selection precedes the website link. Support actions cover suggestions, bugs and both stores. Feedback links validate optional intent while retaining language/theme. Per-command edit actions identify the command and open the supported browser shortcuts page; returning refreshes assigned bindings.
- L-layout seek widths use the free span beside the composer; native action rectangles reserve 8px clearance. A single resolver supplies rendering, previews and magnetic targets. Composer styling is sampled only for owned surfaces, with no native border/radius/shadow overrides.
- Website setup is explained immediately, copy uses the actual preset catalog, and refreshed player/dashboard screenshots are prepared. Approved campaign values are retained only after analytics consent; no extension telemetry was added. See the dated audience and signing assessments.

### Prior full validation record (2026-10-30)

The October 30 candidate passed 43 unit/integration tests (3,190 assertions), 46 extension/userscript browser tests, 11 website/feedback browser tests and six HTTP tests. Type checks, extension/userscript packaging, the 165-page website build, feedback dry-run, 33-locale listing generation, source-version checks and 77-entry ZIP validation passed. Exact generated-userscript content parity passed after that rebuild. `git diff --check` passed.

Actual Chrome/Edge toolbar checks and a Chrome Arabic popup check passed. Live Edge composer style comparison and native model-menu hit testing passed. Full live Read Aloud/email acceptance remains open because the selected conversation failed to load its responses after refresh. Real Edge Android, userscript-manager/native Mac acceptance and new translation review remain pending. The Edge test preset remains Composer dock after browser security blocked settings access during restoration; its prior Automatic preset needs manual restoration.

See [current acceptance evidence](ACCEPTANCE-1.4.0.md), [audience findings](AUDIENCE-2026-10-30.md), [signing assessment](PACKAGE-SIGNING-ASSESSMENT.md), and [screenshot provenance](../assets/store/screenshots/README-v1.4.0.md). Older records below retain their original counts. Local validation is separate from deployment, store submission and public availability; none of those production actions or signing enrollment occurred.

Latest artifact SHA-256 values:

| Artifact | SHA-256 |
| --- | --- |
| Extension ZIP (692,364 bytes) | `2fb3a6ebc2f16637e241060727f4698d50552034f455f0387368f3f310618dfa` |
| Generated userscript (706,532 bytes) | `1dc413c6d72b56be3c822009ce3f8d89775eb76ec4968b978383a7400b06dab4` |

## Candidate artifacts

| Artifact | Local path |
| --- | --- |
| Unpacked extension | `dist/` |
| Extension ZIP | `dist-zip/chatgpt-audio-controls-v1.4.0.zip` |
| Standalone userscript | `userscript/chatgpt-audio-controls.user.js` |
| Website | `site-dist/` |
| Feedback worker dry-run bundle | `build/feedback-worker/` |
| Legacy feedback transition files | `build/feedback/` |
| Store descriptions and logos | `build/edge-store-listings/` |
| Localized listing source | `docs/STORE-LISTINGS.md` |
| Browser fixture screenshots | `build/browser-results/` |
| Live Edge visual checks (desktop and 320 CSS pixels) | `build/visual-acceptance/` |

Store providers may support fewer listing locales than the interface. Apply the prepared copy only where the provider offers the locale, and record any omissions. Generated files do not update provider metadata.

## Validation and publication boundaries

Automated verification uses local Chromium fixtures. It covers both delivered player distributions, layout geometry and persistence, drag cancellation, tap popovers, RTL scope, viewport widths, notification readiness, byte-exact downloads, commands, settings, source recovery, static routes and feedback behavior. A separate live Edge visual check informed composer-surface detection; it does not close full platform acceptance or establish Android support.

Run these from the repository root (historical verification sections below retain their original counts; the latest audience/polish record supersedes them):

```text
bun run scripts/build-store-copy.ts
bun run scripts/build-feedback-copy.ts
bun run build
bun run typecheck:feedback
bun test
bun run build:site
bun run test:site-http
bunx playwright test
bun run build:feedback
bun run scripts/build-feedback.ts
bun run scripts/build-edge-listings.ts
bun run version:check
bun run release:check
bun run scripts/package-zip.ts
python scripts/validate-package.py dist-zip/chatgpt-audio-controls-v1.4.0.zip
```

An untagged release check checks source consistency only. The tagged v1.4.0 publication gate must remain blocked while `config/acceptance.json` contains pending checks. The previous version's Mac waiver is not carried forward.

| Stage | Status |
| --- | --- |
| Source, catalog, extension and userscript builds | Prepared locally |
| Automated tests | See final verification record below |
| Real Edge desktop / live ChatGPT | Visual composer check performed; full playback/platform acceptance pending |
| Real Edge Android, keyboard, rotation and browser chrome | Pending; mobile support is not yet release-accepted |
| Real Chrome toolbar popup | Verified; full playback/platform acceptance pending |
| Userscript manager / native Mac | Pending |
| New translation native-speaker review | Not independently verified |
| Website and feedback deployment | Not performed |
| Store submission and certification | Not performed |
| Public availability | Not verified for v1.4.0 |

See [the acceptance checklist](ACCEPTANCE-1.4.0.md). No production services, store metadata, release tags or public downloads were updated by preparing this candidate.

The build emits an advisory about the shared UI bundle exceeding 500 kB before compression. It includes all interface catalogs; this is not a typecheck/build failure.

## Platform references

- [Chromium Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands): many commands, at most four suggested bindings; omitted suggestions remain unassigned.
- [Microsoft Edge API support](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support): `commands` is listed for Windows, Linux and Mac, not Android (checked 2026-10-29).

## Earlier candidate verification record (2026-10-29)

Validated on Windows with Bun 1.4.3 and Playwright Chromium:

- TypeScript application and feedback-worker checks passed.
- 34 unit/integration tests passed, including destructive-pause recovery and seek-anchor regressions executed against both distributions. Catalog assertions confirm descriptions for all 15 commands in all 24 locales. An additional delivered-content test rebuilds the shared userscript bundle and compares its actual contents and CSS, rather than checking file existence.
- 43 browser tests passed in the complete run. After the live composer-surface correction and compact fallback refinement, all 16 affected browser cases passed in both distributions; the final keyboard-after-cancellation correction also passed both distribution cases. These cover exact preview geometry, 24px capture boundaries, click/drag separation, cancellation, single-slot swapping, native corner restoration, two-row phone docking, missing-composer expansion, RTL popovers, reduced motion and 320/360/390/768/desktop widths. Seven geometry/migration/catalog/content-parity tests passed in the final run (454 assertions).
- Live Edge visual checks covered the signed-in home and conversation composers, the one-row desktop dock, the 320 CSS-pixel two-row dock and bounded help. Temporary viewport overrides and desktop placement changes were restored after testing. ChatGPT's selected conversation responses did not load successfully, so these visual checks do not establish native Read Aloud/playback acceptance.
- Six website HTTP tests passed; 120 localized pages, their Markdown resources, sitemap and consent behavior were validated.
- The feedback worker dry-run build passed using local bindings; no upload occurred.
- Version checks passed at 1.4.0. The tagged publication gate was explicitly checked and correctly refused publication because live acceptance remains pending.
- Extension ZIP validation passed: 68 entries, version 1.4.0. `git diff --check` passed.

Final artifact SHA-256 values are recorded in `build/release-1.4.0-evidence.json`. Fixture screenshots and live Edge visual evidence are labeled separately; neither establishes Android acceptance.

## Player/settings polish verification (2026-10-30)

- Retained version 1.4.0 and the existing layout schema/storage keys. Added a 32×28 visual dock tab within a 44×44 hit area, collapsed branding, adaptive seek geometry, translucent drag previews, native menu layering and sideways volume placement. Response headers and embedded editors are excluded from application obstacles/composer candidates. Unavailable docking stays compact rather than switching to original placement.
- Stabilized actual desktop toolbar sizing at 360 CSS pixels while retaining fluid full-tab/mobile surfaces. Shared settings use explicit popup/dashboard presentation, styled switches, danger resets and localized support cards. Controlled layout inputs update immediately; ordered storage writes preserve rapid changes and failures remain reported.
- Application typecheck and extension/userscript builds passed. All 37 unit/integration tests passed (1,179 assertions), including 24-locale coverage, playback recovery and exact delivered userscript-content parity.
- The full browser run passed 50 of 51 tests. Its remaining settings-switch failure was corrected; all three affected settings/popup cases then passed, including an explicit persisted pill-order assertion. Both distributions passed email-header docking, menu layering, volume bounds, five-second toast/focus pause, magnetic dragging, responsive geometry and playback regressions.
- Actual Edge and Chrome toolbar popups were opened and visually checked through their browser toolbar buttons. Both rendered normally; Chrome About showed the suggestion/review card with the Chrome destination. These were real popup windows, not extension-tab substitutes. Screenshot: `build/visual-acceptance/polish/chrome-popup.png`.
- Live Edge confirmed the painted composer uses an inset shadow ring and native model menus remain clickable above the dock. The final ring/seam refinement was subsequently checked in local fixtures; a final live visual recheck was interrupted by user interaction. The selected live conversation still reported that its responses could not load, so the email-header/playback case is fixture-verified only.
- Source-version/release consistency and the rebuilt 68-entry ZIP passed at 1.4.0. The bundle-size advisory remains. Android hardware, full desktop playback acceptance, native-speaker review, store submission, deployment and public availability remain pending.
- Final dock-border/logo and standalone reset styling adjustments were rebuilt and packaged. All six affected dock/header/compact-fallback browser checks passed across both distributions, and delivered userscript-content parity passed again.
