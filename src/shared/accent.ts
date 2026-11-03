export const ACCENT_CACHE_KEY = 'cgpt-ra-theme-cache';
export const ACCENT_KEYS = ['blue', 'green', 'purple', 'orange', 'pink', 'yellow', 'black'] as const;
export type AccentCache = { chatTheme: string; isDark: boolean; updatedAt: number; accent?: string; accentText?: string };
// Cache only literal colors, never arbitrary CSS expressions or page data.
export function literalColor(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 96 && (/^#(?:[a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(value) || /^(?:rgb|rgba|hsl|hsla)\([\d.,% /+-]+\)$/i.test(value));
}
export function readAccentCache(value: unknown): AccentCache | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as AccentCache;
  if (!ACCENT_KEYS.includes(v.chatTheme as typeof ACCENT_KEYS[number]) || typeof v.isDark !== 'boolean' || !Number.isFinite(v.updatedAt)) return null;
  return { chatTheme: v.chatTheme, isDark: v.isDark, updatedAt: v.updatedAt,
    ...(literalColor(v.accent) ? { accent: v.accent } : {}), ...(literalColor(v.accentText) ? { accentText: v.accentText } : {}) };
}
