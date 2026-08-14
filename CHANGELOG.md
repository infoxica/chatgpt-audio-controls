# Changelog

All notable changes to **ChatGPT Audio Controls & Read Aloud** are documented in this file following [Semantic Versioning](https://semver.org/).

---

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
