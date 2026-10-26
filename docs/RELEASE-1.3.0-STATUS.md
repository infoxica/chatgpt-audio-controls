# v1.3.0 delivery status

## Release decision

Implementation and acceptance gates are complete; production PR review and publication remain pending. Previous v1.2.0 results do not count for this release. **Native Mac testing waived for v1.3.0** by the owner; it has not passed native Mac testing.

## Implemented

- Session-specific retained audio, extension-owned recovery after destructive host pause, stale-result cancellation, preserved position/speed/volume, progress-based playing state and recoverable errors. Native Read Aloud starts sessions; duplicate buttons and their setting are removed in the extension and standalone userscript.
- New semantic composer selectors, separate rounded capsules, measured side placement and narrow-screen fallback. Help beside Dashboard; localized feedback links in About and options.
- Hosted 17-language feedback for installed users and uninstall, same-origin validation, server-side Turnstile, D1 persistence and idempotency. Owner-authenticated summary/export CLI. No historical import, automatic diagnostics or automatic feedback deletion.
- Shared extension/userscript behavioral fixtures, destructive-pause regression, delayed retention/stale completion tests, Worker/D1 and form retry tests. These are controlled fixtures, not installed Chrome/Edge/Tampermonkey acceptance.

## Deployed service evidence — 26 October 2026

- Owner confirmed Cloudflare account **Anand** before resources were created. Dedicated staging and production Workers, D1 databases and managed Turnstile widgets are configured.
- Staging: `https://chatgpt-audio-feedback-staging.anand224patel.workers.dev/feedback`, Worker version `f57b9132-cefe-4fba-92f4-30e9ab992fbb`.
- Production: `https://chatgpt-audio-feedback.anand224patel.workers.dev/feedback`, Worker version `19a0d021-c90f-4287-8d23-9dd589af11f0`.
- Real Edge browser submissions passed Turnstile and showed confirmation in both environments. Remote D1 queries verified the expected rows. The one identified synthetic production row was removed; production count returned to zero. Staging retains synthetic acceptance data. Final deployments additionally update localized installed-user labels and privacy text; no storage semantics changed.
- Existing Google Apps Script endpoint updated in place to version 3. Live Japanese check showed a localized link carrying the old version and uninstall context to the Worker. The transition has no spreadsheet scopes or write path.

## Remaining release gates

### Follow-up implementation and live evidence — 26 October 2026

- Live Edge revealed that the current native Read Aloud uses a detached AUDIO element with a MediaSource URL. Added session-bound streaming HTTP capture, byte matching for concurrent requests, bounded retention through host cancellation, and matching fixtures for both distributions. Live Edge subsequently resumed three times, advanced from the saved position, retained the complete 1:38 duration, and supported paused seeking and speed changes. This is partial Edge evidence, not the complete acceptance matrix.
- Feedback now uses `https://chatgpt-audio-controls.infoxica.com/feedback`. The active `infoxica.com` zone was verified in the approved Anand account. Production Turnstile allows both the custom hostname and the original workers.dev hostname. A real submission from the custom domain passed Turnstile and persisted to D1; only that exact synthetic test row was removed afterward.
- Final staging Worker version: `e811c11d-0bf5-4efc-9b12-e3a09657da8d`; production: `03a8ea63-52e6-4971-b512-a0d964bdb27b`. Apps Script transition updated in place to version 4 with the custom address and friendly localized copy.
- All 17 feedback languages use reader-focused copy. Technical privacy information remains available in an expandable disclosure. Feedback, popup and dashboard offer System / Light / Dark; System reacts to changes, overrides persist, and extension pages synchronize their shared preference. Theme changes preserve form answers.
- Updated local verification: 21 unit tests / 228 assertions, 25 browser tests, six website HTTP tests, extension/Worker typechecks, builds and ZIP validation. The privacy disclosure received an additional four-test feedback pass. PR #20 CI before this follow-up passed; the updated revision requires fresh CI.
- Local candidate ZIP SHA-256: `a4de1ba4d7dcc251c44978d3fd5e8d1ea34c6d14df1785bf240c21f8000e4938`. This replaces the earlier local candidate hash. Store assets must use one verified archive consistently.

Feedback appearance follow-up (26 October): the form now matches the landing page's neutral light/dark palette and rounded language/theme icon controls. Localized accessible names, tooltips, native keyboard selection and System / Light / Dark preferences remain available. Worker typecheck and all four feedback browser tests passed, including mobile layout, focus order, icon states and answer retention. Live Edge verified the deployed controls and keyboard theme selection. Staging version: `00154b90-d71e-4cd2-b923-7cfb049a5ac4`; production version: `73729aa6-8519-4a8e-ad69-b443bc07c404`. No schema or submission changes. CI for the preceding revision `5f4f889` completed successfully (run `40313065122`); this appearance revision requires its own CI.

Feedback copy and README follow-up (26 October): simplified the shared privacy message in all 17 languages, regenerated website/store copy, and verified the new message on the live form. Staging version: `e4634965-a736-421f-996a-b9e8e95d7912`; production version: `19b46632-5f29-4585-ba69-dc699d260943`. The README source badge now explicitly shows 1.3.0. CI, packaging, and release validation reject stale README badges/links/headings and mismatched package, manifest, UI, userscript or changelog versions. Local verification passed: typecheck, 22 unit tests / 233 assertions, four feedback browser tests, six website HTTP tests, website/extension builds, and ZIP validation (61 entries). Current candidate ZIP SHA-256: `25c54dea7ba4619737667891108b3db12f9756b89b66ba9214c71992b64683b3`, superseding the earlier candidate hashes. Website and store text is prepared in the feature branch; public publication still follows the release workflow below.

### Still required

Release review follow-up: automated review identified direct-URL retention being aborted by MediaSource cleanup. The new shared browser fixture failed for extension and userscript before the fix and passed afterward, including exact audio download. Direct retention now uses the pre-interceptor fetch with session cancellation and a 60-second timeout; the obsolete pending-request cache was removed. All 18 extension/userscript browser tests, 22 unit tests / 233 assertions, typecheck/build and ZIP validation passed. Updated archive SHA-256: `30eb7621dc7a8abbb6f64729a3feffcfcfd4ba93360593607fd66ea57e7aa90a`. This supersedes the earlier archive; owner acceptance is still explicitly attributed to the earlier candidate.

- Chrome, Edge and actual Tampermonkey acceptance were confirmed by the owner on 26 October for candidate `14254cb`. Browser versions and per-scenario results were not supplied; the acceptance record distinguishes these owner confirmations from directly observed tests. The three live acceptance flags are now true. Native Mac remains waived for 1.3.0 only.
- Fresh 1280×800 active/paused player images were captured from a real Edge ChatGPT session with the `3c3a6e2` build. Resume advanced from the saved position and seeking worked during capture. A current settings-page screenshot was also captured from the unpacked extension verification profile. README/website references now use these images; see `assets/store/screenshots/V1.3.0.md`. Store-console image replacement is still pending and may need the owner because browser automation blocks those pages.
- PR #20 merged into develop on 26 October (`f53444d`); CI run `40325056147` passed. Pages deployment run `40327347760` succeeded. All 85 live localized HTML pages match the verified build except its modification timestamp, and both current screenshots match byte-for-byte. Live Edge verified privacy/help content, analytics decline, and feedback health. All acceptance flags are now satisfied. Finalization reapplies the premature version bump as the final commit; merge its PR using **Rebase and merge** before opening develop → master. Required reviews remain in place.
- Verified GitHub assets, independent Chrome and Edge submissions, then separate public-availability checks. Neither store has been submitted for v1.3.0.
- Release notes and authorized replies for GitHub #18/#19 and the identified Chrome one-star review are prepared in `RELEASE-NOTES-1.3.0.md` and `RELEASE-COMMUNICATIONS-1.3.0.md`. No replies have been posted. Browser automation denies access to store reviews/developer-console pages; the Chrome reply may require owner posting after public availability.

## Test environment note

The local Windows host sends an external pause to headless Chromium at approximately three seconds. This also reproduced in a bare `<audio>` page without either distribution loaded, with no media error and no script pause call. A control run with hardware-media-key/media-session integration disabled advanced beyond six seconds. Windows fixture processes therefore isolate that OS integration; Linux CI and required live Chrome/Edge/Tampermonkey acceptance use normal browser behavior. This is not a production extension workaround or a waiver of live acceptance.

Local implementation checks: extension and Worker typechecks, 16 unit tests / 217 assertions, 21 browser tests, six website HTTP tests, extension/userscript build, 85-page website build, and Worker dry run passed. Owner summary queries and a private staging JSON export were exercised. Final versioned package validation and CI evidence are recorded separately when available.

## Rollout and rollback

Use the same verified ZIP for both stores and record its SHA-256. Follow `ACCEPTANCE-1.3.0.md` and `STORE-LAUNCH-CHECKLIST.md`. The final commit before opening the production PR must be `chore: bump version to 1.3.0` and synchronize package, manifest, UI and userscript versions.

After actual public rollout, review service health and voluntary feedback at 24 hours and seven days. Distinguish accepted submissions from public store availability. Do not schedule these reviews relative to a candidate build. Roll back Worker code with Wrangler while preserving D1; browser-store regressions require a higher-version extension patch. A private dashboard is deferred.
