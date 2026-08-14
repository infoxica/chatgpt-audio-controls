<div align="center">

# 🎙️ ChatGPT Audio Controls & Read Aloud

**The ultimate audio enhancement extension and userscript for ChatGPT.**  
*Seek, control speed, adjust volume, download voice responses, and trigger speech directly with one click.*

[![Version](https://img.shields.io/badge/version-1.0.0-10a37f.svg?style=for-the-badge)](https://github.com/infoxica/chatgpt-audio-controls/releases)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-38bdf8.svg?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Runtime](https://img.shields.io/badge/Runtime-Bun-f472b6.svg?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh)
[![React](https://img.shields.io/badge/Frontend-React_SPA-61dafb.svg?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![License](https://img.shields.io/badge/license-MIT-22c55e.svg?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](CONTRIBUTING.md)

[Features](#-key-features) • [Installation](#-installation-guide) • [Keyboard Shortcuts](#-keyboard-shortcuts) • [Architecture](#-architecture) • [Contributing](#-contributing) • [Privacy](#-privacy-policy)

</div>

---

## 🌟 Overview

OpenAI's ChatGPT includes a built-in **Read Aloud** voice feature, but lacks essential audio controls: there is no seekbar, no speed presets, no volume slider, no keyboard shortcuts, no direct download button, and triggering speech requires digging into context menus.

**ChatGPT Audio Controls** solves this by injecting a beautiful, floating, dual-capsule audio player directly beside the ChatGPT prompt composer and placing 1-click speech buttons right on assistant response toolbars.

Available as both a **Chromium Browser Extension (Manifest V3)** with a full React SPA Popup & Dashboard, and as a lightweight **Standalone Userscript** for Tampermonkey.

---

## ✨ Key Features

### 🎛️ Dual-Capsule Floating Player
- **Transport & Seeker Capsule (Left)**:
  - Sleek **2px resting / 4px hover** seeker track.
  - Live tabular timestamp indicators (`0:00 / 0:00`).
  - Play / Pause and **-10s / +10s** jump buttons.
  - **Dynamic Hold Acceleration**: Hold down either skip button to smoothly scrub through long audio (accelerates up to 50× seek rate).
- **Controls & Action Rail (Right)**:
  - **Speed Menu**: Quick presets from `0.5×` to `3.0×` with persistence.
  - **Vertical Volume Popover**: Slim slider with percentage readout.
  - **Direct Audio Downloader**: Instant 1-click download of the synthesized voice stream (`.mp3`, `.m4a`, `.wav`, etc.).
  - **Shortcuts Tooltip**: Instant hotkey cheatsheet.

### ⚡ 1-Click Inline Speech Trigger
- Adds a convenient speaker button (`🔈`) directly on every assistant response toolbar right next to the **Copy** button.
- Click once to read aloud; click again to stop playback.

### ⚛️ Modern React SPA Popup & Options Dashboard
- Built with **React 19**, **Bun**, and **Lucide Icons** (`lucide-react`).
- **Extension Popup**: Instant speed presets, volume controls, active ChatGPT tab detection, and shortcuts reference.
- **Options Dashboard**: Interactive audio player sandbox simulator, soundwave visualizer, audio preference customization, and technical FAQ.
- Adapts seamlessly to **Dark Mode** and **Light Mode**.

### 🔒 100% Privacy & Zero-CSP Overhead
- **Zero data collection**, zero analytics, zero external network requests.
- **100% self-contained**: Inline Lucide SVGs with no remote CDN font or stylesheet dependencies.

---

## 🚀 Installation Guide

### Option 1: Chromium Extension (Chrome, Edge, Brave, Arc, Opera, Vivaldi)

#### Method A: Load from Source (Recommended for Developers)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/infoxica/chatgpt-audio-controls.git
   cd chatgpt-audio-controls
   ```
2. Install dependencies and build with Bun:
   ```bash
   bun install
   bun run build
   ```
3. Open your browser's extension management page:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
4. Enable **Developer mode** (toggle in top right).
5. Click **Load unpacked** and select the `dist/` folder inside the project.
6. Navigate to [https://chatgpt.com](https://chatgpt.com) and start listening!

#### Method B: Install from Release ZIP

1. Download the latest `chatgpt-audio-controls-vX.X.X.zip` from [Releases](https://github.com/infoxica/chatgpt-audio-controls/releases).
2. Extract the ZIP to a folder.
3. Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and choose the extracted folder.

---

### Option 2: Userscript (Tampermonkey / Violentmonkey / Greasemonkey)

If you prefer using a userscript manager (e.g. on Firefox, Safari, or Chrome):

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Click to install: **[chatgpt-audio-controls.user.js](userscript/chatgpt-audio-controls.user.js)**.
3. Confirm the installation in your userscript manager.
4. Visit [https://chatgpt.com](https://chatgpt.com) — the player will activate automatically on document start!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>Alt</kbd> + <kbd>P</kbd> | **Play / Pause** | Toggle active Read Aloud playback |
| <kbd>Alt</kbd> + <kbd>←</kbd> | **Skip Backward** | Jump back 10 seconds (Hold to scrub) |
| <kbd>Alt</kbd> + <kbd>→</kbd> | **Skip Forward** | Jump forward 10 seconds (Hold to scrub) |
| <kbd>Shift</kbd> + <kbd>&lt;</kbd> | **Decrease Speed** | Step down to the previous speed preset |
| <kbd>Shift</kbd> + <kbd>&gt;</kbd> | **Increase Speed** | Step up to the next speed preset |
| **Hold** <kbd>◀10</kbd> / <kbd>10▶</kbd> | **Smooth Scrub** | Smoothly scrub audio with dynamic acceleration |

*(Shortcuts are automatically disabled when typing inside inputs or textareas.)*

---

## 🏗️ Architecture

```
chatGPT_audio_controls/
├── .github/                       # CI/CD Workflows & Issue Templates
├── src/
│   ├── popup/                     # React SPA Extension Action Popup
│   ├── options/                   # Full-page React SPA Dashboard & Simulator
│   ├── content/                   # Main-world Content Script & Player Core
│   │   ├── content.ts             # Audio & DOM Interceptors
│   │   ├── icons.ts               # Self-Contained Lucide SVGs
│   │   └── player.css             # Glassmorphic Player Stylesheet
│   └── shared/                    # Constants, Storage & Types
├── public/
│   ├── manifest.json              # Manifest V3 Configuration
│   └── icons/                     # Multi-res PNG & SVG Icons
├── userscript/
│   └── chatgpt-audio-controls.user.js # Standalone Tampermonkey Script
├── scripts/
│   ├── generate-icons.ts          # Pure PNG Icon Generator
│   ├── build-content.ts           # Content Script Bundler
│   ├── sync-userscript.ts         # Userscript Sync Utility
│   └── package-zip.ts             # Distributable ZIP Creator
├── CONTRIBUTING.md
├── CHANGELOG.md
├── PRIVACY.md
└── LICENSE
```

### Manifest V3 & Audio Interception Mechanism

1. **Page-Context Interception (`world: "MAIN"`)**:  
   The extension content script runs directly in the page context at `document_start`. This allows transparent hooking into `HTMLMediaElement.prototype.play`/`pause`, `window.fetch`, `window.XMLHttpRequest`, and `URL.createObjectURL` to intercept audio Blobs without context-bridging performance penalties.

2. **Self-Contained Rendering**:  
   All icons are rendered as inline SVGs. There are zero requests to third-party font servers or CDNs, guaranteeing 100% CSP compliance and instant rendering.

---

## 🛠️ Development & Building

```bash
# Install dependencies with Bun
bun install

# Run Vite dev server for popup & dashboard
bun run dev

# Generate icon assets
bun run build:icons

# Build complete extension bundle
bun run build

# Package distribution ZIP
bun run package

# Typecheck
bun run typecheck
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are very welcome!  
Please check out [CONTRIBUTING.md](CONTRIBUTING.md) to understand our Git branching model (`master` -> `develop` -> `feature/*`, `bug/*`, `fix/*`) and PR checklist.

---

## 🔒 Privacy Policy

We take user privacy seriously. **ChatGPT Audio Controls collects zero data.**  
All processing is done 100% on your device. Please read our full [PRIVACY.md](PRIVACY.md).

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/infoxica">Infoxica</a></sub>
</div>
