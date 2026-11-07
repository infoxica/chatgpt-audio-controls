# Website demonstration media

## Current screenshots — 2026-11-07

The current 1.4.2 build supplies six 1920×1080 PNGs: `composer-dock.png`,
`corner-layout.png`, `side-layout.png`, `original-layout.png`, `split-bottom.png`
and `settings.png`. The split-bottom capture uses a taller fictional composer.
The website uses dock, corner, side, bottom split and settings; README also shows
original top alignment. Captures are native-size, not enlarged store images.

Run `bun run build`, then `node scripts/build-store-assets.mjs` to refresh both
website and store screenshots. The fixture is `scripts/fixtures/website-demo.html`.
The capture verifies player bounds and the attached dock width, and saves its
network audit in `build/store-artwork/network-audit.json`. Inspect regenerated
images before running `bun run build:site` or publishing.

## Existing walkthrough

`walkthrough.mp4` and `chapters.json` retain the previously recorded silent FHD
walkthrough: playback, speed, seeking, download, collapse and docking. This task
refreshes screenshots and promotional artwork; it does not rerecord that video.
To regenerate the video separately, use `node scripts/capture-website-demo.mjs`
with FFmpeg installed, then rerun the store-artwork script for the current stills.
The video has native controls, no autoplay and no third-party embed.

## Privacy and verification boundary

All stills use a disposable Chromium profile, locally fulfilled fictional chat
and generated silent PCM. Only the mock page/audio and installed extension assets
are permitted; external requests are blocked. No personal browser profile,
conversation, account details, desktop, microphone or system audio is captured.
The settings screenshot is a scrolled view of the real extension page.

These captures illustrate the current player; they do not establish live ChatGPT,
Mac or Android acceptance. Technical capture details belong here rather than in
public-facing README captions. Store upload and website deployment are separate.
