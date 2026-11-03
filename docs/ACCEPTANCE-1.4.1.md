# v1.4.1 acceptance — 2026-11-02

## Release continuation — 2026-11-03

The owner confirmed the requested real Mac checklist passed for candidate 1.4.1
(docking, dragging, playback, seeking and download). This is owner-reported
acceptance, not an automated macOS run. `nativeMac` is now true. Other gates
remain unchanged until their current-candidate checks are completed.

## Navigation and accent revision — 2026-11-03

This is the latest local evidence and supersedes the artifact hashes and test
counts below. Version remains **1.4.1**; nothing was deployed or published.

- The mobile header is full-width, one row and 72px high, with 12px horizontal
  padding and 44px controls. Donate is icon-only and the menu stays physically
  rightmost in RTL. The measured header continues to set anchor clearance.
- The desktop language panel fits all 67 entries without scrolling at
  1512×850 and 1536×724. The mobile dialog uses two, three and four columns,
  locks background scrolling, retains its heading/close control, traps focus,
  closes with Escape and restores focus. Checks include 320, 360, 390, 480,
  768 and 1000px widths, RTL and translated labels.
- Transport order is Play/Pause, backward, forward, then the existing actions.
  Both distributions share the same renderer, including compact and preview UI.
- Read-only inspection of current ChatGPT in Edge found the active blue action
  token `--color-background-accent-action: #2c67c5`, while the old
  `--theme-submit-btn-bg` token was absent. The old extension fallback was
  `#3a83f7`. Accent resolution now follows the composer ancestor chain, ignores
  unrelated themed elements, rebinds after replacement and refreshes on focus.
  Validated optional color fields extend the existing cache without changing
  its key or System/Light/Dark behavior. Popup/settings subscribe to live changes.
- Isolated fixtures passed seven named colors, two successive custom colors,
  white/black foreground contrast values, nested owners, replacement, and popup
  reopening. Automatic approval review rejected changing the live account's
  accent preference; no preference was changed. Live color-switch acceptance
  was therefore not performed. Fixtures do not establish native Mac acceptance.
- PayPal links remain direct and parameter-free. Website-only
  `support_link_click` events require consent and include only the provider,
  predefined amount/currency, locale and controlled placement (plus GA's beacon
  transport option). Declined/withdrawn consent suppresses events. Consent and
  privacy disclosures now mention these clicks in all 67 languages. No extension
  telemetry, payment detection or new permissions were added.

Validation:

- Application/website type checking and extension, userscript and website builds
  passed. All **65 unit tests / 60,464 assertions** passed, including playback
  recovery, seek anchors, locale validation and exact userscript bundle/CSS parity.
  The Worker fixture needed loopback access outside the filesystem sandbox.
- The broad browser run passed 98/99 checks; the locale sweep hit Chrome's
  synchronized-storage write quota. Test-only pacing fixed that issue. The final
  affected run passed **13/13**, including that sweep and four new width/panel
  cases. A further **8/8** rendering check verified settled menu geometry and
  captured screenshots. All 103 distinct current cases have passing evidence
  across these runs; there was no second full-suite run.
- Seven website HTTP checks, version checks and source release checks passed.
  The release command without a tag skips publication acceptance; it is not a
  release approval. The existing large localization-bundle warning remains.
- Combined Worker/static assets and legacy redirects were prepared locally.
  Real Mac acceptance, remaining Android acceptance, native browser acceptance,
  deployment, store submission and public availability remain separate/open.

Privacy-safe fixture captures are under `build/acceptance-1.4.1/`:
`mobile-header-320.png`, `language-modal-390.png`,
`desktop-languages-1512.png`, and `desktop-languages-1536.png`.

Every one of the 96 ZIP entries matches `dist` byte-for-byte. The manifest is
1.4.1 and includes 52 browser-supported locale catalogs.

| Latest artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `dist-zip/chatgpt-audio-controls-v1.4.1.zip` | 1,298,141 | `e08818288a9fbe72462627fd94f0bd993750b1845ed80b7fb1dbdb1f65a0b7a3` |
| `userscript/chatgpt-audio-controls.user.js` | 1,636,178 | `e379bd4711ee77fa65e8b37bed1f8bf38c27dbf2ffaa528ba84107209c3f4954` |

Machine-readable latest hashes: `build/acceptance-1.4.1/artifacts.json`.

## Earlier local revision — 2026-11-03

This section supersedes earlier local counts below. Version remains **1.4.1**.
It does not establish native Mac/Android acceptance or public availability.

- Main dragging now lifts into an inert, aspect-preserving preview within
  240×120px. Inactive destinations show circles; only the magnetic destination
  shows full resolved outlines. Control dragging remains a swap within the
  current layout. Hidden/clipped sidebars no longer reserve invisible space.
- The website header is sticky with measured anchor clearance. The expanded
  language menu scrolls within the viewport; long translated paragraphs wrap.
- PayPal coffee support is available beside Sponsors on all support surfaces.
  Public `paypal.me/infoxica/{1,3,5,10}USD` destinations were opened in Edge:
  each reached `@infoxica` and displayed the matching USD amount. No Send action
  or payment was performed. Both providers retire the same donation request
  when opened; this never records payment completion.
- UI coverage is **67 locales**, including 34 additions; browser manifest
  catalogs cover **52 supported codes**. Unsupported browser-managed locales
  use fallback catalogs while custom UI remains available. The generated site
  contains **335 pages**, with **68 alternatives** per sitemap URL including
  `x-default`. Feedback privacy links now use the official hostname.

### Validation and limitations

- Application and feedback TypeScript checks passed. All 64 unit tests passed
  (60,391 assertions), including playback recovery, seek anchors, engagement,
  locale/placeholder validation and exact generated-userscript content parity.
- Seven website HTTP tests passed. Browser checks covered all 67 player,
  popup/settings and feedback translations, all 268 localized guide pages,
  RTL, narrow widths, support links, reduced motion and both distributions.
  Menu/paragraph overflow found during the broad browser run was corrected.
  The final affected-suite rerun passed **32/32** drag/laptop/website tests;
  the subsequent 67-locale feedback/privacy-link check also passed.
- Laptop coverage includes 1512×982, 1536×864 and reduced CSS viewport sizes
  such as 1512×850 and 1335×724. Responsive tests are not native macOS evidence.
- Extension/userscript builds and version/source release checks passed.
  Cloudflare Worker/static-assets **dry-run only** passed with 1,495 assets.
  The publication gate was not asserted. Vite reports the large localization
  bundle warning; no new runtime translation service or telemetry was added.
- Existing translations were retained. New translation drafts were checked
  for schema, variables, terminology and rendering, but have not had complete
  native-speaker linguistic review. That remains an explicit quality follow-up.
- Real Mac acceptance and the remaining clean-browser Android saved-file
  acceptance remain open. Deployment, store submission and publication were
  not performed. Existing acceptance flags remain unchanged.

Privacy-safe local captures (fictional fixtures, not personal conversations):
`build/acceptance-1.4.1/drag-1512.png`, `language-menu.png`, `support-rtl.png`.
These are acceptance evidence, not new marketing screenshots.

### Rebuilt artifacts

Every ZIP entry was compared byte-for-byte against `dist`; version is 1.4.1,
with 52 manifest catalogs and no build/debug/private files.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `dist-zip/chatgpt-audio-controls-v1.4.1.zip` | 1,296,980 | `66d73ed79a1fd9c6294c1a9ff4572abfee33b6fc987730f85a63d1d443f470e0` |
| `userscript/chatgpt-audio-controls.user.js` | 1,634,703 | `7b9ddd31b71dfb37eb229834c35f3836e627c281adb9f4632766b5ad8fcdf4a8` |

Machine-readable artifact details: `build/acceptance-1.4.1/artifacts.json`.
Payment format reference: [PayPal.Me guidance](https://www.paypal.com/us/cshelp/article/paypalme-frequently-asked-questions-help432).
Browser catalog reference: [Chrome i18n conventions](https://developer.chrome.com/docs/extensions/reference/api/i18n).

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
