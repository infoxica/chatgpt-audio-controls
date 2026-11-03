# v1.4.0 acceptance continuation — 2026-11-02

Version remains **1.4.0**. This record supersedes earlier deployment and candidate-validation status; it does not substitute fixture coverage for live-device acceptance.

## Completed external work

- PR #24 was merged into `develop` at `a3ae825ae8115b82cddf833c5e69c5587387e1f7`. Its tree matches the previously tested `71b1578` candidate.
- The official Pages workflow [41343042645](https://github.com/infoxica/chatgpt-audio-controls/actions/runs/41343042645) successfully built and deployed that commit. The [public website](https://infoxica.github.io/chatgpt-audio-controls/) now includes the updated media, image viewer and separate donation/review sections.
- Live HTTP/browser inspection reached all 33 localized homepages, found their four expected one-time Sponsors links, and checked narrow layouts. All three viewer images decoded at 1920×1080; the 22.88-second video decoded at 1920×1080 and advanced after explicit play. No page errors or pre-consent GA/GTM requests were observed.
- A subsequent direction audit found missing document-level RTL on Arabic, Persian and Hebrew pages. The source correction below is **not yet deployed**; `websiteDeployment` remains false until the corrected revision is deployed and verified.
- The previously verified production feedback deployment remains accepted. No additional production feedback record was submitted during this continuation.

Public-only evidence: [deployed website support section](evidence/1.4.0-acceptance-2026-11-02/website-support.png) and [actual Edge toolbar About popup](evidence/1.4.0-acceptance-2026-11-02/edge-toolbar-about.png). Neither image contains private conversation content or browser tabs.

## Live Edge evidence and limits

- Reloaded the installed unpacked 1.4.0 candidate in Windows Edge; the older store-installed 1.3.0 copy remained disabled.
- In the explicitly authorized existing ChatGPT tab, native Read Aloud started successfully. The download-ready notice appeared while playback was continuing, then disappeared. Pausing at approximately 18.79 seconds returned ChatGPT's native action to “Read aloud”; a backward seek moved to 8.79 seconds and remained paused. A forward seek and explicit resume continued to natural completion at 50.68 seconds.
- No private response text, conversation URL, audio or screenshot was saved or published. The page still reported a response-loading error, so this does not establish the live email-card acceptance case. Private audio was not downloaded.
- Live keyboard help displayed actual assigned/unassigned bindings. Escape did not close a panel opened directly in the wide player; this exposed the second fix below.
- Reloaded the rebuilt candidate and opened the **actual Edge toolbar popup**. Controls and About rendered normally; About showed header, donation, review and then privacy content, with reachable scrollable content and the expected support destinations. This was an English pass, not a new RTL/long-label pass.
- Chrome's currently inspected profile did not show the candidate in its extension menu. Automatic Computer Use safety review then stopped browser interaction because it could not reliably determine the current Chrome URL. No later live-browser or userscript-manager result is claimed.
- Tampermonkey 5.5.1 was present in Edge, but the delivered userscript was not installed/tested through that manager in this continuation. No Android device or Mac was available through the exposed tools.

## Acceptance defects corrected

1. Generated website documents now set `dir` from the existing centralized language-direction helper, including all guide routes. HTTP coverage checks all 165 pages; browser coverage checks desktop RTL support-card geometry and the image viewer.
2. Escape now closes directly opened wide-player help, volume and speed popovers as well as compact overflow, and restores focus to a visible trigger. The generated userscript contains the same fix. Browser regressions cover both distributions.

## Validation and rollout boundary

- Application type checking, extension build, userscript generation, version checks and ZIP packaging passed.
- **60 unit/integration tests passed**, 29,207 assertions, including playback recovery, locale completeness, local feedback persistence and exact delivered-userscript bundle/CSS parity.
- **Seven HTTP tests passed**; **18 website browser tests passed**.
- **97 browser scenarios passed across the full run and targeted rerun**, with one expected userscript-only skip. The initial full run had 95 passes and two failures in the newly added Escape tests: their setup left the player collapsed. Explicitly starting playback at a wide viewport fixed the test setup; both cases then passed without changing their dismissal/focus assertions. This is combined evidence, not a claim that the original full run was green.
- Rebuilt ZIP: `dist-zip/chatgpt-audio-controls-v1.4.0.zip`, SHA-256 `00BF37C606C8175C0B63959DEA76A3B7C05A945DE40E507694E297B83FBCDEA7`.
- The archive validator passed: 77 entries, version 1.4.0. The tagged publication check correctly fails because required acceptance is incomplete.

Full final-candidate Chrome/Edge acceptance, actual userscript-manager testing, real Edge Android testing, native Mac testing (or a new explicit owner waiver), and translation review remain open. All corresponding acceptance flags remain unchanged. Store submission, production-branch promotion, release tag and public extension availability have **not** occurred.

The fixes must merge through the normal `feature/* → develop` review path before website redeployment. Repository policy also requires a genuine final version-bump commit before opening a PR to `master`; the current development tip does not satisfy that rule. Do not manufacture a no-op bump, increment beyond the requested 1.4.0, bypass review, or waive uncompleted platform checks.
