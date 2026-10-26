import { useLayoutEffect } from 'react';
import { getReleaseCopy } from './i18n/release-copy';
import type { ExtensionSettings } from './types';

export type ThemePreference = ExtensionSettings['theme'];

export function useTheme(preference: ThemePreference): void {
  useLayoutEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };
    apply();
    system.addEventListener('change', apply);
    return () => system.removeEventListener('change', apply);
  }, [preference]);
}

export function ThemeSelect({ value, onChange, language }: { value: ThemePreference; onChange: (value: ThemePreference) => void; language: string }) {
  const copy = getReleaseCopy(language);
  return <select className="theme-select" aria-label={copy.appearance} title={copy.appearance} value={value} onChange={event => onChange(event.target.value as ThemePreference)}>
    <option value="system">{copy.themeSystem}</option>
    <option value="light">{copy.themeLight}</option>
    <option value="dark">{copy.themeDark}</option>
  </select>;
}
