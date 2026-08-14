# Privacy Policy

**Last Updated: August 2026**

ChatGPT Audio Controls & Read Aloud is built with a strict **Privacy-First** architecture. We believe that browser extensions and developer tools should never compromise user trust, personal conversations, or browsing activity.

---

## Summary (TL;DR)

- **Zero Data Collection**: We do not collect, track, store, or transmit your prompts, responses, audio files, or personal information.
- **100% On-Device Processing**: All audio interception, seeking, playback speed alterations, volume adjustments, and downloads run strictly locally inside your web browser.
- **Zero Telemetry & Analytics**: No third-party trackers, analytics libraries (e.g. Google Analytics), or error-logging beacons are bundled or loaded.
- **No External Network Calls**: The extension does not communicate with any external backend servers.

---

## Data Handled Locally

The extension only reads and writes local settings necessary for its operation:

1. **User Preferences**:
   - Default playback rate (e.g. `1.25x`)
   - Default volume level (e.g. `80%`)
   - Preferred skip step (e.g. `10 seconds`)
   - Feature flags (toggling keyboard shortcuts or inline buttons)
   - UI Theme (`dark`, `light`, `system`)
   - Stored in standard `chrome.storage.sync` or `localStorage` on your own device.

2. **Audio Streams**:
   - When ChatGPT generates Read Aloud voice responses, the audio stream is temporarily held in your browser's local memory (`Blob`) solely to enable seeking and user-initiated file downloads (`.mp3`/`.m4a`/`.wav`).
   - The audio stream is never sent over any network.

---

## Permissions Transparency (Manifest V3)

The Chromium extension requests the minimum required permissions:

- **`storage`**: Used exclusively to persist user preferences (speed, volume, shortcuts) across browser restarts.
- **`host_permissions` (`https://chatgpt.com/*`)**: Required solely to inject the interactive audio control player and inline speech buttons onto the ChatGPT interface.

---

## Third-Party Services & Dependencies

The extension is entirely self-contained. It contains **no CDN stylesheets, remote fonts, or external JavaScript files**. All icon assets (Lucide SVGs) and styling are bundled locally within the extension to ensure complete offline safety and strict Content Security Policy (CSP) compliance.

---

## Open Source & Auditability

This project is fully open source under the MIT license. Anyone can inspect and audit the complete codebase:
- **Repository**: [https://github.com/infoxica/chatgpt-audio-controls](https://github.com/infoxica/chatgpt-audio-controls)

---

## Contact

For privacy-related inquiries or questions, open an issue on GitHub:
- [https://github.com/infoxica/chatgpt-audio-controls/issues](https://github.com/infoxica/chatgpt-audio-controls/issues)
