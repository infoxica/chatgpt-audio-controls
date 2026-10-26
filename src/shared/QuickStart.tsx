import { useEffect, useState } from 'react';
import './release-ui.css';
import { getReleaseCopy } from './i18n/release-copy';

export function QuickStart({ language }: { language: string }) {
  const [dismissed, setDismissed] = useState(true);
  const copy = getReleaseCopy(language);
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) void chrome.storage.local.get('quickStartDismissed').then(result => setDismissed(result.quickStartDismissed === true));
    else setDismissed(localStorage.getItem('quickStartDismissed') === 'true');
  }, []);
  const dismiss = () => {
    setDismissed(true);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) void chrome.storage.local.set({ quickStartDismissed: true });
    else localStorage.setItem('quickStartDismissed', 'true');
  };
  if (dismissed) return null;
  return <aside className="release-ui" style={{ padding: '12px 16px' }}>
    <div className="section-card"><strong>{copy.quickStart}</strong><p>{copy.quickStartBody}</p><button className="btn-outline" onClick={dismiss}>{copy.dismiss}</button></div>
  </aside>;
}
