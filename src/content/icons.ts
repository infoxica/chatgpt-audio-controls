/*
 * Self-contained inline Lucide SVGs for zero-CSP-violation rendering.
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
