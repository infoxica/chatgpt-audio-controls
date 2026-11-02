# v1.4.1 release status — 2026-11-02

**Unreleased candidate.** Local implementation and staging are separate from
native-device acceptance, PR approval, production deployment and store release.
See [acceptance](ACCEPTANCE-1.4.1.md) and [website operations](WEBSITE-RELEASE.md).

## Implementation

Adaptive compact controls, shared preview geometry, SVG viewer close button,
README/changelog cleanup, root-domain links, readable sitemap, Worker selective
static routing, safe legacy redirects and scoped-credential CI are prepared.
Preferences, playback, permissions and feedback protections are preserved.
The genuine 1.4.0→1.4.1 metadata bump is the final implementation commit.

## Staging and rollback

Combined website/feedback staging was deployed to
https://chatgpt-audio-feedback-staging.anand224patel.workers.dev/ as version
12cbcc9a-0238-45cb-97ef-df9d4e9a5b44. Browser probes passed public homepage,
Japanese guide, Arabic page, sitemap, private feedback, health, API errors and
missing-page behavior. Staging is noindex. Raw HTTP clients received Cloudflare
1010 responses; browser probes succeeded without weakening security.
This early staging snapshot precedes final metadata and viewer CSS rebuilding;
it is not final-candidate production acceptance.

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
Android's debugging endpoint is reachable. Candidate installation/testing is in
progress; connectivity is not acceptance. The user will run the Mac checklist.

Normal PR approval, final platform acceptance, website promotion, release tagging
and Chrome/Edge submissions remain open. Do not set acceptance flags from
responsive emulation, previous versions or staging-only evidence.
