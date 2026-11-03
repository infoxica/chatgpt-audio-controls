import { ACCENT_CACHE_KEY, readAccentCache } from '../shared/accent';
import { isLayout, readLayout, writeLayout, LAYOUT_KEY } from '../shared/layout';
import { getSettings, saveSettings } from "../shared/storage";
import { VISIBILITY_COMMAND, isPlayerCommand } from "../shared/shortcuts";
import { DEFAULT_SETTINGS, SETTING_STORAGE_KEYS, STORAGE_KEYS } from "../shared/constants";
import { ExtensionSettings } from "../shared/types";
import { ENGAGEMENT_KEY, isEngagementAction } from '../shared/engagement';

const BRIDGE_SOURCE = "chatgpt-audio-controls-settings-bridge";
const REQUEST_TYPE = "CGPT_RA_SETTINGS_REQUEST";
const UPDATE_TYPE = "CGPT_RA_SETTINGS_UPDATE";
const THEME_UPDATE_TYPE = "CGPT_RA_THEME_UPDATE";
const CHATGPT_THEME_KEYS = new Set(["blue", "green", "purple", "orange", "pink", "yellow", "black"]);
const settingEntries = Object.entries(SETTING_STORAGE_KEYS) as [keyof ExtensionSettings, string][];
const settingStorageKeyNames = settingEntries.map(([, storageKey]) => storageKey);

function getStoredSettings(data: Record<string, unknown>): ExtensionSettings {
  const legacySettings = data[STORAGE_KEYS.SETTINGS];
  const flatSettings = Object.fromEntries(
    settingEntries
      .filter(([, storageKey]) => data[storageKey] !== undefined)
      .map(([settingName, storageKey]) => [settingName, data[storageKey]]),
  );

  return {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries(Object.entries(legacySettings && typeof legacySettings === "object" ? legacySettings : {}).filter(([key]) => Object.hasOwn(DEFAULT_SETTINGS, key))),
    ...flatSettings,
  } as ExtensionSettings;
}

function publish(settings: ExtensionSettings, shortcut = '', commands: Record<string, string> = {}): void {
  window.postMessage(
    {
      source: BRIDGE_SOURCE,
      type: UPDATE_TYPE,
      settings,
      shortcut,
      commands,
    },
    "*",
  );
}

async function readSettings(): Promise<void> {
  try {
    const stored = await chrome.storage.sync.get([STORAGE_KEYS.SETTINGS, ...settingStorageKeyNames]);
    const command = await chrome.runtime.sendMessage({ type: 'get-visibility-shortcut' }).catch(() => null);
    publish(getStoredSettings(stored), typeof command?.shortcut === 'string' ? command.shortcut : '', command?.commands || {});
  } catch (_) {
    publish(DEFAULT_SETTINGS);
  }
}

window.addEventListener("message", (event: MessageEvent) => {
  if (event.source === window && event.data?.source === 'chatgpt-audio-controls-engagement' && event.data.type === 'request' && typeof event.data.id === 'string' && event.data.id.length <= 64 && isEngagementAction(event.data.action)) {
    const { id, action } = event.data;
    const result = (reply: any) => window.postMessage({ source: 'chatgpt-audio-controls-engagement', type: 'result', id, ...reply }, '*');
    if (action.type === 'claim' && document.visibilityState !== 'visible') result({ ok: false });
    else void chrome.runtime.sendMessage({ type: 'engagement', action }).then(result).catch(() => result({ ok: false }));
  }
  if (event.source === window && event.data?.source === BRIDGE_SOURCE) {
    if (event.data.type === 'CGPT_RA_LAYOUT_REQUEST') void publishLayout();
    if (event.data.type === 'CGPT_RA_LAYOUT_SAVE' && typeof event.data.id === 'string' && event.data.id.length < 100) {
      const { id, layout } = event.data;
      void (async () => {
        let ok = false;
        try { if (isLayout(layout)) { await writeLayout(layout); ok = true; await publishLayout(); } } catch {}
        window.postMessage({ source: BRIDGE_SOURCE, type: 'CGPT_RA_LAYOUT_SAVED', id, ok }, '*');
      })();
    }
    if (event.data.type === 'CGPT_RA_OPEN_SETTINGS') void chrome.runtime.sendMessage({ type: 'open-settings' }).catch(() => {});
  }
  if (
    event.source === window &&
    event.data?.source === BRIDGE_SOURCE &&
    event.data?.type === REQUEST_TYPE
  ) {
    void readSettings();
  }

  if (
    event.source === window &&
    event.data?.source === BRIDGE_SOURCE &&
    event.data?.type === THEME_UPDATE_TYPE &&
    event.data?.theme &&
    CHATGPT_THEME_KEYS.has(event.data.theme.chatTheme) &&
    typeof event.data.theme.isDark === "boolean" &&
    typeof event.data.theme.updatedAt === "number"
  ) {
    const theme = readAccentCache(event.data.theme);
    if (theme) void chrome.storage.local.set({ [ACCENT_CACHE_KEY]: theme }).catch(() => {});
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[ENGAGEMENT_KEY]) window.postMessage({ source: 'chatgpt-audio-controls-engagement', type: 'changed' }, '*');
  if (areaName === 'local' && changes[LAYOUT_KEY]) void publishLayout();
  if (areaName !== "sync") return;

  if (
    !changes[STORAGE_KEYS.SETTINGS] &&
    !settingStorageKeyNames.some((storageKey) => changes[storageKey])
  ) return;

  void readSettings();
});

void readSettings();
window.addEventListener('focus', () => { void readSettings(); });

// Only the extension service worker can request a persistent visibility change.
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || !isPlayerCommand(message?.type)) return;
  void getSettings().then(async settings => {
    if (settings.enableShortcuts) {
      if (message.type === VISIBILITY_COMMAND) await saveSettings({ floatingUiHidden: !settings.floatingUiHidden });
      else window.postMessage({ source: BRIDGE_SOURCE, type: 'CGPT_RA_COMMAND', command: message.type }, '*');
    }
    reply({ ok: true });
  }).catch(() => reply({ ok: false }));
  return true;
});

async function publishLayout(): Promise<void> {
  try { window.postMessage({ source: BRIDGE_SOURCE, type: 'CGPT_RA_LAYOUT_UPDATE', layout: await readLayout() }, '*'); } catch {}
}
