# Store artwork

Current 1.4.2 artwork, prepared for manual Chrome and Edge listing uploads.

| File | Dimensions | Purpose |
|---|---|---|
| `icon-128.png` | 128×128 | Existing extension icon, unchanged |
| `logo-300.png` | 300×300 | Edge logo, rendered from the existing 310px brand asset |
| `small-promo-440x280.png` | 440×280 | Small promotional tile |
| `marquee-promo-1400x560.png` | 1400×560 | Marquee and README banner |
| `promo-1280x800.png` | 1280×800 | Additional brand artwork |
| `screenshots/composer-dock.png` | 1280×800 | Docked playback and seeking |
| `screenshots/corner-layout.png` | 1280×800 | Corner arrangement |
| `screenshots/side-layout.png` | 1280×800 | Vertical side arrangement |
| `screenshots/settings.png` | 1280×800 | Actual preferences and placement controls |
| `screenshots/shortcuts.png` | 1280×800 | Actual browser shortcut customization UI |

Upload the five screenshots in the order above. The separate promotional artwork
is not a product screenshot. These files replace the older mixed-version store
captures; Git history retains those assets. No store upload is performed by the
generation script.

Run `bun run build`, then `node scripts/build-store-assets.mjs` with Playwright
Chromium installed. It also refreshes the 1920×1080 website/README screenshots in
`assets/demo`. Run `bun run build:site` afterwards.

The player is the built extension on the existing fictional ChatGPT-style fixture.
The script uses a disposable profile, synthetic silent audio and blocked external
network requests. It does not read personal chats, cookies or accounts. The
settings captures are actual extension pages. This is product demonstration media,
not live ChatGPT or device acceptance evidence. No user-count or rating claims are
baked into the images.

Dimensions checked against [Chrome image guidance](https://developer.chrome.com/docs/webstore/images)
and [Edge listing guidance](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension).

## Local verification — 2026-11-07

- All 16 store/demo PNG dimensions verified; five website asset copies match exactly.
- Type checking, extension build, 1.4.2 version validation and 335-page website build pass.
- Eight media/image-viewer browser checks pass, including all five viewer entries,
  mobile widths and RTL. Existing video playback remains covered.
- Capture network audit and image hashes: `build/store-artwork/`.
- Store submission, website deployment and native-device acceptance are not performed.
