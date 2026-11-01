# v1.4.0 rollout checkpoint — 2026-11-01

The owner authorized committing and rolling out the prepared changes. Version remains 1.4.0. This checkpoint supersedes earlier statements that no rollout was authorized; historical validation records retain their original scope.

## Candidate verification

- Fresh extension/userscript build, TypeScript checking and coordinated version checks passed.
- All 60 unit/integration tests passed across 12 files (29,207 assertions), including local D1 integration and delivered-userscript content parity.
- The website rebuilt all 165 pages across 33 languages. Feedback generation, Worker dry-run/type checks and all six HTTP tests passed.
- The privacy-safe 1920×1080 settings screenshot was refreshed after the final 24px dashboard-card padding adjustment.
- The rebuilt ZIP passed archive validation: 77 entries, version 1.4.0.
- Full browser regressions and remote CI are to be recorded against the pushed candidate. Earlier focused browser evidence is in [support acceptance](SUPPORT-ACCEPTANCE-1.4.0.md).

## Promotion and publication boundaries

Repository rules require feature → develop promotion through a pull request, followed by a version-bump-headed develop → master release PR. The production workflow submits the stores and creates a GitHub release only after its acceptance gate succeeds. Do not enable publication or manufacture acceptance to bypass that gate.

Website deployment can run separately through the reviewed develop branch. Feedback deployment requires staging verification and then the configured production environment. Record successful deployment identifiers and live checks separately from extension store status.

At this checkpoint, all flags in `config/acceptance.json` remain false. Local fixtures do not establish live ChatGPT playback in stock Chrome/Edge, a real userscript manager, real Edge Android, or native macOS acceptance. Only the macOS check permits an explicit owner waiver. No such waiver has been provided.

The latest public release observed before promotion is v1.3.0. A committed candidate, passing CI, website deployment, store submission and public store availability are separate milestones.
