# v1.4.0 rollout checkpoint — 2026-11-02

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

At this checkpoint, `feedbackDeployment` is true; the remaining flags in `config/acceptance.json` are false. Local fixtures and the limited Edge smoke check below do not establish the complete desktop matrix, real userscript-manager, Edge Android, or native macOS acceptance. Only the macOS check permits an explicit owner waiver. No such waiver has been provided.

The latest public release observed before promotion is v1.3.0. A committed candidate, passing CI, website deployment, store submission and public store availability are separate milestones.

## Commit and service deployment

The prepared changes were committed as `4a7faaa` and pushed in PR #24 against develop. Duplicate v1.3.0 ancestry caused conflicts. Rebasing the three v1.4.0 commits onto develop resolved them: both base trees were `b855bba17b94bc2f2aae9c13e2dbfe53e65e03d3`, and the candidate tree remained `7266268de4c8e3308fef1bc6e2bcae022b16331d`. The rebased support commit is `7aabcfb`; the old local branch is retained as `feature/v1.4.0-pre-rebase-4a7faaa`.

Feedback staging deployed as `6c13a4fb-fc51-47c7-beb1-ef0faed05e00`. Its health endpoint and all 33 locales passed installed-Edge rendering, direction, no-overflow, bug-intent and theme checks. Neither staging nor production required database migrations.

The same bundle deployed to the configured production feedback domain as `7f11f9b3-4a4b-41a4-ba64-5251022a0459`. Previous production version `19b46632-5f29-4585-ba69-dc699d260943` remains the rollback reference. No secrets or schema were changed.

Production passed the same 33-locale rendering/direction/theme/intent checks. Edge returned `{"ok":true}` from `/health`. After explicit owner approval, a labelled synthetic submission reached the success screen and its exact D1 row was verified. Cleanup matched both its UUID and unique test comment; exactly one row was removed and the remaining count was zero. Real feedback was untouched. `feedbackDeployment` is now true; other acceptance flags remain false.

PR #24 requires one approving GitHub review, including approval after the most recent push. No branch protection or review requirement has been bypassed. Website promotion remains pending that merge.

## Live Edge smoke check

After explicit owner approval, the enabled unpacked 1.4.0 extension was reloaded through Edge's Extensions page. The installed 1.3.0 store copy remained disabled. Native Read Aloud on the approved completed response produced visible advancing player time. Pause held at 24 seconds; a backward seek moved to 14 seconds and remained paused until explicit resume. Resume advanced from that position. Playback was left paused and the player collapsed. No conversation content or audio was saved or published.

The real Edge toolbar popup opened at its stable width. About displayed the header, donation amounts and review section with normal wrapping and spacing. This English smoke check complements, but does not replace, the isolated multilingual popup checks or the remaining live acceptance matrix.

Remote browser testing exposed two timing failures, corrected by waiting for the rendered preset before dragging and persisted checkbox state after clicking. A third failure was genuine German heading overflow at 320px with a wider system font. The heading now shrinks and wraps long words; regression coverage waits for locale loading and deliberately exercises the wider Arial fallback on every platform. Exact-commit remote CI remains the promotion check.
