# 1.4.2 patch candidate

## Changes

- Isolate optional retained-audio capture from native speech cancellation. Reset
  the capture inactivity limit on incoming bytes; expiry must not terminate
  ChatGPT's active request. See [the reported-bug investigation](BUG-1.4.2-STREAM-TIMEOUT.md).
- Restrict floating UI to ordinary chats, project/custom-GPT chats and Codex.
  Other routes and visible native modal dialogs hide the player. Returning to a
  supported surface restores the existing visibility/layout preferences.
- Add a five-step tour based on the Claude Audio Controls welcome flow, using
  ChatGPT's existing translated instructions and 67 localized navigation catalogs.
  Fresh installs open it once; updates/startup do not. Manual replay is available
  in popup About, dashboard sidebar, the getting-started panel and player Help.
  The userscript offers an in-page tour from Help and its settings dialog.
- Keep the expired-rating fix in PR #29: filter contributors by their own rating
  observation time before computing weighted/max display values. A stale Edge
  observation cannot suppress fresh Chrome ratings. Raw API observations remain
  available with their timestamps.

## Local validation (2026-11-06)

- Type checking and the Chrome/Edge MV3 build pass. The standalone userscript is
  regenerated from the shared source; exact bundle/CSS parity passes.
- Unit suite after the timeout correction: 80 tests pass, including capture
  inactivity/cancellation, playback recovery, all 67 locale catalogs,
  statistics expiry/aggregation, Worker routing and feedback protections.
- Final release-preparation browser run: 84/84 extension/userscript/tour tests
  pass after the timeout correction (`build/release-1.4.2-browser.log`).
  Coverage includes route/modal visibility without stopping audio, replay links
  on every extension surface, nested userscript dialog focus restoration, fresh
  install versus update behavior, five tour steps, skip/completion, storage
  failures, narrow layouts, RTL, playback recovery, dragging and saved layouts.
  The first run exposed a coordinate race in the drag test after a layout save;
  the helper now waits for the existing FLIP animation before reading bounds.
- After the timeout correction, 22/22 targeted browser regressions pass across
  extension and userscript: slow native requests survive capture expiry and can
  finish or be canceled by the host; destructive pause/resume, MediaSource
  recovery, seek/download, readiness and DOM-replacement visibility still pass.
  The two original slow-request cases failed before the correction with AbortError.
  These use an accelerated clock and synthetic responses, not a live user chat.
  Logs are `build/report-unit-after.log`, `build/report-browser-after.log` and
  `build/report-build-after.log`.
- Tour screenshots were visually checked at desktop and 360px RTL widths. Local
  captures are `build/browser-results/feature-tour-desktop.png` and
  `build/browser-results/feature-tour-rtl.png`.
- Website statistics: four rendered-browser checks pass, including fresh Chrome
  ratings after the retained Edge max-rating contributor expires, narrow RTL
  rendering and unavailable-data fallback.
- Version and source release checks pass at 1.4.2. Live publication acceptance is
  deliberately unset in `config/acceptance.json`; 1.4.1 results are not reused.
  The tagged publication check was exercised and correctly rejects the incomplete
  acceptance record (`build/release-1.4.2-gate.log`).
- Local package: `dist-zip/chatgpt-audio-controls-v1.4.2.zip`, 99 entries, integrity
  checked, with the new tour entry and assets included. SHA-256:
  `b207b1c957c4be832f6df5e36c4cff93f1bf5204cf04ac2cf81e32b215e37e19`.

## CI follow-up (2026-11-06)

CI run `42264523712` passed build/unit checks and 136 browser tests, but failed
the two cross-tab support tests (extension and userscript). The new modal-aware
player visibility predicate incorrectly cleared a shown support card; its claim
was already consumed, so it could not return when the native dialog closed.

The fix distinguishes permanent route/intentional hiding from temporary modal
deferral. Both native dialogs and ARIA modals now retain the card while hidden,
restore it on closing, and keep the display count at one. The original failure
was reproduced locally in both distributions before the correction. Version
remains 1.4.2; extension and generated userscript share the fix.

The unit suite passes 80 tests after this correction. All 17 applicable targeted
browser checks pass, covering support requests, player visibility and tour entry
in both distributions; the userscript-only React-surface check is intentionally
skipped. Logs: `build/ci29-after.log` and `build/ci29-unit.log`. Build, userscript
parity, version and ZIP validation pass. The next PR CI run must confirm the full
browser suite. The owner will test Mac and Edge Android; acceptance remains unset.

## Acceptance boundaries

Verify live slow/long Read Aloud responses in Chrome and Edge, including playback
beyond one minute, pause/resume and downloads. The isolated timeout reproduction
does not confirm the exact cause on the original reporter's device.

Before publishing this candidate, verify a fresh Chrome/Edge installation opens
the tour, while an update/reload does not. Replay it from About, getting started,
the dashboard sidebar and player Help. Verify Next/Back, Skip, completion, keyboard
navigation and manual language/theme preferences. In the userscript, also check
the nested settings-to-tour dialog returns focus to the Feature tour button.

On live ChatGPT, open a conversation, project chat and Codex, then visit Settings,
Spaces, Dots and other non-chat routes. The player must return with its saved
placement and intentional hide/collapse preference intact. Opening a native
settings dialog must hide the UI without pausing already-playing audio. Repeat on
desktop and Edge Android; fixture tests do not attest the current native DOM.

The tour uses static illustrative controls, never real conversation content or
recorded audio. Completion/skip is a local preference only. No new permissions,
telemetry, voice changes or automatic prompts on updates are introduced.

Browser fixture checks do not establish live Mac, Android or provider acceptance.
Production deployment, extension-store publication and the unresolved live Chrome
audience/Edge statistics gates remain separate from this patch's local validation.

## Release preparation checklist

- [ ] PR #29's final 1.4.2 head passes CI and receives review approval.
- [ ] Record current Chrome, Edge and userscript live playback/tour acceptance.
- [ ] Record real Edge Android acceptance and Mac acceptance (or an explicit
  Mac-only waiver under the existing policy).
- [ ] Complete website/feedback production checks; retain rollback artifacts.
- [ ] Update only verified entries in `config/acceptance.json` for 1.4.2.
- [ ] Merge into develop through PR #29, then prepare the develop-to-master
  release PR while preserving the genuine final version-bump commit required by
  `.agents/rules/git.md`. Do not rewrite shared history or bump another version
  simply to disguise a merge commit.
- [ ] Pass `RELEASE_TAG=v1.4.2 bun run release:check` before release promotion.
- [ ] Record GitHub release, Chrome/Edge submissions, certification and public
  availability separately. A version increase on master triggers publishing;
  merging this feature branch into develop only runs validation.
