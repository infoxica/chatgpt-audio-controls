import { PlaybackSession } from "./playback-session";
import { StreamingAudioCapture } from "./streaming-audio";
import { getReleaseCopy } from "../shared/i18n/release-copy";
import { floatingVisibility } from "../shared/visibility";
import { playbackAction, platformKeys } from "../shared/shortcuts";
import { getLucideSvg, setIcon } from "./icons";
import { SPEED_PRESETS, STORAGE_KEYS } from "../shared/constants";
import { ExtensionSettings } from "../shared/types";
import { getTranslations } from "../shared/i18n/core";

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
  let visibilityShortcut = '';
  let sessionSpeed: number | null = null;
  let sessionVolume: number | null = null;
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


  // Keep only a small byte-bounded cache. A Blob is a strong reference to the
  // complete audio payload, so an entry-count cap alone can retain too much.
  const MAX_BLOB_MAP_ENTRIES = 4;
  const MAX_BLOB_MAP_BYTES = 64 * 1024 * 1024;
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

  let statusTimer = 0;
  function showStatus(message: string, error = false): void {
    let status = document.getElementById('cgpt-ra-status');
    if (!status) { status = document.createElement('div'); status.id = 'cgpt-ra-status'; status.setAttribute('role', 'status'); document.body.append(status); }
    status.textContent = message;
    status.hidden = false;
    status.dataset.error = String(error);
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => { if (status) status.hidden = true; }, error ? 12000 : 4000);
  }
  function recoveryCopy() { return getReleaseCopy(settingsCache?.language); }

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
      if (playBtn) { playBtn.title = platformKeys(t.content.tooltips.playPause); playBtn.dataset.defaultTitle = playBtn.title; }

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
            <span class="cgpt-ra-shortcut-key">${platformKeys("Alt")} + ←</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.forward.replace("{s}", String(step))}</span>
            <span class="cgpt-ra-shortcut-key">${platformKeys("Alt")} + →</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.slower}</span>
            <span class="cgpt-ra-shortcut-key">${platformKeys("Shift")} + ,</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>${t.content.shortcutsPopover.faster}</span>
            <span class="cgpt-ra-shortcut-key">${platformKeys("Shift")} + .</span>
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
        const commandRow = document.createElement('div');
        commandRow.className = 'cgpt-ra-shortcut-row';
        const commandLabel = document.createElement('span');
        commandLabel.textContent = recoveryCopy().visibilityShortcut;
        const commandKey = document.createElement('span');
        commandKey.className = 'cgpt-ra-shortcut-key';
        commandKey.textContent = visibilityShortcut ? platformKeys(visibilityShortcut) : recoveryCopy().unassigned;
        commandRow.append(commandLabel, commandKey);
        const scope = document.createElement('p');
        scope.textContent = recoveryCopy().shortcutScope;
        helpPopover.append(commandRow, scope);
      }

      const collapseBtn = rightRail.querySelector<HTMLElement>(".cgpt-ra-collapse-btn");
      if (collapseBtn) collapseBtn.title = t.content.tooltips.collapse;
    }

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
      visibilityShortcut = typeof event.data.shortcut === 'string' ? event.data.shortcut.slice(0, 80) : '';

      if (activeMedia) {
        try {
          activeMedia.playbackRate = getSavedSpeed();
          activeMedia.defaultPlaybackRate = getSavedSpeed();
          activeMedia.volume = getSavedVolume();
        } catch (_) {}
      }

      applyI18nLabels();
      updateControls();
      scheduleLayoutSync();
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

    const isPlaying = playback.playing;
    const current = playback.time;
    const duration = playback.duration;
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
    if (blob.size && blob.size <= MAX_BLOB_MAP_BYTES && looksLikeAudio(sourceURL, blob.type)) rememberBlobURL(sourceURL, blob);
  }

  const audioRequests = new Map<string, Promise<Blob>>();
  const streamingAudio = new StreamingAudioCapture();
  async function readAudio(response: Response): Promise<Blob> {
    if (Number(response.headers.get('content-length')) > MAX_BLOB_MAP_BYTES || !response.body) throw new Error('Audio size unsupported');
    const reader = response.body.getReader();
    const parts: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BLOB_MAP_BYTES) { void reader.cancel().catch(() => {}); throw new Error('Audio size unsupported'); }
        parts.push(value as Uint8Array<ArrayBuffer>);
      }
    } finally { reader.releaseLock(); }
    if (!size) throw new Error('Empty audio');
    return new Blob(parts, { type: response.headers.get('content-type') || 'application/octet-stream' });
  }
  async function retainAudio(source: string, signal: AbortSignal): Promise<Blob> {
    if (!source) throw new Error('No audio source');
    const stream = streamingAudio.retain(source);
    if (stream) return stream;
    const cached = blobURLMap.get(source);
    if (cached) return cached;
    const pending = audioRequests.get(source);
    if (pending) return pending;
    const response = await fetch(source, { credentials: 'include', signal });
    if (!response.ok) throw new Error('Audio unavailable');
    return readAudio(response);
  }
  const playback = new PlaybackSession(retainAudio, media => {
    activeMedia = media;
    if (media) installMediaListeners(media);
    updateControls();
    broadcastLiveAudioState(true);
    scheduleLayoutSync();
  }, () => showStatus(recoveryCopy().playError, true));
  window.addEventListener('pagehide', () => { playback.dispose(); activeMedia = null; blobURLMap.clear(); blobURLBytes = 0; audioRequests.clear(); streamingAudio.clearExcept(); });

  function installObjectURLInterceptor(): void {
    try {
      const urlObj = PAGE.URL;
      if (!urlObj || urlObj.__cgptRAObjectURLHook) return;

      const originalCreate = urlObj.createObjectURL.bind(urlObj);
      const originalRevoke = urlObj.revokeObjectURL.bind(urlObj);

      urlObj.createObjectURL = function (object: any) {
        const url = originalCreate(object);
        if (PAGE.MediaSource && object instanceof PAGE.MediaSource) streamingAudio.register(object, url);

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
        const inputURL = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const signal = args[1]?.signal || args[0]?.signal;
        const capture = looksLikeAudio(inputURL, '') && !signal?.aborted ? streamingAudio.begin() : null;
        let response: Response;
        try {
          // ChatGPT aborts its reader on Pause. Keep only the recognized audio
          // request alive for bounded retention; all other fetches are untouched.
          response = await originalFetch(...(capture ? [args[0], { ...args[1], signal: capture.controller.signal }] : args));
        } catch (error) {
          if (capture) streamingAudio.complete(capture, Promise.reject(error));
          throw error;
        }

        try {
          const requestURL =
            typeof args[0] === "string"
              ? args[0]
              : args[0]?.url || response.url || "";

          const type = response.headers?.get("content-type") || "";

          if (looksLikeAudio(requestURL, type)) {
            const pending = readAudio(response.clone());
            if (capture) streamingAudio.complete(capture, pending);
            audioRequests.set(requestURL, pending);
            if (audioRequests.size > 4) audioRequests.delete(audioRequests.keys().next().value!);
            void pending.catch(() => {}).finally(() => {
              if (audioRequests.get(requestURL) === pending) audioRequests.delete(requestURL);
            });
          } else if (capture) streamingAudio.complete(capture, Promise.reject(new Error('Not audio')));
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

  function installStreamingInterceptor(): void {
    const source = PAGE.MediaSource?.prototype;
    const buffer = PAGE.SourceBuffer?.prototype;
    if (!source || !buffer || source.__cgptRAStreamHook) return;
    const add = source.addSourceBuffer, append = buffer.appendBuffer;
    source.addSourceBuffer = function (...args: any[]) {
      const result = add.apply(this, args);
      streamingAudio.addBuffer(this, result);
      return result;
    };
    buffer.appendBuffer = function (data: ArrayBuffer | ArrayBufferView) {
      const result = append.call(this, data);
      streamingAudio.append(this, data);
      return result;
    };
    Object.defineProperty(source, '__cgptRAStreamHook', { value: true, configurable: true });
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
      if (playback.isOwned(media) && playback.duration > 0) return { start: 0, end: playback.duration, seekable: true };
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

    const source = media.src || media.currentSrc || "";
    return (
      blobURLMap.has(source) ||
      streamingAudio.has(source) ||
      looksLikeAudio(source, "")
    );
  }

  function attachMedia(media: HTMLMediaElement, reason = "detected"): void {
    if (!media || playback.isOwned(media) || typeof media.play !== "function" || !isReadAloudMedia(media)) return;

    const source = media.src || media.currentSrc;
    const changed = activeMedia !== media || playback.url !== source;
    playback.attach(media);
    if (changed) {
      streamingAudio.clearExcept(source);
      for (const url of blobURLMap.keys()) if (url !== source) removeBlobURL(url);
      for (const url of audioRequests.keys()) if (url !== source) audioRequests.delete(url);
    }
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


    if (changed) installMediaListeners(media);

    setControlsEnabled(true);
    updateControls();
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
        const isReadAloud = !playback.isOwned(this) && isReadAloudMedia(this);
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
            <span class="cgpt-ra-shortcut-key">${platformKeys("Alt")} + ←</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>Forward 10 sec</span>
            <span class="cgpt-ra-shortcut-key">${platformKeys("Alt")} + →</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>Slower Preset</span>
            <span class="cgpt-ra-shortcut-key">${platformKeys("Shift")} + ,</span>
          </div>
          <div class="cgpt-ra-shortcut-row">
            <span>Faster Preset</span>
            <span class="cgpt-ra-shortcut-key">${platformKeys("Shift")} + .</span>
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

  let observedComposer: HTMLElement | null = null;
  const composerObserver = new ResizeObserver(scheduleLayoutSync);
  const composerAttributes = new MutationObserver(scheduleLayoutSync);
  let conversationPath = location.pathname;
  function getComposer(): HTMLElement | null {
    const candidates = document.querySelectorAll<HTMLElement>('[data-chatgpt-composer], [data-type="unified-composer"]');
    const composer = Array.from(candidates).find(el => el.getBoundingClientRect().height > 0 && el.querySelector('[data-composer-markdown], #prompt-textarea, [data-testid="composer-text-input"]'));
    if (composer) return composer;
    const prompt = document.querySelector<HTMLElement>('#prompt-textarea, [data-testid="composer-text-input"], textarea[placeholder*="Ask"]');
    return prompt?.closest('form') || prompt?.parentElement || null;
  }

  function syncComposerLayout(): void {
    if (!leftRail || !rightRail || !floatingToggle) return;

    if (location.pathname !== conversationPath) {
      conversationPath = location.pathname;
      playback.dispose(); activeMedia = null; userForcedExpand = false; streamingAudio.clearExcept();
      blobURLMap.clear(); blobURLBytes = 0; audioRequests.clear();
      updateControls();
    }
    const composer = getComposer();
    if (composer !== observedComposer) {
      composerObserver.disconnect();
      composerAttributes.disconnect();
      observedComposer = composer;
      for (let parent: HTMLElement | null = composer; parent; parent = parent.parentElement) {
        composerObserver.observe(parent);
        composerAttributes.observe(parent, { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'data-state'] });
      }
    }
    const settings = getSavedSettings();
    const hasSession = Boolean(activeMedia && !activeMedia.ended);
    const shouldExpand = !userForcedCollapsed && (hasSession || userForcedExpand);
    const visible = floatingVisibility(Boolean(settings.floatingUiHidden), settings.floatingUiHideMode || 'idle-only', hasSession, shouldExpand);
    leftRail.classList.toggle('cgpt-ra-collapsed', !visible.player);
    rightRail.classList.toggle('cgpt-ra-collapsed', !visible.player);
    floatingToggle.classList.toggle('cgpt-ra-hidden', !visible.launcher);
    cache.isCollapsed = !visible.player;
    cache.floatingHidden = !visible.launcher;
    const viewportWidth = window.innerWidth;
    const rect = composer?.getBoundingClientRect() || { left: 16, right: viewportWidth - 16, top: window.innerHeight - 72, height: 48 };
    floatingToggle.style.left = `${Math.round(Math.max(8, Math.min(viewportWidth - 52, rect.right + 12)))}px`;
    floatingToggle.style.top = `${Math.round(Math.max(8, Math.min(window.innerHeight - 52, rect.top + rect.height / 2 - 21)))}px`;
    floatingToggle.style.right = '';
    floatingToggle.style.bottom = '';
    const sideGap = 10, outerMargin = 14, minLeftWidth = 240, maxLeftWidth = 430;
    const leftAvailable = rect.left - outerMargin - sideGap;
    const rightAvailable = viewportWidth - rect.right - outerMargin - sideGap;
    rightRail.style.width = '';
    const railWidth = rightRail.scrollWidth + 2;
    const compact = leftAvailable < minLeftWidth || rightAvailable < railWidth;
    leftRail.classList.toggle('cgpt-ra-compact', compact);
    rightRail.classList.toggle('cgpt-ra-compact', compact);
    if (!visible.player) return;
    if (compact) {
      const width = Math.max(160, Math.min(430, viewportWidth - 24));
      const left = Math.max(12, Math.min(viewportWidth - width - 12, (rect.left + rect.right - width) / 2));
      rightRail.style.width = `${width}px`;
      const rightHeight = rightRail.getBoundingClientRect().height || 48;
      const top = Math.max(8, rect.top - rightHeight - 68);
      leftRail.style.width = `${width}px`;
      leftRail.style.left = rightRail.style.left = `${left}px`;
      leftRail.style.top = `${top}px`;
      rightRail.style.top = `${top + 56}px`;
      return;
    }
    rightRail.style.width = '';
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
      playback.seek(target);
    } catch (error) {
      warn("Seek failed:", error);
    }

    if (update) updateControls();
  }

  function seekRelative(seconds: number, update = true): void {
    if (!activeMedia) return;
    seekAbsolute((playback.time) + seconds, update);
  }

  // ---------------------------------------------------------------------
  // Playback / speed / volume with DOM Cache
  // ---------------------------------------------------------------------

  function togglePlayback(): void {
    playback.toggle();
    updateControls();
    broadcastLiveAudioState(true);
    scheduleLayoutSync();
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

    const current = playback.time;
    const info = getSeekInfo(activeMedia);

    const formattedCur = formatTime(current);
    if (currentLabel && cache.currentTimeStr !== formattedCur) {
      cache.currentTimeStr = formattedCur;
      currentLabel.textContent = formattedCur;
    }

    const durationNum = Number.isFinite(playback.duration)
      ? playback.duration
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

    const isPaused = playback.paused;
    playButton?.setAttribute('aria-busy', String(playback.loading));
    playButton?.classList.toggle('cgpt-ra-buffering', playback.loading);
    if (playButton) {
      playButton.dataset.defaultTitle ||= playButton.title;
      playButton.title = playback.loading ? recoveryCopy().pending : playButton.dataset.defaultTitle;
      playButton.setAttribute('aria-label', playButton.title);
    }
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
    const blob = await playback.blob();
    return { blob, mime: blob.type, url: activeMedia?.currentSrc || activeMedia?.src || '' };
  }

  async function downloadCurrentAudio(): Promise<void> {
    if (!activeMedia || !downloadButton) return;

    showStatus(recoveryCopy().downloading);
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
      showStatus(recoveryCopy().downloadError, true);
    } finally {
      downloadButton.classList.remove("cgpt-ra-download-busy");
      downloadButton.removeAttribute("disabled");
      setIcon(downloadButton, "download");
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

      const action = playbackAction(event);
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (action === 'play') { event.stopImmediatePropagation(); if (!event.repeat) togglePlayback(); }
      const step = settings.tapSeekSeconds || CONFIG.tapSeekSeconds;
      if (action === 'back') seekRelative(-step);
      if (action === 'forward') seekRelative(step);
      if (action === 'slower') changeSpeed(-1);
      if (action === 'faster') changeSpeed(1);
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
    // Structural changes can replace the composer, but attribute
    // changes across the whole ChatGPT tree are far too noisy (hover/focus
    // state alone can produce many). Keep this observer child-list only.
    const observer = new MutationObserver(() => {
      if (observerTimeout) return;
      observerTimeout = window.setTimeout(() => {
        observerTimeout = null;
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
    window.visualViewport?.addEventListener('resize', scheduleLayoutSync, { passive: true });
    window.visualViewport?.addEventListener('scroll', scheduleLayoutSync, { passive: true });
    window.addEventListener("scroll", scheduleLayoutSync, { passive: true });

    window.setInterval(() => {
      scanDOMForPlayingMedia();
      scheduleThemeSync();
      scheduleLayoutSync();
    }, 5000);
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  function installEarlyHooks(): void {
    installStreamingInterceptor();
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
    startObserver();

    log("ChatGPT Audio Controls Extension Ready");
  }

  installEarlyHooks();
  initUI();
})();
