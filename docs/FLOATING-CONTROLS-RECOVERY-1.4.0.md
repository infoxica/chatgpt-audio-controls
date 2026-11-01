# Floating controls recovery — 2026-11-01

## Observed failure

The live Edge ChatGPT tab had a composer and an extension status element, but no player layer, rails or launcher. Its console reported React hydration error 418, indicating a client-side page rebuild. The player held references to its original elements and updated them without checking whether their container remained attached.

This identifies a DOM lifecycle failure, not an off-screen position or a saved hide setting. The exact change that triggered ChatGPT's hydration mismatch has not been isolated to a commit; the checkout contains the coordinated, uncommitted 1.4.0 changes. The 1.3.0 startup also inserted UI early, so the evidence does not justify blaming the localization changes.

## Fix

- Keep audio interception at document start, and defer UI insertion until DOMContentLoaded.
- Reattach the existing player layer during layout synchronization if the host removes it. Cancel any interrupted drag and recompute geometry without recreating playback sessions or listeners.
- Restore the generated userscript stylesheet when the host removes it.
- Preserve saved layout, deliberate hiding, and collapsed state.

## Verification

- Before the fix: the new DOM-removal regression failed for both extension and userscript because the launcher never returned.
- After the fix: 10 focused browser tests passed, covering DOM recovery, mobile fallback, RTL, destructive host pause/replacement and rapid pause/resume.
- The final recovery test, extended with saved-layout and intentional-hide assertions, passed for both distributions (2 tests).
- Playback/layout/userscript parity unit tests: 20 passed, 631 assertions.
- TypeScript and extension/userscript builds passed. Existing large-chunk advisory remains.
- Version check and ZIP validation passed: 1.4.0, 77 ZIP entries.
- Live Edge: after refreshing ChatGPT, the branded launcher was visible; clicking it made both rails visible and changed the accessible state to expanded. Live audio was not retested because the native response reported that it could not load. Actual Android acceptance and publication remain separate.

## Updated artifacts

- `dist-zip/chatgpt-audio-controls-v1.4.0.zip`: SHA-256 `68f6bbef99ed5b6fc78839bd96687f02a35e6035f72e253bb9d514be358fde20`
- `userscript/chatgpt-audio-controls.user.js`: SHA-256 `854291cde6599c628f7a4afa62f4ee8f25c07188340e2766c4a4856ce270c8fe`

These supersede the artifact hashes in the earlier localization evidence. No submission or deployment was performed.
