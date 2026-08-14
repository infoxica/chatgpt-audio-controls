// ==UserScript==
// @name         ChatGPT Read Aloud & Audio Controls
// @namespace    https://infoxica.com/
// @version      1.0.0
// @description  Integrated Read Aloud controls beside the ChatGPT composer: compact seek player, speed presets, volume slider with wheel scroll, instant audio download, shortcuts, and one-click per-response speech.
// @author       Infoxica
// @match        https://chatgpt.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @homepageURL  https://github.com/infoxica/chatgpt-audio-controls
// @supportURL   https://github.com/infoxica/chatgpt-audio-controls/issues
// @downloadURL  https://raw.githubusercontent.com/infoxica/chatgpt-audio-controls/master/userscript/chatgpt-audio-controls.user.js
// @updateURL    https://raw.githubusercontent.com/infoxica/chatgpt-audio-controls/master/userscript/chatgpt-audio-controls.user.js
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  const PAGE = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

  const CONFIG = {
    tapSeekSeconds: 10,
    speeds: [0.5, 0.75, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3],
    defaultSpeed: 1,
    defaultVolume: 1,
    speedStorage: "cgpt-ra-v4-speed",
    volumeStorage: "cgpt-ra-v4-volume",
    debug: true,
  };

  let activeMedia = null;
  let activeInlineButton = null;
  let pendingInlineButton = null;
  let userForcedExpand = false;

  let leftRail = null;
  let rightRail = null;
  let floatingToggle = null;
  let collapseButton = null;
  let seekSlider = null;
  let currentLabel = null;
  let durationLabel = null;
  let playButton = null;
  let speedButton = null;
  let speedMenu = null;
  let volumeWrap = null;
  let volumeSlider = null;
  let volumeLabel = null;
  let downloadButton = null;

  let sliderDragging = false;

  let capturedAudioBlob = null;
  let capturedAudioMime = "";
  let capturedAudioURL = "";
  let capturedAudioAt = 0;

  const blobURLMap = new Map();

  function log(...args) {
    if (CONFIG.debug) {
      console.log(
        "%c[ChatGPT Audio Controls]",
        "color:#3968c8;font-weight:700",
        ...args,
      );
    }
  }

  function warn(...args) {
    console.warn("[ChatGPT Audio Controls]", ...args);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatTime(seconds) {
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

  function getSavedSpeed() {
    const n = parseFloat(localStorage.getItem(CONFIG.speedStorage));
    return Number.isFinite(n) && n >= 0.25 && n <= 4 ? n : CONFIG.defaultSpeed;
  }

  function getSavedVolume() {
    const n = parseFloat(localStorage.getItem(CONFIG.volumeStorage));
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : CONFIG.defaultVolume;
  }

  function broadcastLiveAudioState() {
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
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem("cgpt-ra-live-state", JSON.stringify(liveState));
    } catch (_) {}
  }

  /*
   * Self-contained Lucide SVGs (no external font or CDN required).
   */
  const LUCIDE = {
    play: '<polygon points="6 3 20 12 6 21 6 3"></polygon>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect>',
    square: '<rect x="5" y="5" width="14" height="14" rx="2"></rect>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line>',
    "volume-2": '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>',
    "volume-1": '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>',
    "volume-x": '<path d="M11 5 6 9H2v6h4l5 4V5Z"></path><line x1="22" x2="16" y1="9" y2="15"></line><line x1="16" x2="22" y1="9" y2="15"></line>',
    "circle-help": '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 1 1 5.83 1c0 2-3 2-3 4"></path><path d="M12 17h.01"></path>',
    "rotate-ccw": '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path>',
    "rotate-cw": '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"></path><path d="M21 3v5h-5"></path>',
    "loader-circle": '<path d="M21 12a9 9 0 1 1-6.22-8.56"></path>',
    "minimize-2": '<polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line>',
    "chatgpt-audio": `
      <g transform="translate(12,12) scale(0.35)" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" />
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(60)" />
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(120)" />
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(180)" />
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(240)" />
        <path d="M 0,-24 C 10,-24 16,-18 16,-8 L 16,-2 C 16,4 12,8 6,8 L 0,8" transform="rotate(300)" />
        <circle cx="0" cy="0" r="10" fill="#3968c8" stroke="#ffffff" stroke-width="1.5" />
        <polygon points="-2,-4 5,0 -2,4" fill="#ffffff" stroke="none" />
      </g>
    `,
  };

  function lucideIcon(name, className = "") {
    const body = LUCIDE[name] || LUCIDE["circle-help"];
    return `
      <svg
        class="cgpt-ra-lucide ${className}"
        viewBox="0 0 24 24"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >${body}</svg>
    `;
  }

  function setIcon(button, iconName, extraHTML = "") {
    if (!button) return;
    button.innerHTML = lucideIcon(iconName) + extraHTML;
  }

  // ---------------------------------------------------------------------
  // Audio capture / download interception
  // ---------------------------------------------------------------------

  function looksLikeAudio(url, contentType) {
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

  function rememberAudioBlob(blob, sourceURL = "") {
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

  function installObjectURLInterceptor() {
    try {
      const urlObj = PAGE.URL;
      if (!urlObj || urlObj.__cgptRAObjectURLHook) return;

      const originalCreate = urlObj.createObjectURL.bind(urlObj);
      const originalRevoke = urlObj.revokeObjectURL.bind(urlObj);

      urlObj.createObjectURL = function (object) {
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

      urlObj.revokeObjectURL = function (url) {
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

  function installFetchInterceptor() {
    try {
      if (!PAGE.fetch || PAGE.fetch.__cgptRAFetchHook) return;

      const originalFetch = PAGE.fetch.bind(PAGE);

      async function wrappedFetch(...args) {
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
              .then((blob) => rememberAudioBlob(blob, requestURL))
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

  function installXHRInterceptor() {
    try {
      const proto = PAGE.XMLHttpRequest?.prototype;
      if (!proto || proto.__cgptRAXHRHook) return;

      const originalOpen = proto.open;
      const originalSend = proto.send;

      proto.open = function (method, url, ...rest) {
        this.__cgptRAURL = String(url || "");
        return originalOpen.call(this, method, url, ...rest);
      };

      proto.send = function (...args) {
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

  function getSeekInfo(media = activeMedia) {
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

  function attachMedia(media, reason = "detected") {
    if (!media || typeof media.play !== "function") return;

    const changed = activeMedia !== media;
    activeMedia = media;
    userForcedExpand = true;

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
    broadcastLiveAudioState();
    syncComposerLayout();

    log("Attached media:", reason, media);
  }

  function installMediaListeners(media) {
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
          broadcastLiveAudioState();
          syncComposerLayout();
        }
      });
    });
  }

  function installMediaInterceptor() {
    try {
      const proto = PAGE.HTMLMediaElement?.prototype;
      if (!proto || proto.__cgptRAV4Hook) return;

      const originalPlay = proto.play;
      const originalPause = proto.pause;

      proto.play = function (...args) {
        attachMedia(this, "play() intercepted");

        const result = originalPlay.apply(this, args);

        queueMicrotask(() => {
          try {
            this.playbackRate = getSavedSpeed();
            this.defaultPlaybackRate = getSavedSpeed();
            this.volume = getSavedVolume();
          } catch (_) {}

          updateControls();
          broadcastLiveAudioState();
        });

        return result;
      };

      proto.pause = function (...args) {
        const result = originalPause.apply(this, args);

        if (this === activeMedia) {
          queueMicrotask(() => {
            updateControls();
            updateInlineButtons();
            broadcastLiveAudioState();
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
  // Styles (48px Height, 24px Radius, 36px Buttons, Primary Play)
  // ---------------------------------------------------------------------

  function installStyles() {
    if (document.getElementById("cgpt-ra-v4-style")) return;

    const style = document.createElement("style");
    style.id = "cgpt-ra-v4-style";
    style.textContent = `
      :root {
          --cgpt-ra-bg: #212121;
          --cgpt-ra-bg-hover: rgba(255, 255, 255, .10);
          --cgpt-ra-border: rgba(255, 255, 255, .12);
          --cgpt-ra-text: #ececec;
          --cgpt-ra-muted: #8e8e8e;
          --cgpt-ra-disabled: rgba(255, 255, 255, .28);
          --theme-submit-btn-bg: #3968c8;
          --theme-submit-btn-text: #ffffff;
      }

      html.light {
          --cgpt-ra-bg: #ffffff;
          --cgpt-ra-bg-hover: rgba(0, 0, 0, .07);
          --cgpt-ra-border: rgba(0, 0, 0, .12);
          --cgpt-ra-text: #0d0d0d;
          --cgpt-ra-muted: #5d5d5d;
          --cgpt-ra-disabled: rgba(0, 0, 0, .25);
          --theme-submit-btn-bg: #3968c8;
          --theme-submit-btn-text: #ffffff;
      }

      #cgpt-ra-left,
      #cgpt-ra-right {
          position: fixed;
          z-index: 9999;
          border: 1px solid var(--cgpt-ra-border);
          background: var(--cgpt-ra-bg);
          color: var(--cgpt-ra-text);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, .32);
          opacity: 1 !important;
          transition: opacity .18s ease, transform .18s ease, visibility .18s ease;
      }

      #cgpt-ra-left {
          min-width: 240px;
          max-width: 430px;
          height: 48px;
          display: block;
          padding: 0 14px;
          border-radius: 24px;
          overflow: visible;
      }

      #cgpt-ra-left::before {
          content: "";
          position: absolute;
          z-index: 2;
          top: -1px;
          left: 50%;
          width: 140px;
          height: 4px;
          transform: translateX(-50%);
          background: var(--cgpt-ra-bg);
          pointer-events: none;
      }

      .cgpt-ra-transport-row {
          position: absolute;
          z-index: 3;
          left: 50%;
          top: -40px;
          transform: translateX(-50%);
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 4px 8px;
          margin: 0;
          border: 1px solid var(--cgpt-ra-border);
          border-radius: 24px 24px 14px 14px;
          background: var(--cgpt-ra-bg);
          box-shadow: 0 2px 6px rgba(0, 0, 0, .14);
      }

      .cgpt-ra-transport-row::after {
          content: "";
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: -4px;
          height: 6px;
          background: var(--cgpt-ra-bg);
          pointer-events: none;
      }

      .cgpt-ra-transport-row > * {
          position: relative;
          z-index: 1;
      }

      .cgpt-ra-transport-row .cgpt-ra-icon-btn {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border-radius: 50%;
      }

      .cgpt-ra-play {
          width: 40px !important;
          height: 40px !important;
          flex: 0 0 40px !important;
          border-radius: 50% !important;
          background-color: var(--theme-submit-btn-bg, #3968c8) !important;
          color: var(--theme-submit-btn-text, #ffffff) !important;
          box-shadow: 0 2px 10px rgba(16, 163, 127, 0.4) !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
      }

      .cgpt-ra-play svg {
          stroke: currentColor;
          fill: currentColor;
      }

      .cgpt-ra-progress-row {
          height: 46px;
          display: grid;
          grid-template-columns: 70px minmax(0, 1fr);
          align-items: center;
          gap: 10px;
          padding: 0;
          margin: 0;
          border: 0;
      }

      #cgpt-ra-right {
          width: max-content;
          min-width: 0;
          height: 48px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 8px;
          border-radius: 24px;
          white-space: nowrap;
      }

      .cgpt-ra-speed-wrap { order: 1; }
      .cgpt-ra-volume-wrap { order: 2; }
      .cgpt-ra-download { order: 3; margin-left: 2px; }
      .cgpt-ra-help-wrap { order: 4; margin-left: 2px; }
      .cgpt-ra-collapse-btn { order: 5; margin-left: 4px; }

      #cgpt-ra-floating-toggle {
          position: fixed;
          z-index: 9999;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid var(--cgpt-ra-border);
          background: var(--cgpt-ra-bg);
          color: var(--cgpt-ra-text);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 4px 14px rgba(0, 0, 0, .32);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          transition: transform .15s ease, background .15s ease;
      }

      #cgpt-ra-floating-toggle:hover {
          transform: scale(1.08);
          border-color: var(--theme-submit-btn-bg, #3968c8);
      }

      #cgpt-ra-floating-toggle.cgpt-ra-hidden {
          display: none !important;
      }

      #cgpt-ra-left.cgpt-ra-collapsed,
      #cgpt-ra-right.cgpt-ra-collapsed {
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          transform: scale(0.95);
      }

      #cgpt-ra-left.cgpt-ra-no-media .cgpt-ra-media-control,
      #cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-media-control,
      #cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-volume-popover,
      #cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-speed-menu {
          pointer-events: none !important;
      }

      .cgpt-ra-icon-btn {
          position: relative;
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: inherit;
          cursor: pointer;
          padding: 0;
          font-size: 17px;
          transition: background .12s ease, opacity .12s ease;
      }

      .cgpt-ra-icon-btn:hover {
          background: var(--cgpt-ra-bg-hover);
      }

      .cgpt-ra-icon-btn:disabled {
          opacity: 0.38;
          cursor: default;
          background: transparent;
      }

      .cgpt-ra-lucide {
          display: block;
          width: 19px;
          height: 19px;
          flex: 0 0 19px;
          overflow: visible;
          pointer-events: none;
      }

      .cgpt-ra-icon-btn svg {
          stroke: currentColor;
      }

      .cgpt-ra-seek10 {
          position: relative;
      }

      .cgpt-ra-seek10 .cgpt-ra-lucide {
          width: 22px;
          height: 22px;
      }

      .cgpt-ra-seek10 .cgpt-ra-ten {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding-top: 2px;
          font-size: 9px;
          font-weight: 700;
          font-family: system-ui, sans-serif;
          pointer-events: none;
      }

      .cgpt-ra-time {
          min-width: 0;
          color: var(--cgpt-ra-muted);
          font-size: 10.5px;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          text-align: left;
      }

      .cgpt-ra-seek-wrap {
          min-width: 0;
          display: flex;
          align-items: center;
          padding: 0;
      }

      .cgpt-ra-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 18px;
          margin: 0;
          padding: 0;
          border: 0;
          outline: 0;
          cursor: pointer;
          color: var(--cgpt-ra-text);
          background: transparent;
      }

      .cgpt-ra-range::-webkit-slider-runnable-track {
          height: 2px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.2);
          transition: height .12s ease, background .12s ease;
      }

      html.light .cgpt-ra-range::-webkit-slider-runnable-track {
          background: rgba(0, 0, 0, 0.18);
      }

      .cgpt-ra-range:hover::-webkit-slider-runnable-track,
      .cgpt-ra-range:focus-visible::-webkit-slider-runnable-track {
          height: 4px;
          background: var(--theme-submit-btn-bg, #3968c8);
      }

      .cgpt-ra-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          margin-top: -4px;
          border: 0;
          border-radius: 50%;
          background: var(--cgpt-ra-text);
          box-shadow: 0 0 0 1px var(--cgpt-ra-bg);
          transition: width .12s ease, height .12s ease, margin-top .12s ease;
      }

      .cgpt-ra-range:hover::-webkit-slider-thumb,
      .cgpt-ra-range:focus-visible::-webkit-slider-thumb {
          width: 11px;
          height: 11px;
          margin-top: -3.5px;
          background: var(--theme-submit-btn-bg, #3968c8);
      }

      .cgpt-ra-range::-moz-range-track {
          height: 2px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.2);
          transition: height .12s ease, background .12s ease;
      }

      .cgpt-ra-range:hover::-moz-range-track,
      .cgpt-ra-range:focus-visible::-moz-range-track {
          height: 4px;
          background: var(--theme-submit-btn-bg, #3968c8);
      }

      .cgpt-ra-range::-moz-range-progress {
          height: 2px;
          border: 0;
          border-radius: 999px;
          background: var(--theme-submit-btn-bg, #3968c8);
      }

      .cgpt-ra-range::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border: 0;
          border-radius: 50%;
          background: var(--cgpt-ra-text);
      }

      .cgpt-ra-range:disabled {
          opacity: .35;
          cursor: default;
      }

      .cgpt-ra-speed-wrap,
      .cgpt-ra-volume-wrap,
      .cgpt-ra-help-wrap {
          position: relative;
      }

      .cgpt-ra-speed-btn {
          width: auto;
          min-width: 48px;
          height: 36px;
          padding: 0 10px;
          border-radius: 18px;
          font-size: 12.5px;
          font-weight: 600;
          font-family: system-ui, sans-serif;
      }

      .cgpt-ra-popover {
          position: absolute;
          right: 0;
          bottom: calc(100% + 9px);
          display: none;
          border: 1px solid var(--cgpt-ra-border);
          border-radius: 12px;
          background: #282828;
          color: #fff;
          box-shadow: 0 10px 30px rgba(0, 0, 0, .35);
          overflow: hidden;
          z-index: 10002;
      }

      html.light .cgpt-ra-popover {
          background: #ffffff;
          color: #202020;
      }

      .cgpt-ra-speed-wrap.cgpt-open .cgpt-ra-popover,
      .cgpt-ra-help-wrap:hover .cgpt-ra-popover,
      .cgpt-ra-help-wrap:focus-within .cgpt-ra-popover {
          display: block;
      }

      .cgpt-ra-speed-menu {
          min-width: 90px;
          padding: 5px;
      }

      .cgpt-ra-speed-option {
          width: 100%;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font-size: 12px;
      }

      .cgpt-ra-speed-option:hover,
      .cgpt-ra-speed-option.cgpt-selected {
          background: rgba(255, 255, 255, .10);
      }

      html.light .cgpt-ra-speed-option:hover,
      html.light .cgpt-ra-speed-option.cgpt-selected {
          background: rgba(0, 0, 0, .07);
      }

      .cgpt-ra-volume-popover {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 6px);
          transform: translateX(-50%);
          width: 44px;
          height: 165px;
          display: flex;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 0;
          padding: 6px 5px 6px;
          border: 1px solid var(--cgpt-ra-border);
          border-radius: 22px;
          background: #282828;
          color: #fff;
          box-shadow: 0 10px 30px rgba(0, 0, 0, .35);
          transition: opacity .12s ease, visibility .12s ease;
          z-index: 10002;
      }

      html.light .cgpt-ra-volume-popover {
          background: #ffffff;
          color: #202020;
      }

      .cgpt-ra-volume-wrap:hover .cgpt-ra-volume-popover,
      .cgpt-ra-volume-wrap:focus-within .cgpt-ra-volume-popover {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
      }

      .cgpt-ra-volume-popover input[type="range"] {
          position: absolute;
          top: 56px;
          left: 50%;
          width: 96px;
          height: 18px;
          margin: 0;
          transform: translate(-50%, -50%) rotate(-90deg);
          cursor: pointer;
      }

      .cgpt-ra-volume-value {
          position: absolute;
          left: 4px;
          right: 4px;
          bottom: 6px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-top: 1px solid var(--cgpt-ra-border);
          font-size: 9.5px;
          font-weight: 600;
          font-family: system-ui, sans-serif;
          line-height: 1;
          color: inherit;
          opacity: .80;
          text-align: center;
      }

      .cgpt-ra-help {
          width: 300px;
          padding: 12px 14px;
          font-family: system-ui, sans-serif;
      }

      .cgpt-ra-help-title {
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 700;
      }

      .cgpt-ra-shortcut-row {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 4px 0;
          font-size: 11px;
      }

      .cgpt-ra-shortcut-key {
          color: inherit;
          opacity: .65;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          white-space: nowrap;
      }

      .cgpt-ra-download-busy svg {
          animation: cgpt-ra-spin .8s linear infinite;
      }

      @keyframes cgpt-ra-spin {
          to { transform: rotate(360deg); }
      }

      .cgpt-inline-readaloud {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          opacity: .72;
          padding: 0;
          transition: opacity .12s ease, background .12s ease;
      }

      .cgpt-inline-readaloud:hover {
          opacity: 1;
          background: rgba(127, 127, 127, .14);
      }

      .cgpt-inline-readaloud svg {
          display: block;
          width: 17px;
          height: 17px;
      }

      .cgpt-inline-readaloud.cgpt-active {
          opacity: 1;
          color: var(--theme-submit-btn-bg, #3968c8);
      }
    `;

    document.documentElement.appendChild(style);
  }

  function buildUI() {
    if (leftRail || !document.body) return;

    installStyles();

    floatingToggle = document.createElement("button");
    floatingToggle.id = "cgpt-ra-floating-toggle";
    floatingToggle.type = "button";
    floatingToggle.title = "ChatGPT Audio Controls";
    floatingToggle.setAttribute("aria-label", "Expand ChatGPT Audio Controls");
    floatingToggle.innerHTML = lucideIcon("chatgpt-audio");

    floatingToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      userForcedExpand = true;
      syncComposerLayout();
    });

    leftRail = document.createElement("div");
    leftRail.id = "cgpt-ra-left";
    leftRail.className = "cgpt-ra-no-media cgpt-ra-collapsed";

    leftRail.innerHTML = `
      <div class="cgpt-ra-transport-row">
        <button class="cgpt-ra-icon-btn cgpt-ra-seek10 cgpt-ra-back cgpt-ra-media-control"
                title="Back 10 seconds — hold to scrub" disabled>
          ${lucideIcon("rotate-ccw")}
          <span class="cgpt-ra-ten">10</span>
        </button>

        <button class="cgpt-ra-icon-btn cgpt-ra-play cgpt-ra-media-control"
                title="Play / Pause (Alt+P)" disabled>
          ${lucideIcon("play")}
        </button>

        <button class="cgpt-ra-icon-btn cgpt-ra-seek10 cgpt-ra-forward cgpt-ra-media-control"
                title="Forward 10 seconds — hold to scrub" disabled>
          ${lucideIcon("rotate-cw")}
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
          ${lucideIcon("volume-2")}
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
        ${lucideIcon("download")}
      </button>

      <div class="cgpt-ra-help-wrap">
        <button class="cgpt-ra-icon-btn" title="Keyboard shortcuts & gestures">
          ${lucideIcon("circle-help")}
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

      <button class="cgpt-ra-icon-btn cgpt-ra-collapse-btn" title="Collapse Player">
        ${lucideIcon("minimize-2")}
      </button>
    `;

    document.body.append(floatingToggle, leftRail, rightRail);

    collapseButton = rightRail.querySelector(".cgpt-ra-collapse-btn");
    collapseButton?.addEventListener("click", (e) => {
      e.stopPropagation();
      userForcedExpand = false;
      syncComposerLayout();
    });

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
        rightRail
          ?.querySelector(".cgpt-ra-speed-wrap")
          ?.classList.remove("cgpt-open");
      });

      speedMenu.appendChild(item);
    });

    speedButton.addEventListener("click", (event) => {
      event.stopPropagation();
      rightRail
        .querySelector(".cgpt-ra-speed-wrap")
        ?.classList.toggle("cgpt-open");
    });

    document.addEventListener("click", () => {
      rightRail
        ?.querySelector(".cgpt-ra-speed-wrap")
        ?.classList.remove("cgpt-open");
    });

    playButton.addEventListener("click", togglePlayback);

    installHoldSeek(leftRail.querySelector(".cgpt-ra-back"), -1);
    installHoldSeek(leftRail.querySelector(".cgpt-ra-forward"), 1);

    seekSlider.addEventListener("pointerdown", () => {
      sliderDragging = true;
    });

    seekSlider.addEventListener("input", () => {
      if (!activeMedia) return;
      const target = parseFloat(seekSlider.value);
      seekAbsolute(target, false);
      currentLabel.textContent = formatTime(target);
    });

    const finishSeek = () => {
      if (!sliderDragging) return;
      sliderDragging = false;
      seekAbsolute(parseFloat(seekSlider.value), true);
    };

    seekSlider.addEventListener("pointerup", finishSeek);
    seekSlider.addEventListener("pointercancel", finishSeek);

    volumeSlider.addEventListener("input", () => {
      setVolume(parseFloat(volumeSlider.value));
    });

    volumeWrap.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        const delta = event.deltaY < 0 ? 0.05 : -0.05;
        const current = activeMedia ? activeMedia.volume : getSavedVolume();
        setVolume(clamp(current + delta, 0, 1));
      },
      { passive: false },
    );

    downloadButton.addEventListener("click", downloadCurrentAudio);

    setControlsEnabled(Boolean(activeMedia));
    broadcastLiveAudioState();
    syncComposerLayout();
  }

  function setControlsEnabled(enabled) {
    if (!leftRail || !rightRail) return;

    leftRail.classList.toggle("cgpt-ra-no-media", !enabled);
    rightRail.classList.toggle("cgpt-ra-no-media", !enabled);

    leftRail.querySelectorAll("button, input").forEach((el) => {
      el.disabled = !enabled;
    });

    rightRail
      .querySelectorAll(
        ".cgpt-ra-speed-btn, .cgpt-ra-volume-btn, .cgpt-ra-volume-slider, .cgpt-ra-download",
      )
      .forEach((el) => {
        el.disabled = !enabled;
      });

    const helpButton = rightRail.querySelector(".cgpt-ra-help-wrap > button");
    if (helpButton) helpButton.disabled = false;

    if (collapseButton) collapseButton.disabled = false;
  }

  function getComposer() {
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

  function syncComposerLayout() {
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

    const minLeftWidth = 240;
    const maxLeftWidth = 430;

    const canFit = leftAvailable >= minLeftWidth && rightAvailable >= 120;

    if (!canFit || !shouldExpand) {
      leftRail.classList.add("cgpt-ra-collapsed");
      rightRail.classList.add("cgpt-ra-collapsed");

      floatingToggle.classList.remove("cgpt-ra-hidden");
      const toggleX = Math.min(viewportWidth - 52, rect.right + 12);
      const toggleY = rect.top + rect.height / 2 - 21;
      floatingToggle.style.left = `${toggleX}px`;
      floatingToggle.style.top = `${toggleY}px`;
      return;
    }

    floatingToggle.classList.add("cgpt-ra-hidden");
    leftRail.classList.remove("cgpt-ra-collapsed");
    rightRail.classList.remove("cgpt-ra-collapsed");

    const computedLeftWidth = clamp(leftAvailable, minLeftWidth, maxLeftWidth);
    const centerY = rect.top + rect.height / 2;

    leftRail.style.display = "block";
    leftRail.style.width = `${computedLeftWidth}px`;
    leftRail.style.left = `${rect.left - sideGap - computedLeftWidth}px`;
    leftRail.style.top = `${centerY - 24}px`;

    rightRail.style.display = "inline-flex";
    rightRail.style.width = "max-content";
    rightRail.style.left = `${rect.right + sideGap}px`;
    rightRail.style.top = `${centerY - 24}px`;
  }

  function installHoldSeek(button, direction) {
    if (!button) return;

    let holding = false;
    let holdStarted = 0;
    let lastFrame = 0;
    let becameHold = false;
    let raf = null;

    const frame = (now) => {
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

      let seekRate;
      if (heldFor < 1.5) seekRate = 4;
      else if (heldFor < 3) seekRate = 10;
      else if (heldFor < 6) seekRate = 25;
      else seekRate = 50;

      seekRelative(direction * seekRate * dt, false);
      updateControls();

      raf = requestAnimationFrame(frame);
    };

    button.addEventListener("pointerdown", (event) => {
      if (button.disabled || event.button !== 0) return;

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

    const stop = (event) => {
      if (!holding) return;
      holding = false;

      if (raf) cancelAnimationFrame(raf);

      if (!becameHold) {
        seekRelative(direction * CONFIG.tapSeekSeconds);
      }

      try {
        button.releasePointerCapture(event.pointerId);
      } catch (_) {}
    };

    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
  }

  function seekAbsolute(target, update = true) {
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

  function seekRelative(seconds, update = true) {
    if (!activeMedia) return;
    seekAbsolute((Number(activeMedia.currentTime) || 0) + seconds, update);
  }

  function togglePlayback() {
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

  function setSpeed(speed) {
    if (!Number.isFinite(speed) || speed <= 0) return;

    localStorage.setItem(CONFIG.speedStorage, String(speed));

    if (activeMedia) {
      try {
        activeMedia.playbackRate = speed;
        activeMedia.defaultPlaybackRate = speed;
      } catch (_) {}
    }

    updateControls();
    broadcastLiveAudioState();
  }

  function setVolume(volume) {
    volume = clamp(volume, 0, 1);

    localStorage.setItem(CONFIG.volumeStorage, String(volume));

    if (activeMedia) {
      try {
        activeMedia.volume = volume;
        activeMedia.muted = false;
      } catch (_) {}
    }

    updateControls();
    broadcastLiveAudioState();
  }

  function updateControls() {
    if (!leftRail || !rightRail) return;

    if (!activeMedia) {
      setControlsEnabled(false);
      return;
    }

    setControlsEnabled(true);

    const current = Number(activeMedia.currentTime) || 0;
    const info = getSeekInfo(activeMedia);

    currentLabel.textContent = formatTime(current);

    if (Number.isFinite(activeMedia.duration)) {
      durationLabel.textContent = formatTime(activeMedia.duration);
    } else if (info.seekable) {
      durationLabel.textContent = formatTime(info.end);
    } else {
      durationLabel.textContent = "--:--";
    }

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

    setIcon(playButton, activeMedia.paused ? "play" : "pause");

    let speed = getSavedSpeed();
    let volume = getSavedVolume();

    try {
      speed = activeMedia.playbackRate;
      volume = activeMedia.volume;
    } catch (_) {}

    speedButton.textContent = `${speed}×`;

    speedMenu?.querySelectorAll(".cgpt-ra-speed-option").forEach((item) => {
      item.classList.toggle(
        "cgpt-selected",
        Math.abs(parseFloat(item.dataset.speed) - speed) < 0.001,
      );
    });

    volumeSlider.value = String(volume);
    volumeLabel.textContent = `${Math.round(volume * 100)}%`;

    const volumeButton = rightRail.querySelector(".cgpt-ra-volume-btn");

    if (volume <= 0 || activeMedia.muted) {
      setIcon(volumeButton, "volume-x");
    } else if (volume < 0.5) {
      setIcon(volumeButton, "volume-1");
    } else {
      setIcon(volumeButton, "volume-2");
    }
  }

  function extensionFor(mime, url = "") {
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

  async function resolveDownloadBlob() {
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
      const blob = blobURLMap.get(src);
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

    throw new Error(
      "The current Read Aloud stream was not exposed as a downloadable media response.",
    );
  }

  async function downloadCurrentAudio() {
    if (!activeMedia) return;

    downloadButton.disabled = true;
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
      downloadButton.disabled = false;
      setIcon(downloadButton, "download");
    }
  }

  function textMeaning(element) {
    return (
      `${element.getAttribute?.("aria-label") || ""} ` +
      `${element.getAttribute?.("title") || ""} ` +
      `${element.textContent || ""}`
    )
      .trim()
      .toLowerCase();
  }

  function findToolbar(turn) {
    const copyButton = Array.from(turn.querySelectorAll("button")).find((btn) => {
      const txt = textMeaning(btn);
      return txt === "copy" || txt.includes("copy response") || txt.includes("copy code");
    });

    if (copyButton?.parentElement) {
      return copyButton.parentElement;
    }

    const actionBars = Array.from(turn.querySelectorAll(".flex, [role='toolbar'], [data-testid*='action']"));
    for (const bar of actionBars) {
      if (bar.querySelector("button") && !bar.closest("pre, code, table")) {
        return bar;
      }
    }

    return null;
  }

  function installInlineReadAloudButtons() {
    document
      .querySelectorAll('[data-message-author-role="assistant"]')
      .forEach((message) => {
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
            broadcastLiveAudioState();
            return;
          }

          if (activeMedia && !activeMedia.paused) {
            try {
              activeMedia.pause();
            } catch (_) {}
          }

          pendingInlineButton = button;
          await triggerNativeReadAloud(turn);
        });

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

  async function waitForReadAloudMenuItem(timeout = 1800) {
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
            resolve(item);
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

  async function triggerNativeReadAloud(turn) {
    const direct = Array.from(turn.querySelectorAll("button")).find((btn) => {
      if (btn.classList.contains("cgpt-inline-readaloud")) return false;
      const t = textMeaning(btn);
      return t.includes("read aloud") || t.includes("read out loud") || t.includes("listen");
    });

    if (direct) {
      direct.click();
      return;
    }

    const toolbar = findToolbar(turn);
    const moreBtn = toolbar
      ? Array.from(toolbar.querySelectorAll("button")).find((b) => {
          const t = textMeaning(b);
          return t.includes("more actions") || t === "more" || t.includes("options");
        })
      : null;

    if (!moreBtn) {
      pendingInlineButton = null;
      warn("Could not find the response More Actions button.");
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

  function updateInlineButtons() {
    document.querySelectorAll(".cgpt-inline-readaloud").forEach((button) => {
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
    (event) => {
      const target = event.target;

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

      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        seekRelative(-CONFIG.tapSeekSeconds);
        return;
      }

      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        seekRelative(CONFIG.tapSeekSeconds);
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

  function changeSpeed(direction) {
    let current = activeMedia?.playbackRate || getSavedSpeed();

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
  // Dynamic page
  // ---------------------------------------------------------------------

  function scanDOMForPlayingMedia() {
    document.querySelectorAll("audio, video").forEach((media) => {
      if (!media.paused && !media.ended) {
        attachMedia(media, "DOM fallback");
      }
    });
  }

  function startObserver() {
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
      broadcastLiveAudioState();
      syncComposerLayout();
    }, 1000);
  }

  function animationLoop() {
    if (activeMedia) updateControls();
    requestAnimationFrame(animationLoop);
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  function installEarlyHooks() {
    installObjectURLInterceptor();
    installFetchInterceptor();
    installXHRInterceptor();
    installMediaInterceptor();
  }

  function initUI() {
    if (!document.body) {
      requestAnimationFrame(initUI);
      return;
    }

    buildUI();
    installInlineReadAloudButtons();
    startObserver();
    animationLoop();

    log("ChatGPT Audio Controls Userscript Ready");
  }

  installEarlyHooks();
  initUI();
})();
