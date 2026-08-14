/*
 * Self-contained inline Lucide & ChatGPT SVGs for zero-CSP-violation rendering.
 * Does not depend on external fonts or CDNs.
 */
export const LUCIDE_ICONS: Record<string, string> = {
  play: '<polygon points="6 3 20 12 6 21 6 3"></polygon>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>',
  square: '<rect x="5" y="5" width="14" height="14" rx="2"></rect>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line>',
  "volume-2": '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>',
  "volume-1": '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>',
  "volume-x": '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><line x1="22" x2="16" y1="9" y2="15"></line><line x1="16" x2="22" y1="9" y2="15"></line>',
  "circle-help": '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4"></path><path d="M12 17h.01"></path>',
  "rotate-ccw": '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path>',
  "rotate-cw": '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"></path><path d="M21 3v5h-5"></path>',
  "loader-circle": '<path d="M21 12a9 9 0 1 1-6.22-8.56"></path>',
  "chevron-right": '<polyline points="9 18 15 12 9 6"></polyline>',
  "chevron-left": '<polyline points="15 18 9 12 15 6"></polyline>',
  "minimize-2": '<polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line>',
  "chatgpt-audio": `
    <g transform="translate(12,12) scale(0.35)" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" />
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(60)" />
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(120)" />
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(180)" />
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(240)" />
      <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(300)" />
      <circle cx="0" cy="0" r="10" fill="#3968c8" stroke="#ffffff" stroke-width="1.5" />
      <polygon points="-2,-4 5,0 -2,4" fill="#ffffff" stroke="none" />
    </g>
  `,
};

export function getLucideSvg(name: string, className = ""): string {
  const body = LUCIDE_ICONS[name] || LUCIDE_ICONS["circle-help"];
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

export function setIcon(button: HTMLElement | null, iconName: string, extraHTML = ""): void {
  if (!button) return;
  button.innerHTML = getLucideSvg(iconName) + extraHTML;
}
