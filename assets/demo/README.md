# Website demo — 2026-11-01

The 23-second silent MP4 and four screenshots were captured from the built 1.4.0 extension in a fresh temporary Chromium profile. The conversation is a locally served fictional morning-routine example, not a personal chat. The player UI is real; the surrounding page is a demonstration fixture, not a live ChatGPT acceptance recording. Generated silent PCM supplies the retained audio payload, so the video makes no voice-quality claim.

## Privacy

- No connection to the owner's browser, profile, cookies, account, tabs, chat history or desktop recording.
- Only page content is captured; no browser chrome, notifications, filenames or account identity.
- All page network requests are fulfilled locally or blocked, except the installed extension's own static assets. The capture log contains only the fictional page, generated audio and extension bundles.
- Video audio and metadata are removed during H.264 encoding. No microphone or system audio is recorded.
- Reviewed all four screenshots and a contact sheet sampled every three seconds from the final video.
- These replace the website's earlier live-composer screenshot and dashboard image. Older store assets are unchanged.

## Contents and reproduction

- `walkthrough.mp4`: playback, speed selection, seeking, retained-audio download, collapse/expand and corner/composer placement; 1920×1080 (16:9) H.264, 1,004,159 bytes, 22.88 seconds.
- `composer-dock.png`, `corner-layout.png`, `settings.png`, `original-layout.png`: 1920×1080 screenshots.
- `chapters.json`: accessible English transcript, also rendered below the website video.

Run `bun run build`, then `node scripts/capture-website-demo.mjs` with Playwright Chromium and FFmpeg installed. The script deliberately uses a disposable profile. Never substitute a personal profile or a real logged-in page. Inspect all regenerated media before publishing. Then run `bun run build:site`.

The site hosts its own video, with native controls, `preload="none"`, no autoplay and no third-party video embed. Demo notices are localized in all 33 website languages; the recorded interface and transcript are explicitly English. Screenshots link to full-resolution assets.

## Validation

- Type checking and all 165 localized page builds passed.
- Four browser tests passed: video playback at 1280px, 360px and Arabic RTL at 390px, plus existing consent/attribution behavior. No horizontal overflow or video request before playback.
- Desktop/mobile screenshots reviewed locally. Publication has not been performed.

## FHD refinement

Captured at a 1920×1080 CSS viewport and device scale factor 1; no upscaling. The synthetic shell now follows the supplied reference: slim icon sidebar, near-black background, blue prompt bubble, centered writing card and suggestions, compact composer, and generic account icon. Actual response text and the profile image were not copied. Large chapter overlays are hidden for screenshots; the video uses compact lower-left annotations. `original-layout.png` is an additional collapsed-player comparison image. The three website images and video are refreshed; original-layout remains an extra review asset.
