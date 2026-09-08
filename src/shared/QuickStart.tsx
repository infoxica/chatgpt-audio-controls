import { useEffect, useState } from 'react';
import './release-ui.css';
import { getReleaseCopy } from './i18n/release-copy';
import config from '../../config/release.json';
import { resolveLanguage } from './i18n/core';

export function QuickStart({ language }: { language: string }) {
  const [dismissed, setDismissed] = useState(true);
  const copy = getReleaseCopy(language);
  const locale = resolveLanguage(language);
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) void chrome.storage.local.get('quickStartDismissed').then(result => setDismissed(result.quickStartDismissed === true));
    else setDismissed(localStorage.getItem('quickStartDismissed') === 'true');
  }, []);
  const dismiss = () => {
    setDismissed(true);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) void chrome.storage.local.set({ quickStartDismissed: true });
    else localStorage.setItem('quickStartDismissed', 'true');
  };
  return <aside className="release-ui" style={{ padding: '12px 16px' }}>
    {!dismissed && <div className="section-card"><strong>{copy.quickStart}</strong><p>{copy.quickStartBody}</p><button className="btn-outline" onClick={dismiss}>{copy.dismiss}</button></div>}
    <a href={`${config.siteUrl}${locale === 'en' ? '' : locale + '/'}#help`} target="_blank" rel="noreferrer">{copy.help}</a>
  </aside>;
}
