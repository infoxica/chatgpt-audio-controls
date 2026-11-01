# v1.4.0 release handoff — 2026-11-01

**Superseded source snapshot:** the later [UI localization audit](LOCALIZATION-AUDIT-1.4.0.md) changes this checkout and rebuilds the extension/userscript. The frozen `build/release-preparation-1.4.0/` files and hashes below describe the earlier preparation only. Consult the audit for current artifacts and validation; refresh the whole-release handoff before submission.

Status: **local release candidate; publication blocked by outstanding acceptance**. Version remains 1.4.0. The current checkout is `feature/movable-controls-1.4.0`, based on `c48cd87`, with the coordinated release changes still uncommitted. No commit, push, tag, deployment, store submission or signing enrollment was performed during preparation.

## Prepared material

- [User-facing release notes](RELEASE-NOTES-1.4.0.md), [changelog](../CHANGELOG.md), and [store listing copy](STORE-LISTINGS.md).
- Extension: `dist-zip/chatgpt-audio-controls-v1.4.0.zip`; unpacked build: `dist/`.
- Userscript: `userscript/chatgpt-audio-controls.user.js`, generated from the shared player and CSS.
- Handoff directory: `build/release-preparation-1.4.0/`. Its `artifacts/` directory contains copies of the extension/userscript, website ZIP, feedback dry-run ZIP and store-input ZIP; `manifest.json` and `checksums.sha256` identify the files.
- Website: `site-dist/`, with 165 pages across 33 locales. Feedback: `build/feedback-worker-production/` is a **production-configured dry-run bundle**, not a deployment; the local-environment dry run is retained in `build/feedback-worker/`. Deploy from the repository's intended environment only after review; the dry-run ZIP does not apply bindings, secrets or migrations.
- Store inputs: descriptions/logos for 33 interface locales in `build/edge-store-listings/`. Provider-supported locales must be checked separately. [Screenshot provenance](../assets/store/screenshots/README-v1.4.0.md) distinguishes live images from fixtures. The live dock image predates the final corner join; refreshed live/provider-sized screenshots remain required before submission.

## Validation

The final validation counts and artifact hashes are recorded in [release status](RELEASE-1.4.0-STATUS.md) and `build/release-preparation-1.4.0/manifest.json`. Raw unit, browser, HTTP and publication-gate logs are retained in the handoff directory.

All **61 browser scenarios** are verified (50 extension/userscript, 11 website/feedback). The full run returned 57 passes and four failures; all four passed targeted reruns after the test-infrastructure corrections below. This is combined evidence, not a claim that the original full run was green.

The frozen dependency install, application/feedback type checks, extension/userscript build, website and feedback resources, local and production-configured worker dry runs, locale/listing generation, source-version check and 77-entry ZIP validation passed. All 43 unit/integration tests (3,190 assertions) and six HTTP tests passed. The tagged publication preflight (`RELEASE_TAG=v1.4.0`) correctly fails while the acceptance record is incomplete. A successful untagged version check is not publication acceptance.

Preparation also corrected CI ordering so delivered-userscript parity runs after building. The worker test's startup hook now allows 30 seconds for local workerd/D1 startup; request assertions are unchanged. The five-second toast test freezes browser time before creating the toast, preventing slow host round trips from consuming its assertion window. The exhaustive 132-page guide audit has a bounded two-minute budget for the expanded 33-language catalog. The language-grid test re-enters its hover menu after resize rather than leaving the pointer over a different navigation trigger. These are test-infrastructure corrections, not changes to playback or toast behavior; no locale assertions were removed.

Local runtime: Windows, Bun 1.4.3, Wrangler 4.152.0. GitHub Actions pins Bun 1.3.9; exact-commit CI has not been run for this uncommitted candidate. Non-fatal build advisories remain for the shared UI bundle size and third-party `use client` directives.

## Before publication

1. Complete and record candidate-specific live Chrome/Edge playback and UI checks, actual toolbar popups, userscript-manager checks, and real Edge Android acceptance. Complete native Mac checks or obtain an explicit owner waiver for that gate only. Follow [the acceptance checklist](ACCEPTANCE-1.4.0.md); automated responsive tests do not establish phone support.
2. Review the sixteen new translations with native speakers. Refresh the final live dock screenshots and prepare provider-sized listing images. Record provider locale omissions rather than assuming all 33 are accepted by each store.
3. Deploy and verify the intended website and feedback environments when authorized. Keep deployment evidence distinct from local dry runs. Update `config/acceptance.json` only for checks supported by recorded evidence; all seven flags are still false.
4. Review and commit the release branch, run exact-commit CI, and rerun the tagged publication preflight. Do not merge the version bump into `master` until ready: the existing workflow automatically submits increasing versions on `master`. A release tag also creates a public GitHub release.
5. Publish only the approved artifacts and record Chrome/Edge submission, certification and public availability independently. Keep Verified CRX Uploads enrollment separate; [the signing assessment](PACKAGE-SIGNING-ASSESSMENT.md) remains an assessment, not an enabled requirement.

For verification changes or rebuilds after this handoff, regenerate artifacts and checksums and update the evidence before using them for submission.
