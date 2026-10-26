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
