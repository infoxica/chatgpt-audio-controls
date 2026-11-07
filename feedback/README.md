# Feedback service

The public website remains on GitHub Pages. `worker/` is an independent TypeScript Worker with separate staging and production D1 databases and Turnstile widgets. The owner confirmed the Cloudflare account **Anand** on 26 October 2026. Recheck `bunx wrangler whoami` before resource creation or deploying from another login.

| Environment | Form |
| --- | --- |
| Staging | https://chatgpt-audio-feedback-staging.anand224patel.workers.dev/feedback |
| Production | https://chatgpt-audio-controls.infoxica.com/feedback |

The production Worker also retains its original workers.dev address for existing links. The custom domain belongs to the confirmed Anand account and is included in the production Turnstile widget's hostname list. The form defaults to the system color scheme, supports saved Light/Dark overrides, and keeps implementation details behind the Privacy disclosure.

Use `source=installed` or `source=uninstall`. The form accepts `lang`, `version`, `browser`, and `os`; all are sanitized. No reason is selected by default. GET and Skip never write feedback. Only POST `/api/feedback` persists. `/health` checks database reachability.

## Development and deployment

1. Install root dependencies with `bun install`. Generate localized form data with `bun scripts/build-feedback-copy.ts`.
2. Use `bunx wrangler d1 migrations apply chatgpt-audio-feedback-local --config feedback/worker/wrangler.jsonc --local` for local D1. Put the official Turnstile test secret in an ignored `.dev.vars` file for local development only.
3. Run `bun run typecheck:feedback`, `bun test tests/worker.test.mjs`, and `bun run build:feedback`.
4. For staging/production, verify the intended account, apply that environment's D1 migrations with `--remote --env staging|production`, configure its `TURNSTILE_SECRET_KEY` with Wrangler secrets, and deploy using `bunx wrangler deploy --config feedback/worker/wrangler.jsonc --env staging|production`. Always validate staging first. Never deploy test keys to public environments.
5. Check `/health`, submit synthetic feedback in a real browser, verify its exact D1 row and confirmation, and remove only that identified synthetic production record. Preserve real feedback. Record deployed Worker version IDs in the release status.

The unique submission ID and canonical payload hash enforce idempotency. A retry after a lost response returns the existing ID; reuse with different answers returns 409. Validation, Turnstile rejection, and database failures never return success. Inputs remain available and the client resets the challenge before a retry. Parameterized SQL keeps comments literal. Operational logs omit comments, tokens and request bodies.

## Owner queries and export

Run `bun scripts/feedback-admin.ts production summary` (or `staging`) for source, reason, version, date and locale breakdowns. Run `bun scripts/feedback-admin.ts production export` for a timestamped JSON export under ignored `build/feedback-exports/`. These commands use the owner's authenticated Wrangler session. There is no public query/export endpoint or private dashboard. Protect exports like the database; do not attach them to issues or releases.

No historical import is needed and no automatic feedback deletion is configured. Roll back Worker code using `wrangler rollback --config feedback/worker/wrangler.jsonc --env production`; do not roll back or destroy D1 data. Keep schema changes backward compatible.

## Legacy Google destination

`Code.gs` and `Index.html` are a minimal transition page for old installations. `bun scripts/build-feedback.ts` generates `build/feedback`, including all localized labels and the configured production URL. Deploy that generated code to the existing Apps Script web-app deployment using its owner account. It has no spreadsheet write path; stale open survey submissions receive an error. Do not create a replacement URL because older installations already contain the existing endpoint.

Backend source, generated declarations, private exports and secrets must never enter extension ZIPs. See `PRIVACY.md` for the voluntary-feedback disclosure.

## Optional feature and symptom answers

Bug/broken reports may include optional feature and symptom choices. Neither choice nor a note is required. Choosing a category and pressing Send remains sufficient; GET, Skip, close and choosing a chip never submit. Changing away from bug/broken clears optional context. These are categorical user answers, not automatically observed diagnostics. No new permissions, installation identifiers, telemetry, attachments or external messaging are added.

Older payloads omit `form_version` or use 1 and keep their exact canonical hash: `JSON.stringify([source,reason,comment,locale,version,browser,os,1])`. V2 uses `JSON.stringify([source,reason,comment,locale,version,browser,os,2,featureOrNull,symptomOrNull,2])`. Omitted optional values and null canonicalize identically. A symptom requires a feature. Only bug/broken answers may carry context. The new form sends v1 unless a feature is selected. Retry identity, Turnstile and changed-answer conflicts are unchanged. Diagnostic and consent attachment keys are rejected while that capability is disabled.

For a later reviewed deployment, back up the intended source database using its approved process, apply additive migration `0002_optional_feedback_context.sql` in staging, then deploy the compatible Worker/form and verify old/new submissions. Repeat only through the owner-approved production process. No remote migration is part of this PR. Nullable columns can remain when rolling Worker code back to v1; do not drop columns during rollback. V1 requests also continue to work on the old schema. A v2 request before migration fails closed without reporting success.

New optional labels use existing feature translations and a separate complete prompt/symptom catalog for every supported locale. Translation review is welcome; no language silently falls back to English. Diagnostics require a separate privacy/consent/manifest review and remain disabled.
