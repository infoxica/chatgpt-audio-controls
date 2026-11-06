# Website deployment and rollback

The current 1.4.2 candidate targets **https://chatgpt-audio-controls.infoxica.com/**.
The existing feedback Worker serves the website through its ASSETS binding.
The custom hostname and TLS configuration remain unchanged. Production deployment
is separate from a successful build or staging check.

## Build and validate

PR #29 now includes the coordinated 1.4.2 extension patch as well as the website
work. The dated 1.4.1 staging evidence below remains historical; it does not
establish production deployment or device acceptance for 1.4.2. Current extension
checks and release gates are tracked in [ACCEPTANCE-1.4.2.md](ACCEPTANCE-1.4.2.md).

Run `bun run build:site`, `bun run prepare:web-assets`, and `bun run build:feedback`.
Run the HTTP, browser, feedback, locale and release checks before promotion.
The public build contains 335 localized pages (67 languages, five routes), with
68 language alternatives including x-default for each sitemap URL.

`site-dist/` is the production asset source. `build/site-staging/` adds noindex
headers and disallows crawling. `build/website-snapshot/` is a copy of the current
candidate, **not** a backup of a previous deployment. Preserve previous deployed
artifacts separately before promotion.

The Python preview accepts the new root URL and redirects the legacy project
prefix without redirecting `/` to itself. The Worker negotiates localized Markdown
and advertises canonical, alternate and llms.txt links on generated page responses.

## Worker routing and security

`/feedback`, `/feedback/*`, `/api`, `/api/*`, `/health`, and `/health/*` run the
Worker first. Feedback retains its CSP, no-store policy, Turnstile verification,
rate limits and D1 protections. Public static assets cannot shadow these routes.
Public pages run the negotiation handler. Media under `/assets/` bypasses it.
The public statistics endpoint reads KV. Missing assets remain 404.
See [Cloudflare selective Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).

Deploy and exercise the staging environment first:

```sh
node node_modules/wrangler/bin/wrangler.js deploy --config feedback/worker/wrangler.jsonc --env staging
```

Check the homepage, localized guides, image viewer, media, sitemap, robots,
feedback form, health endpoint, API rejection behavior and unknown-route 404s.
Use a browser if Cloudflare rejects a raw HTTP client's fingerprint; do not relax
production security merely to make a synthetic probe pass.

## Production promotion

Follow repository PR/release gates before deploying. The manual
cloudflare-website.yml workflow uses a cloudflare-production environment and
allows production only from develop or master. Configure environment approval
protection, CLOUDFLARE_ACCOUNT_ID and a scoped CLOUDFLARE_API_TOKEN before use.
Use only the account/Worker permissions needed for deployment and existing
bindings. Never copy a developer's local Wrangler OAuth credentials.

After production browser acceptance, set the repository variable
WEBSITE_CLOUDFLARE_READY=true. Only then may the Pages workflow replace the
legacy site with build/legacy-pages/. Each old localized page supplies a static
redirect, new canonical URL and fallback link. These are **not HTTP 301s**.
Existing assets/media remain available. Redirect JavaScript retains only approved
campaign values and a safe fragment, never arbitrary query parameters.

## Rollback

Before deployment, record the active Worker version and download the last good
Pages deployment artifact. Keep both with release evidence. The production
version observed before this migration was
7f11f9b3-4a4b-41a4-ba64-5251022a0459 (2026-11-01); recheck before rollout.
Rollback to the recorded deployed Worker version using Wrangler's rollback
command, then verify feedback/API routes and the intended website state.
Restore the prior Pages artifact if redirects have been activated, and clear
WEBSITE_CLOUDFLARE_READY until production checks pass again.
Do not roll back D1 data or rotate secrets for a static-site rollback.

## Set up staging statistics

1. In Cloudflare, select the account that owns the existing feedback Worker. Copy its account ID. Under **API Tokens**, create a dedicated deployment token scoped to that account. Start with the Edit Cloudflare Workers template. Include Workers Scripts edit and Workers KV Storage edit for binding/provisioning. Scope route permissions to the website zone for production. Preserve existing D1, Turnstile and custom-domain bindings. Test staging first and inspect any permission error before granting additional access.
2. On GitHub open **infoxica/chatgpt-audio-controls → Settings → Environments**. Select or create `cloudflare-staging`. Under **Environment secrets**, add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Use a separate protected `cloudflare-production` environment for promotion. The workflow reads these secrets only during credential checking and deployment.
3. Sign into Google Cloud as a user authorized to read this item's publisher statistics. Enable the Chrome Web Store API in a dedicated project, configure Google Auth Platform's audience and consent screen, and create a **Web application** OAuth client. If using Google's OAuth Playground, register its exact redirect URI `https://developers.google.com/oauthplayground`. In its gear menu select **Use your own OAuth credentials** and **Offline** access. Authorize only `https://www.googleapis.com/auth/chromewebstore.readonly`, approve as the publisher user, and exchange the code for tokens. Use the **refresh token**. An external consent screen in Testing can issue short-lived grants; choose an appropriate production or internal consent configuration before relying on daily refreshes. [Google setup](https://developer.chrome.com/docs/webstore/using-api) · [OAuth Playground](https://developers.google.com/oauthplayground/)
4. In Cloudflare open **Workers & Pages → chatgpt-audio-feedback-staging → Settings → Variables and Secrets**. Add encrypted secrets `STATS_CLIENT_ID`, `STATS_CLIENT_SECRET`, `STATS_REFRESH_TOKEN` and `STATS_PUBLISHER_ID` (publisher dashboard ID). Preserve the existing Turnstile secret. Alternatively use interactive `wrangler secret put NAME --env staging --config feedback/worker/wrangler.jsonc`. Keep values out of shell arguments, Git and chat. Rotate by replacing and verifying the grant before revoking the old one. On 2026-11-05 the owner selected reuse of the existing publishing OAuth credentials for both environments instead of the dedicated grant described above. Rotation must therefore coordinate the publishing workflow and both Workers. Adding a scope to the consent-screen configuration alone does not add it to an existing refresh-token grant; verify both statistics methods with the saved grant.
5. Wrangler binds `STATS_KV` separately for each environment. On first deployment verify the provisioned namespace under the Worker's Bindings and pin its namespace ID in that environment before moving it or changing Worker names. Keep key `extension:stats:v1` without expiry. The public Chrome item ID is `aifalimlfgiepmbejcemcofninobaiea`. The Edge item ID is `cmhbacgmcgiolpidfjcpefkhbbeamemf`.
6. Run **Cloudflare website and feedback** on the reviewed branch with **staging** selected. The staging homepage uses its own API. To test the scheduled event locally, run `bunx wrangler dev --test-scheduled --config feedback/worker/wrangler.jsonc` and request `http://localhost:8787/__scheduled?cron=0+3+*+*+*`. To exercise a real staging Worker, temporarily configure a staging Cron Trigger, observe one scheduled event in Worker logs, and remove that trigger. Verify the cached JSON contains the expected per-field dates and counts. No visitor URL initiates a refresh.
7. Edge automation defaults to disabled. Verify Microsoft's applicable terms and permission to use the undocumented details endpoint. If permitted, enable `EDGE_STATS_ENABLED=true` in the staging config for the scheduled test. A denial, challenge or schema change is a failed observation. Do not bypass it. Enable production only after staging succeeds.
8. Before production, record the current Worker version and smoke-test feedback, sitemap, Markdown GET/HEAD, skill digest and stats in staging. After promotion verify the **03:00 UTC** scheduled event, both store observations and the public response. Test both requested scanners against the canonical hostname. Record Search Console's **last read** and discovered pages separately from a successful submission and from indexed pages.

Chrome reports seven-day active users and Edge reports active installations. The combined number can include the same person twice. Ratings use rating counts as weights by default. Set `RATING_MODE=max` to display the higher store rating with its own count. The API returns 503 before there are usable observations. A retained measurement is marked stale when its latest attempt fails or it ages past 48 hours. The homepage suppresses figures older than a week. KV propagation can briefly expose the previous snapshot.

The homepage excludes expired rating observations before computing its displayed
weighted or maximum rating. One expired store cannot hide the other store's fresh
rating. The API retains the full source observations for inspection.

The homepage eyebrow now uses icon-labelled product, audience and rating items
with separators on desktop and wrapping on mobile. It shows five decorative stars
and a one-decimal scale such as `4.0/5.0 Rated`, without update dates, a disclosure
panel or store links. Screen-reader labels retain source and metric explanations;
observation timestamps remain in the API. The audience label is `Users / installs`,
not downloads, because neither upstream metric measures downloads. Partial
audience figures explicitly name their store. Both new labels are localized in
all 67 website catalogs. Expired-contributor regression coverage exercises
weighted and max modes, including a stale max-mode winner, in unit tests and the
rendered website.

### Staging acceptance — 2026-11-05

- Both GitHub deployment environments have the account ID and API token secrets;
  both Workers have all four `STATS_*` secrets and retain their Turnstile secret.
  Verification read secret names only. The temporary interactive setup script was
  removed after the owner confirmed configuration and remote names were verified.
- GitHub Actions run [42001724263](https://github.com/infoxica/chatgpt-audio-controls/actions/runs/42001724263)
  deployed commit `0b3575b` successfully to staging. Worker version:
  `a2f9fe2f-84cd-4195-9e63-9258ac8b22e6`; previous staging rollback version:
  `4f4573ff-219c-467a-93fa-1fe39c83c1c3`.
- The staging KV namespace `26e410b118514002b026b792e0be0413` was provisioned by
  that deployment and is now pinned in configuration. Production remains separate.
- 29 live HTTP assertions passed: English/Japanese HTML and Markdown, negotiated
  HEAD responses, noindex, all 335 sitemap entries, skill digest, health, feedback
  rendering and invalid-request rejection, stats CORS/methods/cache behavior, and
  private-route rejection. Evidence: `build/acceptance-1.4.1/staging-discovery-2026-11-05.json`.
  Python's HTTP client was rejected before reaching the Worker; the normal curl
  client completed these checks. No feedback record was submitted.
- Clean-browser staging checks passed at 1512px and 390px Arabic RTL without
  horizontal overflow. Before the first valid snapshot, both store links remain
  available. Screenshots: `build/acceptance-1.4.1/staging-stats-{1512,390}-2026-11-05.png`.
- The PR review's expired-rating suppression issue is fixed: the homepage now
  recomputes weighted/max ratings from unexpired observations. Local validation:
  both TypeScript checks, website/Worker build, 11 Worker/provider tests,
  33 website browser tests, and the 1.4.1 version check passed. Local Worker and
  browser tests required running outside the sandbox's localhost/process limits.
- The first scheduled staging attempts revealed a runtime bug: Workers rejects
  `fetch` with `redirect: "error"` before contacting Google. The wrapper now uses
  `manual` and rejects 3xx responses, preserving the rule against forwarding OAuth
  credentials to redirect destinations. A workerd test with fake credentials
  reproduces the original failure and verifies both successful collection and
  redirect rejection. The expanded Worker/provider suite passes 13 tests; both
  TypeScript checks pass. Failed collection correctly leaves the endpoint at 503
  rather than publishing invented zero counts. Runtime diagnostics expose only
  bounded failure categories, never credentials or raw upstream responses.
- The final staging deployment in run [42005880839](https://github.com/infoxica/chatgpt-audio-controls/actions/runs/42005880839)
  succeeded at commit `1d51f5a`; Worker version
  `971ef268-795e-4c8a-8fd0-3519ae7d732c`. Both authenticated Google methods now
  return successful HTTP responses. The cached rating is **4.0 from four ratings**;
  the clean-browser homepage shows `Chrome ★ 4.0/5` with its source disclosure.
  Evidence: `build/acceptance-1.4.1/staging-live-rating-2026-11-05.png`.
- **Chrome user-count acceptance remains open.** Despite requesting `users-7d`
  without dimensions, the response contains nonempty dimension values. The
  adapter rejects these rows with `no_valid_users:dimensioned_row`, rather than
  interpreting an unidentified slice as a total or summing overlapping users.
  Confirm Google's aggregate response semantics before accepting these values.
  The public endpoint accurately returns `chrome.users: null`,
  `combined.users: null`, and `isComplete: false`; ratings remain usable.
- The temporary staging cron was removed with `wrangler triggers deploy` using
  the explicit empty staging cron list. Scheduled changes can take time to
  propagate. Production's configured daily schedule has not been deployed by
  this work. Final local regression result: **14 tests passed, 137 assertions**.
- A separate manual Edge observation at `2026-11-05T09:56:23.627664Z` returned
  103 active installations and zero ratings. This observation was not imported
  into KV: it predates subsequent scheduled attempts and must not be relabelled
  as a newer observation. No combined audience total has been published.
- PR [#29](https://github.com/infoxica/chatgpt-audio-controls/pull/29) remains open
  with review required. Production promotion, its first daily refresh, Google
  Search Console evidence, and the production scanner checks remain separate
  acceptance gates. Extension and userscript versions remain **1.4.1**.
- Microsoft's [store-linked terms](https://www.microsoft.com/en-us/legal/terms-of-use)
  and [services agreement](https://www.microsoft.com/en-us/servicesagreement) were
  reviewed. They do not establish a supported statistics API or explicit permission
  for this automated redistribution. Edge scheduled collection remains disabled
  pending that confirmation and a Worker-origin check. The dated manual-import
  procedure below remains available for authorized observations.

### Manual Edge fallback

Obtain a dated, authorized Edge observation and prepare a JSON file with `crxId`, `activeInstallCount`, `averageRating`, and `ratingCount`. Use zero count and a null average only for a confirmed unrated listing. Export the current value with `wrangler kv key get extension:stats:v1 --binding STATS_KV --remote --text --env staging --config feedback/worker/wrangler.jsonc` and keep a UTF-8 backup. Outside the refresh window run:

```sh
bun scripts/import-edge-stats.ts previous.json edge.json OBSERVATION_TIME_UTC cmhbacgmcgiolpidfjcpefkhbbeamemf > candidate.json
```

Use `-` for the previous file only after verifying that the key has never existed. Compare the output with the backup and re-read KV before writing. If the prior value changed, regenerate against the new value. Write the approved JSON with `wrangler kv key put extension:stats:v1 --path candidate.json --binding STATS_KV --remote --env staging --config feedback/worker/wrangler.jsonc`. Verify the dated result after propagation. Select production explicitly for a production import.
