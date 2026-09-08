export const VISIBILITY_COMMAND = 'toggle-floating-ui';

export function isMacPlatform(platform = typeof navigator === 'undefined' ? '' : navigator.platform): boolean {
  return /mac/i.test(platform);
}

export function platformKeys(text: string, mac = isMacPlatform()): string {
  return mac ? text.replace(/Alt/g, 'Option ⌥').replace(/Shift/g, 'Shift ⇧').replace(/Ctrl/g, 'Control ⌃').replace(/Command/g, 'Command ⌘') : text;
}

export function playbackAction(event: Pick<KeyboardEvent, 'code' | 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'isComposing'>): 'play' | 'back' | 'forward' | 'slower' | 'faster' | null {
  if (event.isComposing || event.ctrlKey || event.metaKey) return null;
  if (event.altKey && !event.shiftKey) {
    if (event.code === 'KeyP') return 'play';
    if (event.key === 'ArrowLeft') return 'back';
    if (event.key === 'ArrowRight') return 'forward';
  }
  if (!event.altKey && !event.shiftKey && (event.code === 'Space' || event.code === 'KeyK')) return 'play';
  if (!event.altKey && event.shiftKey && event.code === 'Comma') return 'slower';
  if (!event.altKey && event.shiftKey && event.code === 'Period') return 'faster';
  return null;
}

export function shortcutSettingsUrl(agent = navigator.userAgent): string {
  return /Edg\//.test(agent) ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts';
}
