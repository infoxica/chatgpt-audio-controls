import { useEffect, useState } from 'react';
import { Keyboard, Pencil } from 'lucide-react';
import { getTranslations } from './i18n/core';
import { polishCopy } from './i18n/polish';
import './release-ui.css';
import { getReleaseCopy } from './i18n/release-copy';
import { commandLabels, featureCopy } from './i18n/features';
import { COMMANDS, platformKeys, shortcutSettingsUrl } from './shortcuts';
import { getSettings, subscribeSettings } from './storage';
export function CommandShortcut({ language, surface = 'dashboard' }: { language?: string; surface?: 'dashboard' | 'popup' }) {
  const copy = getReleaseCopy(language);
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [step, setStep] = useState(10);
  const [editing, setEditing] = useState('');
  const polish = polishCopy(language);
  const openSettings = (label = '') => { setEditing(label); void chrome.tabs.create({ url: shortcutSettingsUrl() }); };
  const labels = commandLabels(language, step);
  useEffect(() => { void getSettings().then(s => setStep(s.tapSeekSeconds)); return subscribeSettings(s => setStep(s.tapSeekSeconds)); }, []);
  const supported = typeof chrome !== 'undefined' && Boolean(chrome.commands?.getAll) && !/Android/i.test(navigator.userAgent);
  useEffect(() => {
    const refresh = () => { if (supported) void chrome.commands.getAll().then(commands => setBindings(Object.fromEntries(commands.map(c => [c.name || '', c.shortcut || ''])))).catch(() => setBindings({})); };
    refresh(); window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh);
  }, [supported]);
  return <section className={`${surface === 'dashboard' ? 'card' : 'section-card'} release-ui command-shortcuts`}>
    <header className="settings-section-header"><h2 className={surface === 'dashboard' ? 'card-title' : 'section-title'}><Keyboard size={16} aria-hidden="true" />{getTranslations(language).popup.shortcuts.title}</h2>
      {supported && <button className="btn-outline" onClick={() => openSettings()}>{copy.customize}</button>}
    </header>
    {editing && <p role="status">{polish.editHint.replace('{action}', editing)}</p>}
    {COMMANDS.map(command => { const label = labels[command].replace('{s}', String(step)); return <div className="shortcut-row" key={command}><span className="shortcut-action">{label}</span><div className="shortcut-binding"><kbd dir="ltr">{bindings[command] ? platformKeys(bindings[command]) : copy.unassigned}</kbd>{supported && <button className="shortcut-edit" aria-label={`${polish.edit}: ${label}`} title={polish.editHint.replace('{action}', label)} onClick={() => openSettings(label)}><Pencil size={15} aria-hidden="true" /></button>}</div></div>; })}
    <p className="card-desc">{supported ? copy.shortcutScope : featureCopy(language).desktopShortcuts}</p>
  </section>;
}
