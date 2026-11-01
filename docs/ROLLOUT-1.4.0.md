# v1.4.0 rollout checkpoint — 2026-11-01

The owner authorized committing and rolling out the prepared changes. Version remains 1.4.0. This checkpoint supersedes earlier statements that no rollout was authorized; historical validation records retain their original scope.

## Candidate verification

- Fresh extension/userscript build, TypeScript checking and coordinated version checks passed.
- All 60 unit/integration tests passed across 12 files (29,207 assertions), including local D1 integration and delivered-userscript content parity.
- The website rebuilt all 165 pages across 33 languages. Feedback generation, Worker dry-run/type checks and all six HTTP tests passed.
- The privacy-safe 1920×1080 settings screenshot was refreshed after the final 24px dashboard-card padding adjustment.
- The rebuilt ZIP passed archive validation: 77 entries, version 1.4.0.
- The full browser run passed 89 cases, skipped one expected userscript-only case, and found two test failures. The old four-link support selector was narrowed to review/support actions after donation links were added; the composer pixel check now waits for scheduled theme sampling. Both corrections passed all six targeted repeated cases. Exact-commit remote CI must still pass. Earlier focused evidence is in [support acceptance](SUPPORT-ACCEPTANCE-1.4.0.md).

## Promotion and publication boundaries

Repository rules require feature → develop promotion through a pull request, followed by a version-bump-headed develop → master release PR. The production workflow submits the stores and creates a GitHub release only after its acceptance gate succeeds. Do not enable publication or manufacture acceptance to bypass that gate.

Website deployment can run separately through the reviewed develop branch. Feedback deployment requires staging verification and then the configured production environment. Record successful deployment identifiers and live checks separately from extension store status.

At this checkpoint, all flags in `config/acceptance.json` remain false. Local fixtures do not establish live ChatGPT playback in stock Chrome/Edge, a real userscript manager, real Edge Android, or native macOS acceptance. Only the macOS check permits an explicit owner waiver. No such waiver has been provided.

The latest public release observed before promotion is v1.3.0. A committed candidate, passing CI, website deployment, store submission and public store availability are separate milestones.

## Commit and service deployment

The prepared changes were committed as `4a7faaa` and pushed in PR #24 against develop. Duplicate v1.3.0 ancestry caused conflicts. Rebasing the three v1.4.0 commits onto develop resolved them: both base trees were `b855bba17b94bc2f2aae9c13e2dbfe53e65e03d3`, and the candidate tree remained `7266268de4c8e3308fef1bc6e2bcae022b16331d`. The rebased support commit is `7aabcfb`; the old local branch is retained as `feature/v1.4.0-pre-rebase-4a7faaa`.

Feedback staging deployed as `6c13a4fb-fc51-47c7-beb1-ef0faed05e00`. Its health endpoint and all 33 locales passed installed-Edge rendering, direction, no-overflow, bug-intent and theme checks. Neither staging nor production required database migrations.

The same bundle deployed to the configured production feedback domain as `7f11f9b3-4a4b-41a4-ba64-5251022a0459`. Previous production version `19b46632-5f29-4585-ba69-dc699d260943` remains the rollback reference. No database records or secrets were changed. Production live checks and end-to-end challenge/submission acceptance remain distinct from this successful deployment; the acceptance flag is not yet closed.
