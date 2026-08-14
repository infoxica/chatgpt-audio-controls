import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants";
import { ExtensionSettings } from "./types";

export async function getSettings(): Promise<ExtensionSettings> {
  if (typeof chrome !== "undefined" && chrome.storage?.sync) {
    try {
      const data = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
      if (data && data[STORAGE_KEYS.SETTINGS]) {
        return { ...DEFAULT_SETTINGS, ...data[STORAGE_KEYS.SETTINGS] };
      }
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
    try {
      await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: updated });
    } catch (_) {}
  }

  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  } catch (_) {}

  // Also sync primary speed/volume keys for content script direct read
  if (settings.defaultSpeed !== undefined) {
    localStorage.setItem(STORAGE_KEYS.SPEED, String(settings.defaultSpeed));
  }
  if (settings.defaultVolume !== undefined) {
    localStorage.setItem(STORAGE_KEYS.VOLUME, String(settings.defaultVolume));
  }

  return updated;
}
