# v1.4.1 release status — 2026-11-03

**Unreleased candidate.** Code, CI, native acceptance, production deployment,
store submission and public availability remain separate. See
[acceptance](ACCEPTANCE-1.4.1.md) and [website operations](WEBSITE-RELEASE.md).

## Current implementation and review

The 1.4.1 feature branch contains adaptive player geometry, magnetic dragging,
67 interface locales, support links, compact mobile navigation and current
ChatGPT accent synchronization. Extension and userscript artifacts retain the
same playback/recovery implementation and existing preferences/permissions.

PR #26 targets develop and includes PR #25's changes. Keep #25 open until #26
is merged, then close it as superseded. The owner requested waiting for Codex's
automatic review; no review-request comment was posted. A fresh review of the
updated head is still required.

Develop is currently 1.4.0. Squash-merging the complete 1.4.1 PR with the genuine
version-bump title can leave a final commit that actually changes 1.4.0 to
1.4.1 before opening develop -> master. Recheck the resulting commit and diff;
do not use an empty version bump or bypass the repository's branch rules.

## Verification

- Owner-reported real Mac checklist passed: docking, dragging, playback,
  seeking and download. `nativeMac` is true.
- Current candidate passed real Edge Android playback, touch pause/resume,
  seeking, docking, collapse/expand, volume and portrait/landscape/keyboard
  geometry. A 277,409-byte AAC file was saved on the phone and decoded fully
  without errors locally. `edgeAndroidLive` is true. See dated acceptance notes.
- CI run 41605652934 passed type checks, builds, unit tests, website generation
  and Edge listing preparation. Browser tests: 121 passed, one intentional skip,
  one animation-timing assertion failed. That assertion now waits for settled
  44px hit areas; six repeated local extension/userscript runs passed. Updated
  full CI remains required.
- The signed-commit retry succeeded for the test fix (`6924469`); the earlier
  GPG timeout no longer blocks committing the acceptance follow-up. Signing
  remains enabled.
- Edge listing preparation now uses the shared 52 supported browser manifest
  locales. All 67 UI locales remain available through the extension and website.
- Fresh Windows Chrome/Edge and native Tampermonkey acceptance remain open.
  Browser security policy blocked automated access to the Extensions page and
  prohibited alternate routes. The owner is AFK; manual reload remains pending.
- The same policy blocked restoring the phone's store-extension enabled state.
  The tested unpacked 1.4.1 candidate remains enabled; store version 1.3.0 remains
  disabled. Both were enabled before testing. This is a cleanup item, not evidence
  of a product failure.

## Staging and production

Staging was deployed as Worker version
`ea7cb0bd-6c4d-4c48-8e54-22a81f8b487c` at
https://chatgpt-audio-feedback-staging.anand224patel.workers.dev/.
Browser homepage/image-viewer checks and HTTP checks for localized content,
private feedback, health, sitemap, media and noindex rules passed.

Production has not been changed. The recorded rollback Worker version is
`7f11f9b3-4a4b-41a4-ba64-5251022a0459`; recheck before promotion.
The prior Pages artifact is preserved locally at
`build/rollback/github-pages-41343042645/artifact.tar`, SHA-256
`41dfc67ef8cec3411e1a4f9a1ac8935c730b9609020b044c07df26d8e00e8f5f`.
`WEBSITE_CLOUDFLARE_READY` must remain gated until production acceptance passes.
Scoped CI credentials/environment protection require verification before using
production automation. Never copy local OAuth credentials into GitHub.

## Current packaged artifacts

ZIP: `dist-zip/chatgpt-audio-controls-v1.4.1.zip`, 96 validated entries,
1,298,141 bytes; SHA-256
`e08818288a9fbe72462627fd94f0bd993750b1845ed80b7fb1dbdb1f65a0b7a3`.
Userscript: 1,636,178 bytes; SHA-256
`e379bd4711ee77fa65e8b37bed1f8bf38c27dbf2ffaa528ba84107209c3f4954`.
Local evidence is in `build/acceptance-1.4.1/`; it is not a published release.

Release tagging, production website/feedback acceptance, Chrome/Edge store
submission and public availability remain pending. Keep their acceptance flags
false until their respective checks complete.
