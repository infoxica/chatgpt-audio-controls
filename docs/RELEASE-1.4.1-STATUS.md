# v1.4.1 release status — 2026-11-03

**Production website deployed; extension publication pending.** Local validation,
owner-reported device acceptance, deployment, store submission and public
availability are separate milestones.

## Merged implementation

PR #26 merged into develop as `5416d0b8924653ababcd21c099b5ecb07e2e75d1`.
Its tree matches the tested candidate `0dd49af`; GitHub also marked #25 merged.
The merge genuinely changes package and manifest versions from 1.4.0 to 1.4.1.
The owner explicitly accepted this verified merge as satisfying the final
version-bump rule, despite its merge-commit title, without rewriting history
or incrementing to 1.4.2. The remaining acceptance follow-up changes evidence
and release flags only; it does not change the candidate implementation.

## Acceptance

- CI [41610640161](https://github.com/infoxica/chatgpt-audio-controls/actions/runs/41610640161)
  passed: 122 browser tests, one intentional skip, builds, type checks, unit
  tests, delivered-userscript parity, Edge listings and archive validation.
- Merged develop CI
  [41638313445](https://github.com/infoxica/chatgpt-audio-controls/actions/runs/41638313445)
  also passed.
- The owner confirmed reloaded 1.4.1 passed desktop Chrome, Edge and Tampermonkey
  playback, pause/resume, seeking and download. These are owner-reported passes;
  the agent did not bypass the browser restriction on Extensions pages.
- The owner previously confirmed the real Mac checklist. Real Edge Android
  touch, rotation, keyboard, playback and saved AAC download checks passed as
  detailed in [acceptance](ACCEPTANCE-1.4.1.md).
- The Android unpacked candidate remains enabled and store 1.3.0 disabled;
  restoring that state remains a manual cleanup item, not a release failure.

## Website and feedback

Production now serves the merged website at
https://chatgpt-audio-controls.infoxica.com/ through Worker version
`b83cc576-8631-4145-a06c-e008ef4fcef4`.
The exact production configuration passed a dry run; all seven local HTTP
checks passed. Live Edge verified homepage, 67-language menu, image viewer,
1920×1080 video playback, Urdu RTL without horizontal overflow, database health,
feedback intent and 67 locale options, and the API's method guard. The production
sitemap has 335 unique canonical URLs and 68 alternatives per URL; robots points
to the new hostname. Raw scripted HTTP probes received Cloudflare 403 responses;
browser verification was used without weakening protection.

The existing feedback persistence/Turnstile acceptance remains valid; this
promotion retains the production database, secret and challenge configuration.
The current form and database health were rechecked, with no new feedback record
submitted. See the prior production feedback acceptance in
[the 2026-11-02 record](RELEASE-ACCEPTANCE-2026-11-02.md).

Staging version: `ea7cb0bd-6c4d-4c48-8e54-22a81f8b487c`.
Rollback Worker: `7f11f9b3-4a4b-41a4-ba64-5251022a0459`.
The prior Pages artifact remains at
`build/rollback/github-pages-41343042645/artifact.tar`, SHA-256
`41dfc67ef8cec3411e1a4f9a1ac8935c730b9609020b044c07df26d8e00e8f5f`.

Cloudflare deployment was performed with the existing local authenticated CLI.
GitHub has no Cloudflare scoped token/account secrets or protected Cloudflare
production environment configured yet; automated Cloudflare deployment remains
unconfigured. Local OAuth credentials were not copied to GitHub.

## Remaining rollout

Merge the acceptance-only follow-up through develop, then prepare develop ->
master using the owner's verified-version exception. Run CI/release validation
on the final candidate. A master version increase triggers GitHub release and
Chrome/Edge submission workflows. Record each provider result separately;
submission or certification does not prove public availability. Legacy Pages
redirect activation is recorded separately after its workflow succeeds.
