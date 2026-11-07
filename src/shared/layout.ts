export const LAYOUT_KEY = 'cgpt-ra-layout-v1';
export const PRESETS = ['composer', 'original', 'split-bottom', 'bottom-left', 'bottom-right', 'top-left', 'top-right', 'left', 'right'] as const;
export type LayoutPreset = typeof PRESETS[number];
export type LayoutProfile = { preset: LayoutPreset; seekFirst: boolean };
export type LayoutPreferences = { version: 2; desktop: LayoutProfile; narrow: LayoutProfile };
export const defaultProfile = (_narrow = false): LayoutProfile => ({ preset: 'composer', seekFirst: true });
export const defaultLayout = (): LayoutPreferences => ({ version: 2, desktop: defaultProfile(), narrow: defaultProfile(true) });
export function isLayoutProfile(value: unknown): value is LayoutProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as LayoutProfile;
  return PRESETS.includes(p.preset) && typeof p.seekFirst === 'boolean';
}
export function isLayout(value: unknown): value is LayoutPreferences {
  const p = value as LayoutPreferences | undefined;
  return p?.version === 2 && isLayoutProfile(p.desktop) && isLayoutProfile(p.narrow) && p.narrow.preset === 'composer';
}
export function migrateLayout(value: unknown): LayoutPreferences {
  if (isLayout(value)) return value;
  const old = value as { version?: number; desktop?: { mode?: string; anchor?: string; arrangement?: string; seekFirst?: boolean }; narrow?: { seekFirst?: boolean } } | null;
  const next = defaultLayout();
  if (old?.version !== 1) return next;
  // Preserve the previous automatic placement when migrating a saved v1 profile.
  next.desktop.preset = 'original';
  const p = old.desktop;
  if (p && typeof p.seekFirst === 'boolean') {
    next.desktop.seekFirst = p.seekFirst;
    if (p.mode === 'docked' && ((p.arrangement === 'corner' && /^(top|bottom)-(left|right)$/.test(p.anchor || '')) || (p.arrangement === 'column' && ['left', 'right'].includes(p.anchor || '')))) next.desktop.preset = p.anchor as LayoutPreset;
  }
  if (typeof old.narrow?.seekFirst === 'boolean') next.narrow.seekFirst = old.narrow.seekFirst;
  return next;
}
export function layoutProfile(width: number): 'desktop' | 'narrow' { return width < 768 ? 'narrow' : 'desktop'; }
export async function readLayout(): Promise<LayoutPreferences> {
  let value: unknown;
  if (typeof chrome !== 'undefined' && chrome.storage?.local) value = (await chrome.storage.local.get(LAYOUT_KEY))[LAYOUT_KEY];
  else { try { value = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); } catch { value = null; } }
  return migrateLayout(value);
}
export async function writeLayout(value: LayoutPreferences): Promise<void> {
  if (!isLayout(value)) throw new Error('Invalid layout');
  if (typeof chrome !== 'undefined' && chrome.storage?.local) await chrome.storage.local.set({ [LAYOUT_KEY]: value });
  else localStorage.setItem(LAYOUT_KEY, JSON.stringify(value));
}
