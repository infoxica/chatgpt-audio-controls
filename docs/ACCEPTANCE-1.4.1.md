# v1.4.1 acceptance — 2026-11-02

This candidate includes the unpublished 1.4.0 work. Earlier acceptance documents
are historical evidence, not proof that this candidate passed a native platform.

## Local evidence

- Application type checking passed. Geometry covers 1512×982, 1440×900,
  1280×800, 1728×1117, 1920×1080 and narrow widths. Full 356px controls fall
  back to a 224px presentation with 44px buttons before changing arrangement.
- The complete browser run passed 102 scenarios; one
  extension-inapplicable userscript scenario was skipped. Initial failures came
  from tests trying to click secondary controls before opening More, including
  a controls-expansion timing race, and an old website URL expectation. Updated
  tests use the actual More interaction and wait for visible controls.
- After real Android testing exposed an AAC file-decoder failure, the complete
  102-scenario run passed again with a retained-byte MediaSource fallback. Four
  focused extension/userscript checks then passed, including two new AAC
  filename checks: 104 distinct scenarios in total. The filename test isolates
  MIME selection with a playable tone; it does not claim native AAC decoding.
- Original/split and all preset/order fixtures, exact drag geometry, destructive
  pause and retained-source recovery, localized labels, support reminders,
  popup/settings, image-viewer SVG centering and website RTL were exercised.
- Seven HTTP tests passed, including XML parsing, 165 unique URLs, 34 distinct
  alternatives per URL and retrieval of every localized page.
- Worker routing tests protect private feedback/API/health paths from colliding
  static filenames. Public assets use the configured asset binding.

Emulation does not establish native Mac or Edge Android acceptance. Final build,
archive checks and native results are recorded in RELEASE-1.4.1-STATUS.md.

## Mac checklist for the candidate

1. Extract the candidate ZIP, enable developer mode at chrome://extensions or
   edge://extensions, disable the store copy temporarily, and Load unpacked from
   the extracted folder containing manifest.json. Confirm version 1.4.1.
2. Use a fictional conversation. At the reported 1512×982 display setting,
   record the actual browser viewport (window.innerWidth × window.innerHeight),
   macOS/browser version, zoom and display scaling. Test 100% and 125% zoom,
   sidebar open/closed, light/dark and Arabic or Persian UI.
3. Start native Read Aloud. Check original, four corners, two side centers and
   composer dock, both pill orders. Nothing should clip or cover native controls.
   At constrained widths, More exposes speed, volume, download and help.
4. Drag/swap/cancel, collapse/expand, resize and reset. Reload and confirm the
   saved layout. Check composer growth, model menus and keyboard focus.
5. Pause/resume repeatedly, seek backward/forward, change speed/volume and
   download full retained audio. Confirm no position loss or duplicate playback.
6. Open the real toolbar popup repeatedly and the website image viewer. Confirm
   readable controls and a centered close icon. Return results and any cropped,
   privacy-safe screenshots; a Mac-only waiver does not satisfy this bug report.
7. Disable/remove the unpacked test copy and restore the store copy afterwards.

## Android checklist

Use the exact candidate, not the installed 1.3.0 store copy. Record browser,
Android, candidate version and actual viewport. Test portrait/landscape,
keyboard appearance, composer growth, docking, touch targets, More/popovers,
seek, pause/resume and downloaded audio in a fictional conversation. Restore
normal rotation and developer-mode settings after testing.

### Real-device observations — partial, not acceptance

Samsung Galaxy S25 Ultra, Android 17, Edge 156.0.4314.43, unpacked 1.4.1:

- Native AAC began playing, but pause/resume initially failed with
  `DEMUXER_ERROR_NO_SUPPORTED_STREAMS` from the retained file decoder. The
  streaming fallback resumed advancing playback and supported forward seek.
  No speech request or format conversion was added.
- Observed CSS viewports were 411×729 portrait, 855×329 landscape and 411×413
  with the keyboard. Geometry snapshots had no horizontal overflow. Composer
  growth and return from keyboard/rotation were exercised; the volume popup's
  scroll dimensions matched its client dimensions.
- The browser reported all 270,338 retained bytes received for a download, but
  no completed saved file was confirmed. A prior debugger connection may affect
  download handling; a clean-browser saved-file check remains required. The
  recorded pending download was cancelled. Do not mark `edgeAndroidLive` true.
- The final filename correction passed both-distribution browser tests. The
  updated candidate was copied to the phone but left disabled. The original
  1.3.0 store copy, developer-mode setting and rotation were restored; the test
  tab and temporary inspection dumps were removed. No personal chat media was
  saved or published. Local JSON evidence contains only test/geometry data.

Repeat the full native checklist on the final candidate before acceptance,
including stable touch transitions and a completed, playable saved audio file.

## Media provenance

The existing demo is a 23-second walkthrough of playback, speed, seeking,
download, collapse and docking. Video/screenshots are 1920×1080 (16:9), captured
in an isolated fictional conversation without personal chats, account details
or microphone recording. This is acceptance metadata, not homepage/README copy.
