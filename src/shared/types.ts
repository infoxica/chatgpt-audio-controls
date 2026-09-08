export type SupportedLanguage =
  | "auto"
  | "en"
  | "zh-CN"
  | "zh-TW"
  | "vi"
  | "th"
  | "es"
  | "pt-BR"
  | "pt-PT"
  | "ru"
  | "hi"
  | "fr"
  | "de"
  | "ja"
  | "ko"
  | "id"
  | "it"
  | "tr";

export interface ExtensionSettings {
  floatingUiHidden: boolean;
  floatingUiHideMode: "idle-only" | "all";
  defaultSpeed: number;
  defaultVolume: number;
  tapSeekSeconds: number;
  enableShortcuts: boolean;
  enableInlineButtons: boolean;
  theme: "system" | "dark" | "light";
  smoothScrubbing: boolean;
  autoDownloadFormat: "auto" | "mp3" | "m4a" | "wav";
  language: SupportedLanguage;
}

export interface PlaybackState {
  hasMedia: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  volume: number;
  isMuted: boolean;
  formattedCurrent: string;
  formattedDuration: string;
}

export interface ShortcutItem {
  id: string;
  action: string;
  keys: string[];
  description: string;
  category: "playback" | "navigation" | "speed";
}
