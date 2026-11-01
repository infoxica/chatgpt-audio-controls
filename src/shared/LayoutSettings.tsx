import { PanelsTopLeft, Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PRESETS, defaultLayout, LayoutPreferences, LayoutProfile, readLayout, writeLayout, LAYOUT_KEY } from './layout';
import { featureCopy } from './i18n/features';
import { getReleaseCopy } from './i18n/release-copy';
import { ExtensionSettings } from './types';
export function LayoutSettings({ language, surface = 'popup' }: { language?: string; surface?: 'popup' | 'dashboard' }) {
  const [layout, setLayout] = useState(defaultLayout), [profile, setProfile] = useState<'desktop' | 'narrow'>('desktop'), [error, setError] = useState(false);
  const c = featureCopy(language);
  const pending = useRef(0);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    const load = () => { void readLayout().then(value => { if (!pending.current) setLayout(value); }).catch(() => setError(true)); }; load();
    const change = (changes: Record<string, chrome.storage.StorageChange>, area: string) => { if (area === 'local' && changes[LAYOUT_KEY]) load(); };
    if (typeof chrome !== 'undefined') chrome.storage?.onChanged.addListener(change);
    return () => { if (typeof chrome !== 'undefined') chrome.storage?.onChanged.removeListener(change); };
  }, []);
  function save(value: LayoutPreferences) {
    // Controlled inputs must update during their event, before storage resolves.
    setLayout(value);
    pending.current++;
    writes.current = writes.current.then(async () => {
      try { await writeLayout(value); setError(false); }
      catch { setError(true); }
      finally { pending.current--; }
    });
    return writes.current;
  }
  const update = (value: Partial<LayoutProfile>) => void save({ ...layout, [profile]: { ...layout[profile], ...value } });
  const p = layout[profile];
  return <section className={`${surface === 'dashboard' ? 'card' : 'section-card'} release-ui layout-settings`}>
    <div className={surface === 'dashboard' ? 'card-title' : 'section-title'}><PanelsTopLeft size={16} color="var(--accent)" /><span>{c.layout}</span></div>
    <label>{c.layout}<select aria-label={c.layout} value={profile} onChange={e => setProfile(e.target.value as typeof profile)}><option value="desktop">{c.desktop}</option><option value="narrow">{c.narrow}</option></select></label>
    <label>{c.placement}<select aria-label={c.placement} value={p.preset} onChange={e => update({ preset: e.target.value as LayoutProfile['preset'] })}>
      {(profile === 'narrow' ? ['composer'] as const : PRESETS).map(preset => <option key={preset} value={preset}>{c.presets[preset]}</option>)}
    </select></label>
    <label className="toggle-row">{c.seekFirst}<input className="settings-switch" role="switch" type="checkbox" checked={p.seekFirst} onChange={e => update({ seekFirst: e.target.checked })} /></label>
    <button className="btn-outline btn-danger" onClick={() => void save(defaultLayout())}>{c.reset}</button>
    {error ? <p role="alert">{getReleaseCopy(language).savedError}</p> : <p className="card-desc">{c.saved}</p>}
  </section>;
}
export function DownloadNotificationSettings({ settings, onUpdateSettings, surface = 'popup' }: { surface?: 'popup' | 'dashboard'; settings: ExtensionSettings; onUpdateSettings: (value: Partial<ExtensionSettings>) => void }) {
  return <div className={`${surface === 'dashboard' ? 'card' : 'section-card'} release-ui`}><label className="toggle-row"><span className="settings-label"><Bell size={16} color="var(--accent)" />{featureCopy(settings.language).notify}</span><input className="settings-switch" role="switch" type="checkbox" checked={settings.notifyDownloadReady} onChange={e => onUpdateSettings({ notifyDownloadReady: e.target.checked })} /></label></div>;
}
