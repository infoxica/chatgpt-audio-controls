# Investigation: interrupted audio and missing controls

Investigated 2026-11-06 against feedback `c1629939-b71f-47dc-aee4-051b5f29b434`
(2026-10-29, extension 1.3.0, Chromium/Windows). Personal details and conversation
content are intentionally omitted.

## Confirmed defect and correction

Both 1.3.0 and the current candidate gave retained speech capture a fixed
60-second deadline. Its AbortController was also supplied to ChatGPT's native
fetch. A capture timeout could therefore abort the response ChatGPT was consuming.

Before the correction, an isolated slow-speech browser fixture failed in both
extension and userscript distributions: after advancing the clock 61 seconds,
the pending native request rejected with AbortError. This reproduces a mechanism
consistent with the report, not the reporter's exact production session.

The correction separates the clone's cancellation from the native transport.
Nonempty chunks reset a 60-second inactivity deadline. Expiry rejects retention
and cancels only its reader; the native request can still finish. Once retention
fails, the original caller's cancellation is honored, including an earlier abort.
Explicit session replacement still disposes capture. Late completion cannot
turn expired retention into a successful download. Pause recovery continues to
retain an active capture as before.

Regression coverage checks progress beyond one minute, expiration, late results,
host cancellation before/after expiration, and session replacement. Browser
fixtures check that the slow request survives the deadline and can subsequently
complete or be canceled by its native caller in both distributions.

## Missing controls and console messages

The 1.3.0 UI mounted as soon as the body existed and did not restore player nodes
removed by host DOM replacement. The current candidate already defers initial UI
mounting until DOMContentLoaded and restores detached player elements. Existing
browser regressions cover restoration without resetting visibility or playback.
These mitigations do not establish exactly why this user's bar disappeared.

[React error 418](https://react.dev/errors/418) identifies a hydration mismatch;
DOM changes before hydration are one possible cause. The report has no stack
trace identifying the offending mutation. The asynchronous-message warning also
lacks a source/stack trace; existing settings handlers settle both success and
failure paths, and no specific missing response was reproduced. Neither message
alone proves the cause of the audio interruption.

## Additional 1.4.1 reports (2026-11-07 investigation)

Grouped under [GitHub issue #30](https://github.com/infoxica/chatgpt-audio-controls/issues/30):

- November 6, Chromium/Windows, Spanish UI: playback stops partway through;
  restarting Read Aloud is necessary, and pause/backward seek can leave it stuck.
- November 6, Chromium/macOS, English UI: playback stops after about a minute;
  repeated reinstallations do not help.

Version 1.4.1 contains the same fixed-timeout mechanism corrected in PR #29.
These reports are consistent with that defect, but neither original user session
was reproduced and a Mac platform result cannot be inferred from Chromium fixtures.
No additional audio-path change was needed based on this investigation.

Existing tests cover destructive native pause, pending retention, repeated resume,
seek anchors, source replacement and decoder fallback. A new browser regression
delays the retained response body in chunks across 118 seconds of simulated time,
then exercises native source removal on pause, backward seek, repeated resume and
an exact-byte download. It asserts one speech request, in both distributions.
This adds body-progress integration coverage to the existing delayed-header and
capture-unit tests; it does not represent 118 seconds of real-device listening.

## Release boundary

The correction is prepared in the unreleased 1.4.2 candidate for both the
extension and generated userscript. See [candidate acceptance](ACCEPTANCE-1.4.2.md)
for validation results. Live long-response playback in Chrome and Edge remains
required before publication. No telemetry, permissions, voice or TTS changes
are introduced. This investigation does not claim the reporter's device is fixed
until they receive and verify a published update.
