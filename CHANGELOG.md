# Changelog

All notable changes to **ChatGPT Audio Controls & Read Aloud** are documented in this file following [Semantic Versioning](https://semver.org/).

---

## [1.4.0] — Unreleased

- Apply RTL document direction throughout Arabic, Persian and Hebrew website pages. Close wide-player help, volume and speed popovers with Escape and return focus to their visible trigger, in both distributions.

- Optional GitHub Sponsors support on the website, dashboard, popup About, and standalone settings, with one-time US$1/$3/$5/$10 links and copy in all 33 languages. Privacy and features remain unconditional.
- Device-local meaningful-listening count, review invitation after four uses, and support invitation after ten. Non-modal cards wait until playback pauses/ends, respect hidden controls and typing, and allow permanent dismissal or one reminder after both 14 days and ten further uses. No telemetry or additional permissions.

- Restore floating controls if ChatGPT replaces their DOM during hydration or navigation, retaining playback, saved layouts and intentional hide/collapse settings. Keep early audio capture while deferring UI insertion until the document is parsed; restore removed standalone userscript styles as well.

- Align left-side layouts and drag destinations with the visible sidebar rail, ignoring transparent navigation panels and clipping hidden overflow. Follow sidebar expansion/collapse without changing saved layouts.

- Replace popup/dashboard theme dropdowns with compact Light, Dark and System icon buttons, retaining localized labels, keyboard access and saved preferences.

- Close the visual dock/input gap with a non-interactive fill outside the native composer's rounded top corners, preserving its original border and input behavior.

- Native 48px player pills, icon-only circle, four corner L presets, two vertical side-center presets and original automatic placement.
- Composer dock joins the input without a seam: one desktop row, two mobile rows, and a compact menu for secondary controls on small screens.
- Exact-shape drag previews, 24px magnetic capture with at most 12px attraction, 220ms drop/swap settling, 280ms reset and 200ms collapse. Reduced-motion support and smooth cancellation.
- Pill grips swap only within the selected layout. Keyboard layout settings and version-2 per-device desktop/mobile profiles migrate compatible earlier preferences; mobile uses composer docking only.
- Responsive popup and dashboard, touch-accessible controls, viewport-aware docking, and LTR/RTL interfaces.
- Bengali, Marathi, Telugu, Tamil, Arabic, Persian, Hebrew, Polish, Hungarian, Swedish, Czech, Ukrainian, Catalan, Greek, Romanian and Norwegian Bokmål across the player, extension, website, feedback and supported listing resources (33 interface languages total; new translation review pending).
- Collision-aware L-layout seek widths, native top-action clearance and corner-aware dock tabs. Composer borders, radii and shadows remain untouched.
- Compact open settings sections, alphabetical language choices, shortcut-edit guidance and suggestion/bug/Chrome-review/Edge-review actions with localized feedback intent.
- Benefit-led website/listing copy, updated screenshots, consent-gated campaign allowlisting and a dated audience baseline. No extension telemetry added. Package signing assessed without enrollment or publishing.
- Optional full-audio-ready notification tied to the current retained playback session.
- Fifteen assignable desktop commands, with optional commands API support on mobile.
- Standalone userscript generated from the shared player source and styles.
- Refined composer docking with a small branded tab, native surface treatment, menu-safe layering and stable placement around response/email headers. Adaptive seek tracks and interior-facing volume popovers keep controls clear.
- Fixed desktop toolbar popup sizing, aligned settings cards, added danger styling for resets and localized suggestion/review cards in all 24 languages. Download-ready notifications use a compact success treatment and dismiss after five active seconds.

## [1.3.0] - 2026-10-26

- Preserve playback position, speed and volume across destructive host pauses with a session-specific retained source and an owned audio element. Ignore stale loads and play results, show loading/recovery state, and prevent overlapping sessions.
- Reset the playback progress anchor after seeking so a backward seek during resume cannot cause a false loading timeout; seeking alone does not count as advancing playback.
- Recognize ChatGPT's updated composer. Restore two separate rounded capsules beside it when space permits and above it on narrow screens.
- Remove injected response Read Aloud buttons, toolbar/menu automation and the obsolete setting from both extension and userscript. Start with ChatGPT's native button.
- Move Help beside Dashboard and add localized Send feedback links in About and settings.
- Add remembered System / Light / Dark preferences to popup, dashboard and feedback, with icon controls on the feedback form.
- Keep the README source-version badge and heading synchronized with release metadata through CI and packaging checks.
- Replace the Google survey backend with a Cloudflare Worker, private D1 storage and Turnstile. Support voluntary uninstall reasons and installed-user bug/suggestion/other feedback in 17 languages, with idempotent submissions and owner query/export tools.
- Keep the existing Google URL as a localized transition page with no spreadsheet writes. Update privacy and store disclosures.
- Reset release acceptance; require fresh Windows Chrome, Edge and actual Tampermonkey checks. Native Mac testing is waived for v1.3.0, not passed.

## [1.2.0] - 2026-09-09

- Add Hindi, French, German, Japanese, Korean, Indonesian, Italian and Turkish, for 17 interface and manifest locales.
- Keep paused audio controls visible and use a compact panel above the composer when side controls cannot fit.
- Add synchronized floating-control visibility settings, with idle-bubble-only and all-controls modes.
- Add a customizable browser visibility command that works while typing, with Mac labels and actual assigned shortcuts.
- Add localized first-use help, playback/download recovery messages and native control detection independent of extension language.
- Launch the localized official website with optional consent-gated analytics and the voluntary uninstall survey backed by a private response Sheet.
- Match the website to the extension design with accessible React/Radix menus, a desktop language grid, on-site guides, official store badges and review links. Link the localized website from popup and options.
- Generate canonical sitemaps, Markdown mirrors and full context files for all 85 localized pages. Keep preview redirects within the preview origin.
- Gate automatic master publishing on version increases and verified acceptance; separate Chrome/Edge submission and manual retries. Validate archive contents and exercise the loaded extension in Chromium fixtures.
- Preserve standalone userscript functionality. Its version metadata follows this release; new extension features are not a claim of userscript parity.

## [1.1.0] - 2026-08-27

### 🌐 Multi-Language & Internationalization (i18n) Support
- **Supported Languages & Regional Variants**:
  - 🇺🇸 English (`en`) — Default fallback
  - 🇨🇳 Chinese (Simplified) — 简体中文 (`zh-CN`)
  - 🇹🇼 / 🇭🇰 Chinese (Traditional) — 繁體中文 (`zh-TW`)
  - 🇻🇳 Vietnamese — Tiếng Việt (`vi`)
  - 🇹🇭 Thai — ไทย (`th`)
  - 🇪🇸 Spanish — Español (`es`)
  - 🇧🇷 Portuguese (Brazil) — Português do Brasil (`pt-BR`)
  - 🇵🇹 Portuguese (Portugal) — Português de Portugal (`pt-PT`)
  - 🇷🇺 Russian — Русский (`ru`)
- **Automatic Browser Locale Detection**: Detects user browser language via `chrome.i18n.getUILanguage()` and `navigator.languages` with exact regional variant matching.
- **Language Switcher in Options Dashboard**: Allows users to manually configure and switch their preferred extension language.
- **Comprehensive Real-Time UI Localization**: Localized Options Dashboard, Popup extension interface, floating Read Aloud player tooltips, shortcuts popover, and inline response speech buttons.
- **Chrome Store & Edge Add-ons Multilingual Listings**: Created localized `_locales` metadata and `docs/STORE-LISTINGS.md` for store publishing.

## [1.0.2] - 2026-08-16

### 🏪 Store Badges & UI Showcase
- Added official Chrome Web Store and Microsoft Edge Add-ons installation badges and direct store links.
- Reorganized the installation guide to highlight one-click store installation as the primary recommended option.
- Added live UI preview screenshots for the floating Read Aloud player in ChatGPT and the popup settings dashboard.

## [1.0.1] - 2026-08-14

### ✨ Launch Readiness & Playback Polish
- Added the shared ChatGPT Audio brand mark to the popup and options navigation, with theme-aware accent treatment.
- Removed the popup Status tab and the options interactive player sandbox.
- Connected popup and options preferences to the main-world audio player through a dedicated settings bridge.
- Made Inline Speech Buttons, Global Shortcuts, and Smooth Scrubbing settings apply immediately to an open ChatGPT page.
- Restored and documented `Space` / `K` play-pause controls while retaining `Alt+P` as an alias.
- Updated the floating control icon to follow the active ChatGPT theme accent.

### 🔒 Store Readiness
- Restricted content-script access to `https://chatgpt.com/*` only.
- Clarified local-only data handling, ChatGPT page access, and project independence in the privacy policy.
- Added Chrome Web Store and Microsoft Edge Add-ons submission guidance.
- Made the release ZIP filename follow the package version automatically.

## [1.0.0] - 2026-08-14

### ✨ Chromium Extension Release (Manifest V3)
- **React SPA Popup**:
  - Fast-opening, interactive popup with dark/light themes.
  - Active audio status indicator and ChatGPT tab connection diagnostics.
  - Default playback speed selector and interactive volume slider.
  - Toggles for inline response speech buttons and keyboard shortcuts.
  - Integrated shortcuts reference drawer.
- **Options Dashboard & Sandbox**:
  - Full-page React SPA with audio preferences, custom steps, and theme toggles.
  - Interactive simulator with dynamic soundwave visualizer and floating controls test bench.
  - Detailed FAQ and technical audio interception guide.
- **Injected Audio Engine & Player**:
  - Main-world (`world: "MAIN"`) interception of `HTMLMediaElement.prototype` and network pipeline (`fetch`, `XMLHttpRequest`, `URL.createObjectURL`).
  - Fused dual-capsule floating player anchored beside ChatGPT's composer prompt.
  - Dynamic 2px resting / 4px hover seeker track with zero double-track artifacts.
  - Smooth scrubbing acceleration when holding the ◀10s or 10s▶ buttons.
  - 1-Click inline Read Aloud button on assistant responses placed next to "Copy".
  - One-click direct audio download for `.mp3`, `.m4a`, `.wav`, `.ogg`, and `.webm` formats.
- **Tooling & Open Source**:
  - Full build system powered by **Bun** and **Vite**.
  - Multi-resolution icon generation script.
  - Automated `.zip` packaging script.
  - Full MIT License, Privacy Policy, Contributing guide, and GitHub Actions release workflow.
- **Standalone Userscript**:
  - Updated `userscript/chatgpt-audio-controls.user.js` for Tampermonkey and Violentmonkey users.
