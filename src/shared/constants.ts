import { ExtensionSettings, ShortcutItem } from "./types";

export const EXTENSION_VERSION = "1.0.1";

export const SPEED_PRESETS = [0.5, 0.75, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

export const STORAGE_KEYS = {
  SPEED: "cgpt-ra-v4-speed",
  VOLUME: "cgpt-ra-v4-volume",
  SETTINGS: "cgpt-ra-settings",
} as const;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  defaultSpeed: 1,
  defaultVolume: 1,
  tapSeekSeconds: 10,
  enableShortcuts: true,
  enableInlineButtons: true,
  theme: "system",
  smoothScrubbing: true,
  autoDownloadFormat: "auto",
};

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
