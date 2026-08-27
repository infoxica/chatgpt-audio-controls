import { getLucideSvg, setIcon } from "./icons";
import { SPEED_PRESETS, STORAGE_KEYS } from "../shared/constants";
import { ExtensionSettings } from "../shared/types";
import { getTranslations } from "../shared/i18n";

(function () {
  "use strict";

  const PAGE: any = typeof window !== "undefined" ? window : globalThis;

  const CONFIG = {
    tapSeekSeconds: 10,
    speeds: SPEED_PRESETS,
    defaultSpeed: 1,
    defaultVolume: 1,
    speedStorage: STORAGE_KEYS.SPEED,
    volumeStorage: STORAGE_KEYS.VOLUME,
    settingsStorage: STORAGE_KEYS.SETTINGS,
    debug: false,
  };

  const CHATGPT_THEME_KEYS = ["blue", "green", "purple", "orange", "pink", "yellow", "black"];

  let activeMedia: HTMLMediaElement | null = null;
  let settingsCache: ExtensionSettings | null = null;
  let sessionSpeed: number | null = null;
  let sessionVolume: number | null = null;
  let activeInlineButton: HTMLElement | null = null;
  let pendingInlineButton: HTMLElement | null = null;
  const inlineButtons = new Set<HTMLElement>();
  const mediaListenersInstalled = new WeakSet<HTMLMediaElement>();
  let userForcedExpand = false;
  let userForcedCollapsed = false;

  let leftRail: HTMLElement | null = null;
  let rightRail: HTMLElement | null = null;
  let floatingToggle: HTMLButtonElement | null = null;
  let collapseButton: HTMLButtonElement | null = null;
  let seekSlider: HTMLInputElement | null = null;
  let currentLabel: HTMLElement | null = null;
  let durationLabel: HTMLElement | null = null;
  let playButton: HTMLElement | null = null;
  let speedButton: HTMLElement | null = null;
  let speedMenu: HTMLElement | null = null;
  let volumeWrap: HTMLElement | null = null;
  let volumeSlider: HTMLInputElement | null = null;
  let volumeLabel: HTMLElement | null = null;
  let downloadButton: HTMLElement | null = null;

  let sliderDragging = false;

  let capturedAudioBlob: Blob | null = null;
  let capturedAudioMime = "";
  let capturedAudioURL = "";
  let capturedAudioAt = 0;

  // Keep only a small byte-bounded cache. A Blob is a strong reference to the
  // complete audio payload, so an entry-count cap alone can retain too much.
  const MAX_BLOB_MAP_ENTRIES = 4;
  const MAX_BLOB_MAP_BYTES = 8 * 1024 * 1024;
  const blobURLMap = new Map<string, Blob>();
  let blobURLBytes = 0;

  function removeBlobURL(url: string): void {
    const blob = blobURLMap.get(url);
    if (!blob) return;

    blobURLBytes -= blob.size;
    blobURLMap.delete(url);
  }

  function pruneBlobMap(): void {
    while (blobURLMap.size > MAX_BLOB_MAP_ENTRIES || blobURLBytes > MAX_BLOB_MAP_BYTES) {
      const firstEntry = blobURLMap.entries().next().value as [string, Blob] | undefined;
      if (!firstEntry) break;
      removeBlobURL(firstEntry[0]);
    }
  }

  function rememberBlobURL(url: string, blob: Blob): void {
    removeBlobURL(url);
    blobURLMap.set(url, blob);
    blobURLBytes += blob.size;
    pruneBlobMap();
  }

  // Cached DOM state to completely eliminate flickering and redundant reflows
  const cache = {
    currentTimeStr: "",
    durationStr: "",
    isPaused: true,
    speed: 1,
    volume: 1,
    isMuted: false,
    controlsEnabled: false,
    leftWidth: "",
    leftX: "",
    leftY: "",
    rightX: "",
    rightY: "",
    isCollapsed: true,
    floatingHidden: false,
    lastBroadcast: 0,
    lastThemeCheck: "",
  };

  function log(...args: any[]) {
    if (CONFIG.debug) {
      console.log(
        "%c[ChatGPT Audio Controls]",
        "color:#3968c8;font-weight:700",
        ...args,
      );
    }
  }

  function warn(...args: any[]) {
    console.warn("[ChatGPT Audio Controls]", ...args);
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  function getSavedSpeed(): number {
    if (sessionSpeed !== null) return sessionSpeed;

    const configuredSpeed = Number(settingsCache?.defaultSpeed);
    if (Number.isFinite(configuredSpeed) && configuredSpeed >= 0.25 && configuredSpeed <= 4) {
      return configuredSpeed;
    }

    const n = parseFloat(localStorage.getItem(CONFIG.speedStorage) || "");
    return Number.isFinite(n) && n >= 0.25 && n <= 4 ? n : CONFIG.defaultSpeed;
  }

  function getSavedVolume(): number {
    if (sessionVolume !== null) return sessionVolume;

    const configuredVolume = Number(settingsCache?.defaultVolume);
    if (Number.isFinite(configuredVolume) && configuredVolume >= 0 && configuredVolume <= 1) {
      return configuredVolume;
    }

    const n = parseFloat(localStorage.getItem(CONFIG.volumeStorage) || "");
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : CONFIG.defaultVolume;
  }

  function getSavedSettings(): Partial<ExtensionSettings> {
    if (settingsCache) return settingsCache;

    try {
      const raw = localStorage.getItem(CONFIG.settingsStorage);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function getI18n() {
    return getTranslations(settingsCache?.language);
  }

  function applyI18nLabels(): void {
    const t = getI18n();
    const settings = getSavedSettings();
    const step = settings.tapSeekSeconds || CONFIG.tapSeekSeconds;

    if (floatingToggle) {
      floatingToggle.title = t.common.extensionName;
      floatingToggle.setAttribute("aria-label", t.content.tooltips.expand);
    }

    if (rightRail) {
      const backBtn = rightRail.querySelector<HTMLElement>(".cgpt-ra-back");
      if (backBtn) backBtn.title = t.content.tooltips.back.replace("{s}", String(step));

      const playBtn = rightRail.querySelector<HTMLElement>(".cgpt-ra-play");
      if (playBtn) playBtn.title = t.content.tooltips.playPause;

      const forwardBtn = rightRail.querySelector<HTMLElement>(".cgpt-ra-forward");
      if (forwardBtn) forwardBtn.title = t.content.tooltips.forward.replace("{s}", String(step));

      const speedBtn = rightRail.querySelector<HTMLElement>(".cgpt-ra-speed-btn");
      if (speedBtn) speedBtn.title = t.content.tooltips.speed;

      const volBtn = rightRail.querySelector<HTMLElement>(".cgpt-ra-volume-btn");
      if (volBtn) volBtn.title = t.content.tooltips.volume;

      const volSlider = rightRail.querySelector<HTMLInputElement>(".cgpt-ra-volume-slider");
      if (volSlider) volSlider.setAttribute("aria-label", t.content.tooltips.volumeSlider);

      const dlBtn = rightRail.querySelector<HTMLElement>(".cgpt-ra-download");
      if (dlBtn) dlBtn.title = t.content.tooltips.download;

      const helpBtn = rightRail.querySelector<HTMLElement>(".cgpt-ra-help-wrap .cgpt-ra-icon-btn");
      if (helpBtn) helpBtn.title = t.content.tooltips.shortcuts;

      const helpPopover = rightRail.querySelector<HTMLElement>(".cgpt-ra-popover.cgpt-ra-help");
      if (helpPopover) {
        helpPopover.innerHTML = `
          <div class="cgpt-ra-help-title">${t.content.shortcutsPopover.title}</div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.playPause}</span>
            <span class="cgpt-ra-shortcut-key">Space / K</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.back.replace("{s}", String(step))}</span>
            <span class="cgpt-ra-shortcut-key">Alt + ←</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.forward.replace("{s}", String(step))}</span>
            <span class="cgpt-ra-shortcut-key">Alt + →</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.slower}</span>
            <span class="cgpt-ra-shortcut-key">Shift + &lt;</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.faster}</span>
            <span class="cgpt-ra-shortcut-key">Shift + &gt;</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.volumeScroll}</span>
            <span class="cgpt-ra-shortcut-key">${t.content.shortcutsPopover.volumeScrollKey}</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.smoothScrub}</span>
            <span class="cgpt-ra-shortcut-key">${t.content.shortcutsPopover.smoothScrubKey.replace(/{s}/g, String(step))}</span>
          </div>
        `;
      }

      const collapseBtn = rightRail.querySelector<HTMLElement>(".cgpt-ra-collapse-btn");
      if (collapseBtn) collapseBtn.title = t.content.tooltips.collapse;
    }

    updateInlineButtons();
  }

  function installSettingsBridge(): void {
    window.addEventListener("message", (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.data?.source !== "chatgpt-audio-controls-settings-bridge" ||
        event.data?.type !== "CGPT_RA_SETTINGS_UPDATE"
      ) {
        return;
      }

      settingsCache = event.data.settings as ExtensionSettings;

      if (activeMedia) {
        try {
          activeMedia.playbackRate = getSavedSpeed();
          activeMedia.defaultPlaybackRate = getSavedSpeed();
          activeMedia.volume = getSavedVolume();
        } catch (_) {}
      }

      applyI18nLabels();
      installInlineReadAloudButtons();
      updateControls();
    });

    window.postMessage(
      {
        source: "chatgpt-audio-controls-settings-bridge",
        type: "CGPT_RA_SETTINGS_REQUEST",
      },
      "*",
    );
  }

  // ---------------------------------------------------------------------
  // Intelligent ChatGPT Theme & Accent Detection
  // ---------------------------------------------------------------------

  function parseColorToTheme(colorStr: string): string | null {
    if (!colorStr) return null;
    const str = colorStr.toLowerCase().trim();

    if (str.includes("green") || str === "#10a37f") return "green";
    if (str.includes("purple") || str.includes("violet") || str === "#8e55ea") return "purple";
    if (str.includes("orange") || str === "#f97316") return "orange";
    if (str.includes("pink") || str === "#ec4899") return "pink";
    if (str.includes("yellow") || str === "#eab308") return "yellow";
    if (str.includes("blue") || str === "#3968c8") return "blue";

    const rgbMatch = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);

      if (g > r + 30 && g > b - 10 && g > 110) return "green";
      if (b > 140 && r > 90 && g < 130) return "purple";
      if (r > 190 && g > 70 && g < 180 && b < 80) return "orange";
      if (r > 190 && b > 110 && g < 150) return "pink";
      if (r > 170 && g > 140 && b < 80) return "yellow";
      if (b > r + 25 && b > g + 5) return "blue";
    }

    return null;
  }

  function resolveActiveChatGPTTheme(): string {
    const attrEl = document.querySelector("[data-chat-theme]");
    const attr =
      document.documentElement.getAttribute("data-chat-theme") ||
      document.body?.getAttribute("data-chat-theme") ||
      attrEl?.getAttribute("data-chat-theme");

    if (attr && CHATGPT_THEME_KEYS.includes(attr.toLowerCase())) {
      return attr.toLowerCase();
    }

    const classes = `${document.documentElement.className} ${document.body?.className || ""}`.toLowerCase();
    for (const t of ["green", "purple", "orange", "pink", "yellow", "black", "blue"]) {
      if (classes.includes(`theme-${t}`) || classes.includes(`chat-theme-${t}`) || classes.includes(`data-theme-${t}`)) {
        return t;
      }
    }

    const rootStyle = getComputedStyle(document.documentElement);
    // ChatGPT's theme selector drives --theme-submit-btn-bg. The generic
    // interactive accent remains blue even when a chat theme is selected.
    const accentRaw =
      rootStyle.getPropertyValue("--theme-submit-btn-bg").trim() ||
      rootStyle.getPropertyValue("--interactive-bg-accent-secondary-default").trim();

    const fromAccent = parseColorToTheme(accentRaw);
    if (fromAccent) return fromAccent;

    const submitBtn = document.querySelector(
      'button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="Voice"], button[data-testid*="submit"]'
    );
    if (submitBtn) {
      const btnStyle = getComputedStyle(submitBtn);
      const fromBtnBg = parseColorToTheme(btnStyle.backgroundColor);
      if (fromBtnBg) return fromBtnBg;
      const fromBtnColor = parseColorToTheme(btnStyle.color);
      if (fromBtnColor) return fromBtnColor;
    }

    return "blue";
  }

  function detectAndCacheChatGPTTheme(): void {
    try {
      const isDark = document.documentElement.classList.contains("dark") ||
        !document.documentElement.classList.contains("light");

      const chatTheme = resolveActiveChatGPTTheme();
      const themeKey = `${isDark ? "dark" : "light"}-${chatTheme}`;

      if (cache.lastThemeCheck === themeKey) return;
      cache.lastThemeCheck = themeKey;

      const themeCache = {
        isDark,
        chatTheme,
        updatedAt: Date.now(),
      };

      localStorage.setItem("cgpt-ra-theme-cache", JSON.stringify(themeCache));
      window.postMessage(
        {
          source: "chatgpt-audio-controls-settings-bridge",
          type: "CGPT_RA_THEME_UPDATE",
          theme: themeCache,
        },
        "*",
      );

      log("Synchronized ChatGPT Theme:", chatTheme, isDark ? "Dark" : "Light");
    } catch (_) {}
  }

  function broadcastLiveAudioState(force = false): void {
    const now = Date.now();
    if (!force && now - cache.lastBroadcast < 500) return;
    cache.lastBroadcast = now;

    const isPlaying = Boolean(activeMedia && !activeMedia.paused && !activeMedia.ended);
    const current = Number(activeMedia?.currentTime) || 0;
    const duration = Number(activeMedia?.duration) || 0;
    const speed = activeMedia?.playbackRate || getSavedSpeed();
    const volume = activeMedia ? activeMedia.volume : getSavedVolume();

    const liveState = {
      hasMedia: Boolean(activeMedia),
      isPlaying,
      currentTime: current,
      duration,
      speed,
      volume,
      isMuted: Boolean(activeMedia?.muted || volume === 0),
      formattedCurrent: formatTime(current),
      formattedDuration: formatTime(duration),
      updatedAt: now,
    };

    try {
      localStorage.setItem("cgpt-ra-live-state", JSON.stringify(liveState));
    } catch (_) {}

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      try {
        chrome.storage.local.set({ "cgpt-ra-live-state": liveState });
      } catch (_) {}
    }
  }

  // ---------------------------------------------------------------------
  // Audio capture / download interception (Leak-free)
  // ---------------------------------------------------------------------

  function looksLikeAudio(url: string, contentType: string): boolean {
    const u = String(url || "").toLowerCase();
    const type = String(contentType || "").toLowerCase();

    return (
      type.startsWith("audio/") ||
      type.includes("application/ogg") ||
      (type.includes("application/octet-stream") &&
        /(audio|speech|voice|tts|synth)/.test(u)) ||
      /\.(mp3|m4a|aac|wav|ogg|opus|webm)(?:$|\?)/i.test(u) ||
      /(read.?aloud|text.?to.?speech|tts|synthesi[sz]e|speech)/i.test(u)
    );
  }

  function rememberAudioBlob(blob: Blob, sourceURL = ""): void {
    if (!(blob instanceof Blob) || !blob.size) return;

    const mime = blob.type || "";
    if (mime && !looksLikeAudio(sourceURL, mime)) return;

    capturedAudioBlob = blob;
    capturedAudioMime = mime;
    capturedAudioURL = sourceURL;
    capturedAudioAt = Date.now();

    log("Captured audio payload", {
      size: blob.size,
      type: blob.type,
      sourceURL,
    });
  }

  function installObjectURLInterceptor(): void {
    try {
      const urlObj = PAGE.URL;
      if (!urlObj || urlObj.__cgptRAObjectURLHook) return;

      const originalCreate = urlObj.createObjectURL.bind(urlObj);
      const originalRevoke = urlObj.revokeObjectURL.bind(urlObj);

      urlObj.createObjectURL = function (object: any) {
        const url = originalCreate(object);

        try {
          if (object instanceof PAGE.Blob && object.size && looksLikeAudio(url, object.type)) {
            rememberBlobURL(url, object);
            rememberAudioBlob(object, url);
          }
        } catch (_) {}

        return url;
      };

      urlObj.revokeObjectURL = function (url: string) {
        removeBlobURL(url);
        return originalRevoke(url);
      };

      Object.defineProperty(urlObj, "__cgptRAObjectURLHook", {
        value: true,
        configurable: true,
      });
    } catch (error) {
      warn("Object URL interception failed:", error);
    }
  }

  function installFetchInterceptor(): void {
    try {
      if (!PAGE.fetch || PAGE.fetch.__cgptRAFetchHook) return;

      const originalFetch = PAGE.fetch.bind(PAGE);

      async function wrappedFetch(...args: any[]) {
        const response = await originalFetch(...args);

        try {
          const requestURL =
            typeof args[0] === "string"
              ? args[0]
              : args[0]?.url || response.url || "";

          const type = response.headers?.get("content-type") || "";

          if (looksLikeAudio(requestURL, type)) {
            response
              .clone()
              .blob()
              .then((blob: Blob) => rememberAudioBlob(blob, requestURL))
              .catch(() => {});
          }
        } catch (_) {}

        return response;
      }

      wrappedFetch.__cgptRAFetchHook = true;
      PAGE.fetch = wrappedFetch;

      log("fetch() audio capture installed");
    } catch (error) {
      warn("fetch interception failed:", error);
    }
  }

  function installXHRInterceptor(): void {
    try {
      const proto = PAGE.XMLHttpRequest?.prototype;
      if (!proto || proto.__cgptRAXHRHook) return;

      const originalOpen = proto.open;
      const originalSend = proto.send;

      proto.open = function (method: string, url: string, ...rest: any[]) {
        this.__cgptRAURL = String(url || "");
        return originalOpen.call(this, method, url, ...rest);
      };

      proto.send = function (...args: any[]) {
        this.addEventListener(
          "load",
          () => {
            try {
              const type = this.getResponseHeader("content-type") || "";
              const url = this.responseURL || this.__cgptRAURL || "";

              if (!looksLikeAudio(url, type)) return;

              if (this.response instanceof PAGE.Blob) {
                rememberAudioBlob(this.response, url);
              } else if (this.response instanceof PAGE.ArrayBuffer) {
                rememberAudioBlob(new Blob([this.response], { type }), url);
              }
            } catch (_) {}
          },
          { once: true },
        );

        return originalSend.apply(this, args);
      };

      Object.defineProperty(proto, "__cgptRAXHRHook", {
        value: true,
        configurable: true,
      });
    } catch (error) {
      warn("XHR interception failed:", error);
    }
  }

  // ---------------------------------------------------------------------
  // Media interception
  // ---------------------------------------------------------------------

  function getSeekInfo(media = activeMedia): { start: number; end: number; seekable: boolean } {
    if (!media) return { start: 0, end: 0, seekable: false };

    try {
      if (Number.isFinite(media.duration) && media.duration > 0) {
        return { start: 0, end: media.duration, seekable: true };
      }

      if (media.seekable?.length) {
        return {
          start: media.seekable.start(0),
          end: media.seekable.end(media.seekable.length - 1),
          seekable: true,
        };
      }

      if (media.buffered?.length) {
        return {
          start: 0,
          end: media.buffered.end(media.buffered.length - 1),
          seekable: true,
        };
      }
    } catch (_) {}

    return { start: 0, end: 0, seekable: false };
  }

  function isReadAloudMedia(media: HTMLMediaElement): boolean {
    if (media.tagName !== "AUDIO") return false;

    const source = media.currentSrc || media.src || "";
    return (
      !media.isConnected ||
      Boolean(pendingInlineButton) ||
      blobURLMap.has(source) ||
      source === capturedAudioURL ||
      looksLikeAudio(source, "")
    );
  }

  function attachMedia(media: HTMLMediaElement, reason = "detected"): void {
    if (!media || typeof media.play !== "function" || !isReadAloudMedia(media)) return;

    const changed = activeMedia !== media;
    activeMedia = media;
    if (changed) {
      userForcedExpand = true;
      userForcedCollapsed = false;
    }

    if (changed) {
      try {
        media.playbackRate = getSavedSpeed();
        media.defaultPlaybackRate = getSavedSpeed();
        media.volume = getSavedVolume();
      } catch (_) {}
    }

    if (pendingInlineButton) {
      activeInlineButton = pendingInlineButton;
      pendingInlineButton = null;
    }

    if (changed) installMediaListeners(media);

    setControlsEnabled(true);
    updateControls();
    updateInlineButtons();
    broadcastLiveAudioState(true);
    scheduleLayoutSync();

    log("Attached media:", reason, media);
  }

  function installMediaListeners(media: HTMLMediaElement): void {
    if (mediaListenersInstalled.has(media)) return;
    mediaListenersInstalled.add(media);

    [
      "loadedmetadata",
      "durationchange",
      "timeupdate",
      "ratechange",
      "volumechange",
      "play",
      "pause",
      "ended",
      "canplay",
    ].forEach((name) => {
      media.addEventListener(name, () => {
        if (activeMedia === media) {
          updateControls();
          updateInlineButtons();
          broadcastLiveAudioState();
          if (name === "play" || name === "pause" || name === "ended") {
            scheduleLayoutSync();
          }
        }
      });
    });
  }

  function installMediaInterceptor(): void {
    try {
      const proto = PAGE.HTMLMediaElement?.prototype;
      if (!proto || proto.__cgptRAV4Hook) return;

      const originalPlay = proto.play;
      const originalPause = proto.pause;

      proto.play = function (...args: any[]) {
        const isReadAloud = isReadAloudMedia(this);
        if (isReadAloud) attachMedia(this, "play() intercepted");

        const result = originalPlay.apply(this, args);

        queueMicrotask(() => {
          try {
            if (!isReadAloud) return;
            this.playbackRate = getSavedSpeed();
            this.defaultPlaybackRate = getSavedSpeed();
            this.volume = getSavedVolume();
          } catch (_) {}

          updateControls();
          broadcastLiveAudioState(true);
        });

        return result;
      };

      proto.pause = function (...args: any[]) {
        const result = originalPause.apply(this, args);

        if (this === activeMedia) {
          queueMicrotask(() => {
            updateControls();
            updateInlineButtons();
            broadcastLiveAudioState(true);
            scheduleLayoutSync();
          });
        }

        return result;
      };

      Object.defineProperty(proto, "__cgptRAV4Hook", {
        value: true,
        configurable: true,
      });

      log("HTMLMediaElement hook installed");
    } catch (error) {
      warn("Media hook failed:", error);
    }
  }

  // ---------------------------------------------------------------------
  // UI Building
  // ---------------------------------------------------------------------

  function buildUI(): void {
    if (leftRail || !document.body) return;

    floatingToggle = document.createElement("button");
    floatingToggle.id = "cgpt-ra-floating-toggle";
    floatingToggle.type = "button";
    floatingToggle.title = "ChatGPT Audio Controls";
    floatingToggle.setAttribute("aria-label", "Expand ChatGPT Audio Controls");
    floatingToggle.innerHTML = getLucideSvg("chatgpt-audio");

    floatingToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      userForcedExpand = true;
      userForcedCollapsed = false;
      scheduleLayoutSync();
    });

    leftRail = document.createElement("div");
    leftRail.id = "cgpt-ra-left";
    leftRail.className = "cgpt-ra-no-media cgpt-ra-collapsed";

    leftRail.innerHTML = `
      <div class="cgpt-ra-progress-row">
        <span class="cgpt-ra-time">
          <span class="cgpt-ra-current">0:00</span>/<span class="cgpt-ra-duration">0:00</span>
        </span>

        <div class="cgpt-ra-seek-wrap">
          <input class="cgpt-ra-range cgpt-ra-seek-slider cgpt-ra-media-control"
                 type="range" min="0" max="100" step="0.01" value="0" disabled>
        </div>
      </div>
    `;

    rightRail = document.createElement("div");
    rightRail.id = "cgpt-ra-right";
    rightRail.className = "cgpt-ra-no-media cgpt-ra-collapsed";

    rightRail.innerHTML = `
      <div class="cgpt-ra-transport-row cgpt-ra-media-control">
        <button class="cgpt-ra-icon-btn cgpt-ra-seek10 cgpt-ra-back cgpt-ra-media-control"
                title="Back 10 seconds — hold to scrub" disabled>
          ${getLucideSvg("rotate-ccw")}
          <span class="cgpt-ra-ten">10</span>
        </button>

        <button class="cgpt-ra-icon-btn cgpt-ra-play cgpt-ra-media-control"
                title="Play / Pause (Space or K; Alt+P legacy)" disabled>
          ${getLucideSvg("play")}
        </button>

        <button class="cgpt-ra-icon-btn cgpt-ra-seek10 cgpt-ra-forward cgpt-ra-media-control"
                title="Forward 10 seconds — hold to scrub" disabled>
          ${getLucideSvg("rotate-cw")}
          <span class="cgpt-ra-ten">10</span>
        </button>
      </div>

      <div class="cgpt-ra-speed-wrap cgpt-ra-media-control">
        <button class="cgpt-ra-icon-btn cgpt-ra-speed-btn" title="Playback speed" disabled>
          ${getSavedSpeed()}×
        </button>
        <div class="cgpt-ra-popover cgpt-ra-speed-menu"></div>
      </div>

      <div class="cgpt-ra-volume-wrap cgpt-ra-media-control">
        <button class="cgpt-ra-icon-btn cgpt-ra-volume-btn" title="Volume (Scroll to adjust)" disabled>
          ${getLucideSvg("volume-2")}
        </button>
        <div class="cgpt-ra-volume-popover">
          <input class="cgpt-ra-range cgpt-ra-volume-slider"
                 type="range" min="0" max="1" step="0.01"
                 value="${getSavedVolume()}">
          <span class="cgpt-ra-volume-value">${Math.round(getSavedVolume() * 100)}%</span>
        </div>
      </div>

      <button class="cgpt-ra-icon-btn cgpt-ra-download cgpt-ra-media-control"
              title="Download audio" disabled>
        ${getLucideSvg("download")}
      </button>

      <div class="cgpt-ra-help-wrap">
        <button class="cgpt-ra-icon-btn" title="Keyboard shortcuts & gestures">
          ${getLucideSvg("circle-help")}
        </button>
        <div class="cgpt-ra-popover cgpt-ra-help">
          <div class="cgpt-ra-help-title">Read Aloud Shortcuts</div>
          <div class="cgpt-ra-shortcut-row">
            <span>Play / Pause</span>
            <span class="cgpt-ra-shortcut-key">Space / K</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>Back 10 sec</span>
            <span class="cgpt-ra-shortcut-key">Alt + ←</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>Forward 10 sec</span>
            <span class="cgpt-ra-shortcut-key">Alt + →</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>Slower Preset</span>
            <span class="cgpt-ra-shortcut-key">Shift + &lt;</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>Faster Preset</span>
            <span class="cgpt-ra-shortcut-key">Shift + &gt;</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>Volume Scroll</span>
            <span class="cgpt-ra-shortcut-key">Scroll on 🔈</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>Smooth Scrub</span>
            <span class="cgpt-ra-shortcut-key">Hold ◀10 / 10▶</span>
          </div>
        </div>
      </div>

      <button class="cgpt-ra-icon-btn cgpt-ra-collapse-btn" title="Collapse Player">
        ${getLucideSvg("minimize-2")}
      </button>
    `;

    document.body.append(floatingToggle, leftRail, rightRail);

    collapseButton = rightRail.querySelector(".cgpt-ra-collapse-btn");
    collapseButton?.addEventListener("click", (e) => {
      e.stopPropagation();
      userForcedExpand = false;
      userForcedCollapsed = Boolean(activeMedia);
      scheduleLayoutSync();
    });

    seekSlider = leftRail.querySelector(".cgpt-ra-seek-slider");
    currentLabel = leftRail.querySelector(".cgpt-ra-current");
    durationLabel = leftRail.querySelector(".cgpt-ra-duration");
    playButton = rightRail.querySelector(".cgpt-ra-play");

    speedButton = rightRail.querySelector(".cgpt-ra-speed-btn");
    speedMenu = rightRail.querySelector(".cgpt-ra-speed-menu");
    volumeWrap = rightRail.querySelector(".cgpt-ra-volume-wrap");
    volumeSlider = rightRail.querySelector(".cgpt-ra-volume-slider");
    volumeLabel = rightRail.querySelector(".cgpt-ra-volume-value");
    downloadButton = rightRail.querySelector(".cgpt-ra-download");

    CONFIG.speeds.forEach((speed) => {
      const item = document.createElement("button");
      item.className = "cgpt-ra-speed-option";
      item.type = "button";
      item.dataset.speed = String(speed);
      item.textContent = `${speed}×`;

      item.addEventListener("click", () => {
        setSpeed(speed);
        rightRail?.querySelector(".cgpt-ra-speed-wrap")?.classList.remove("cgpt-open");
      });

      speedMenu?.appendChild(item);
    });

    speedButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      rightRail?.querySelector(".cgpt-ra-speed-wrap")?.classList.toggle("cgpt-open");
    });

    document.addEventListener("click", () => {
      rightRail?.querySelector(".cgpt-ra-speed-wrap")?.classList.remove("cgpt-open");
    });

    playButton?.addEventListener("click", togglePlayback);

    installHoldSeek(rightRail.querySelector(".cgpt-ra-back") as HTMLElement, -1);
    installHoldSeek(rightRail.querySelector(".cgpt-ra-forward") as HTMLElement, 1);

    seekSlider?.addEventListener("pointerdown", () => {
      sliderDragging = true;
    });

    seekSlider?.addEventListener("input", () => {
      if (!activeMedia || !seekSlider || !currentLabel) return;
      const target = parseFloat(seekSlider.value);
      seekAbsolute(target, false);
      currentLabel.textContent = formatTime(target);
    });

    const finishSeek = () => {
      if (!sliderDragging || !seekSlider) return;
      sliderDragging = false;
      seekAbsolute(parseFloat(seekSlider.value), true);
    };

    seekSlider?.addEventListener("pointerup", finishSeek);
    seekSlider?.addEventListener("pointercancel", finishSeek);

    volumeSlider?.addEventListener("input", () => {
      if (!volumeSlider) return;
      setVolume(parseFloat(volumeSlider.value));
    });

    volumeWrap?.addEventListener(
      "wheel",
      (event: WheelEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const delta = event.deltaY < 0 ? 0.05 : -0.05;
        const current = activeMedia ? activeMedia.volume : getSavedVolume();
        setVolume(clamp(current + delta, 0, 1));
      },
      { passive: false }
    );

    downloadButton?.addEventListener("click", downloadCurrentAudio);

    applyI18nLabels();
    setControlsEnabled(Boolean(activeMedia));
    detectAndCacheChatGPTTheme();
    syncComposerLayout();
  }

  function setControlsEnabled(enabled: boolean): void {
    if (!leftRail || !rightRail || cache.controlsEnabled === enabled) return;
    cache.controlsEnabled = enabled;

    leftRail.classList.toggle("cgpt-ra-no-media", !enabled);
    rightRail.classList.toggle("cgpt-ra-no-media", !enabled);

    leftRail.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input").forEach((el) => {
      el.disabled = !enabled;
    });

    rightRail
      .querySelectorAll<HTMLButtonElement | HTMLInputElement>(
        ".cgpt-ra-transport-row button, .cgpt-ra-speed-btn, .cgpt-ra-volume-btn, .cgpt-ra-volume-slider, .cgpt-ra-download",
      )
      .forEach((el) => {
        el.disabled = !enabled;
      });

    const helpButton = rightRail.querySelector<HTMLButtonElement>(".cgpt-ra-help-wrap > button");
    if (helpButton) helpButton.disabled = false;

    if (collapseButton) collapseButton.disabled = false;
  }

  // ---------------------------------------------------------------------
  // Layout Alignment
  // ---------------------------------------------------------------------

  let layoutRaf: number | null = null;
  function scheduleLayoutSync(): void {
    if (layoutRaf) return;
    layoutRaf = requestAnimationFrame(() => {
      layoutRaf = null;
      syncComposerLayout();
    });
  }

  function getComposer(): HTMLElement | null {
    const prompt =
      document.querySelector("#prompt-textarea") ||
      document.querySelector('[data-testid="composer-text-input"]') ||
      document.querySelector('textarea[placeholder*="Ask"]');

    if (!prompt) return null;

    return (
      prompt.closest('[data-type="unified-composer"]') ||
      prompt.closest("form") ||
      prompt.parentElement?.parentElement?.parentElement ||
      prompt.parentElement
    );
  }

  function syncComposerLayout(): void {
    if (!leftRail || !rightRail || !floatingToggle) return;

    const composer = getComposer();
    const hasActiveAudio = activeMedia && !activeMedia.paused && !activeMedia.ended;
    const shouldStayCollapsed = userForcedCollapsed;
    const shouldExpand = Boolean(!shouldStayCollapsed && (hasActiveAudio || userForcedExpand));

    if (!composer) {
      cache.isCollapsed = true;
      leftRail.classList.add("cgpt-ra-collapsed");
      rightRail.classList.add("cgpt-ra-collapsed");
      if (cache.floatingHidden) {
        cache.floatingHidden = false;
        floatingToggle.classList.remove("cgpt-ra-hidden");
      }
      floatingToggle.style.right = "16px";
      floatingToggle.style.bottom = "80px";
      return;
    }

    const rect = composer.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const sideGap = 10;
    const outerMargin = 14;

    const leftAvailable = rect.left - outerMargin - sideGap;
    const rightAvailable = viewportWidth - rect.right - outerMargin - sideGap;

    const minLeftWidth = 240;
    const maxLeftWidth = 430;

    const minRightWidth = 360;
    const canFit = leftAvailable >= minLeftWidth && rightAvailable >= minRightWidth;

    if (shouldStayCollapsed) {
      cache.isCollapsed = true;
      leftRail.classList.add("cgpt-ra-collapsed");
      rightRail.classList.add("cgpt-ra-collapsed");

      if (cache.floatingHidden) {
        cache.floatingHidden = false;
        floatingToggle.classList.remove("cgpt-ra-hidden");
      }

      const toggleX = `${Math.round(Math.min(viewportWidth - 52, rect.right + 12))}px`;
      const toggleY = `${Math.round(rect.top + rect.height / 2 - 21)}px`;

      if (floatingToggle.style.left !== toggleX) floatingToggle.style.left = toggleX;
      if (floatingToggle.style.top !== toggleY) floatingToggle.style.top = toggleY;
      floatingToggle.style.right = "";
      floatingToggle.style.bottom = "";
      return;
    }

    if (!canFit || !shouldExpand) {
      cache.isCollapsed = true;
      leftRail.classList.add("cgpt-ra-collapsed");
      rightRail.classList.add("cgpt-ra-collapsed");

      if (cache.floatingHidden) {
        cache.floatingHidden = false;
        floatingToggle.classList.remove("cgpt-ra-hidden");
      }

      const toggleX = `${Math.round(Math.min(viewportWidth - 52, rect.right + 12))}px`;
      const toggleY = `${Math.round(rect.top + rect.height / 2 - 21)}px`;

      if (floatingToggle.style.left !== toggleX) floatingToggle.style.left = toggleX;
      if (floatingToggle.style.top !== toggleY) floatingToggle.style.top = toggleY;
      floatingToggle.style.right = "";
      floatingToggle.style.bottom = "";
      return;
    }

    if (!cache.floatingHidden) {
      cache.floatingHidden = true;
      floatingToggle.classList.add("cgpt-ra-hidden");
    }

    if (cache.isCollapsed) {
      cache.isCollapsed = false;
      leftRail.classList.remove("cgpt-ra-collapsed");
      rightRail.classList.remove("cgpt-ra-collapsed");
    }
    const computedLeftWidth = `${Math.round(clamp(leftAvailable, minLeftWidth, maxLeftWidth))}px`;
    const leftX = `${Math.round(rect.left - sideGap - parseFloat(computedLeftWidth))}px`;
    const leftY = `${Math.round(rect.top + rect.height / 2 - 24)}px`;
    const rightX = `${Math.round(rect.right + sideGap)}px`;

    if (leftRail.style.width !== computedLeftWidth) leftRail.style.width = computedLeftWidth;
    if (leftRail.style.left !== leftX) leftRail.style.left = leftX;
    if (leftRail.style.top !== leftY) leftRail.style.top = leftY;

    if (rightRail.style.left !== rightX) rightRail.style.left = rightX;
    if (rightRail.style.top !== leftY) rightRail.style.top = leftY;
  }

  // ---------------------------------------------------------------------
  // Smooth seek on hold
  // ---------------------------------------------------------------------

  function installHoldSeek(button: HTMLElement | null, direction: number): void {
    if (!button) return;

    let holding = false;
    let holdStarted = 0;
    let lastFrame = 0;
    let becameHold = false;
    let smoothScrubbingEnabled = true;
    let raf: number | null = null;
    let pointerId: number | null = null;

    const frame = (now: number) => {
      if (!holding) return;
      if (!smoothScrubbingEnabled) return;

      const heldFor = (now - holdStarted) / 1000;

      if (heldFor < 0.28) {
        raf = requestAnimationFrame(frame);
        return;
      }

      becameHold = true;

      if (!lastFrame) lastFrame = now;
      const dt = Math.max(0, (now - lastFrame) / 1000);
      lastFrame = now;

      let seekRate: number;
      if (heldFor < 1.5) seekRate = 4;
      else if (heldFor < 3) seekRate = 10;
      else if (heldFor < 6) seekRate = 25;
      else seekRate = 50;

      seekRelative(direction * seekRate * dt, false);
      updateControls();

      raf = requestAnimationFrame(frame);
    };

    button.addEventListener("pointerdown", (event: PointerEvent) => {
      if ((button as HTMLButtonElement).disabled || event.button !== 0) return;

      event.preventDefault();

      holding = true;
      pointerId = event.pointerId;
      becameHold = false;
      smoothScrubbingEnabled = getSavedSettings().smoothScrubbing !== false;
      holdStarted = performance.now();
      lastFrame = 0;

      try {
        button.setPointerCapture(event.pointerId);
      } catch (_) {}

      raf = requestAnimationFrame(frame);
    });

    const stop = (event: PointerEvent) => {
      if (!holding) return;
      if (event.pointerId !== pointerId) return;
      holding = false;

      if (raf) cancelAnimationFrame(raf);

      if (!becameHold) {
        const step = getSavedSettings().tapSeekSeconds || CONFIG.tapSeekSeconds;
        seekRelative(direction * step);
      }

      try {
        if (pointerId !== null && button.hasPointerCapture(pointerId)) {
          button.releasePointerCapture(pointerId);
        }
      } catch (_) {}

      pointerId = null;
    };

    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("lostpointercapture", stop);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  }

  function seekAbsolute(target: number, update = true): void {
    if (!activeMedia) return;

    const info = getSeekInfo(activeMedia);
    if (!info.seekable) return;

    target = clamp(target, info.start, info.end);

    try {
      activeMedia.currentTime = target;
    } catch (error) {
      warn("Seek failed:", error);
    }

    if (update) updateControls();
  }

  function seekRelative(seconds: number, update = true): void {
    if (!activeMedia) return;
    seekAbsolute((Number(activeMedia.currentTime) || 0) + seconds, update);
  }

  // ---------------------------------------------------------------------
  // Playback / speed / volume with DOM Cache
  // ---------------------------------------------------------------------

  function togglePlayback(): void {
    if (!activeMedia) return;

    try {
      if (activeMedia.paused) {
        const p = activeMedia.play();
        if (p?.catch) p.catch((error) => warn("Play failed:", error));
      } else {
        activeMedia.pause();
      }
    } catch (error) {
      warn("Play/pause failed:", error);
    }
  }

  function setSpeed(speed: number): void {
    if (!Number.isFinite(speed) || speed <= 0) return;

    sessionSpeed = speed;
    localStorage.setItem(CONFIG.speedStorage, String(speed));

    if (activeMedia) {
      try {
        activeMedia.playbackRate = speed;
        activeMedia.defaultPlaybackRate = speed;
      } catch (_) {}
    }

    updateControls();
    broadcastLiveAudioState(true);
  }

  function setVolume(volume: number): void {
    volume = clamp(volume, 0, 1);

    sessionVolume = volume;
    localStorage.setItem(CONFIG.volumeStorage, String(volume));

    if (activeMedia) {
      try {
        activeMedia.volume = volume;
        activeMedia.muted = false;
      } catch (_) {}
    }

    updateControls();
    broadcastLiveAudioState(true);
  }

  function updateControls(): void {
    if (!leftRail || !rightRail) return;

    if (!activeMedia) {
      setControlsEnabled(false);
      return;
    }

    setControlsEnabled(true);

    const current = Number(activeMedia.currentTime) || 0;
    const info = getSeekInfo(activeMedia);

    const formattedCur = formatTime(current);
    if (currentLabel && cache.currentTimeStr !== formattedCur) {
      cache.currentTimeStr = formattedCur;
      currentLabel.textContent = formattedCur;
    }

    const durationNum = Number.isFinite(activeMedia.duration)
      ? activeMedia.duration
      : info.seekable
      ? info.end
      : 0;

    const formattedDur = durationNum > 0 ? formatTime(durationNum) : "--:--";
    if (durationLabel && cache.durationStr !== formattedDur) {
      cache.durationStr = formattedDur;
      durationLabel.textContent = formattedDur;
    }

    if (seekSlider) {
      if (info.seekable) {
        if (seekSlider.disabled) seekSlider.disabled = false;
        seekSlider.min = String(info.start);
        seekSlider.max = String(info.end);

        if (!sliderDragging) {
          seekSlider.value = String(clamp(current, info.start, info.end));
        }
      } else if (!seekSlider.disabled) {
        seekSlider.disabled = true;
      }
    }

    const isPaused = activeMedia.paused;
    if (cache.isPaused !== isPaused) {
      cache.isPaused = isPaused;
      setIcon(playButton, isPaused ? "play" : "pause");
    }

    const speed = activeMedia.playbackRate || getSavedSpeed();
    if (cache.speed !== speed) {
      cache.speed = speed;
      if (speedButton) speedButton.textContent = `${speed}×`;

      speedMenu?.querySelectorAll<HTMLElement>(".cgpt-ra-speed-option").forEach((item) => {
        item.classList.toggle(
          "cgpt-selected",
          Math.abs(parseFloat(item.dataset.speed || "0") - speed) < 0.001,
        );
      });
    }

    const volume = activeMedia.volume;
    const isMuted = activeMedia.muted || volume <= 0;

    if (cache.volume !== volume || cache.isMuted !== isMuted) {
      cache.volume = volume;
      cache.isMuted = isMuted;

      if (volumeSlider) volumeSlider.value = String(volume);
      if (volumeLabel) volumeLabel.textContent = `${Math.round(volume * 100)}%`;

      const volumeButton = rightRail.querySelector<HTMLElement>(".cgpt-ra-volume-btn");
      if (isMuted) {
        setIcon(volumeButton, "volume-x");
      } else if (volume < 0.5) {
        setIcon(volumeButton, "volume-1");
      } else {
        setIcon(volumeButton, "volume-2");
      }
    }
  }

  // ---------------------------------------------------------------------
  // Download Audio
  // ---------------------------------------------------------------------

  function extensionFor(mime: string, url = ""): string {
    const type = String(mime || "").toLowerCase();

    if (type.includes("mpeg")) return "mp3";
    if (type.includes("mp4") || type.includes("m4a") || type.includes("aac"))
      return "m4a";
    if (type.includes("wav")) return "wav";
    if (type.includes("ogg") || type.includes("opus")) return "ogg";
    if (type.includes("webm")) return "webm";

    const match = String(url).match(
      /\.(mp3|m4a|aac|wav|ogg|opus|webm)(?:$|\?)/i,
    );
    return match ? match[1].toLowerCase() : "mp3";
  }

  async function resolveDownloadBlob(): Promise<{ blob: Blob; mime: string; url: string }> {
    if (capturedAudioBlob && Date.now() - capturedAudioAt < 60 * 60 * 1000) {
      return {
        blob: capturedAudioBlob,
        mime: capturedAudioMime || capturedAudioBlob.type,
        url: capturedAudioURL,
      };
    }

    if (!activeMedia) throw new Error("No active Read Aloud audio.");

    const src = activeMedia.currentSrc || activeMedia.src || "";

    if (src && blobURLMap.has(src)) {
      const blob = blobURLMap.get(src)!;

      // Touch the entry so the cache behaves as an LRU when it is pruned.
      blobURLMap.delete(src);
      blobURLMap.set(src, blob);
      return { blob, mime: blob.type, url: src };
    }

    if (src) {
      try {
        const response = await PAGE.fetch(src, { credentials: "include" });

        if (response.ok) {
          const blob = await response.blob();

          if (blob.size) {
            return {
              blob,
              mime: blob.type || response.headers.get("content-type") || "",
              url: src,
            };
          }
        }
      } catch (_) {}
    }

    throw new Error("The current Read Aloud stream was not exposed as a downloadable media response.");
  }

  async function downloadCurrentAudio(): Promise<void> {
    if (!activeMedia || !downloadButton) return;

    downloadButton.setAttribute("disabled", "true");
    downloadButton.classList.add("cgpt-ra-download-busy");
    setIcon(downloadButton, "loader-circle");

    try {
      const { blob, mime, url } = await resolveDownloadBlob();

      const ext = extensionFor(mime || blob.type, url);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `chatgpt-read-aloud-${timestamp}.${ext}`;

      const objectURL = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectURL;
      link.download = filename;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(objectURL), 5000);

      log("Downloaded audio:", filename, blob.size, mime);
    } catch (error) {
      warn("Download failed:", error);
      alert(getI18n().content.alerts.downloadError);
    } finally {
      downloadButton.classList.remove("cgpt-ra-download-busy");
      downloadButton.removeAttribute("disabled");
      setIcon(downloadButton, "download");
    }
  }

  // ---------------------------------------------------------------------
  // Inline Read Aloud Button
  // ---------------------------------------------------------------------

  function textMeaning(element: Element | null): string {
    if (!element) return "";
    return (
      `${element.getAttribute?.("aria-label") || ""} ` +
      `${element.getAttribute?.("title") || ""} ` +
      `${element.textContent || ""}`
    )
      .trim()
      .toLowerCase();
  }

  function accessibleMeaning(element: Element | null): string {
    if (!element) return "";
    return `${element.getAttribute("aria-label") || ""} ${element.getAttribute("title") || ""}`
      .trim()
      .toLowerCase();
  }

  function isCopyControl(button: Element): boolean {
    const label = textMeaning(button);
    const testId = (button.getAttribute("data-testid") || "").toLowerCase();
    return (
      /(?:^|[-_])(copy|copy-response|copy-code)(?:[-_]|$)/.test(testId) ||
      label === "copy" ||
      label.includes("copy response") ||
      label.includes("copy code")
    );
  }

  function isReadAloudControl(button: Element): boolean {
    const label = accessibleMeaning(button) || textMeaning(button);
    const testId = (button.getAttribute("data-testid") || "").toLowerCase();
    return (
      /(?:read[-_ ]?aloud|read[-_ ]?out[-_ ]?loud|text[-_ ]?to[-_ ]?speech|tts)/.test(testId) ||
      /\bread aloud\b/.test(label) ||
      /\bread out loud\b/.test(label) ||
      label === "read"
    );
  }

  function isMoreActionsControl(button: Element): boolean {
    const label = accessibleMeaning(button);
    const testId = (button.getAttribute("data-testid") || "").toLowerCase();
    const identifier = `${label} ${testId}`.trim();

    return (
      label === "more" ||
      label.includes("more actions") ||
      label.includes("more options") ||
      label.includes("response actions") ||
      /(?:^|[-_\s])(more|options|overflow|ellipsis|kebab)(?:[-_\s]|$)/.test(identifier)
    );
  }

  function findMoreActionsControl(scope: Element | null): HTMLElement | null {
    if (!scope) return null;

    const buttons = [
      ...(scope.matches("button, [role='button']") ? [scope as HTMLElement] : []),
      ...Array.from(scope.querySelectorAll<HTMLElement>("button, [role='button']")),
    ].filter(
      (button) =>
        !button.classList.contains("cgpt-inline-readaloud") &&
        !button.closest("pre, code, table"),
    );

    return (
      buttons.find(isMoreActionsControl) ||
      buttons.find((button) => button.getAttribute("aria-haspopup") === "menu") ||
      null
    );
  }

  function findMoreActionsNear(element: Element | null, stopAt: Element | null): HTMLElement | null {
    let scope = element;

    while (scope && scope !== document.body) {
      const moreButton = findMoreActionsControl(scope);
      if (moreButton) return moreButton;
      if (scope === stopAt) break;
      scope = scope.parentElement;
    }

    return null;
  }

  function isInteractiveContainer(element: Element | null): boolean {
    return Boolean(element?.matches("button, [role='button'], a, input, textarea, select"));
  }

  function findActionContainer(control: Element, boundary: Element): Element | null {
    let candidate = control.parentElement;
    let firstSafeContainer: Element | null = null;

    while (candidate && candidate !== document.body) {
      if (!isInteractiveContainer(candidate)) {
        firstSafeContainer ||= candidate;

        const controlCount = candidate.querySelectorAll("button, [role='button']").length;
        if (controlCount >= 2 || candidate === boundary) return candidate;
      }

      if (candidate === boundary) break;
      candidate = candidate.parentElement;
    }

    return firstSafeContainer;
  }

  function placeInlineReadAloudButton(toolbar: Element, button: HTMLElement): void {
    const copyButton = Array.from(toolbar.querySelectorAll<HTMLElement>("button, [role='button']")).find(
      (candidate) => isCopyControl(candidate) && !isInteractiveContainer(candidate.parentElement),
    );

    if (copyButton) {
      if (button.previousElementSibling === copyButton) return;
      copyButton.insertAdjacentElement("afterend", button);
      return;
    }

    // Copy's accessible name is localized. When it cannot be identified by
    // label, place Read Aloud immediately before the response-actions menu.
    // This preserves the native action order without nesting one button in another.
    const responseActions = findMoreActionsControl(toolbar);
    const responseParent = responseActions?.parentElement;
    if (responseActions && responseParent && !isInteractiveContainer(responseParent)) {
      if (button.nextElementSibling === responseActions) return;
      responseActions.insertAdjacentElement("beforebegin", button);
      return;
    }

    if (button.parentElement === toolbar) return;
    toolbar.appendChild(button);
  }

  function findReadAloudControl(scope: Element | null): HTMLElement | null {
    if (!scope) return null;

    const controls = [
      ...(scope.matches("button, [role='menuitem'], [role='option']") ? [scope as HTMLElement] : []),
      ...Array.from(scope.querySelectorAll<HTMLElement>("button, [role='menuitem'], [role='option']")),
    ];

    return (
      controls.find(
        (control) =>
          !control.classList.contains("cgpt-inline-readaloud") && isReadAloudControl(control),
      ) || null
    );
  }

  function findToolbar(turn: Element): Element | null {
    const responseActions = findMoreActionsControl(turn);
    if (responseActions) {
      const responseToolbar = findActionContainer(responseActions, turn);
      if (responseToolbar) return responseToolbar;
    }

    const copyButton = Array.from(turn.querySelectorAll("button")).find(
      (btn) => !btn.closest("pre, code, table") && isCopyControl(btn),
    );

    if (copyButton?.parentElement) {
      const copyToolbar = copyButton.closest('[role="toolbar"], [data-testid*="action"]');
      if (copyToolbar && !isInteractiveContainer(copyToolbar)) return copyToolbar;

      const copyParent = findActionContainer(copyButton, turn);
      if (copyParent) return copyParent;
    }

    const actionBars = Array.from(turn.querySelectorAll(".flex, [role='toolbar'], [data-testid*='action']"));
    for (const bar of actionBars) {
      if (
        !bar.closest("pre, code, table") &&
        !isInteractiveContainer(bar) &&
        Array.from(bar.querySelectorAll("button")).some(
          (button) => isCopyControl(button) || isReadAloudControl(button) || isMoreActionsControl(button),
        )
      ) {
        return bar;
      }
    }

    return null;
  }

  function installInlineReadAloudButtons(): void {
    for (const button of inlineButtons) {
      if (!button.isConnected) {
        inlineButtons.delete(button);
        if (activeInlineButton === button) activeInlineButton = null;
      }
    }

    const settings = getSavedSettings();
    if (settings.enableInlineButtons === false) {
      document.querySelectorAll<HTMLElement>(".cgpt-inline-readaloud").forEach((button) => {
        button.remove();
        inlineButtons.delete(button);
        if (activeInlineButton === button) activeInlineButton = null;
      });
      return;
    }

    document.querySelectorAll('[data-message-author-role="assistant"]').forEach((message) => {
      const turn =
        message.closest("article") ||
        message.closest('[data-testid^="conversation-turn"]') ||
        message.parentElement;

      if (!turn) return;

      if (
        turn.getAttribute("data-cgpt-ra-inline-ready") === "true" &&
        turn.querySelector(".cgpt-inline-readaloud")
      ) {
        return;
      }

      const toolbar = findToolbar(turn);
      const existingButton = turn.querySelector<HTMLElement>(".cgpt-inline-readaloud");
      if (existingButton) {
        inlineButtons.add(existingButton);
        if (toolbar) {
          placeInlineReadAloudButton(toolbar, existingButton);
          turn.setAttribute("data-cgpt-ra-inline-ready", "true");
        }

        return;
      }

      if (!toolbar) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "cgpt-inline-readaloud";
      button.title = "Read aloud";
      button.setAttribute("aria-label", "Read aloud");
      setIcon(button, "volume-2");

      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (
          button === activeInlineButton &&
          activeMedia &&
          !activeMedia.paused &&
          !activeMedia.ended
        ) {
          try {
            activeMedia.pause();
            activeMedia.currentTime = 0;
          } catch (_) {}

          updateInlineButtons();
          broadcastLiveAudioState(true);
          return;
        }

        if (activeMedia && !activeMedia.paused) {
          try {
            activeMedia.pause();
          } catch (_) {}
        }

        pendingInlineButton = button;
        await triggerNativeReadAloud(turn, button);
      });

      placeInlineReadAloudButton(toolbar, button);

      inlineButtons.add(button);
      turn.setAttribute("data-cgpt-ra-inline-ready", "true");
    });
  }

  async function waitForReadAloudMenuItem(timeout = 1800): Promise<HTMLElement | null> {
    const started = performance.now();

    return new Promise((resolve) => {
      const scan = () => {
        const candidates = document.querySelectorAll(
          '[role="menuitem"], [role="option"], [data-radix-popper-content-wrapper] button, [data-radix-popper-content-wrapper] [role="menuitem"]',
        );

        for (const item of candidates) {
          const text = textMeaning(item);

          if (isReadAloudControl(item) || /\bread aloud\b/.test(text) || /\bread out loud\b/.test(text)) {
            resolve(item as HTMLElement);
            return;
          }
        }

        if (performance.now() - started >= timeout) {
          resolve(null);
          return;
        }

        requestAnimationFrame(scan);
      };

      scan();
    });
  }

  async function triggerNativeReadAloud(turn: Element, inlineButton: HTMLElement): Promise<void> {
    const inlineRow = inlineButton.parentElement;
    const toolbar = findToolbar(turn);
    const direct = [inlineRow, toolbar, turn]
      .filter((scope, index, scopes) => scope && scopes.indexOf(scope) === index)
      .map((scope) => findReadAloudControl(scope))
      .find((control): control is HTMLElement => Boolean(control));

    if (direct) {
      direct.click();
      return;
    }

    const moreBtn =
      findMoreActionsControl(inlineRow) ||
      findMoreActionsControl(toolbar) ||
      findMoreActionsNear(inlineButton, turn) ||
      findMoreActionsControl(turn);

    if (!moreBtn) {
      pendingInlineButton = null;
      warn("Could not locate the response More Actions button.");
      return;
    }

    moreBtn.click();

    const menuItem = await waitForReadAloudMenuItem();

    if (!menuItem) {
      pendingInlineButton = null;
      warn("Could not find Read Aloud in the response popup menu.");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return;
    }

    menuItem.click();
  }

  function updateInlineButtons(): void {
    const t = getI18n();
    for (const button of inlineButtons) {
      if (!button.isConnected) {
        inlineButtons.delete(button);
        if (activeInlineButton === button) activeInlineButton = null;
        continue;
      }

      const active =
        button === activeInlineButton &&
        activeMedia &&
        !activeMedia.paused &&
        !activeMedia.ended;

      button.classList.toggle("cgpt-active", Boolean(active));
      setIcon(button, active ? "square" : "volume-2");
      const label = active ? t.content.tooltips.stopReadAloud : t.content.tooltips.readAloud;
      button.title = label;
      button.setAttribute("aria-label", label);
    }
  }

  // ---------------------------------------------------------------------
  // Shortcuts
  // ---------------------------------------------------------------------

  window.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      const settings = getSavedSettings();
      if (settings.enableShortcuts === false) return;

      const target = event.target instanceof HTMLElement ? event.target : null;

      if (
        target?.matches("input, textarea, select, [contenteditable='true']") ||
        target?.isContentEditable ||
        target?.closest("button, a, input, textarea, select, [role='button']")
      ) {
        return;
      }

      if (!activeMedia) return;

      // Keep Alt+P as a legacy alias. Space/K are the primary player shortcuts
      // because they match common web and desktop media players.
      if (event.altKey && (event.code === "KeyP" || event.key.toLowerCase() === "p")) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (!event.repeat) togglePlayback();
        return;
      }

      const isPlayPauseKey =
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.code === "Space" || event.code === "KeyK" || event.key === " ");

      if (isPlayPauseKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (!event.repeat) togglePlayback();
        return;
      }

      const step = settings.tapSeekSeconds || CONFIG.tapSeekSeconds;

      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        seekRelative(-step);
        return;
      }

      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        seekRelative(step);
        return;
      }

      if (event.shiftKey && event.code === "Comma") {
        event.preventDefault();
        changeSpeed(-1);
        return;
      }

      if (event.shiftKey && event.code === "Period") {
        event.preventDefault();
        changeSpeed(1);
      }
    },
    true,
  );

  function changeSpeed(direction: number): void {
    const current = activeMedia?.playbackRate || getSavedSpeed();

    let closestIndex = 0;
    let closestDistance = Infinity;

    CONFIG.speeds.forEach((speed, index) => {
      const distance = Math.abs(speed - current);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    const next = clamp(closestIndex + direction, 0, CONFIG.speeds.length - 1);
    setSpeed(CONFIG.speeds[next]);
  }

  // ---------------------------------------------------------------------
  // DOM Observer & Poller (Zero Thrashing, Immediate Theme Sync)
  // ---------------------------------------------------------------------

  function scanDOMForPlayingMedia(): void {
    document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((media) => {
      if (!media.paused && !media.ended && isReadAloudMedia(media)) {
        attachMedia(media, "DOM fallback");
      }
    });
  }

  let observerTimeout: number | null = null;
  let themeTimeout: number | null = null;

  function scheduleThemeSync(): void {
    if (themeTimeout) return;

    themeTimeout = window.setTimeout(() => {
      themeTimeout = null;
      detectAndCacheChatGPTTheme();
    }, 250);
  }

  function startObserver(): void {
    // Structural changes are needed for response buttons, but attribute
    // changes across the whole ChatGPT tree are far too noisy (hover/focus
    // state alone can produce many). Keep this observer child-list only.
    const observer = new MutationObserver(() => {
      if (observerTimeout) return;
      observerTimeout = window.setTimeout(() => {
        observerTimeout = null;
        installInlineReadAloudButtons();
        scheduleLayoutSync();
      }, 500);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Theme changes generally happen on the root/body. Watching only those
    // nodes avoids turning every descendant class/style mutation into a
    // synchronous computed-style pass.
    const themeObserver = new MutationObserver(scheduleThemeSync);
    const themeAttributes = ["class", "data-theme", "data-chat-theme", "style"];
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: themeAttributes,
    });
    if (document.body) {
      themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: themeAttributes,
      });
    }

    window.addEventListener("resize", scheduleLayoutSync, { passive: true });
    window.addEventListener("scroll", scheduleLayoutSync, { passive: true });

    window.setInterval(() => {
      installInlineReadAloudButtons();
      scanDOMForPlayingMedia();
      scheduleThemeSync();
      scheduleLayoutSync();
    }, 5000);
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  function installEarlyHooks(): void {
    installObjectURLInterceptor();
    installFetchInterceptor();
    installXHRInterceptor();
    installMediaInterceptor();
  }

  function initUI(): void {
    if (!document.body) {
      requestAnimationFrame(initUI);
      return;
    }

    installSettingsBridge();
    buildUI();
    installInlineReadAloudButtons();
    startObserver();

    log("ChatGPT Audio Controls Extension Ready");
  }

  installEarlyHooks();
  initUI();
})();
