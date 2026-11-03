# v1.4.0 live acceptance

Record device, OS, browser/manager version, extension build, date and evidence beside every completed item. Automated fixture checks alone do not close these live gates.

Latest continuation: [2026-11-02 evidence](RELEASE-ACCEPTANCE-2026-11-02.md), including public website deployment, partial final-candidate Edge checks and two acceptance fixes. Full platform gates remain open.

The subsequent [localization audit](LOCALIZATION-AUDIT-1.4.0.md) supersedes the earlier source snapshot below. It records current extension/userscript checks separately; no live acceptance item was closed by that audit.

## Local release preparation — 2026-11-01

The current candidate passed 43 unit/integration tests (3,190 assertions), six HTTP tests and all 61 browser scenarios across the full run and targeted reruns. The original browser run had 57 passes/four failures; both toast timing cases, the 132-page guide audit and resize/hover language navigation passed after test-infrastructure corrections. The initial worker startup timeout was also resolved, followed by a clean full unit run. See [the handoff](RELEASE-HANDOFF-1.4.0.md) for logs, artifacts and exact limitations.

Application/feedback type checking, both distributions, 33-locale resources, 165 website pages, local/production-configured Worker dry runs, version and archive validation passed. CI now builds before running delivered-userscript parity; workflow YAML/order was checked locally, not in remote CI. No new live-platform evidence was collected. The tagged publication gate remains blocked and all seven acceptance flags remain false. These local results do not close any checklist item below.

## Left sidebar alignment — 2026-10-31

Live Edge inspection found the collapsed rail (about 52px) alongside a hidden 288px navigation panel whose transparent ancestor retained its layout box. The previous build reproduced a 332px player inset against an expected 60px in the regression fixture. The corrected extension and userscript pass both pill orders for top-left, left-center and bottom-left, with 52px collapsed/clipped, 340px expanded and 0px hidden sidebar states, matching drop destinations and unchanged preferences after cancellation. Fourteen neighboring browser cases and 11 geometry/userscript-content parity tests passed; type checking, version/build and ZIP validation passed. Live diagnosis is confirmed; post-fix validation is automated and does not close the platform acceptance gates below.

## Dock corner join — 2026-10-31

The extension and userscript now paint only the empty corner space between the dock and rounded native input. No composer styles are overridden. The non-interactive fill tracks resizing/dragging and disappears when collapsed, hidden or detached. Local pixel assertions passed in light/dark at 320, 390, 768 and 1366px, alongside native style/input checks, dragging, menus, collapse and fallback (14 focused browser cases across both distributions). Eleven geometry/content-parity tests, type checking/build and ZIP validation passed. These fixture checks do not close the live acceptance gates below.

## Audience/layout update — latest evidence (2026-10-30)

This section supersedes earlier automated counts, without closing the outstanding full-platform gates.

- Application type checking/build and feedback type checking/dry-run build passed. Version remains 1.4.0; layout schema/storage keys are unchanged.
- **43 unit/integration tests passed, 3,190 assertions**, including 33-locale catalog completeness, placeholders, Norwegian aliases, language order, feedback intent, campaign filtering, recovery and exact generated-userscript bundle/CSS parity.
- **46 extension/userscript browser tests passed**. Coverage includes all presets and orders, constrained side seeking, 8px native-action clearance, shared preview geometry, cancellation/magnetism, persistence/fallback, native composer style immutability, corner metrics, popup/dashboard responsiveness, command dispatch/edit guidance and five-second readiness safeguards. Two affected capture/light-theme cases passed again after screenshot preparation.
- **11 website/feedback browser tests and six HTTP tests passed**. The website contains 165 pages in 33 locales. Tests cover consent, filtered campaign parameters, store-click events, narrow layouts, localized routes and validated feedback intent without automatic submission. Feedback persistence tests use local Miniflare/D1, not production.
- Actual Windows Chrome and Edge toolbar popups were opened through their toolbar buttons. English controls/About render at normal width. Chrome's Arabic popup was reopened and checked with all four support actions; automatic language was restored afterward. Evidence: [Chrome](evidence/1.4.0-audience/chrome-popup.png), [Chrome RTL](evidence/1.4.0-audience/chrome-popup-rtl.png), [Edge About](evidence/1.4.0-audience/edge-popup-about.png).
- Live Edge / ChatGPT composer comparison: unchanged inline style, 28px radius, zero-width native border and native inset shadow before/after expansion. The visible collapsed tab clears the corner by approximately 34px (28 + 6). Expanded dock width matches the composer and its bottom meets the composer top. The native model-selection menu overlaps the dock region and receives pointer hit testing above it; no model was changed.
- The selected live conversation reported that responses could not load after refresh. Email-content interactions and playback/recovery are fixture-verified; this does **not** establish final live email/Read Aloud acceptance. Actual Android, complete desktop playback, userscript-manager and native Mac acceptance remain pending. No acceptance configuration gate was marked complete from fixtures.
- Test cleanup limitation: browser URL security blocked access to Edge's extension settings during restoration. The local Edge test profile remains on **Composer dock**, rather than its previous **Automatic** desktop preset. Restore Placement → Automatic manually; audio preferences and the narrow-screen profile were not reset.
- Prepared [screenshots and provenance](../assets/store/screenshots/README-v1.4.0.md), [audience baseline](AUDIENCE-2026-10-30.md) and [signing assessment](PACKAGE-SIGNING-ASSESSMENT.md). New translations require native-speaker review. Publishing, feedback/website deployment and signing enrollment were not performed.

Final artifact hashes are in `build/release-1.4.0-evidence.json`; the current ZIP validates as 77 entries. Shared UI bundle-size and Vite third-party directive advisories remain non-fatal build warnings.

## Polish evidence (2026-10-30)

- [x] Actual Windows Edge toolbar popup: normal width, readable navigation and controls; opened through the pinned toolbar icon using the local 1.4.0 candidate.
- [x] Actual Windows Chrome 156.0.8078.48 toolbar popup: normal width and About support card; review link points to Chrome and feedback retains language/theme. Evidence: `build/visual-acceptance/polish/chrome-popup.png`.
- [x] Live Edge model menu remains clickable above the expanded dock. Local fixtures also cover this stacking interaction.
- [ ] Recheck the final composer ring/seam refinement live after reloading the final candidate. The last live pass preceded this final refinement; user interaction interrupted the reload attempt.
- [ ] Repeat actual toolbar opening with long translations and RTL in both desktop browsers. Automated extension-tab width checks do not replace this live check.
- [ ] Reproduce a successfully loaded live email-card response; the selected conversation currently reports failed response loading. The email-header regression passes in both distribution fixtures.

The remaining platform gates below are unchanged. See the release status document for the exact automated run results.

## Edge desktop and live ChatGPT

- [ ] Install the candidate and start ChatGPT's native Read Aloud on a completed response.
- [ ] Verify uninterrupted playback, destructive host pause, repeated resume, forward/backward seeks and seek-only events. Resume progress must be measured from the new seek position.
- [ ] Click the circle; then drag less than 8 pixels and more than 8 pixels. A completed drag must not collapse the player.
- [ ] Try the 14 core desktop configurations: original, four corner L layouts in both orders, two vertical side-center layouts in both orders, and composer dock. Also swap original/dock contents. Previews must match final sizes, orientations and circle locations exactly.
- [ ] Check 24px magnetic capture and at most 12px attraction, 220ms drop/swap settling, 280ms reset and 200ms collapse. Repeat rapidly and with reduced motion. Cancellation restores smoothly and never saves.
- [ ] Verify composer dock matches the painted input width/color, uses one desktop row, has rounded top corners only and no visible seam. The native border, radius and shadow must remain unchanged in both states. The collapsed 32×28px tab clears the end corner radius by 6px, right in LTR / left in RTL.
- [ ] Drag sliders/playback buttons normally; only the circle and dedicated grips move layout.
- [ ] Cancel using Escape, pointer cancellation and an invalid drop. Reload and open another chat/tab to verify persistence. Reset restores original desktop placement and mobile composer docking, both with default order. Verify version-1 migration and honest storage-failure reporting.
- [ ] Resize and zoom; expand the composer and open/close navigation. Keep the player and popovers visible and clear of detected controls. Return to the larger viewport and confirm the saved arrangement is restored.
- [ ] Assign/reassign all 15 commands in `edge://extensions/shortcuts`. Help/settings must show the actual bindings after focus returns. A key mapped to an existing page shortcut must run once.
- [ ] Test disabled shortcuts, editing text/IME, a non-ChatGPT active tab, collapse versus hide, and opening help/settings.
- [ ] During a long response, confirm readiness appears when complete audio bytes become available while playback continues. Verify download bytes/source, disable notification, dismiss, hover/focus timer pause and expiry.
- [ ] Abort capture, replace sessions rapidly and navigate chats. No stale notification may survive or download another session's payload.

## Edge Android

- [ ] Test at 320, 360 and 390 CSS-pixel widths and on an actual phone in portrait and landscape.
- [ ] Verify composer docking is the only narrow preset. Check two rows within one shared surface, the compact secondary-controls menu, pill swapping and touch cancellation. If the composer disappears or space is insufficient, a compact expandable circle remains reachable without saving the fallback.
- [ ] Expand the software keyboard and change browser toolbar visibility; use pinch zoom and rotation. Every control/popover remains reachable; the saved preference is not replaced by a temporary compact fit.
- [ ] Verify popup and dashboard navigation wrap and no page overflows horizontally, including Tamil and Arabic/Persian/Hebrew.
- [ ] Verify menus open on tap, buttons/sliders have usable touch targets, and the circle does not cover ChatGPT's voice/composer controls.
- [ ] Verify operation without the Commands API and the desktop-only assignment explanation.
- [ ] Test retained-audio recovery, toast timing, download completion and the actual mobile file-saving flow.

## Languages and distributions

- [ ] Review all sixteen new translations with native speakers; check player, settings, help, website, feedback and provider-supported store copy.
- [ ] Switch LTR/RTL and back. Only owned interfaces change direction; physical docks stay fixed, timestamps/keys/progress stay intentional.
- [ ] Install the delivered userscript in the supported manager and verify the same layouts, notification, language and playback behaviors. Verify local settings and persistence independently from the extension.
- [ ] Complete real Chrome and native Mac checks or obtain a new explicitly recorded owner waiver for Mac. Do not reuse the v1.3.0 waiver.

## Deployment and publication

- [ ] Deploy and verify the intended website and feedback-worker environments; retain evidence separately from local dry runs.
- [ ] Confirm provider locale availability, save each supported listing, reload, and verify it is complete.
- [ ] Record store submissions, certification results and actual public version availability separately.
- [ ] Update only the acceptance fields supported by recorded evidence. A passing local build is not store acceptance.
