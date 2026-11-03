import { useId, useLayoutEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { getReleaseCopy } from './i18n/release-copy';
import type { ExtensionSettings } from './types';
import './theme-selector.css';

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
  const name = useId();
  const choices = [
    { theme: 'light' as const, label: copy.themeLight, Icon: Sun },
    { theme: 'dark' as const, label: copy.themeDark, Icon: Moon },
    { theme: 'system' as const, label: copy.themeSystem, Icon: Monitor },
  ];
  return <div className="theme-selector" role="radiogroup" aria-label={copy.appearance}>
    {choices.map(({ theme, label, Icon }) => <label key={theme} className="theme-choice" title={label}>
      <input type="radio" name={name} value={theme} checked={value === theme} aria-label={label} onChange={() => onChange(theme)} />
      <span><Icon size={16} strokeWidth={1.7} aria-hidden="true" /></span>
    </label>)}
  </div>;
}
