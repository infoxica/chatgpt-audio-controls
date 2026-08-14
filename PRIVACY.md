# Privacy Policy

**Last Updated: August 2026**

ChatGPT Audio Controls & Read Aloud is built with a strict **Privacy-First** architecture. We believe that browser extensions and developer tools should never compromise user trust, personal conversations, or browsing activity.

---

## Summary (TL;DR)

- **Zero Data Collection**: We do not collect, track, store, or transmit your prompts, responses, audio files, or personal information.
- **100% On-Device Processing**: All audio interception, seeking, playback speed alterations, volume adjustments, and downloads run strictly locally inside your web browser.
- **Zero Telemetry & Analytics**: No third-party trackers, analytics libraries (e.g. Google Analytics), or error-logging beacons are bundled or loaded.
- **No Developer-Operated Network Calls**: The extension does not communicate with any external backend servers. ChatGPT continues to make its normal requests to provide its own service.

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

3. **ChatGPT Page Interface**:
   - The extension reads the presence of ChatGPT assistant-response toolbars and the browser media element that plays Read Aloud audio. It does not parse, store, or transmit conversation text.
   - This local access is used only to add the Read Aloud action and provide playback controls for the audio the user chooses to play.

---

## Permissions Transparency (Manifest V3)

The Chromium extension requests only the minimum browser access required:

- **`storage`**: Used exclusively to persist user preferences (speed, volume, shortcuts) across browser restarts.
- **ChatGPT site access (`https://chatgpt.com/*`)**: The content scripts run only on ChatGPT to add the interactive audio control player and inline speech buttons. The extension does not request broad host permissions.

---

## Third-Party Services & Dependencies

The extension is entirely self-contained. It contains **no CDN stylesheets, remote fonts, or external JavaScript files**. All icon assets (Lucide SVGs) and styling are bundled locally within the extension to ensure complete offline safety and strict Content Security Policy (CSP) compliance.

---

## Open Source & Auditability

This project is fully open source under the MIT license. Anyone can inspect and audit the complete codebase:
- **Repository**: [https://github.com/infoxica/chatgpt-audio-controls](https://github.com/infoxica/chatgpt-audio-controls)

## Independence and Trademarks

ChatGPT Audio Controls is an independent project and is not affiliated with, endorsed by, or sponsored by OpenAI. ChatGPT is a trademark of OpenAI.

---

## Contact

For privacy-related inquiries or questions, open an issue on GitHub:
- [https://github.com/infoxica/chatgpt-audio-controls/issues](https://github.com/infoxica/chatgpt-audio-controls/issues)
