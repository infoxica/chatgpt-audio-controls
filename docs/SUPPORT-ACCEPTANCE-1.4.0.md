# Optional support and review reminders — 2026-11-01

## Delivered locally

Version remains **1.4.0**. Website headers link to each localized homepage's `#support`; existing `#reviews` links still work. The website, dashboard and popup About include voluntary one-time GitHub Sponsors contributions, review alternatives and unconditional privacy/feature availability. All 33 existing interface languages have the new copy. Suggestion and bug-report actions remain available.

Automatic requests use only device-local aggregate state (`cgpt-ra-engagement-v1`). Review eligibility starts at four qualifying sessions; support at ten. Twenty seconds of advancing wall-time playback, or complete natural playback of a shorter clip, qualifies once. Seeking, buffering, playback speed and recovery do not inflate the count. Existing installations start at zero. Layout/audio reset keys are unchanged.

The extension worker serializes count and display claims; ephemeral document/session deduplication uses browser session storage. The userscript uses the same reducer/controller with local storage and Web Locks. Storage or coordination errors suppress automatic requests. No permissions, telemetry, TTS/voice changes or payment processing were added.

Cards wait for a safe visible pause/end, never move focus, and respect typing, dialogs, dragging and intentional player hiding. Temporary menus/typing/viewport constraints hide an already displayed card until it fits safely again. Playback resumption, navigation and session replacement clear it. One display per 24 hours; initial donation takes priority. A later reminder requires both 14 days and ten additional uses, and can appear only once. X/Escape and Don't ask again retire that request; opening a contribution/review link records only that it was opened. Disabling reminders cancels automatic requests and pending reminders without affecting persistent support sections. Re-enabling preserves handled requests and canceled reminders; previously unseen initial requests can become eligible again.

## Validation

- **47 unit/regression tests passed** across engagement, playback session, commands, layout, audio capture, locales, controls and delivered-userscript parity. Coverage includes short clips, twenty-second boundaries at multiple speeds, seeking, replacement/recovery, storage failures, duplicate events, competing claims, scheduling and dismissal.
- **18 focused browser cases passed**, with one expected skip (the userscript has no React dashboard/popup). Includes website support layouts, all 132 localized guide pages, both distributions' prompt flows, concurrent tabs, typing/hidden-player deferral, disabled reminders, RTL and responsive controls. A subsequent two-case run passed for native dialogs temporarily hiding and restoring the same claimed card. Headless Chromium reports all tabs visible, so the inactive tab is explicitly modeled as hidden in that visibility scenario.
- **12 existing playback/recovery browser regressions passed**, six per distribution: uninterrupted playback, destructive host pause, repeated resume, early pause/rapid toggles, direct URL capture, MediaSource abort/removal and keyboard/volume/download/rejected-resume behavior.
- Actual toolbar popup targets opened via `chrome.action.openPopup()` passed in **installed Edge** and **Chrome for Testing**, in English, German and Arabic, across repeated openings. Width was 365px, without horizontal overflow; donation targets were at least 44px high. These are real popup targets, not ordinary extension tabs.
- Dashboard/popup responsive checks cover 320, 360, 390, 768 and 1366px; website checks also cover 1920px. Light/dark screenshots, RTL direction, translated wrapping, link destinations, focus preservation and reduced-motion-compatible static styling were checked.
- Type checking, extension and userscript builds, the 165-page/33-locale website build, locale completeness, version checks and explicit delivered-userscript content parity passed. The release ZIP passed its 77-entry integrity/manifest/locale validation.
- The existing bundle-size and dependency `use client` warnings remain non-fatal. Windows archive-module loading failed inside the sandbox; the same packaging script succeeded outside it. No source packaging workaround was needed.

## Live destination verification

Each link below reached **infoxica's GitHub Sponsors checkout preview** in signed-in Edge and showed the matching **one-time USD amount**. No payment or tier/account change was made, and no billing screenshot was retained.

- https://github.com/sponsors/infoxica/sponsorships?frequency=one-time&amount=1
- https://github.com/sponsors/infoxica/sponsorships?frequency=one-time&amount=3
- https://github.com/sponsors/infoxica/sponsorships?frequency=one-time&amount=5
- https://github.com/sponsors/infoxica/sponsorships?frequency=one-time&amount=10

The existing Edge listing was verified. The Chrome review route was blocked by the browsing tool, so live verification of that review page remains open; its unchanged extension ID and URL structure are covered locally. Unknown browsers show both stores.

## Local artifacts and screenshots

- `dist-zip/chatgpt-audio-controls-v1.4.0.zip`
- `userscript/chatgpt-audio-controls.user.js`
- `site-dist/` (165 localized pages)
- `build/support-website-light.png`, `build/support-website-dark.png`
- `build/support-options.png`, `build/support-popup.png`
- `build/support-popup-msedge-{en,de,ar}.png`
- `build/support-popup-chromium-{en,de,ar}.png`
- `build/support-extension-mobile.png`, `build/support-userscript-mobile.png`

All UI screenshots use local fixtures or isolated browser profiles; no private chats/account data appear. Website screenshots show the support section. Popup captures show the actual scrolling About surface.

Reproduce real toolbar checks with `node scripts/verify-support-popup.mjs msedge` or `node scripts/verify-support-popup.mjs chromium`, after building. Playwright browsers must be installed/available to that process.

## Still separate from implementation

Stock Chrome 156 refused command-line unpacked loading and did not expose the attempted unpacked-extension CDP method; Chrome for Testing passed instead. Stock Chrome and real Edge Android acceptance remain open. Translated copy has structural/completeness validation, not a new professional native-speaker acceptance pass. Broader release acceptance flags remain unchanged.

No commit, push, tag, deployment, store submission or public publication was performed. Local checks do not mark those steps complete. Previous release-preparation hashes describe older artifacts; use the current local files above.

## About readability and media follow-up

The popup About order is now introduction, donation, review, then privacy and remaining links. Onboarding stays on the Controls tab. Support copy uses regular weight with 14px popup body text and 19px headings; amount buttons have 14px/18px block margins and retain 44px touch targets. Shared dashboard support typography is also larger and regular weight.

Actual Edge/Chrome for Testing popups passed English/German/Arabic checks again. Responsive dashboard/popup checks passed at 320–1366px. The 1920×1080 website walkthrough played successfully (22.88 seconds). README now links the MP4 through its poster and includes the dock, corner, original and refreshed settings screenshots. All screenshots use isolated local pages, without personal data. Website and extension builds, version checks and userscript parity passed.

Additional local previews: `build/about-refined.png`, `build/website-refined-home.png`, `build/website-refined-demo.png`, `build/website-refined-support.png`, `build/website-refined-full.png`. No deployment or commit was performed.

## Screenshot viewer and separate cards

Website reference screenshots now open in a viewport-sized native dialog instead of navigating to their source. All three screenshot figures, keyboard activation/focus return, Tab containment, Escape, close-button and backdrop dismissal passed at 1920px, 360px and Arabic RTL 390px. Close labels cover all 33 locales. Store badges and video behavior are unchanged.

Donation/review cards are separate and horizontal on wide website/dashboard views, stacking on mobile and in the popup. Divider-to-card spacing is explicit. Five website responsive support cases, the dashboard/popup width/language test and actual Edge toolbar popups in English/German/Arabic passed. Type checking, website/extension builds and userscript parity passed. Local screenshots: `build/image-viewer-1920.png`, `build/support-cards-1920.png` (mobile variants also available). No publishing performed.

## Horizontal website cards and spacing follow-up

Each website support card is now a full-width horizontal row: copy beside actions, with an internal divider. Both rows share column widths, icon/title spacing and 32px desktop padding; the cards have a 24px gap and 32px clearance from the preceding section divider. Narrow screens stack each card's contents with 24px padding and separation. The extension cards are unchanged by this website refinement.

All nine selected website checks passed, including measured padding/gaps, screenshot viewer behavior, German at 768px, Arabic at 390px and 1920px desktop. All 165 localized pages rebuilt successfully. Current visual: `build/support-cards-1920.png`. Local only; not deployed.

## Horizontal extension settings cards

The dashboard now matches the website's wide support rows, with copy beside actions, a logical divider, 24px card padding and 24px between cards. A container query stacks the contents when the settings area is too narrow, accounting for the sidebar as well as viewport width. Popup cards remain stacked.

The existing responsive dashboard/popup case passed across 320, 360, 390, 768 and 1366px in English, German and Arabic. Actual Edge popup checks passed for those languages with no overflow and 44px amount buttons. Type checking/build and archive validation passed; the isolated 1920×1080 settings screenshot was refreshed for the website/README. Preview: `build/support-options.png`. Not committed or published.
