import type { AdditionalLanguage } from './locale-registry';
export type SupportedLanguage = AdditionalLanguage
  | "auto"
  | "pl" | "hu" | "sv" | "cs" | "uk" | "ca" | "el" | "ro" | "nb"
  | "bn" | "mr" | "te" | "ta" | "ar" | "fa" | "he"
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
  notifyDownloadReady: boolean;
  floatingUiHidden: boolean;
  floatingUiHideMode: "idle-only" | "all";
  defaultSpeed: number;
  defaultVolume: number;
  tapSeekSeconds: number;
  enableShortcuts: boolean;
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
