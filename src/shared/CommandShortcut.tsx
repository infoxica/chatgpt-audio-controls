import { useEffect, useState } from 'react';
import './release-ui.css';
import { getReleaseCopy } from './i18n/release-copy';
import { platformKeys, shortcutSettingsUrl, VISIBILITY_COMMAND } from './shortcuts';

export function CommandShortcut({ language }: { language?: string }) {
  const copy = getReleaseCopy(language);
  const [shortcut, setShortcut] = useState('');
  useEffect(() => {
    const refresh = () => { if (typeof chrome !== 'undefined' && chrome.commands) void chrome.commands.getAll().then(commands => setShortcut(commands.find(c => c.name === VISIBILITY_COMMAND)?.shortcut || '')).catch(() => setShortcut('')); };
    refresh(); window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  return <div className="section-card card release-ui">
    <div className="shortcut-row"><span>{copy.visibilityShortcut}</span><kbd>{shortcut ? platformKeys(shortcut) : copy.unassigned}</kbd></div>
    <p className="card-desc">{copy.shortcutScope}</p>
    <button className="btn-outline" onClick={() => { if (typeof chrome !== 'undefined' && chrome.tabs) void chrome.tabs.create({ url: shortcutSettingsUrl() }); }}>{copy.customize}</button>
  </div>;
}
