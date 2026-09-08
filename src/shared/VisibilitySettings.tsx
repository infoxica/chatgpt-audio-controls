import { ExtensionSettings } from './types';
import './release-ui.css';
import { getReleaseCopy } from './i18n/release-copy';

export function VisibilitySettings({ settings, onUpdateSettings }: { settings: ExtensionSettings; onUpdateSettings: (value: Partial<ExtensionSettings>) => void }) {
  const copy = getReleaseCopy(settings.language);
  return <div className="section-card card release-ui">
    <label className="toggle-row"><span className="toggle-label">{copy.hide}</span><input type="checkbox" checked={settings.floatingUiHidden} onChange={e => onUpdateSettings({ floatingUiHidden: e.target.checked })} /></label>
    <label style={{ display: 'grid', gap: 8, marginTop: 10 }}>{copy.hideMode}
      <select aria-label={copy.hideMode} value={settings.floatingUiHideMode} onChange={e => onUpdateSettings({ floatingUiHideMode: e.target.value as ExtensionSettings['floatingUiHideMode'] })}>
        <option value="idle-only">{copy.idleOnly}</option><option value="all">{copy.allUi}</option>
      </select>
    </label>
    <p className="card-desc" style={{ marginTop: 10 }}>{copy.hideHint}</p>
  </div>;
}
