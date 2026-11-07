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

## Additional reports and dock corrections (2026-11-07)

The two November 6 reports on 1.4.1 (Chromium/Windows and Chromium/macOS) are
grouped into issue #30. Inspection of the `v1.4.1` tag confirms the shared native
request still had the fixed 60-second timer. The existing 1.4.2 correction covers
that mechanism; the exact customer sessions have not been reproduced.

A new integration regression delays the retained response body across 118 seconds
of simulated delivery, then verifies destructive pause, backward seek, repeated
resume and an exact-byte download with one speech request. Both distributions
pass. This supplements delayed-header, capture-unit and seek-anchor coverage.

Docking had a separate defect: the painted-surface lookup depended on the English
`Ask ChatGPT` editor label. With `Work with ChatGPT` or a translated label it could
sample the square outer wrapper. The new test failed in both distributions before
the correction: the collapsed tab extended 4px beyond the actual surface instead
of clearing its 28px corner by 6px. Structural editor detection now samples the
rounded surface for geometry, borders and tab placement. English, Spanish and RTL
Arabic fixtures verify this without modifying native composer styles.

Actual nearby native buttons receive 8px collision clearance, including the whole
dock surface. When necessary, the player temporarily uses its compact fallback;
removing the obstruction restores docking with identical saved preferences.
No permanent spacing or styling changes are made to native buttons.

Validation: type checking/build, all 80 unit tests (including exact userscript
parity and 67 locales), and 22 targeted browser regressions pass. Logs:
`build/current-fixes-build.log`, `build/current-fixes-unit.log`,
`build/current-fixes-browser.log`. The corrected composer case was first reproduced
against the previous build in `build/dock-regression-before.log`.

Additional layout/playback coverage includes all desktop presets and pill orders,
magnetic targets, cancellation, saved placement, email headers, native menus,
early pause and direct-source recovery (`build/current-fixes-layout.log`). One
extension drag/cancellation case initially timed out during hover; its isolated
trace-enabled rerun passed for both distributions (`build/drag-recheck.log`).
Record this intermittent result rather than treating the first run as green.
Privacy-safe fixture captures in `build/dock-corrected-expanded-extension.png`
and `build/dock-corrected-collapsed-extension.png` were visually inspected;
equivalent userscript captures are also available.

Rebuilt local package: `dist-zip/chatgpt-audio-controls-v1.4.2.zip`, 99 entries,
SHA-256 `733732f8271a61bb0d933f40dfcc895abc15bc7bebffb319e036e742788e399f`.
Version/source release checks pass; tagged publication acceptance was not granted.
This supersedes the earlier local package hash above.

## Split alignment and docked defaults (2026-11-07)

- Desktop placement now offers `Split (top)` (the existing `original` preset)
  and `Split (bottom)` (`split-bottom`). Bottom alignment follows the composer's
  lower edge as its height changes, for either pill order. The same geometry is
  used by rendering, collisions and drag previews. Constrained screens retain
  the existing temporary fallback rather than overwriting the saved choice.
- Fresh profiles and Reset layout use composer docking on desktop and mobile.
  Existing version-2 preferences are unchanged. Version-1 automatic/unsupported
  profiles still migrate to their previous original split behavior.
- The shared settings selectors and userscript expose localized split labels in
  all 67 locales. Layout storage keys/schema, physical RTL positioning, playback
  controls and permissions are unchanged.
- Type checking/build, all 82 unit tests, exact userscript parity, locale-key
  coverage and 1.4.2 version/package checks pass. Logs: `build/split-bottom-build.log`
  and `build/split-bottom-unit.log`.
- The earlier hover timeout recurred in the focused run. The drag fixture now
  foregrounds its page (fresh installation can open the tour) and awaits FLIP
  completion before hover hit testing. Two repeated runs pass in both distributions
  (`build/split-drag-check.log`), without forced clicks or disabled animations.
- Local ZIP: `dist-zip/chatgpt-audio-controls-v1.4.2.zip`, 99 entries, SHA-256
  `352fefd51a9c873b14c0b6c719cf2efcc5e44b72c926ccfe7830b3ed52e9e15b`.
  This supersedes the preceding package hashes. Native-device acceptance remains
  pending; these checks do not publish the candidate.
- The complete player and support browser suites pass: 101 passed, one expected
  userscript-only skip for extension dashboard/popup pages (8.2 minutes).
  Log: `build/split-final-browser.log`. Coverage includes fresh dock defaults,
  both split alignments/orders, composer growth, active drop geometry, persistence,
  narrow-screen restoration, keyboard settings/reset and playback recovery in both
  distributions. Privacy-safe tall-composer captures are
  `build/split-bottom-extension.png` and `build/split-bottom-userscript.png`.

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
