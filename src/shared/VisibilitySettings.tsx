import { EyeOff } from 'lucide-react';
import { ExtensionSettings } from './types';
import './release-ui.css';
import { getReleaseCopy } from './i18n/release-copy';

export function VisibilitySettings({ settings, onUpdateSettings, surface = 'popup' }: { surface?: 'popup' | 'dashboard'; settings: ExtensionSettings; onUpdateSettings: (value: Partial<ExtensionSettings>) => void }) {
  const copy = getReleaseCopy(settings.language);
  return <div className={`${surface === 'dashboard' ? 'card' : 'section-card'} release-ui`}>
    <label className="toggle-row"><span className="settings-label"><EyeOff size={16} color="var(--accent)" />{copy.hide}</span><input className="settings-switch" role="switch" type="checkbox" checked={settings.floatingUiHidden} onChange={e => onUpdateSettings({ floatingUiHidden: e.target.checked })} /></label>
    <label style={{ display: 'grid', gap: 8 }}>{copy.hideMode}
      <select aria-label={copy.hideMode} value={settings.floatingUiHideMode} onChange={e => onUpdateSettings({ floatingUiHideMode: e.target.value as ExtensionSettings['floatingUiHideMode'] })}>
        <option value="idle-only">{copy.idleOnly}</option><option value="all">{copy.allUi}</option>
      </select>
    </label>
    <p className="card-desc">{copy.hideHint}</p>
  </div>;
}
