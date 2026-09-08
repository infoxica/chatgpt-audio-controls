import { getSettings, saveSettings } from "../shared/storage";
import { VISIBILITY_COMMAND } from "../shared/shortcuts";
import { DEFAULT_SETTINGS, SETTING_STORAGE_KEYS, STORAGE_KEYS } from "../shared/constants";
import { ExtensionSettings } from "../shared/types";

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
    ...(legacySettings && typeof legacySettings === "object" ? legacySettings : {}),
    ...flatSettings,
  } as ExtensionSettings;
}

function publish(settings: ExtensionSettings, shortcut = ''): void {
  window.postMessage(
    {
      source: BRIDGE_SOURCE,
      type: UPDATE_TYPE,
      settings,
      shortcut,
    },
    "*",
  );
}

async function readSettings(): Promise<void> {
  try {
    const stored = await chrome.storage.sync.get([STORAGE_KEYS.SETTINGS, ...settingStorageKeyNames]);
    const command = await chrome.runtime.sendMessage({ type: 'get-visibility-shortcut' }).catch(() => null);
    publish(getStoredSettings(stored), typeof command?.shortcut === 'string' ? command.shortcut : '');
  } catch (_) {
    publish(DEFAULT_SETTINGS);
  }
}

window.addEventListener("message", (event: MessageEvent) => {
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
    void chrome.storage.local.set({ "cgpt-ra-theme-cache": event.data.theme });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
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
  if (sender.id !== chrome.runtime.id || message?.type !== VISIBILITY_COMMAND) return;
  void getSettings().then(async settings => {
    if (settings.enableShortcuts) await saveSettings({ floatingUiHidden: !settings.floatingUiHidden });
    reply({ ok: true });
  }).catch(() => reply({ ok: false }));
  return true;
});
