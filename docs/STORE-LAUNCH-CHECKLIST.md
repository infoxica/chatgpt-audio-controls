# Chrome Web Store and Microsoft Edge Add-ons Launch Checklist

Use this checklist for every public release of ChatGPT Audio Controls. It separates checks that can be completed from the repository from the store-account steps that must be completed by the publisher.

## Release preflight

- [ ] Update the release version consistently in `package.json`, `public/manifest.json`, `src/shared/constants.ts`, the userscript header, `CHANGELOG.md`, and the README source-version badge and current version heading.
- [ ] Run `bun run version:check`. Stale README badges, links, headings, or mismatched source versions must block the release.
- [ ] Run `bun install --frozen-lockfile`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run build`.
- [ ] Run `bun test` after building, so generated-userscript and delivered CSS parity are checked against current artifacts. Build the website/feedback fixtures and run `bunx playwright test` plus `bun run test:site-http`.
- [ ] Set `RELEASE_TAG` to the intended tag and run `bun run release:check`.
- [ ] Run `bun run package`; upload only the generated `dist-zip/chatgpt-audio-controls-v<version>.zip` archive.
- [ ] Inspect the archive: `manifest.json` must be at the archive root and the archive must not include source files, `node_modules`, or another enclosing `dist` directory.
- [ ] Confirm the package uses Manifest V3, requests only `storage`, and runs content scripts only on `https://chatgpt.com/*`.
- [ ] Confirm all bundled code and assets are local. Do not add remote JavaScript, remote CSS, remote fonts, telemetry, or analytics.

## GitHub Actions store-publishing secrets

Add these as repository **Actions secrets** before merging a version bump into `master`. Secret values are consumed only by the `publish-chrome` and `publish-edge` jobs and are never committed to the repository.

### Chrome Web Store

- `CHROME_CLIENT_ID`: OAuth 2.0 client ID for the Chrome Web Store API.
- `CHROME_CLIENT_SECRET`: OAuth 2.0 client secret.
- `CHROME_REFRESH_TOKEN`: Refresh token authorized for the `https://www.googleapis.com/auth/chromewebstore` scope.
- `CHROME_PUBLISHER_ID`: Chrome Web Store publisher ID.
- `CHROME_EXTENSION_ID`: Existing Chrome Web Store item/extension ID.

The first Chrome Web Store item and its listing/privacy metadata must be created and published manually once. After that, the workflow uploads the versioned package and submits it for review.

### Microsoft Edge Add-ons

- `EDGE_API_KEY`: Edge Add-ons API v1.1 API key.
- `EDGE_CLIENT_ID`: Edge Add-ons API v1.1 client ID.
- `EDGE_PRODUCT_ID`: Existing Edge Add-ons product ID.

The first Edge Add-ons product, listing metadata, privacy information, and required visual assets must be created manually in Partner Center. Enable the Edge Add-ons Publish API and create the v1.1 API key/client ID before using these secrets.

Adding interface languages can introduce incomplete draft listings even for an existing published product. The Edge Update REST API explicitly does not support updating listing metadata. `ModuleStateUnPublishable` with `Invalid module : LISTING` requires completing descriptions and logos in Partner Center, not changing credentials or rebuilding the ZIP.

CI prepares an `edge-store-listings-<run-id>` artifact containing descriptions and the extension logo for all 33 interface locales. Generate it locally with `bun run scripts/build-edge-listings.ts`. These are manual Partner Center inputs, not an import API payload. Apply only locales offered by the provider and record unavailable locales. Complete and save every supported listing, then retry only Edge using the workflow's `store=edge` option. New locales or later metadata changes require another Partner Center update.

## Browser smoke test

Test the unpacked `dist/` build in the latest stable Chrome and Edge. Sign in to a regular ChatGPT account and open a conversation with an assistant response.

- [ ] Verify ChatGPT's native Read Aloud button starts a session and no duplicate response action is injected.
- [ ] Verify the floating player tracks the active Read Aloud audio: play/pause, seek, speed, volume, and download.
- [ ] Verify Space, K, Alt+P, Alt+Left, Alt+Right, Shift+<, and Shift+> work outside editable fields and do not fire while typing in the prompt.
- [ ] In the popup, change speed, volume, Global Shortcuts, and Smooth Scrubbing; confirm the open ChatGPT tab updates without a reload. Check Help beside Dashboard and Send feedback in About.
- [ ] In the options page, change the seek step; confirm click and keyboard seeking use it.
- [ ] Verify all three ChatGPT themes used by the extension (dark, light, and an accent theme) keep the extension controls readable without recolouring native ChatGPT controls.
- [ ] Refresh the ChatGPT tab, start a new response, navigate between conversations, and leave the page open for several minutes; verify no duplicated controls, console errors, or UI flicker.

## Store listing copy

Use clear, narrow descriptions. Do not imply affiliation with OpenAI or claim to replace ChatGPT.

**Single purpose**

> Adds local playback controls—play/pause, resume, seek, speed, volume, and download—to audio started with ChatGPT's native Read Aloud button.

**ChatGPT site-access justification**

> Runs only on chatgpt.com to control the Read Aloud audio that ChatGPT plays in the current page and position the player around the composer.

**Data-use disclosure**

> Playback and preferences stay in the browser, with optional browser sync. The extension does not upload conversations, audio, installation identifiers, or automatic diagnostics. Optional feedback opens a separate Cloudflare-hosted form protected by Turnstile. Explicit submissions store the chosen category/reason, optional note, language, version and coarse browser/OS in private Cloudflare D1 storage. There is no email field or attachment. Opening or skipping the form stores no feedback. See the public privacy policy for Cloudflare security processing and retention.

**Reviewer test instructions**

> Sign in to ChatGPT with a regular account, open a completed assistant response, and use ChatGPT's native Read Aloud button. Pause and resume repeatedly with the floating controls, then test seeking, speed, volume and download. Resize the window to check separate capsules above the composer. The optional Send feedback link opens a hosted form; submitting is not required for playback.

## Chrome Web Store submission

- [ ] Create or select the Chrome Web Store item and upload the release ZIP.
- [ ] Complete the Privacy tab with the single purpose and data-use disclosure above.
- [ ] Set the public privacy-policy URL to the hosted `PRIVACY.md` page or an equivalent accessible policy page.
- [ ] Provide an accurate short description, detailed description, category, language, and support URL.
- [ ] Prepare provider-sized screenshots of native Read Aloud, the current player/dock and compact settings. Remove screenshots advertising the former injected button. Do not imply OpenAI endorsement.
  Use `assets/store/screenshots/README-v1.4.0.md` for source images and provenance. The live dock image predates the final corner-join refinement and needs recapture; fixture images do not establish live acceptance. Recheck provider size requirements before upload.
- [ ] Submit the first listing manually. Subsequent version bumps merged into `master` are uploaded and submitted for review by GitHub Actions.

## Microsoft Edge Add-ons submission

- [ ] Create the first listing and upload the initial release ZIP through Partner Center.
- [ ] Complete the Privacy page with the same single purpose, permission justification, data-use disclosure, and accessible privacy-policy URL.
- [ ] Provide all required listing assets, including the logo and promotional tile, plus clear screenshots.
- [ ] Add the reviewer test instructions above in Submission Options > Notes for certification.
- [ ] Ensure all metadata is accurate, non-misleading, and written for Microsoft Edge users where applicable. Subsequent version bumps merged into `master` are uploaded and submitted by GitHub Actions.

## Release closeout

- [ ] Merge the version-bumped release PR into `master`. A package version change on `master` triggers the store-publishing job.
- [ ] Tag the exact approved commit as `v<version>` and push the tag. GitHub Actions will validate the metadata, build the package, and create the GitHub release automatically.
- [ ] Verify the GitHub release contains the ZIP and userscript.
- [ ] Install the store-delivered version from both stores and repeat the browser smoke test.
- [ ] Update the release notes with any known ChatGPT UI compatibility limitations.

## Notes for maintainers

- The main audio player intentionally runs in the page's `MAIN` execution world so it can observe the media element that ChatGPT creates. The separate settings bridge remains in the extension's isolated world to access `chrome.storage` safely.
- ChatGPT's DOM is not a public extension API and may change. Treat the browser smoke test as a required release gate.
- The project is independent and not affiliated with, endorsed by, or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.

## Historical website launch note (2026-09-08; not current deployment status)

The permanent website is `https://infoxica.github.io/chatgpt-audio-controls/`.
It returned HTTP 404 on 2026-09-08; publish and verify it before using it in the
public store listing. Do not substitute a temporary trycloudflare.com preview.

For a website-only update to the current Chrome listing, preserve the existing
published feature description and append:

```text
Official website: https://infoxica.github.io/chatgpt-audio-controls/
```

Set the listing's website URL to the same permanent address. After saving/submitting
the metadata change in the developer console, verify the public listing separately.
The localized release descriptions in `docs/STORE-LISTINGS.md` include their
localized website links; they remain release copy, not evidence of console changes.
