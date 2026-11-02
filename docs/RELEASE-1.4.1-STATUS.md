# v1.4.1 release status — 2026-11-02

**Unreleased candidate.** Local implementation and staging are separate from
native-device acceptance, PR approval, production deployment and store release.
See [acceptance](ACCEPTANCE-1.4.1.md) and [website operations](WEBSITE-RELEASE.md).

## Implementation

Adaptive compact controls, shared preview geometry, SVG viewer close button,
README/changelog cleanup, root-domain links, readable sitemap, Worker selective
static routing, safe legacy redirects and scoped-credential CI are prepared.
Preferences, permissions and feedback protections are preserved. Real Android
testing also produced a retained-AAC recovery fix and matching AAC filenames.
The genuine 1.4.0→1.4.1 metadata bump is the final implementation commit.

## Staging and rollback

Combined website/feedback staging was deployed to
https://chatgpt-audio-feedback-staging.anand224patel.workers.dev/ as version
80b80c1d-6e45-44f2-bd4a-dd8be0b090ca. Browser probes passed public homepage,
Japanese guide, Arabic page, sitemap, private feedback, health, API errors and
missing-page behavior. Staging is noindex. Raw HTTP clients received Cloudflare
1010 responses; browser probes succeeded without weakening security.
The final 1.4.1 staging assets also passed viewer close-icon centering.
Staging evidence does not establish production acceptance.

The previous Pages artifact from run 41343042645 is preserved locally at
build/rollback/github-pages-41343042645/artifact.tar, SHA-256
41dfc67ef8cec3411e1a4f9a1ac8935c730b9609020b044c07df26d8e00e8f5f.
Previous production Worker version: 7f11f9b3-4a4b-41a4-ba64-5251022a0459.
No production Worker or Pages deployment has been changed by this implementation.
The Pages redirect workflow remains gated on WEBSITE_CLOUDFLARE_READY.
Scoped CI credentials and environment approval protection still need owner setup.

## Native platforms and publication

Current Google Platform Tools 37.0.1 are installed locally under build/android-tools;
no global PATH or driver changes were made. Wireless pairing succeeded and Edge
Android's debugging endpoint is reachable. The unpacked 1.4.1 candidate was installed through the native Android folder
picker. Real AAC pause/resume and seeking passed after fixing a file-decoder
failure with a retained-byte streaming fallback. Portrait, landscape and
keyboard geometry were measured without horizontal overflow. Saved-file
completion remains unconfirmed, so Android acceptance is still open. See the
acceptance document for scope and cleanup. The user will run the Mac checklist.

Normal PR approval, final platform acceptance, website promotion, release tagging
and Chrome/Edge submissions remain open. Do not set acceptance flags from
responsive emulation, previous versions or staging-only evidence.

## Candidate artifact and final local checks

Candidate: dist-zip/chatgpt-audio-controls-v1.4.1.zip (77 validated entries).
SHA-256: 6f71f787f8c5d8cb2d943303b0aa5c6abfc3b5ca9afc3ffad6e9d8805b63a917.
Application and feedback type checks, both distribution builds, 63 unit/integration
checks (29,325 assertions), seven HTTP checks, manifest/store locale generation,
version consistency and ZIP validation passed. The full browser suite passed
102 scenarios with one intentional skip. Four subsequent focused checks passed,
including two new AAC filename scenarios (104 distinct scenarios overall).
Generated userscript content includes the same recovery and download corrections.
The release gate correctly rejects publication while native/deployment flags
remain false. Local Bun is 1.4.3; CI pins 1.3.9.
