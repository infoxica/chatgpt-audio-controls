import { DEFAULT_SETTINGS, STORAGE_KEYS, SUPPORTED_LANGUAGES } from '../shared/constants';
import { ExtensionSettings } from '../shared/types';
import { PRESETS, defaultLayout, LayoutProfile, readLayout, writeLayout } from '../shared/layout';
import { featureCopy } from '../shared/i18n/features';
import { getReleaseCopy } from '../shared/i18n/release-copy';
import { getTranslations, languageDirection, resolveLanguage } from '../shared/i18n/core';
export async function openStandaloneSettings(settings: ExtensionSettings, changed: (settings: ExtensionSettings) => void): Promise<void> {
  document.getElementById('cgpt-ra-settings-dialog')?.remove();
  let layout = defaultLayout(); try { layout = await readLayout(); } catch {}
  const dialog = document.createElement('dialog'); dialog.id = 'cgpt-ra-settings-dialog'; dialog.dir = languageDirection(settings.language);
  dialog.lang = resolveLanguage(settings.language);
  const c = featureCopy(settings.language), r = getReleaseCopy(settings.language);
  const heading = document.createElement('h2'); heading.textContent = c.layout; dialog.append(heading);
  const fields = (label: string, options: [string, string][], value: string, update: (v: string) => void) => {
    const row = document.createElement('label'), select = document.createElement('select'); row.textContent = label;
    for (const [value, name] of options) { const option = document.createElement('option'); option.value = value; option.textContent = name; select.append(option); }
    select.value = value; select.onchange = () => update(select.value); row.append(select); dialog.append(row); return select;
  };
  fields(r.language, SUPPORTED_LANGUAGES.map(l => [l.code, l.code === 'auto' ? getTranslations(settings.language).options.general.languageAuto : l.nativeName]), settings.language, v => { settings = { ...settings, language: v as ExtensionSettings['language'] }; });
  const notify = document.createElement('label'), checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = settings.notifyDownloadReady; checkbox.onchange = () => { settings = { ...settings, notifyDownloadReady: checkbox.checked }; }; notify.textContent = c.notify; notify.append(checkbox); dialog.append(notify);
  for (const profile of ['desktop', 'narrow'] as const) {
    const h = document.createElement('h3'); h.textContent = c[profile]; dialog.append(h);
    const update = (patch: Partial<LayoutProfile>) => { layout = { ...layout, [profile]: { ...layout[profile], ...patch } }; };
    fields(c.placement, (profile === 'narrow' ? ['composer'] as const : PRESETS).map(preset => [preset, c.presets[preset]]), layout[profile].preset, v => update({ preset: v as LayoutProfile['preset'] }));
    fields(c.seekFirst, [['true', c.seekFirst], ['false', c.swap]], String(layout[profile].seekFirst), v => update({ seekFirst: v === 'true' }));
  }
  const commit = async () => {
    try { await writeLayout(layout); localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ ...DEFAULT_SETTINGS, ...settings })); changed(settings); window.postMessage({ source: 'chatgpt-audio-controls-settings-bridge', type: 'CGPT_RA_LAYOUT_UPDATE', layout }, '*'); dialog.close(); }
    catch { const error = document.createElement('p'); error.setAttribute('role', 'alert'); error.textContent = r.savedError; dialog.append(error); }
  };
  const reset = document.createElement('button'); reset.className = 'cgpt-ra-danger'; reset.textContent = c.reset; reset.onclick = () => { layout = defaultLayout(); void commit(); };
  const save = document.createElement('button'); save.textContent = r.dismiss; save.onclick = () => void commit();
  dialog.append(reset, save); dialog.addEventListener('close', () => dialog.remove()); document.body.append(dialog); dialog.showModal();
}
