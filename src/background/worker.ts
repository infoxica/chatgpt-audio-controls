import { feedbackURL } from '../shared/feedback';
import { getSettings } from '../shared/storage';
import { VISIBILITY_COMMAND } from '../shared/shortcuts';
import config from '../../config/release.json';

async function registerUninstall(): Promise<void> {
  if (!config.feedbackUrl) return chrome.runtime.setUninstallURL('');
  const [settings, platform] = await Promise.all([getSettings(), chrome.runtime.getPlatformInfo()]);
  const osNames: Record<string, string> = { win: 'Windows', mac: 'macOS', linux: 'Linux', cros: 'ChromeOS', android: 'Android' };
  const url = feedbackURL(settings.language, 'uninstall', osNames[platform.os] || 'Other', settings.theme);
  if (!url) throw new Error('Invalid feedback deployment URL');
  await chrome.runtime.setUninstallURL(url);
}
const register = () => { void registerUninstall().catch(error => console.warn('Could not register feedback page', error)); };
chrome.runtime.onInstalled.addListener(register);
chrome.runtime.onStartup.addListener(register);
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'get-visibility-shortcut') return;
  void chrome.commands.getAll().then(commands => reply({ shortcut: commands.find(c => c.name === VISIBILITY_COMMAND)?.shortcut || '' })).catch(() => reply({ shortcut: '' }));
  return true;
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes['cgpt-ra-settings.language'] || changes['cgpt-ra-settings.theme'] || changes['cgpt-ra-settings'])) register();
});
chrome.commands.onCommand.addListener(command => {
  if (command !== VISIBILITY_COMMAND) return;
  void chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(async tabs => {
    if (tabs[0]?.id !== undefined) await chrome.tabs.sendMessage(tabs[0].id, { type: VISIBILITY_COMMAND }, { frameId: 0 });
  }).catch(() => { /* No ChatGPT bridge in the active tab. */ });
});
