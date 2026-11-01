# UI localization audit — 2026-11-01

Version remains **1.4.0**. All 19 requested languages already existed among 33 UI catalogs. **No locales were added or duplicated.** Existing working translations were retained; changes address missing labels, incorrect audio terminology, locale resolution, and extension-owned RTL accessibility.

## Requested coverage

| Priority | Language | Chrome/Edge catalog code | Internal UI code | Status |
| --- | --- | --- | --- | --- |
| Fallback | English | en | en | Existing; fallback retained |
| P1 | Brazilian Portuguese | pt_BR | pt-BR | Existing |
| P1 | Japanese | ja | ja | Existing |
| P1 | Spanish | es | es | Existing |
| P1 | German | de | de | Existing |
| P1 | Vietnamese | vi | vi | Existing |
| P1 | French | fr | fr | Existing |
| P1 | Hindi | hi | hi | Existing |
| P1 | Simplified Chinese | zh_CN | zh-CN | Existing |
| P2 | Traditional Chinese | zh_TW | zh-TW | Existing |
| P2 | Russian | ru | ru | Existing |
| P2 | Polish | pl | pl | Existing |
| P2 | Turkish | tr | tr | Existing |
| P2 | Korean | ko | ko | Existing |
| P2 | Persian | fa | fa | Existing; RTL |
| P2 | Arabic | ar | ar | Existing; RTL |
| P2 | Italian | it | it | Existing |
| P3 | Swedish | sv | sv | Existing |
| P3 | Romanian | ro | ro | Existing |

The other 14 existing UI locales remain available: Bengali `bn`, Marathi `mr`, Telugu `te`, Tamil `ta`, Hebrew `he`, Thai `th`, European Portuguese `pt-PT` (catalog `pt_PT`), Indonesian `id`, Hungarian `hu`, Czech `cs`, Ukrainian `uk`, Catalan `ca`, Greek `el`, and Norwegian Bokmål `nb` (catalog `no`).

## Architecture and findings

The shared TypeScript/JSON catalogs serve the player, popup, dashboard, onboarding, help, notifications, and generated userscript. Supplemental release, feature, support, and polish catalogs already contain all requested languages. The manifest uses Chrome/Edge `_locales/<code>/messages.json` conventions and `default_locale: en` for names, descriptions, and browser commands.

The audit found no missing catalog keys or placeholder mismatches. It did find:

- Browser/manual locale matching did not consistently accept underscore codes or case variants. Matching now accepts those forms, regional tags, Chinese scripts, and existing Norwegian aliases. An explicit Chinese script takes precedence over its region. Manual choices continue to override browser preferences; unsupported browser languages fall back through preferred languages to English.
- The gesture guide hard-coded “Release” and abbreviated seconds. The label is now translated, and timing descriptions use the existing localized seconds unit.
- The seek slider lacked an accessible name. “Playback position” is translated in all 33 catalogs. Initial English player/help markup was redundant with the synchronous localization pass and has been removed.
- Polish, Swedish, and Romanian contained incorrect literal translations of scrubbing, seeking, pill controls, right-side placement, and shortcuts, plus untranslated fragments. Those affected entries were corrected, including onboarding and layout descriptions. Existing brand names and shortcut tokens are preserved. Portuguese/Spanish backward-seek tooltips no longer describe forward seeking.
- Shortcut sequences now remain LTR as complete groups inside RTL options/popup pages. Gesture-list indentation uses logical padding. Recovery/status messages, download-ready toasts, and the userscript dialog declare their own language/direction. The userscript's Auto language option now uses the existing localized label. Native ChatGPT page direction and physical docking positions are unchanged.

This work does not change audio engines, voice availability, speech-language detection, playback actions, extension permissions, storage keys, or the release version.

## Files changed in this audit

- Locale selection/direction: `src/shared/i18n/core.ts`, `direction.ts`.
- Translation corrections/additions: `src/shared/i18n/polish.json`, `locales/audience.json`, `audience-features.json`, `audience-release.json`, `locales/pt-BR.ts`, `locales/es.ts`.
- UI/accessibility wiring: `src/options/components/ShortcutsGuide.tsx`, `src/shared/release-ui.css`, `src/content/content.ts`, `ready-toast.ts`, `standalone-settings.ts`.
- Validation: `tests/locales.test.mjs`, `tests/browser/extension.pw.mjs`.
- Generated outputs: `_locales` catalogs and `docs/STORE-LISTINGS.md`, `userscript/chatgpt-audio-controls.user.js`, extension bundles/ZIP, website pages, feedback locale JSON, and localized Edge listing inputs. Generated files retain their existing generation paths; no parallel localization system was introduced.
- Release records: this audit and linked handoff/status/acceptance notes.

## Validation and artifacts

| Check | Result |
| --- | --- |
| Application TypeScript checking and Vite/content builds | Passed |
| Full Bun unit/integration suite | 48 passed; 28,367 assertions |
| Final focused locale/layout/command/generated-userscript checks | 24 passed; 28,215 assertions |
| Final browser regression run | 14 passed: all 19 requested locales in both player distributions; popup/options/onboarding/help; Arabic/Persian recovery; responsive RTL; toast timing; destructive pause/resume; keyboard/volume; exact-source download |
| Follow-up after localizing the userscript Auto option | 3 passed: Arabic/Persian recovery/dialog tests in both distributions and standalone settings/save-failure checks |
| Catalog completeness | Exact key paths, nonempty strings and preserved placeholders verified across all 33 UI catalogs; all manifest messages and command descriptions validated |
| Shared Chrome/Edge MV3 artifact | Rebuilt and validated: 77 ZIP entries, version 1.4.0, English default locale |
| Generated userscript | Exact shared bundle and CSS parity passed |
| Website and companion resources | 165 static pages in 33 locales rebuilt; feedback JSON and 33 Edge listing inputs regenerated |
| Version checks and whitespace checks | Passed |

Logs are retained under `build/localization-*.log`; `build/localization-1.4.0-evidence.json` records current artifact hashes and changed source hashes. The browser checks use isolated Chromium fixtures. Popup/options pages were exercised at 360px across all 19 languages, with existing responsive coverage at 320/360/390/768/1280px and Arabic mobile player/popover checks. Arabic/Persian screenshots are `build/localization-ar-shortcuts.png` and `build/localization-fa-shortcuts.png`. Package validation, UI tests, and generated-content parity are local evidence; they do not establish actual Chrome/Edge toolbar, Android, store, or deployment acceptance.

The initial sandbox runs could not launch Chromium or connect to the local Worker test server. The approved isolated runs outside that sandbox passed. The broader browser run also exposed a test-clock leak: the toast test left the persistent context clock paused for subsequent scenarios. Resuming that clock during cleanup restored the following tests; production toast timing was unchanged.

`bun run package` completed compilation but its legacy PowerShell `Compress-Archive` step could not load the archive module in this environment. The final ZIP was created from the same `dist/` using .NET `ZipFile.CreateFromDirectory`, then passed package validation. Existing bundle-size and third-party `use client` build advisories remain non-fatal. No packaging dependencies or production permissions were changed.

The earlier `build/release-preparation-1.4.0/` handoff is a historical snapshot from before these localization corrections. Its hashes and whole-release acceptance results must not be attributed to the updated files. Use the rebuilt `dist/`, `dist-zip/chatgpt-audio-controls-v1.4.0.zip`, and generated userscript for this revision. Website/feedback/store resources were regenerated locally; publishing and a refreshed whole-release handoff remain separate.
