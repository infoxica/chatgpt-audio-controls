# Chrome Web Store and Microsoft Edge Add-ons Launch Checklist

Use this checklist for every public release of ChatGPT Audio Controls. It separates checks that can be completed from the repository from the store-account steps that must be completed by the publisher.

## Release preflight

- [ ] Update the release version consistently in `package.json`, `public/manifest.json`, the userscript header, and `CHANGELOG.md`.
- [ ] Run `bun install --frozen-lockfile`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run build`.
- [ ] Set `RELEASE_TAG` to the intended tag and run `bun run release:check`.
- [ ] Run `bun run package`; upload only the generated `dist-zip/chatgpt-audio-controls-v<version>.zip` archive.
- [ ] Inspect the archive: `manifest.json` must be at the archive root and the archive must not include source files, `node_modules`, or another enclosing `dist` directory.
- [ ] Confirm the package uses Manifest V3, requests only `storage`, and runs content scripts only on `https://chatgpt.com/*`.
- [ ] Confirm all bundled code and assets are local. Do not add remote JavaScript, remote CSS, remote fonts, telemetry, or analytics.

## GitHub Actions store-publishing secrets

Add these as repository **Actions secrets** before merging a version bump into `master`. Secret values are consumed only by the `publish-stores` job and are never committed to the repository.

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

## Browser smoke test

Test the unpacked `dist/` build in the latest stable Chrome and Edge. Sign in to a regular ChatGPT account and open a conversation with an assistant response.

- [ ] Verify the response Read Aloud action appears immediately after Copy and starts/stops the native Read Aloud flow.
- [ ] Verify the floating player tracks the active Read Aloud audio: play/pause, seek, speed, volume, and download.
- [ ] Verify Space, K, Alt+P, Alt+Left, Alt+Right, Shift+<, and Shift+> work outside editable fields and do not fire while typing in the prompt.
- [ ] In the popup, change speed, volume, Inline Speech Buttons, Global Shortcuts, and Smooth Scrubbing; confirm the open ChatGPT tab updates without a reload.
- [ ] In the options page, change the seek step; confirm click and keyboard seeking use it.
- [ ] Verify all three ChatGPT themes used by the extension (dark, light, and an accent theme) keep the extension controls readable without recolouring native ChatGPT controls.
- [ ] Refresh the ChatGPT tab, start a new response, navigate between conversations, and leave the page open for several minutes; verify no duplicated controls, console errors, or UI flicker.

## Store listing copy

Use clear, narrow descriptions. Do not imply affiliation with OpenAI or claim to replace ChatGPT.

**Single purpose**

> Adds visible Read Aloud actions and local playback controls—play/pause, seek, speed, volume, and download—to ChatGPT Read Aloud audio.

**ChatGPT site-access justification**

> Runs only on chatgpt.com to add the Read Aloud action and control the audio that ChatGPT plays in the current page.

**Data-use disclosure**

> The extension stores only user preferences in browser storage. It handles the active ChatGPT Read Aloud stream locally to provide playback controls and user-initiated downloads. It does not collect, transmit, sell, or use conversation data, audio, or personal information.

**Reviewer test instructions**

> Sign in to ChatGPT with a regular account, open any assistant response, use its More actions menu to start Read Aloud, then use the extension's response action and floating controls. No developer account, test account, or external service is required.

## Chrome Web Store submission

- [ ] Create or select the Chrome Web Store item and upload the release ZIP.
- [ ] Complete the Privacy tab with the single purpose and data-use disclosure above.
- [ ] Set the public privacy-policy URL to the hosted `PRIVACY.md` page or an equivalent accessible policy page.
- [ ] Provide an accurate short description, detailed description, category, language, and support URL.
- [ ] Upload clear, current screenshots that show the Read Aloud response action and player in use. Do not use ChatGPT or OpenAI branding in a way that suggests endorsement.
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

## Website link update (prepared; console update pending)

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
The localized v1.2.0 descriptions in `docs/STORE-LISTINGS.md` now include their
localized website links; they remain release copy, not evidence of console changes.
