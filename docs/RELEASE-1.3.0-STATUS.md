# v1.3.0 delivery status

## Release decision

Implementation candidate. Do not publish extension assets or submit to stores until the fresh acceptance gates in `config/acceptance.json` are satisfied. Previous v1.2.0 results do not count for this release. **Native Mac testing waived for v1.3.0** by the owner; it has not passed native Mac testing.

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

### Still required

Feedback appearance follow-up (26 October): the form now matches the landing page's neutral light/dark palette and rounded language/theme icon controls. Localized accessible names, tooltips, native keyboard selection and System / Light / Dark preferences remain available. Worker typecheck and all four feedback browser tests passed, including mobile layout, focus order, icon states and answer retention. Live Edge verified the deployed controls and keyboard theme selection. Staging version: `00154b90-d71e-4cd2-b923-7cfb049a5ac4`; production version: `73729aa6-8519-4a8e-ad69-b443bc07c404`. No schema or submission changes. CI for the preceding revision `5f4f889` completed successfully (run `40313065122`); this appearance revision requires its own CI.

- Fresh installed Chrome and Edge on Windows: live ChatGPT pause/resume, immediate pause, long responses, new response, navigation, seeking, speed, volume/download, themes, sidebars and actual 100%/125%/150% zoom. Record browser versions, artifact hash and results.
- Actual Tampermonkey installation and live ChatGPT checks; injected userscript fixtures do not establish manager integration.
- Fresh store screenshots showing the new capsules and native response action. Existing store images are historical until replaced; fixture screenshots must not be represented as live ChatGPT captures.
- Reviewed feature → develop PR, website deployment and live verification, then final version-bump commit and develop → master PR. Respect required review and checks.
- Verified GitHub assets, independent Chrome and Edge submissions, then separate public-availability checks. Neither store has been submitted for v1.3.0.

## Test environment note

The local Windows host sends an external pause to headless Chromium at approximately three seconds. This also reproduced in a bare `<audio>` page without either distribution loaded, with no media error and no script pause call. A control run with hardware-media-key/media-session integration disabled advanced beyond six seconds. Windows fixture processes therefore isolate that OS integration; Linux CI and required live Chrome/Edge/Tampermonkey acceptance use normal browser behavior. This is not a production extension workaround or a waiver of live acceptance.

Local implementation checks: extension and Worker typechecks, 16 unit tests / 217 assertions, 21 browser tests, six website HTTP tests, extension/userscript build, 85-page website build, and Worker dry run passed. Owner summary queries and a private staging JSON export were exercised. Final versioned package validation and CI evidence are recorded separately when available.

## Rollout and rollback

Use the same verified ZIP for both stores and record its SHA-256. Follow `ACCEPTANCE-1.3.0.md` and `STORE-LAUNCH-CHECKLIST.md`. The final commit before opening the production PR must be `chore: bump version to 1.3.0` and synchronize package, manifest, UI and userscript versions.

After actual public rollout, review service health and voluntary feedback at 24 hours and seven days. Distinguish accepted submissions from public store availability. Do not schedule these reviews relative to a candidate build. Roll back Worker code with Wrangler while preserving D1; browser-store regressions require a higher-version extension patch. A private dashboard is deferred.
