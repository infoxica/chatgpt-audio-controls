# Uninstall feedback service

Deploy with Apps Script HTML Service using the designated project owner's account, executing as the owner, accessible to anyone without sign-in. The response spreadsheet must remain private. Keep account emails, private project and spreadsheet identifiers, and credentials out of repository files and pull requests.

1. Run `bun run scripts/build-feedback.ts` to generate `build/feedback` from these sources and the shared translations.
2. Set Script Properties `SPREADSHEET_ID` to the private feedback workbook ID and `SIGNING_SECRET` to a securely generated random secret. Never commit the secret.
3. The `Responses` header must match `HEADERS` in Code.gs exactly. Summary formulas read the response columns; do not add test rows to production statistics.
4. Deploy a versioned web app. Test unsigned URL input, language switching, every reason, blank notes, literal formula-like comments, Skip, duplicate submissions and simulated lost replies. Verify anonymous access and actual Sheet writes.
5. Put the verified `/exec` URL in `config/release.json`; build the extension and test actual uninstall in isolated Chrome and Edge profiles.

Only `submitFeedback` writes responses. Opening or skipping records no response. Tokens expire after 24 hours. Per-page IDs prevent duplicate writes and are not installation IDs. Requests are serialized with ScriptLock, capped at 100 writes/hour, 1,000/day and 10,000 total responses. This limits abuse without collecting IPs or fingerprints; it is not a guarantee against denial of service. Archive responses and update summaries before reaching capacity. No GA4, remote fonts, trackers, or third-party submission endpoint is used.

On client/network failure retain the input and retry the same request ID. The success screen requires `{ saved: true }` after `SpreadsheetApp.flush()`. Duplicate retries return success without another row. The server stores submitted comments as literal text and does not log their contents.
