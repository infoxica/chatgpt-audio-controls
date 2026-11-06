import { DEFAULT_SETTINGS, STORAGE_KEYS, SUPPORTED_LANGUAGES } from '../shared/constants';
import { ExtensionSettings } from '../shared/types';
import { PRESETS, defaultLayout, LayoutProfile, readLayout, writeLayout } from '../shared/layout';
import { featureCopy } from '../shared/i18n/features';
import { getReleaseCopy } from '../shared/i18n/release-copy';
import { getTranslations, languageDirection, resolveLanguage } from '../shared/i18n/core';
import { donationCopy } from '../shared/i18n/donations';
import { supportCopy } from '../shared/i18n/support';
import { SPONSOR_AMOUNTS, sponsorURL, coffeeURL, REVIEW_URLS } from '../shared/support';
import { coffeeCopy } from '../shared/i18n/coffee';
import { engagementRequest, watchEngagement } from '../shared/engagement-client';
import { openStandaloneTour } from '../tour/tour';
import { tourCopy } from '../shared/i18n/tour';
export async function openStandaloneSettings(settings: ExtensionSettings, changed: (settings: ExtensionSettings) => void): Promise<void> {
  document.getElementById('cgpt-ra-settings-dialog')?.remove();
  let layout = defaultLayout(); try { layout = await readLayout(); } catch {}
  const dialog = document.createElement('dialog'); dialog.id = 'cgpt-ra-settings-dialog'; dialog.dir = languageDirection(settings.language);
  dialog.lang = resolveLanguage(settings.language);
  const c = featureCopy(settings.language), r = getReleaseCopy(settings.language);
  const tour = document.createElement('button'); tour.type = 'button'; tour.textContent = tourCopy(settings.language).title;
  tour.onclick = () => openStandaloneTour(settings); dialog.append(tour);
  const d = donationCopy(settings.language), support = supportCopy(settings.language);
  const section = document.createElement('section'); section.className = 'cgpt-ra-standalone-support';
  const title = document.createElement('h2'); title.textContent = d.title; section.append(title);
  for (const text of [d.value, d.costs, d.once, d.privacy, d.optional]) { const p = document.createElement('p'); p.textContent = text; section.append(p); }
  const links = document.createElement('div'); links.className = 'cgpt-ra-support-links';
  const link = (href: string, text: string, kind: 'donation' | 'review') => {
    const a = document.createElement('a'); a.href = href; a.textContent = text; a.target = '_blank'; a.rel = 'noreferrer';
    a.onclick = () => { void engagementRequest({ type: 'opened', kind }).catch(showError); }; links.append(a);
  };
  for (const amount of SPONSOR_AMOUNTS) link(sponsorURL(amount), `US$${amount}`, 'donation');
  for (const amount of SPONSOR_AMOUNTS) link(coffeeURL(amount), `${coffeeCopy(settings.language)} · PayPal · US$${amount}`, 'donation');
  for (const store of ['chrome', 'edge'] as const) link(REVIEW_URLS[store], `${support[3]} · ${store === 'chrome' ? 'Chrome' : 'Edge'}`, 'review');
  section.append(links);
  const reminderRow = document.createElement('label'), reminder = document.createElement('input'); reminder.type = 'checkbox'; reminder.disabled = true; reminderRow.textContent = d.reminders; reminderRow.append(reminder); section.append(reminderRow);
  const error = document.createElement('p'); error.setAttribute('role', 'alert'); section.append(error);
  function showError() { error.textContent = r.savedError; }
  const refresh = () => { void engagementRequest({ type: 'read' }).then(({ state }) => { reminder.checked = state.enabled; reminder.disabled = false; }).catch(showError); };
  reminder.onchange = () => { const enabled = reminder.checked; reminder.disabled = true; void engagementRequest({ type: 'enable', enabled }).then(refresh).catch(() => { showError(); refresh(); }); };
  refresh(); const stop = watchEngagement(refresh); dialog.addEventListener('close', stop, { once: true }); dialog.append(section);
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
