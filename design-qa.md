# FHD media design QA — 2026-11-01

## Target and evidence

- Source visual: user-supplied FHD browser reference (1795×858), retained only in the conversation. Its personal content and local filesystem path are not included in the repository or publishable assets.
- Implementation: `assets/demo/original-layout.png`, `composer-dock.png`, `corner-layout.png`, `settings.png`; all 1920×1080 pixels from a 1920×1080 CSS viewport at deviceScaleFactor 1.
- State comparison: original-layout is idle/collapsed, matching the reference. Composer and corner captures demonstrate the real extension playing generated silent audio. The surrounding chat is fictional.
- Source and implementation were opened together in the same visual review. Relative horizontal composition was compared; the requested 16:9 frame intentionally adds vertical space compared with the wider source. No claim of pixel-identical viewport dimensions.
- Video review: `build/demo-contact-sheet-fhd.jpg`, sampled every three seconds; final H.264 stream independently inspected at 1920×1080, with no audio stream.

## Comparison and fixes

- Previous capture used a 1280×800 frame, large product header and instructional conversation. Replaced with native FHD capture, slim 46px navigation rail, compact header, centered writing card with action row and suggestion strip, and a bottom composer.
- Typography: 14px Arial/sans-serif body, small muted labels and compact line spacing reproduce the reference's UI density. Fictional text deliberately wraps differently.
- Layout: 720px conversation/composer, aligned centers, rounded writing surface, compact native-style action buttons. Increased lower whitespace is intentional for the requested taller viewport.
- Colors: near-black page, charcoal writing card/input, blue prompt bubble and voice control; restrained gray separators and icons.
- Asset fidelity: matching library icons, real extension logo and actual rendered player. Generic account icon replaces the private avatar. No user screenshot pixels are present in media.
- Content: fictional morning-routine example, invented time label, generic suggestions. Small explicit demo notice remains; large chapter text is removed from screenshots.
- Focused inspection: writing-card text and suggestion row, lower composer radius/buttons and player junction, sidebar icons and account area were inspected in the full-resolution screenshots. These regions remain readable at native image size.

## Validation and residual differences

- Playback start, speed selection, seek, download, collapse/expand and layout changes executed during isolated capture. Browser video playback, intrinsic 1920×1080 resolution and no-overflow checks passed at desktop, mobile and RTL website widths; existing consent test passed.
- The dummy native chrome is visual context, not a functioning ChatGPT account. Its sidebar and model selector are intentionally not service integrations. Real ChatGPT visual changes and differing browser zoom are not covered by this fixture.
- Remaining P3: individual native icon silhouettes may differ slightly from the closest existing library icons. Accepted for this privacy-safe product demonstration.
- No actionable P0/P1/P2 findings remain within the requested media scope.

final result: passed
