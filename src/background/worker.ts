import { feedbackURL } from '../shared/feedback';
import { getSettings } from '../shared/storage';
import { VISIBILITY_COMMAND, isPlayerCommand } from '../shared/shortcuts';
import config from '../../config/release.json';
import { ENGAGEMENT_KEY, EngagementStore, isEngagementAction } from '../shared/engagement';

// Session deduplication lives in memory-only extension storage, not the local record.
// Mark before incrementing: a write failure may undercount, but never repeats an ask.
const engagement = new EngagementStore(
  async () => (await chrome.storage.local.get(ENGAGEMENT_KEY))[ENGAGEMENT_KEY],
  async state => { await chrome.storage.local.set({ [ENGAGEMENT_KEY]: state }); },
  async (scope, session) => {
    const key = `cgpt-ra-counted:${scope}`;
    const previous = (await chrome.storage.session.get(key))[key] || 0;
    if (session <= previous) return false;
    await chrome.storage.session.set({ [key]: session }); return true;
  },
);
chrome.tabs.onRemoved?.addListener(tab => {
  void chrome.storage.session.get(null).then(data => chrome.storage.session.remove(Object.keys(data).filter(key => key.startsWith(`cgpt-ra-counted:${tab}:`)))).catch(() => {});
});

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
  if (sender.id !== chrome.runtime.id) return;
  if (message?.type === 'engagement' && isEngagementAction(message.action)) {
    const action = message.action;
    const trustedPage = sender.tab !== undefined && sender.frameId === 0 && /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(sender.url || '') && Boolean(sender.documentId);
    const extensionUI = ['src/options/index.html', 'src/popup/index.html'].some(path => sender.url === chrome.runtime.getURL(path));
    if ((!trustedPage && !extensionUI) || (!trustedPage && (action.type === 'claim' || action.type === 'qualify'))) { reply({ ok: false }); return; }
    void (async () => {
      if (action.type === 'claim') {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tabs[0]?.id !== sender.tab?.id) throw new Error('Not active');
      }
      const result = await engagement.request(action, `${sender.tab?.id}:${sender.documentId}`);
      reply({ ok: true, result });
    })().catch(() => reply({ ok: false }));
    return true;
  }
  if (message?.type === 'open-settings') { void chrome.runtime.openOptionsPage(); return; }
  if (message?.type !== 'get-visibility-shortcut') return;
  if (!chrome.commands?.getAll) { reply({ shortcut: '', commands: {} }); return; }
  void chrome.commands.getAll().then(commands => reply({ shortcut: commands.find(c => c.name === VISIBILITY_COMMAND)?.shortcut || '', commands: Object.fromEntries(commands.filter(c => isPlayerCommand(c.name)).map(c => [c.name, c.shortcut || ''])) })).catch(() => reply({ shortcut: '', commands: {} }));
  return true;
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes['cgpt-ra-settings.language'] || changes['cgpt-ra-settings.theme'] || changes['cgpt-ra-settings'])) register();
});
chrome.commands?.onCommand?.addListener(command => {
  if (!isPlayerCommand(command)) return;
  void chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(async tabs => {
    if (tabs[0]?.id !== undefined) await chrome.tabs.sendMessage(tabs[0].id, { type: command }, { frameId: 0 });
  }).catch(() => { /* No ChatGPT bridge in the active tab. */ });
});
