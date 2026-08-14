import { getLucideSvg, setIcon } from "./icons";
import { SPEED_PRESETS, STORAGE_KEYS } from "../shared/constants";

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
    debug: true,
  };

  let activeMedia: HTMLMediaElement | null = null;
  let activeInlineButton: HTMLElement | null = null;
  let pendingInlineButton: HTMLElement | null = null;
  let userForcedExpand = false;

  let leftRail: HTMLElement | null = null;
  let rightRail: HTMLElement | null = null;
  let floatingToggle: HTMLButtonElement | null = null;
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

  const blobURLMap = new Map<string, Blob>();

  function log(...args: any[]) {
    if (CONFIG.debug) {
      console.log(
        "%c[ChatGPT Audio Controls]",
        "color:#10a37f;font-weight:700",
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
    const n = parseFloat(localStorage.getItem(CONFIG.speedStorage) || "");
    return Number.isFinite(n) && n >= 0.25 && n <= 4 ? n : CONFIG.defaultSpeed;
  }

  function getSavedVolume(): number {
    const n = parseFloat(localStorage.getItem(CONFIG.volumeStorage) || "");
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : CONFIG.defaultVolume;
  }

  function getSavedSettings(): any {
    try {
      const raw = localStorage.getItem(CONFIG.settingsStorage);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  // ---------------------------------------------------------------------
  // Audio capture / download interception
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
          if (object instanceof PAGE.Blob) {
            blobURLMap.set(url, object);

            if (looksLikeAudio(url, object.type)) {
              rememberAudioBlob(object, url);
            }
          }
        } catch (_) {}

        return url;
      };

      urlObj.revokeObjectURL = function (url: string) {
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

  function attachMedia(media: HTMLMediaElement, reason = "detected"): void {
    if (!media || typeof media.play !== "function") return;

    const changed = activeMedia !== media;
    activeMedia = media;
    userForcedExpand = true; // Automatically expand player when speech starts

    try {
      media.playbackRate = getSavedSpeed();
      media.defaultPlaybackRate = getSavedSpeed();
      media.volume = getSavedVolume();
    } catch (_) {}

    if (pendingInlineButton) {
      activeInlineButton = pendingInlineButton;
      pendingInlineButton = null;
    }

    if (changed) installMediaListeners(media);

    setControlsEnabled(true);
    updateControls();
    updateInlineButtons();
    syncComposerLayout();

    log("Attached media:", reason, media);
  }

  function installMediaListeners(media: HTMLMediaElement): void {
    [
      "loadedmetadata",
      "durationchange",
      "timeupdate",
      "progress",
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
          syncComposerLayout();
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
        attachMedia(this, "play() intercepted");

        const result = originalPlay.apply(this, args);

        queueMicrotask(() => {
          try {
            this.playbackRate = getSavedSpeed();
            this.defaultPlaybackRate = getSavedSpeed();
            this.volume = getSavedVolume();
          } catch (_) {}

          updateControls();
        });

        return result;
      };

      proto.pause = function (...args: any[]) {
        const result = originalPause.apply(this, args);

        if (this === activeMedia) {
          queueMicrotask(() => {
            updateControls();
            updateInlineButtons();
            syncComposerLayout();
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

    // 1. Floating Mini Toggle Button (shown when idle / no audio)
    floatingToggle = document.createElement("button");
    floatingToggle.id = "cgpt-ra-floating-toggle";
    floatingToggle.type = "button";
    floatingToggle.title = "ChatGPT Audio Controls";
    floatingToggle.setAttribute("aria-label", "Expand ChatGPT Audio Controls");
    floatingToggle.innerHTML = getLucideSvg("chatgpt-audio");

    floatingToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      userForcedExpand = !userForcedExpand;
      syncComposerLayout();
    });

    // 2. Left Transport & Seeker Capsule
    leftRail = document.createElement("div");
    leftRail.id = "cgpt-ra-left";
    leftRail.className = "cgpt-ra-no-media cgpt-ra-collapsed";

    leftRail.innerHTML = `
      <div class="cgpt-ra-transport-row">
        <button class="cgpt-ra-icon-btn cgpt-ra-seek10 cgpt-ra-back cgpt-ra-media-control"
                title="Back 10 seconds — hold to scrub" disabled>
          ${getLucideSvg("rotate-ccw")}
          <span class="cgpt-ra-ten">10</span>
        </button>

        <button class="cgpt-ra-icon-btn cgpt-ra-play cgpt-ra-media-control"
                title="Play / Pause (Alt+P)" disabled>
          ${getLucideSvg("play")}
        </button>

        <button class="cgpt-ra-icon-btn cgpt-ra-seek10 cgpt-ra-forward cgpt-ra-media-control"
                title="Forward 10 seconds — hold to scrub" disabled>
          ${getLucideSvg("rotate-cw")}
          <span class="cgpt-ra-ten">10</span>
        </button>
      </div>

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

    // 3. Right Controls Rail (Speed, Volume, Download, Help [Rightmost!])
    rightRail = document.createElement("div");
    rightRail.id = "cgpt-ra-right";
    rightRail.className = "cgpt-ra-no-media cgpt-ra-collapsed";

    rightRail.innerHTML = `
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
            <span class="cgpt-ra-shortcut-key">Alt + P</span>
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
    `;

    document.body.append(floatingToggle, leftRail, rightRail);

    seekSlider = leftRail.querySelector(".cgpt-ra-seek-slider");
    currentLabel = leftRail.querySelector(".cgpt-ra-current");
    durationLabel = leftRail.querySelector(".cgpt-ra-duration");
    playButton = leftRail.querySelector(".cgpt-ra-play");

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

    installHoldSeek(leftRail.querySelector(".cgpt-ra-back") as HTMLElement, -1);
    installHoldSeek(leftRail.querySelector(".cgpt-ra-forward") as HTMLElement, 1);

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

    // Hover mouse wheel scroll on volume button to quickly adjust volume
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

    setControlsEnabled(Boolean(activeMedia));
    syncComposerLayout();
  }

  function setControlsEnabled(enabled: boolean): void {
    if (!leftRail || !rightRail) return;

    leftRail.classList.toggle("cgpt-ra-no-media", !enabled);
    rightRail.classList.toggle("cgpt-ra-no-media", !enabled);

    leftRail.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input").forEach((el) => {
      el.disabled = !enabled;
    });

    rightRail
      .querySelectorAll<HTMLButtonElement | HTMLInputElement>(
        ".cgpt-ra-speed-btn, .cgpt-ra-volume-btn, .cgpt-ra-volume-slider, .cgpt-ra-download",
      )
      .forEach((el) => {
        el.disabled = !enabled;
      });

    const helpButton = rightRail.querySelector<HTMLButtonElement>(".cgpt-ra-help-wrap > button");
    if (helpButton) helpButton.disabled = false;
  }

  // ---------------------------------------------------------------------
  // Dynamic Space Detection & Responsive Composer Alignment
  // ---------------------------------------------------------------------

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
    const shouldExpand = Boolean(hasActiveAudio || userForcedExpand);

    if (!composer) {
      leftRail.classList.add("cgpt-ra-collapsed");
      rightRail.classList.add("cgpt-ra-collapsed");
      floatingToggle.style.right = "16px";
      floatingToggle.style.bottom = "80px";
      floatingToggle.classList.remove("cgpt-ra-hidden");
      return;
    }

    const rect = composer.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const sideGap = 10;
    const outerMargin = 14;

    const leftAvailable = rect.left - outerMargin - sideGap;
    const rightAvailable = viewportWidth - rect.right - outerMargin - sideGap;

    // Small screens or tight composer space
    const minLeftWidth = 240;
    const maxLeftWidth = 430;

    const canFit = leftAvailable >= minLeftWidth && rightAvailable >= 120;

    if (!canFit || !shouldExpand) {
      // Show floating mini toggle button docked beside composer right edge
      leftRail.classList.add("cgpt-ra-collapsed");
      rightRail.classList.add("cgpt-ra-collapsed");

      floatingToggle.classList.remove("cgpt-ra-hidden");
      const toggleX = Math.min(viewportWidth - 48, rect.right + 12);
      const toggleY = rect.top + rect.height / 2 - 19;
      floatingToggle.style.left = `${toggleX}px`;
      floatingToggle.style.top = `${toggleY}px`;
      return;
    }

    // Hide floating mini button when full capsules are expanded
    floatingToggle.classList.add("cgpt-ra-hidden");
    leftRail.classList.remove("cgpt-ra-collapsed");
    rightRail.classList.remove("cgpt-ra-collapsed");

    // Dynamic width scaling to fit laptop screens perfectly
    const computedLeftWidth = clamp(leftAvailable, minLeftWidth, maxLeftWidth);
    const centerY = rect.top + rect.height / 2;

    leftRail.style.display = "block";
    leftRail.style.width = `${computedLeftWidth}px`;
    leftRail.style.left = `${rect.left - sideGap - computedLeftWidth}px`;
    leftRail.style.top = `${centerY - 23}px`;

    rightRail.style.display = "inline-flex";
    rightRail.style.width = "max-content";
    rightRail.style.left = `${rect.right + sideGap}px`;
    rightRail.style.top = `${centerY - 23}px`;
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
    let raf: number | null = null;

    const frame = (now: number) => {
      if (!holding) return;

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
      becameHold = false;
      holdStarted = performance.now();
      lastFrame = 0;

      try {
        button.setPointerCapture(event.pointerId);
      } catch (_) {}

      raf = requestAnimationFrame(frame);
    });

    const stop = (event: PointerEvent) => {
      if (!holding) return;
      holding = false;

      if (raf) cancelAnimationFrame(raf);

      if (!becameHold) {
        const step = getSavedSettings().tapSeekSeconds || CONFIG.tapSeekSeconds;
        seekRelative(direction * step);
      }

      try {
        button.releasePointerCapture(event.pointerId);
      } catch (_) {}
    };

    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
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
  // Playback / speed / volume
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

    localStorage.setItem(CONFIG.speedStorage, String(speed));

    if (activeMedia) {
      try {
        activeMedia.playbackRate = speed;
        activeMedia.defaultPlaybackRate = speed;
      } catch (_) {}
    }

    updateControls();
  }

  function setVolume(volume: number): void {
    volume = clamp(volume, 0, 1);

    localStorage.setItem(CONFIG.volumeStorage, String(volume));

    if (activeMedia) {
      try {
        activeMedia.volume = volume;
        activeMedia.muted = false;
      } catch (_) {}
    }

    updateControls();
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

    if (currentLabel) currentLabel.textContent = formatTime(current);

    if (durationLabel) {
      if (Number.isFinite(activeMedia.duration)) {
        durationLabel.textContent = formatTime(activeMedia.duration);
      } else if (info.seekable) {
        durationLabel.textContent = formatTime(info.end);
      } else {
        durationLabel.textContent = "--:--";
      }
    }

    if (seekSlider) {
      if (info.seekable) {
        seekSlider.disabled = false;
        seekSlider.min = String(info.start);
        seekSlider.max = String(info.end);

        if (!sliderDragging) {
          seekSlider.value = String(clamp(current, info.start, info.end));
        }
      } else {
        seekSlider.disabled = true;
      }
    }

    setIcon(playButton, activeMedia.paused ? "play" : "pause");

    let speed = getSavedSpeed();
    let volume = getSavedVolume();

    try {
      speed = activeMedia.playbackRate;
      volume = activeMedia.volume;
    } catch (_) {}

    if (speedButton) speedButton.textContent = `${speed}×`;

    speedMenu?.querySelectorAll<HTMLElement>(".cgpt-ra-speed-option").forEach((item) => {
      item.classList.toggle(
        "cgpt-selected",
        Math.abs(parseFloat(item.dataset.speed || "0") - speed) < 0.001,
      );
    });

    if (volumeSlider) volumeSlider.value = String(volume);
    if (volumeLabel) volumeLabel.textContent = `${Math.round(volume * 100)}%`;

    const volumeButton = rightRail.querySelector<HTMLElement>(".cgpt-ra-volume-btn");

    if (volume <= 0 || activeMedia.muted) {
      setIcon(volumeButton, "volume-x");
    } else if (volume < 0.5) {
      setIcon(volumeButton, "volume-1");
    } else {
      setIcon(volumeButton, "volume-2");
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
      alert("Could not download audio stream. Ensure audio is actively loaded.");
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

  function findToolbar(turn: Element): Element | null {
    // Look for the specific message action bar containing the copy button
    const copyButton = Array.from(turn.querySelectorAll("button")).find((btn) => {
      const txt = textMeaning(btn);
      return txt === "copy" || txt.includes("copy response") || txt.includes("copy code");
    });

    if (copyButton?.parentElement) {
      return copyButton.parentElement;
    }

    // Fallback: look for the flex container with message actions at the bottom of the turn
    const actionBars = Array.from(turn.querySelectorAll(".flex, [role='toolbar'], [data-testid*='action']"));
    for (const bar of actionBars) {
      if (bar.querySelector("button") && !bar.closest("pre, code, table")) {
        return bar;
      }
    }

    return null;
  }

  function installInlineReadAloudButtons(): void {
    const settings = getSavedSettings();
    if (settings.enableInlineButtons === false) return;

    // Find assistant messages
    document.querySelectorAll('[data-message-author-role="assistant"]').forEach((message) => {
      const turn =
        message.closest("article") ||
        message.closest('[data-testid^="conversation-turn"]') ||
        message.parentElement;

      if (!turn || turn.querySelector(".cgpt-inline-readaloud")) return;

      const toolbar = findToolbar(turn);
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

        // If clicking active playing speech, stop it
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
          return;
        }

        // Stop existing playing audio first
        if (activeMedia && !activeMedia.paused) {
          try {
            activeMedia.pause();
          } catch (_) {}
        }

        pendingInlineButton = button;
        await triggerNativeReadAloud(turn);
      });

      // Insert directly beside the Copy button if found, or prepend to toolbar
      const copyBtn = Array.from(toolbar.querySelectorAll("button")).find((b) =>
        textMeaning(b).includes("copy"),
      );

      if (copyBtn && copyBtn.parentElement === toolbar) {
        copyBtn.insertAdjacentElement("afterend", button);
      } else {
        toolbar.insertBefore(button, toolbar.firstChild);
      }
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

          if (
            text.includes("read aloud") ||
            text.includes("read out loud") ||
            text.includes("listen") ||
            text === "read"
          ) {
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

  async function triggerNativeReadAloud(turn: Element): Promise<void> {
    // 1. Check if a direct read aloud button exists in this turn
    const direct = Array.from(turn.querySelectorAll("button")).find((btn) => {
      if (btn.classList.contains("cgpt-inline-readaloud")) return false;
      const t = textMeaning(btn);
      return t.includes("read aloud") || t.includes("read out loud") || t.includes("listen");
    });

    if (direct) {
      direct.click();
      return;
    }

    // 2. Locate the specific More Actions button in the bottom action bar
    const toolbar = findToolbar(turn);
    const moreBtn = toolbar
      ? Array.from(toolbar.querySelectorAll("button")).find((b) => {
          const t = textMeaning(b);
          return t.includes("more actions") || t === "more" || t.includes("options");
        })
      : null;

    if (!moreBtn) {
      pendingInlineButton = null;
      warn("Could not locate the response More Actions button.");
      return;
    }

    moreBtn.click();

    // 3. Strictly wait for the Read Aloud item
    const menuItem = await waitForReadAloudMenuItem();

    if (!menuItem) {
      pendingInlineButton = null;
      warn("Could not find Read Aloud in the response popup menu.");
      // Close menu by triggering escape
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return;
    }

    menuItem.click();
  }

  function updateInlineButtons(): void {
    document.querySelectorAll<HTMLElement>(".cgpt-inline-readaloud").forEach((button) => {
      const active =
        button === activeInlineButton &&
        activeMedia &&
        !activeMedia.paused &&
        !activeMedia.ended;

      button.classList.toggle("cgpt-active", Boolean(active));
      setIcon(button, active ? "square" : "volume-2");
      button.title = active ? "Stop read aloud" : "Read aloud";
    });
  }

  // ---------------------------------------------------------------------
  // Shortcuts
  // ---------------------------------------------------------------------

  document.addEventListener(
    "keydown",
    (event: KeyboardEvent) => {
      const settings = getSavedSettings();
      if (settings.enableShortcuts === false) return;

      const target = event.target as HTMLElement;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event.altKey && event.code === "KeyP") {
        event.preventDefault();
        event.stopPropagation();
        togglePlayback();
        return;
      }

      if (!activeMedia) return;

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
  // DOM Observer & Poller
  // ---------------------------------------------------------------------

  function scanDOMForPlayingMedia(): void {
    document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((media) => {
      if (!media.paused && !media.ended) {
        attachMedia(media, "DOM fallback");
      }
    });
  }

  function startObserver(): void {
    const observer = new MutationObserver(() => {
      installInlineReadAloudButtons();
      syncComposerLayout();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", syncComposerLayout, { passive: true });
    window.addEventListener("scroll", syncComposerLayout, { passive: true });

    setInterval(() => {
      installInlineReadAloudButtons();
      scanDOMForPlayingMedia();
      syncComposerLayout();
    }, 1000);
  }

  function animationLoop(): void {
    if (activeMedia) updateControls();
    requestAnimationFrame(animationLoop);
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

    buildUI();
    installInlineReadAloudButtons();
    startObserver();
    animationLoop();

    log("ChatGPT Audio Controls Extension Ready");
  }

  installEarlyHooks();
  initUI();
})();
