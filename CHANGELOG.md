# Changelog

All notable changes to **ChatGPT Audio Controls & Read Aloud** are documented in this file following [Semantic Versioning](https://semver.org/).

---

## [1.2.0] - Unreleased

- Add Hindi, French, German, Japanese, Korean, Indonesian, Italian and Turkish, for 17 interface and manifest locales.
- Keep paused audio controls visible and use a compact panel above the composer when side controls cannot fit.
- Add synchronized floating-control visibility settings, with idle-bubble-only and all-controls modes.
- Add a customizable browser visibility command that works while typing, with Mac labels and actual assigned shortcuts.
- Add localized first-use help, playback/download recovery messages and native control detection independent of extension language.
- Add the localized official website, optional website analytics, and voluntary uninstall survey service. Production configuration and deployment remain release requirements.
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
