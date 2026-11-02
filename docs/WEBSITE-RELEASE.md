# Website deployment and rollback

The v1.4.1 candidate targets **https://chatgpt-audio-controls.infoxica.com/**.
The existing feedback Worker serves the website through its ASSETS binding.
The custom hostname and TLS configuration remain unchanged. Production deployment
is separate from a successful build or staging check.

## Build and validate

Run `bun run build:site`, `bun run prepare:web-assets`, and `bun run build:feedback`.
Run the HTTP, browser, feedback, locale and release checks before promotion.
The public build contains 165 localized pages (33 languages, five routes), with
34 language alternatives including x-default for each sitemap URL.

`site-dist/` is the production asset source. `build/site-staging/` adds noindex
headers and disallows crawling. `build/website-snapshot/` is a copy of the current
candidate, **not** a backup of a previous deployment. Preserve previous deployed
artifacts separately before promotion.

The Python preview accepts the new root URL and redirects the legacy project
prefix without redirecting `/` to itself. Its Markdown Accept negotiation and
custom Link headers are preview features; production provides explicit Markdown
mirrors and HTML discovery links.

## Worker routing and security

`/feedback`, `/feedback/*`, `/api`, `/api/*`, `/health`, and `/health/*` run the
Worker first. Feedback retains its CSP, no-store policy, Turnstile verification,
rate limits and D1 protections. Public static assets cannot shadow these routes.
Other matching assets use Cloudflare's asset handler; missing assets remain 404.
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
