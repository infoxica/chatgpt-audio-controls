export const VISIBILITY_COMMAND = 'toggle-floating-ui';
export const COMMANDS = ['play-pause', 'seek-back', 'seek-forward', 'speed-decrease', 'speed-increase', 'speed-reset', 'volume-increase', 'volume-decrease', 'toggle-mute', 'download-audio', 'toggle-collapse', VISIBILITY_COMMAND, 'reset-layout', 'open-help', 'open-settings'] as const;
export type PlayerCommand = typeof COMMANDS[number];
export const isPlayerCommand = (value: unknown): value is PlayerCommand => typeof value === 'string' && (COMMANDS as readonly string[]).includes(value);
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop();
  const aliases: Record<string, string> = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', comma: 'Comma', period: 'Period', space: 'Space' };
  const code = aliases[key || ''] || (key?.length === 1 ? /^\d$/.test(key) ? `Digit${key}` : `Key${key.toUpperCase()}` : key);
  return event.code.toLowerCase() === code?.toLowerCase() && event.altKey === parts.some(p => p === 'alt' || p === 'option') && event.shiftKey === parts.includes('shift') && event.metaKey === parts.some(p => p === 'command' || p === 'cmd') && event.ctrlKey === parts.some(p => p === 'ctrl' || p === 'macctrl');
}

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
  return /Edg(?:A|iOS)?\//.test(agent) ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts';
}
