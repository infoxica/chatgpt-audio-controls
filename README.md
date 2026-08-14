<div align="center">

# 🎙️ ChatGPT Audio Controls & Read Aloud

**The ultimate audio player and control suite for ChatGPT.**  
*Seek audio, change speeds, scroll to adjust volume, download voice responses, and trigger speech with a single click.*

[![Version](https://img.shields.io/badge/version-1.0.0-3968c8.svg?style=for-the-badge)](https://github.com/infoxica/chatgpt-audio-controls/releases)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-38bdf8.svg?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Userscript](https://img.shields.io/badge/Userscript-Tampermonkey-f59e0b.svg?style=for-the-badge&logo=tampermonkey&logoColor=white)](userscript/chatgpt-audio-controls.user.js)
[![License](https://img.shields.io/badge/license-MIT-22c55e.svg?style=for-the-badge)](LICENSE)

[Features](#-features) • [Installation](#-installation) • [Tampermonkey Guide](#-tampermonkey-guide) • [Shortcuts](#-keyboard-shortcuts--gestures) • [FAQ](#-faq) • [Privacy](#-privacy)

</div>

---

## ✨ Features

### 🎛️ Integrated Floating Player
- **Sleek Seeker & Scrubbing**: Precise 2px→4px progress bar with live timers (`0:00 / 0:00`).
- **Hold to Accelerate**: Hold down the ◀10s or 10s▶ buttons to smoothly scrub through long audio with dynamic acceleration (up to 50× seek rate).
- **Speed Presets**: Instant switching between `0.5×`, `0.75×`, `1.0×`, `1.25×`, `1.5×`, `1.75×`, `2.0×`, `2.5×`, and `3.0×`.
- **Hover-Scroll Volume**: Hover over the speaker icon and scroll your mouse wheel to adjust volume effortlessly in 5% increments.
- **One-Click Audio Download**: Save any speech response directly to your computer as high-quality `.mp3` or `.m4a`.
- **Adaptive Screen Support**: Automatically detects space on laptop screens and scales the player fluidly down to 240px.
- **Floating Mini Toggle**: When no audio is playing, a neat floating logo button stays docked on the right. Click it anytime to expand the player!

### ⚡ 1-Click Response Speech Button
- Adds a convenient speaker button (`🔈`) directly on assistant message toolbars beside the **Copy** button. Click once to start reading aloud; click again to stop.

### ⚛️ Extension Popup & Dashboard
- **Popup**: Instant speed presets, volume slider, active audio detection status, and hotkey cheatsheet.
- **Settings Dashboard**: Customize step sizes, default rates, soundwave visualizer, and test controls in the interactive sandbox.
- Matches ChatGPT's native **Dark** and **Light** themes.

---

## 🚀 Installation

### Option 1: Chromium Extension (Chrome, Brave, Edge, Opera, Arc)

#### Method A: Load from Source
1. Clone or download this repository:
   ```bash
   git clone https://github.com/infoxica/chatgpt-audio-controls.git
   cd chatgpt-audio-controls
   ```
2. Install dependencies and build with Bun (or Node):
   ```bash
   bun install
   bun run build
   ```
3. Open your browser extension settings:
   - **Chrome**: `chrome://extensions/`
   - **Brave**: `brave://extensions/`
   - **Edge**: `edge://extensions/`
4. Turn on **Developer mode** (toggle in the top-right corner).
5. Click **Load unpacked** and select the `dist/` directory.
6. Open [chatgpt.com](https://chatgpt.com) and enjoy full audio control!

#### Method B: Install from Release ZIP
1. Download `chatgpt-audio-controls-v1.0.0.zip` from [Releases](https://github.com/infoxica/chatgpt-audio-controls/releases).
2. Unzip to a folder on your computer.
3. In `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the unzipped folder.

---

## 🐒 Tampermonkey Guide (No Extension Required)

If you prefer using a userscript manager (on Firefox, Chrome, Safari, or Edge):

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Click the link below to open the raw userscript:
   👉 **[Install ChatGPT Audio Controls Userscript](https://raw.githubusercontent.com/infoxica/chatgpt-audio-controls/master/userscript/chatgpt-audio-controls.user.js)**
3. Tampermonkey will open and ask you to click **Install**.
4. Visit [https://chatgpt.com](https://chatgpt.com) — the player is fully active!

> [!TIP]
> **Automatic Updates**: The userscript includes `@updateURL` and `@downloadURL` pointing to GitHub. Tampermonkey will automatically check for updates and keep your script current.

---

## ⌨️ Keyboard Shortcuts & Gestures

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>Alt</kbd> + <kbd>P</kbd> | **Play / Pause** | Toggle speech playback |
| <kbd>Alt</kbd> + <kbd>←</kbd> | **Skip Backward** | Jump back 10 seconds (Hold to scrub) |
| <kbd>Alt</kbd> + <kbd>→</kbd> | **Skip Forward** | Jump forward 10 seconds (Hold to scrub) |
| <kbd>Shift</kbd> + <kbd>&lt;</kbd> | **Slower Speed** | Step down to the previous speed preset |
| <kbd>Shift</kbd> + <kbd>&gt;</kbd> | **Faster Speed** | Step up to the next speed preset |
| **Scroll on 🔈** | **Volume Control** | Hover over volume icon & scroll wheel |
| **Hold ◀10 / 10▶** | **Smooth Scrub** | Hold down skip buttons to fast-forward / rewind |

*(Shortcuts are disabled automatically when typing in prompt inputs.)*

---

## ❓ FAQ

<details>
<summary><strong>How do I download the speech audio?</strong></summary>
When Read Aloud is playing, click the download icon (📥) on the right rail. The audio stream is immediately saved to your computer as an audio file.
</details>

<details>
<summary><strong>What happens when no audio is playing?</strong></summary>
The full player capsules collapse into a small floating logo button on the right side. You can click it anytime to open the player, or it will automatically open when you start Read Aloud.
</details>

<details>
<summary><strong>Will this work on compact laptop screens?</strong></summary>
Yes! The player measures your available screen space dynamically and scales its seekbar smoothly from 240px to 430px so it never collides with your prompt composer.
</details>

<details>
<summary><strong>Why didn't icons render in previous Tampermonkey scripts?</strong></summary>
Previous scripts tried loading external web fonts which browsers blocked. This version uses 100% self-contained inline SVGs, so all icons render instantly with zero network calls.
</details>

---

## 🔒 Privacy Policy

ChatGPT Audio Controls operates **100% locally in your browser**.
- **No data collection**: No prompts, chats, audio files, or telemetry are ever uploaded or transmitted.
- **No external servers**: Runs entirely on your machine.
- Read our complete [PRIVACY.md](PRIVACY.md).

---

## 🤝 Contributing

Contributions, feedback, and suggestions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for details on our workflow and PR guidelines.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

<div align="center">
  <sub>Maintained with ❤️ by <a href="https://github.com/infoxica">Infoxica</a></sub>
</div>
