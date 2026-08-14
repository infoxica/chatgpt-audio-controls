from pathlib import Path
import re

src_path = Path('./script.js')
src = src_path.read_text(encoding='utf-8')

src = src.replace('// @version      4.1.0', '// @version      4.2.0')
src = src.replace(
    '// @description  Integrated Read Aloud controls beside the ChatGPT composer: compact 2-row seek player, speed, volume, download, shortcuts, and one-click per-response Read Aloud.',
    '// @description  Integrated Read Aloud controls beside the ChatGPT composer with fused transport, slim seeker, inline Lucide SVG icons, speed, volume and download.'
)

# ------------------------------------------------------------------
# Replace Lucide loader + setIcon with self-contained Lucide SVG icons.
# ------------------------------------------------------------------
start = src.index("    function setIcon(")
end = src.index("    // ---------------------------------------------------------------------\n    // Audio capture", start)

new_icon_block = r'''    /*
     * Self-contained Lucide SVGs.
     *
     * Previous versions used lucide-static's icon font. ChatGPT/CSP/browser
     * combinations can prevent that external font from rendering. These are
     * the same Lucide-style SVG primitives rendered inline, so there is no
     * external font or stylesheet dependency.
     */
    const LUCIDE = {
        play: '<polygon points="6 3 20 12 6 21 6 3"></polygon>',
        pause: '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>',
        square: '<rect x="5" y="5" width="14" height="14" rx="2"></rect>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line>',
        'volume-2': '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>',
        'volume-1': '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>',
        'volume-x': '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><line x1="22" x2="16" y1="9" y2="15"></line><line x1="16" x2="22" y1="9" y2="15"></line>',
        'circle-help': '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4"></path><path d="M12 17h.01"></path>',
        'rotate-ccw': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path>',
        'rotate-cw': '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"></path><path d="M21 3v5h-5"></path>',
        'loader-circle': '<path d="M21 12a9 9 0 1 1-6.22-8.56"></path>',
    };

    function lucideIcon(name, className = '') {
        const body = LUCIDE[name] || LUCIDE['circle-help'];

        return `
            <svg
                class="cgpt-ra-lucide ${className}"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                focusable="false"
            >${body}</svg>
        `;
    }

    function setIcon(button, iconName, extraHTML = '') {
        if (!button) return;
        button.innerHTML = lucideIcon(iconName) + extraHTML;
    }

'''
# Drop installLucide() function as well by replacing icon block from setIcon through Lucide section.
pre = src[:start]
# locate current Audio capture start
src = pre + new_icon_block + src[end:]

# Remove lingering installLucide() call
src = src.replace("        installLucide();\n", "")

# Remove @font-face block from styles
src = re.sub(
    r'''\s*@font-face \{
                font-family: "LucideIcons";
                src:
                    url\("https://unpkg\.com/lucide-static@latest/font/Lucide\.woff2"\) format\("woff2"\),
                    url\("https://unpkg\.com/lucide-static@latest/font/Lucide\.ttf"\) format\("truetype"\);
                font-weight: normal;
                font-style: normal;
                font-display: block;
            \}\n''',
    '\n',
    src,
    count=1
)

# ------------------------------------------------------------------
# Left panel fused layout CSS.
# ------------------------------------------------------------------
css_start = src.index("            #cgpt-ra-left,\n            #cgpt-ra-right {")
css_end = src.index("            .cgpt-ra-icon-btn {", css_start)

new_panel_css = r'''            #cgpt-ra-left,
            #cgpt-ra-right {
                position: fixed;
                z-index: 9999;
                border: 1px solid var(--cgpt-ra-border);
                background: var(--cgpt-ra-bg);
                color: var(--cgpt-ra-text);
                backdrop-filter: blur(18px);
                -webkit-backdrop-filter: blur(18px);
                box-shadow: 0 1px 2px rgba(0,0,0,.18);
                transition: opacity .15s ease, transform .15s ease;
            }

            /*
             * Fused left player.
             *
             *               (-10   play   +10)
             * ( 00:00/00:00 -------------------------- )
             *
             * The transport capsule overlaps the upper edge of the progress
             * capsule. Two masks remove the intersecting borders so both
             * pieces read as one continuous ChatGPT-style component.
             */
            #cgpt-ra-left {
                width: 430px;
                height: 46px;
                display: block;
                padding: 0 13px;
                border-radius: 24px;
                overflow: visible;
            }

            #cgpt-ra-left::before {
                content: "";
                position: absolute;
                z-index: 2;
                top: -1px;
                left: 50%;
                width: 120px;
                height: 3px;
                transform: translateX(-50%);
                background: var(--cgpt-ra-bg);
                pointer-events: none;
            }

            .cgpt-ra-transport-row {
                position: absolute;
                z-index: 3;
                left: 50%;
                top: -29px;
                transform: translateX(-50%);
                height: 34px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 2px;
                padding: 2px 5px 3px;
                margin: 0;
                border: 1px solid var(--cgpt-ra-border);
                border-radius: 19px 19px 11px 11px;
                background: var(--cgpt-ra-bg);
                box-shadow: 0 1px 2px rgba(0,0,0,.10);
            }

            .cgpt-ra-transport-row::after {
                content: "";
                position: absolute;
                left: 10px;
                right: 10px;
                bottom: -3px;
                height: 5px;
                background: var(--cgpt-ra-bg);
                pointer-events: none;
            }

            .cgpt-ra-transport-row > * {
                position: relative;
                z-index: 1;
            }

            .cgpt-ra-progress-row {
                height: 44px;
                display: grid;
                grid-template-columns: 70px minmax(0, 1fr);
                align-items: center;
                gap: 8px;
                padding: 0;
                margin: 0;
                border: 0;
            }

            /*
             * Right rail has no artificial width. It hugs its controls.
             */
            #cgpt-ra-right {
                width: max-content;
                min-width: 0;
                height: 46px;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 5px 7px;
                border-radius: 24px;
                white-space: nowrap;
            }

            #cgpt-ra-left.cgpt-ra-no-media,
            #cgpt-ra-right.cgpt-ra-no-media {
                opacity: .42;
            }

            #cgpt-ra-left.cgpt-ra-no-media .cgpt-ra-media-control,
            #cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-media-control,
            #cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-volume-popover,
            #cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-speed-menu {
                pointer-events: none !important;
            }

'''
src = src[:css_start] + new_panel_css + src[css_end:]

# SVG css instead of i css
src = src.replace(
r'''            .cgpt-ra-icon-btn > i {
                font-size: 18px;
                line-height: 1;
            }
''',
r'''            .cgpt-ra-lucide {
                display: block;
                width: 18px;
                height: 18px;
                flex: 0 0 18px;
                overflow: visible;
                pointer-events: none;
            }
'''
)

src = src.replace(
r'''            .cgpt-ra-seek10 i {
                font-size: 20px;
            }
''',
r'''            .cgpt-ra-seek10 .cgpt-ra-lucide {
                width: 19px;
                height: 19px;
            }
'''
)

# Make transport a little tighter like reference.
src = src.replace(
r'''            .cgpt-ra-play {
                width: 36px;
                height: 36px;
                flex-basis: 36px;
            }
''',
r'''            .cgpt-ra-transport-row .cgpt-ra-icon-btn {
                width: 30px;
                height: 30px;
                flex: 0 0 30px;
            }

            .cgpt-ra-play {
                width: 32px !important;
                height: 32px !important;
                flex-basis: 32px !important;
            }
'''
)

# ------------------------------------------------------------------
# Seekbar: fully remove native appearance, 2px normal / 4px hover.
# ------------------------------------------------------------------
range_start = src.index("            /*\n             * Slim native range.")
range_end = src.index("            .cgpt-ra-speed-wrap,", range_start)

new_range_css = r'''            /*
             * Sleek seeker:
             * - 2px visual track normally
             * - 4px track on hover / focus
             * - larger invisible hit area so it remains easy to grab
             *
             * appearance:none is important; otherwise Chromium paints its
             * native track underneath the custom one, causing a double line.
             */
            .cgpt-ra-range {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 18px;
                margin: 0;
                padding: 0;
                border: 0;
                outline: 0;
                cursor: pointer;
                color: var(--cgpt-ra-text);
                background: transparent;
            }

            .cgpt-ra-range::-webkit-slider-runnable-track {
                height: 2px;
                border: 0;
                border-radius: 999px;
                background: color-mix(in srgb, currentColor 32%, transparent);
                transition: height .12s ease, background .12s ease;
            }

            .cgpt-ra-range:hover::-webkit-slider-runnable-track,
            .cgpt-ra-range:focus-visible::-webkit-slider-runnable-track {
                height: 4px;
                background: color-mix(in srgb, currentColor 44%, transparent);
            }

            .cgpt-ra-range::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 9px;
                height: 9px;
                margin-top: -3.5px;
                border: 0;
                border-radius: 50%;
                background: currentColor;
                box-shadow: 0 0 0 1px color-mix(in srgb, var(--cgpt-ra-bg) 85%, transparent);
                transition: width .12s ease, height .12s ease, margin-top .12s ease;
            }

            .cgpt-ra-range:hover::-webkit-slider-thumb,
            .cgpt-ra-range:focus-visible::-webkit-slider-thumb {
                width: 10px;
                height: 10px;
                margin-top: -3px;
            }

            .cgpt-ra-range::-moz-range-track {
                height: 2px;
                border: 0;
                border-radius: 999px;
                background: color-mix(in srgb, currentColor 32%, transparent);
                transition: height .12s ease, background .12s ease;
            }

            .cgpt-ra-range:hover::-moz-range-track,
            .cgpt-ra-range:focus-visible::-moz-range-track {
                height: 4px;
                background: color-mix(in srgb, currentColor 44%, transparent);
            }

            .cgpt-ra-range::-moz-range-progress {
                height: 2px;
                border: 0;
                border-radius: 999px;
                background: currentColor;
            }

            .cgpt-ra-range:hover::-moz-range-progress,
            .cgpt-ra-range:focus-visible::-moz-range-progress {
                height: 4px;
            }

            .cgpt-ra-range::-moz-range-thumb {
                width: 9px;
                height: 9px;
                border: 0;
                border-radius: 50%;
                background: currentColor;
            }

            .cgpt-ra-range:disabled {
                opacity: .35;
                cursor: default;
            }

'''
src = src[:range_start] + new_range_css + src[range_end:]

# ------------------------------------------------------------------
# Volume popover / label spacing: real separate footer area.
# ------------------------------------------------------------------
src = src.replace(
r'''            .cgpt-ra-volume-popover {
                position: absolute;
                left: 50%;
                bottom: calc(100% + 4px);
                transform: translateX(-50%);
                width: 44px;
                height: 142px;
                display: flex;
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 5px;
                padding: 9px 5px;
                border: 1px solid var(--cgpt-ra-border);
                border-radius: 22px;
                background: rgb(40,40,40);
                color: #fff;
                box-shadow: 0 10px 30px rgba(0,0,0,.28);
                transition: opacity .12s ease, visibility .12s ease;
                z-index: 10002;
            }
''',
r'''            .cgpt-ra-volume-popover {
                position: absolute;
                left: 50%;
                bottom: calc(100% + 4px);
                transform: translateX(-50%);
                width: 44px;
                height: 158px;
                display: flex;
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                gap: 0;
                padding: 8px 5px 7px;
                border: 1px solid var(--cgpt-ra-border);
                border-radius: 22px;
                background: rgb(40,40,40);
                color: #fff;
                box-shadow: 0 10px 30px rgba(0,0,0,.28);
                transition: opacity .12s ease, visibility .12s ease;
                z-index: 10002;
            }
'''
)

src = src.replace(
r'''            .cgpt-ra-volume-popover input[type="range"] {
                width: 108px;
                height: 22px;
                margin: 38px 0;
                transform: rotate(-90deg);
                accent-color: currentColor;
            }
''',
r'''            .cgpt-ra-volume-popover input[type="range"] {
                position: absolute;
                top: 52px;
                left: 50%;
                width: 98px;
                height: 20px;
                margin: 0;
                transform: translate(-50%, -50%) rotate(-90deg);
                accent-color: currentColor;
            }
'''
)

src = src.replace(
r'''            .cgpt-ra-volume-value {
                position: absolute;
                left: 6px;
                right: 6px;
                bottom: 6px;
                padding-top: 6px;
                border-top: 1px solid var(--cgpt-ra-border);
                font-size: 9px;
                line-height: 1;
                color: inherit;
                opacity: .65;
                text-align: center;
            }
''',
r'''            .cgpt-ra-volume-value {
                position: absolute;
                left: 6px;
                right: 6px;
                bottom: 8px;
                min-height: 28px;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                padding-top: 10px;
                border-top: 1px solid var(--cgpt-ra-border);
                font-size: 9px;
                line-height: 1;
                color: inherit;
                opacity: .68;
                text-align: center;
            }
'''
)

# ------------------------------------------------------------------
# Replace template icons with inline SVG calls.
# ------------------------------------------------------------------
replacements = {
    '<i class="icon-rotate-ccw" aria-hidden="true"></i>': "${lucideIcon('rotate-ccw')}",
    '<i class="icon-play" aria-hidden="true"></i>': "${lucideIcon('play')}",
    '<i class="icon-rotate-cw" aria-hidden="true"></i>': "${lucideIcon('rotate-cw')}",
    '<i class="icon-volume-2" aria-hidden="true"></i>': "${lucideIcon('volume-2')}",
    '<i class="icon-circle-help" aria-hidden="true"></i>': "${lucideIcon('circle-help')}",
    '<i class="icon-download" aria-hidden="true"></i>': "${lucideIcon('download')}",
}
for old, new in replacements.items():
    src = src.replace(old, new)

# ------------------------------------------------------------------
# Right rail sizing + left width = 440 - gap.
# ------------------------------------------------------------------
src = src.replace(
    "        if (leftAvailable < 440 || rightAvailable < 170) {",
    "        if (leftAvailable < (440 - sideGap) || rightAvailable < 150) {"
)

old_layout = r'''        const desiredLeftWidth = 440;
        const desiredRightWidth = clamp(rightAvailable, 170, 250);

        /*
         * Keep left player exactly 440px as requested.
         * If 440px cannot physically fit, hide rather than squeeze it.
         */
        if (leftAvailable < desiredLeftWidth) {
            leftRail.style.display = 'none';
        } else {
            leftRail.style.display = 'flex';
            leftRail.style.width = `${desiredLeftWidth}px`;
            leftRail.style.left = `${rect.left - sideGap - desiredLeftWidth}px`;

            /*
             * Left rail is 64px tall, vertically centered on composer.
             */
            leftRail.style.top = `${centerY - 32}px`;
        }

        rightRail.style.width = `${desiredRightWidth}px`;
        rightRail.style.left = `${rect.right + sideGap}px`;
        rightRail.style.top = `${centerY - 23}px`;
'''

new_layout = r'''        /*
         * User target: "440px minus the gap between the player and composer".
         * With the current 10px ChatGPT spacing this gives a 430px player.
         */
        const desiredLeftWidth = 440 - sideGap;

        if (leftAvailable < desiredLeftWidth) {
            leftRail.style.display = 'none';
        } else {
            leftRail.style.display = 'block';
            leftRail.style.width = `${desiredLeftWidth}px`;
            leftRail.style.left = `${rect.left - sideGap - desiredLeftWidth}px`;

            /*
             * Align the lower progress capsule to the composer center.
             * The transport capsule intentionally rises above it.
             */
            leftRail.style.top = `${centerY - 23}px`;
        }

        /*
         * Hug only the actual right-side buttons. Do not reserve a 170–250px
         * box; max-content/fit-content determines the true button width.
         */
        rightRail.style.display = 'inline-flex';
        rightRail.style.width = 'max-content';
        rightRail.style.left = `${rect.right + sideGap}px`;
        rightRail.style.top = `${centerY - 23}px`;
'''

if old_layout not in src:
    raise RuntimeError("Expected layout block not found")
src = src.replace(old_layout, new_layout)

# Remove the early display flex assignment that fights #cgpt-ra-left block
src = src.replace(
r'''        leftRail.style.display = 'flex';
        rightRail.style.display = 'flex';

        const centerY = rect.top + rect.height / 2;
''',
r'''        const centerY = rect.top + rect.height / 2;
'''
)

# Ensure download remains rightmost without stretching right panel.
src = src.replace(
r'''            .cgpt-ra-download {
                margin-left: auto;
            }
''',
r'''            .cgpt-ra-download {
                margin-left: 2px;
                order: 99;
            }
'''
)

# Add visibility CSS for inline SVG in disabled buttons.
insert_point = src.index("            .cgpt-ra-seek10 {")
src = src[:insert_point] + r'''            .cgpt-ra-icon-btn svg {
                stroke: currentColor;
            }

''' + src[insert_point:]

# Update help label text if any old Alt ↑/↓ remains in comments/tooltips (not keyboard behavior)
src = src.replace('Alt + ↑', 'Shift + >')
src = src.replace('Alt + ↓', 'Shift + <')

out = Path('/chatgpt-read-aloud-integrated-v4.2.user.js')
out.write_text(src, encoding='utf-8')

print(f"Created: {out}")
print(f"Size: {out.stat().st_size:,} bytes")
print("v4.2 changes: fused left layout, 430px width, inline SVG icons, right rail fit-content, corrected volume label, 2→4px seeker.")
