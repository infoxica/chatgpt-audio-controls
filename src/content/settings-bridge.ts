import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../shared/constants";
import { ExtensionSettings } from "../shared/types";

const BRIDGE_SOURCE = "chatgpt-audio-controls-settings-bridge";
const REQUEST_TYPE = "CGPT_RA_SETTINGS_REQUEST";
const UPDATE_TYPE = "CGPT_RA_SETTINGS_UPDATE";

function publish(settings: ExtensionSettings): void {
  window.postMessage(
    {
      source: BRIDGE_SOURCE,
      type: UPDATE_TYPE,
      settings,
    },
    "*",
  );
}

async function readSettings(): Promise<void> {
  try {
    const stored = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
    publish({
      ...DEFAULT_SETTINGS,
      ...(stored?.[STORAGE_KEYS.SETTINGS] || {}),
    });
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
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;

  const settingsChange = changes[STORAGE_KEYS.SETTINGS];
  if (!settingsChange?.newValue) return;

  publish({
    ...DEFAULT_SETTINGS,
    ...settingsChange.newValue,
  });
});

void readSettings();
