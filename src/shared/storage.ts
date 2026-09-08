import { DEFAULT_SETTINGS, SETTING_STORAGE_KEYS, STORAGE_KEYS } from "./constants";
import { ExtensionSettings } from "./types";

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

export async function getSettings(): Promise<ExtensionSettings> {
  if (typeof chrome !== "undefined" && chrome.storage?.sync) {
    try {
      const data = await chrome.storage.sync.get([STORAGE_KEYS.SETTINGS, ...settingStorageKeyNames]);
      return getStoredSettings(data);
    } catch (_) {}
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (_) {}

  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };

  if (typeof chrome !== "undefined" && chrome.storage?.sync) {
    const updates = Object.fromEntries(
      (Object.keys(settings) as (keyof ExtensionSettings)[]).map((settingName) => [
        SETTING_STORAGE_KEYS[settingName],
        settings[settingName],
      ]),
    );
    await chrome.storage.sync.set(updates);
  } else {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  }

  // Preserve the standalone userscript fallback values. Extension pages use
  // chrome.storage.sync, whose failure is deliberately propagated above.
  if (settings.defaultSpeed !== undefined) {
    localStorage.setItem(STORAGE_KEYS.SPEED, String(settings.defaultSpeed));
  }
  if (settings.defaultVolume !== undefined) {
    localStorage.setItem(STORAGE_KEYS.VOLUME, String(settings.defaultVolume));
  }

  return updated;
}

export function subscribeSettings(listener: (settings: ExtensionSettings) => void): () => void {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return () => {};
  const change = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "sync" && (changes[STORAGE_KEYS.SETTINGS] || settingStorageKeyNames.some(key => changes[key]))) {
      void getSettings().then(listener);
    }
  };
  chrome.storage.onChanged.addListener(change);
  return () => chrome.storage.onChanged.removeListener(change);
}
