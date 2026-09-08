import { ExtensionSettings, ShortcutItem } from "./types";

export const EXTENSION_VERSION = "1.2.0";

export const SPEED_PRESETS = [0.5, 0.75, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export const STORAGE_KEYS = {
  SPEED: "cgpt-ra-v4-speed",
  VOLUME: "cgpt-ra-v4-volume",
  SETTINGS: "cgpt-ra-settings",
} as const;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  floatingUiHidden: false,
  floatingUiHideMode: "idle-only",
  defaultSpeed: 1,
  defaultVolume: 1,
  tapSeekSeconds: 10,
  enableShortcuts: true,
  enableInlineButtons: true,
  theme: "system",
  smoothScrubbing: true,
  autoDownloadFormat: "auto",
  language: "auto",
};

// Keep each preference under its own sync key so independent updates from the
// popup and options page cannot overwrite one another.
export const SETTING_STORAGE_KEYS: Record<keyof ExtensionSettings, string> = {
  floatingUiHidden: "cgpt-ra-settings.floatingUiHidden",
  floatingUiHideMode: "cgpt-ra-settings.floatingUiHideMode",
  defaultSpeed: "cgpt-ra-settings.defaultSpeed",
  defaultVolume: "cgpt-ra-settings.defaultVolume",
  tapSeekSeconds: "cgpt-ra-settings.tapSeekSeconds",
  enableShortcuts: "cgpt-ra-settings.enableShortcuts",
  enableInlineButtons: "cgpt-ra-settings.enableInlineButtons",
  theme: "cgpt-ra-settings.theme",
  smoothScrubbing: "cgpt-ra-settings.smoothScrubbing",
  autoDownloadFormat: "cgpt-ra-settings.autoDownloadFormat",
  language: "cgpt-ra-settings.language",
};

export interface LanguageOption {
  code: ExtensionSettings["language"];
  label: string;
  nativeName: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "auto", label: "Auto Detect", nativeName: "Auto (Browser Default)" },
  { code: "en", label: "English", nativeName: "English" },
  { code: "zh-CN", label: "Chinese (Simplified)", nativeName: "简体中文" },
  { code: "zh-TW", label: "Chinese (Traditional)", nativeName: "繁體中文" },
  { code: "vi", label: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "th", label: "Thai", nativeName: "ไทย" },
  { code: "es", label: "Spanish", nativeName: "Español" },
  { code: "pt-BR", label: "Portuguese (Brazil)", nativeName: "Português (Brasil)" },
  { code: "pt-PT", label: "Portuguese (Portugal)", nativeName: "Português (Portugal)" },
  { code: "ru", label: "Russian", nativeName: "Русский" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी" },
  { code: "fr", label: "French", nativeName: "Français" },
  { code: "de", label: "German", nativeName: "Deutsch" },
  { code: "ja", label: "Japanese", nativeName: "日本語" },
  { code: "ko", label: "Korean", nativeName: "한국어" },
  { code: "id", label: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "it", label: "Italian", nativeName: "Italiano" },
  { code: "tr", label: "Turkish", nativeName: "Türkçe" },

];

export const SHORTCUTS: ShortcutItem[] = [
  {
    id: "play-pause",
    action: "Play / Pause",
    keys: ["Space / K"],
    description: "Toggle playback, matching common web and desktop players (Alt+P remains supported)",
    category: "playback",
  },
  {
    id: "seek-back",
    action: "Back 10 seconds",
    keys: ["Alt", "←"],
    description: "Jump backward 10s (Hold for smooth scrub)",
    category: "navigation",
  },
  {
    id: "seek-forward",
    action: "Forward 10 seconds",
    keys: ["Alt", "→"],
    description: "Jump forward 10s (Hold for smooth scrub)",
    category: "navigation",
  },
  {
    id: "speed-decrease",
    action: "Decrease Speed",
    keys: ["Shift", "<"],
    description: "Step down to previous speed preset",
    category: "speed",
  },
  {
    id: "speed-increase",
    action: "Increase Speed",
    keys: ["Shift", ">"],
    description: "Step up to next speed preset",
    category: "speed",
  },
];
