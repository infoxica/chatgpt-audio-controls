import { useEffect } from 'react';
import { ACCENT_CACHE_KEY, readAccentCache } from './accent';

/** Accent only: System/Light/Dark preferences are managed independently. */
export function useChatGPTAccent(): void {
  useEffect(() => {
    let latest = -Infinity, disposed = false;
    const apply = (value: unknown) => {
      const cache = readAccentCache(value);
      if (disposed || !cache || cache.updatedAt < latest) return;
      latest = cache.updatedAt;
      const root = document.documentElement;
      root.dataset.chatTheme = cache.chatTheme;
      for (const key of ['--accent', '--accent-hover', '--accent-light', '--accent-glow', '--accent-foreground']) root.style.removeProperty(key);
      if (cache.accent) {
        root.style.setProperty('--accent', cache.accent);
        root.style.setProperty('--accent-hover', 'color-mix(in srgb, var(--accent) 85%, var(--text-primary))');
        root.style.setProperty('--accent-light', 'color-mix(in srgb, var(--accent) 14%, transparent)');
        root.style.setProperty('--accent-glow', 'color-mix(in srgb, var(--accent) 25%, transparent)');
      }
      if (cache.accentText) root.style.setProperty('--accent-foreground', cache.accentText);
    };
    try { apply(JSON.parse(localStorage.getItem(ACCENT_CACHE_KEY) || 'null')); } catch { /* Continue with extension storage. */ }
    const storage = typeof chrome !== 'undefined' ? chrome.storage : undefined;
    const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[ACCENT_CACHE_KEY]) apply(changes[ACCENT_CACHE_KEY].newValue);
    };
    if (storage?.local) {
      void storage.local.get(ACCENT_CACHE_KEY).then(result => apply(result[ACCENT_CACHE_KEY])).catch(() => {});
      storage.onChanged.addListener(changed);
    }
    return () => { disposed = true; storage?.onChanged.removeListener(changed); };
  }, []);
}
