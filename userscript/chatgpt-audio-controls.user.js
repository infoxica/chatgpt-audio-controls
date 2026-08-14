// ==UserScript==
// @name         ChatGPT Read Aloud & Audio Controls
// @namespace    https://infoxica.com/
// @version      1.0.0
// @description  Integrated Read Aloud controls beside the ChatGPT composer: compact 2-row seek player, speed presets, volume slider, instant audio download, shortcuts, and one-click per-response Read Aloud.
// @author       Infoxica
// @match        https://chatgpt.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @homepageURL  https://github.com/infoxica/chatgpt-audio-controls
// @supportURL   https://github.com/infoxica/chatgpt-audio-controls/issues
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

  let leftRail = null;
  let rightRail = null;
  let seekSlider = null;
  let currentLabel = null;
  let durationLabel = null;
  let playButton = null;
  let speedButton = null;
  let speedMenu = null;
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
        "%c[ChatGPT Read Aloud v4.2]",
        "color:#10a37f;font-weight:700",
        ...args,
      );
    }
  }

  function warn(...args) {
    console.warn("[ChatGPT Read Aloud v4.2]", ...args);
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
  };

  function lucideIcon(name, className = "") {
    const body = LUCIDE[name] || LUCIDE["circle-help"];
    return `
      <svg
        class="cgpt-ra-lucide ${className}"
        viewBox="0 0 24 24"
        width="18"
        height="18"
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
        });

        return result;
      };

      proto.pause = function (...args) {
        const result = originalPause.apply(this, args);

        if (this === activeMedia) {
          queueMicrotask(() => {
            updateControls();
            updateInlineButtons();
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
  // Styles
  // ---------------------------------------------------------------------

  function installStyles() {
    if (document.getElementById("cgpt-ra-v4-style")) return;

    const style = document.createElement("style");
    style.id = "cgpt-ra-v4-style";
    style.textContent = `
      :root {
          --cgpt-ra-bg: rgba(32, 32, 32, .94);
          --cgpt-ra-bg-hover: rgba(255,255,255,.10);
          --cgpt-ra-border: rgba(255,255,255,.10);
          --cgpt-ra-text: rgba(255,255,255,.92);
          --cgpt-ra-muted: rgba(255,255,255,.55);
          --cgpt-ra-disabled: rgba(255,255,255,.28);
      }

      html.light {
          --cgpt-ra-bg: rgba(245,245,245,.96);
          --cgpt-ra-bg-hover: rgba(0,0,0,.07);
          --cgpt-ra-border: rgba(0,0,0,.10);
          --cgpt-ra-text: rgba(0,0,0,.84);
          --cgpt-ra-muted: rgba(0,0,0,.52);
          --cgpt-ra-disabled: rgba(0,0,0,.25);
      }

      #cgpt-ra-left,
      #cgpt-ra-right {
          position: fixed;
          z-index: 9999;
          border: 1px solid var(--cgpt-ra-border);
          background: var(--cgpt-ra-bg);
          color: var(--cgpt-ra-text);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 1px 2px rgba(0,0,0,.18);
          transition: opacity .15s ease, transform .15s ease;
      }

      #cgpt-ra-left {
          width: 430px;
          height: 46px;
          display: block;
          padding: 0 13px;
          border-radius: 24px;
          overflow: visible;
      }

      #cgpt-ra-left::before {
          content: "";
          position: absolute;
          z-index: 2;
          top: -1px;
          left: 50%;
          width: 120px;
          height: 3px;
          transform: translateX(-50%);
          background: var(--cgpt-ra-bg);
          pointer-events: none;
      }

      .cgpt-ra-transport-row {
          position: absolute;
          z-index: 3;
          left: 50%;
          top: -29px;
          transform: translateX(-50%);
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 2px 5px 3px;
          margin: 0;
          border: 1px solid var(--cgpt-ra-border);
          border-radius: 19px 19px 11px 11px;
          background: var(--cgpt-ra-bg);
          box-shadow: 0 1px 2px rgba(0,0,0,.10);
      }

      .cgpt-ra-transport-row::after {
          content: "";
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: -3px;
          height: 5px;
          background: var(--cgpt-ra-bg);
          pointer-events: none;
      }

      .cgpt-ra-transport-row > * {
          position: relative;
          z-index: 1;
      }

      .cgpt-ra-progress-row {
          height: 44px;
          display: grid;
          grid-template-columns: 70px minmax(0, 1fr);
          align-items: center;
          gap: 8px;
          padding: 0;
          margin: 0;
          border: 0;
      }

      #cgpt-ra-right {
          width: max-content;
          min-width: 0;
          height: 46px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 7px;
          border-radius: 24px;
          white-space: nowrap;
      }

      #cgpt-ra-left.cgpt-ra-no-media,
      #cgpt-ra-right.cgpt-ra-no-media {
          opacity: .42;
      }

      #cgpt-ra-left.cgpt-ra-no-media .cgpt-ra-media-control,
      #cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-media-control,
      #cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-volume-popover,
      #cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-speed-menu {
          pointer-events: none !important;
      }

      .cgpt-ra-icon-btn {
          position: relative;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
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
          color: var(--cgpt-ra-disabled);
          cursor: default;
          background: transparent;
      }

      .cgpt-ra-lucide {
          display: block;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
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
          width: 19px;
          height: 19px;
      }

      .cgpt-ra-seek10 .cgpt-ra-ten {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          padding-top: 1px;
          font-size: 8px;
          font-weight: 700;
          font-family: system-ui, sans-serif;
          pointer-events: none;
      }

      .cgpt-ra-transport-row .cgpt-ra-icon-btn {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
      }

      .cgpt-ra-play {
          width: 32px !important;
          height: 32px !important;
          flex-basis: 32px !important;
      }

      .cgpt-ra-time {
          min-width: 0;
          color: var(--cgpt-ra-muted);
          font-size: 10px;
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
          background: color-mix(in srgb, currentColor 32%, transparent);
          transition: height .12s ease, background .12s ease;
      }

      .cgpt-ra-range:hover::-webkit-slider-runnable-track,
      .cgpt-ra-range:focus-visible::-webkit-slider-runnable-track {
          height: 4px;
          background: color-mix(in srgb, currentColor 44%, transparent);
      }

      .cgpt-ra-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 9px;
          height: 9px;
          margin-top: -3.5px;
          border: 0;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--cgpt-ra-bg) 85%, transparent);
          transition: width .12s ease, height .12s ease, margin-top .12s ease;
      }

      .cgpt-ra-range:hover::-webkit-slider-thumb,
      .cgpt-ra-range:focus-visible::-webkit-slider-thumb {
          width: 10px;
          height: 10px;
          margin-top: -3px;
      }

      .cgpt-ra-range::-moz-range-track {
          height: 2px;
          border: 0;
          border-radius: 999px;
          background: color-mix(in srgb, currentColor 32%, transparent);
          transition: height .12s ease, background .12s ease;
      }

      .cgpt-ra-range:hover::-moz-range-track,
      .cgpt-ra-range:focus-visible::-moz-range-track {
          height: 4px;
          background: color-mix(in srgb, currentColor 44%, transparent);
      }

      .cgpt-ra-range::-moz-range-progress {
          height: 2px;
          border: 0;
          border-radius: 999px;
          background: currentColor;
      }

      .cgpt-ra-range:hover::-moz-range-progress,
      .cgpt-ra-range:focus-visible::-moz-range-progress {
          height: 4px;
      }

      .cgpt-ra-range::-moz-range-thumb {
          width: 9px;
          height: 9px;
          border: 0;
          border-radius: 50%;
          background: currentColor;
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
          min-width: 45px;
          padding: 0 9px;
          border-radius: 17px;
          font-size: 12px;
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
          background: rgb(40,40,40);
          color: #fff;
          box-shadow: 0 10px 30px rgba(0,0,0,.28);
          overflow: hidden;
          z-index: 10002;
      }

      html.light .cgpt-ra-popover {
          background: #fff;
          color: #202020;
      }

      .cgpt-ra-speed-wrap.cgpt-open .cgpt-ra-popover,
      .cgpt-ra-help-wrap:hover .cgpt-ra-popover,
      .cgpt-ra-help-wrap:focus-within .cgpt-ra-popover {
          display: block;
      }

      .cgpt-ra-speed-menu {
          min-width: 88px;
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
          background: rgba(255,255,255,.10);
      }

      html.light .cgpt-ra-speed-option:hover,
      html.light .cgpt-ra-speed-option.cgpt-selected {
          background: rgba(0,0,0,.07);
      }

      .cgpt-ra-volume-popover {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 4px);
          transform: translateX(-50%);
          width: 44px;
          height: 158px;
          display: flex;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 0;
          padding: 8px 5px 7px;
          border: 1px solid var(--cgpt-ra-border);
          border-radius: 22px;
          background: rgb(40,40,40);
          color: #fff;
          box-shadow: 0 10px 30px rgba(0,0,0,.28);
          transition: opacity .12s ease, visibility .12s ease;
          z-index: 10002;
      }

      html.light .cgpt-ra-volume-popover {
          background: #fff;
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
          top: 52px;
          left: 50%;
          width: 98px;
          height: 20px;
          margin: 0;
          transform: translate(-50%, -50%) rotate(-90deg);
          accent-color: currentColor;
      }

      .cgpt-ra-volume-value {
          position: absolute;
          left: 6px;
          right: 6px;
          bottom: 8px;
          min-height: 28px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-top: 10px;
          border-top: 1px solid var(--cgpt-ra-border);
          font-size: 9px;
          line-height: 1;
          color: inherit;
          opacity: .68;
          text-align: center;
      }

      .cgpt-ra-help {
          width: 300px;
          padding: 11px 13px;
          font-family: system-ui, sans-serif;
      }

      .cgpt-ra-help-title {
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 650;
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
          opacity: .62;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          white-space: nowrap;
      }

      .cgpt-ra-download {
          margin-left: 2px;
          order: 99;
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
      }

      .cgpt-inline-readaloud:hover {
          opacity: 1;
          background: rgba(127,127,127,.12);
      }

      .cgpt-inline-readaloud svg {
          display: block;
          width: 17px;
          height: 17px;
      }

      .cgpt-inline-readaloud.cgpt-active {
          opacity: 1;
      }

      @media (max-width: 1180px) {
          #cgpt-ra-left,
          #cgpt-ra-right {
              display: none !important;
          }
      }
    `;

    document.documentElement.appendChild(style);
  }

  function buildUI() {
    if (leftRail || !document.body) return;

    installStyles();

    leftRail = document.createElement("div");
    leftRail.id = "cgpt-ra-left";
    leftRail.className = "cgpt-ra-no-media";

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
    rightRail.className = "cgpt-ra-no-media";

    rightRail.innerHTML = `
      <div class="cgpt-ra-speed-wrap cgpt-ra-media-control">
        <button class="cgpt-ra-icon-btn cgpt-ra-speed-btn" title="Playback speed" disabled>
          ${getSavedSpeed()}×
        </button>
        <div class="cgpt-ra-popover cgpt-ra-speed-menu"></div>
      </div>

      <div class="cgpt-ra-volume-wrap cgpt-ra-media-control">
        <button class="cgpt-ra-icon-btn cgpt-ra-volume-btn" title="Volume" disabled>
          ${lucideIcon("volume-2")}
        </button>
        <div class="cgpt-ra-volume-popover">
          <input class="cgpt-ra-volume-slider"
                 type="range" min="0" max="1" step="0.01"
                 value="${getSavedVolume()}">
          <span class="cgpt-ra-volume-value">${Math.round(getSavedVolume() * 100)}%</span>
        </div>
      </div>

      <div class="cgpt-ra-help-wrap">
        <button class="cgpt-ra-icon-btn" title="Keyboard shortcuts">
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
            <span>Smooth Scrub</span>
            <span class="cgpt-ra-shortcut-key">Hold ◀10 / 10▶</span>
          </div>
        </div>
      </div>

      <button class="cgpt-ra-icon-btn cgpt-ra-download cgpt-ra-media-control"
              title="Download audio" disabled>
        ${lucideIcon("download")}
      </button>
    `;

    document.body.append(leftRail, rightRail);

    seekSlider = leftRail.querySelector(".cgpt-ra-seek-slider");
    currentLabel = leftRail.querySelector(".cgpt-ra-current");
    durationLabel = leftRail.querySelector(".cgpt-ra-duration");
    playButton = leftRail.querySelector(".cgpt-ra-play");

    speedButton = rightRail.querySelector(".cgpt-ra-speed-btn");
    speedMenu = rightRail.querySelector(".cgpt-ra-speed-menu");
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
          .querySelector(".cgpt-ra-speed-wrap")
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

    downloadButton.addEventListener("click", downloadCurrentAudio);

    setControlsEnabled(Boolean(activeMedia));
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
    if (!leftRail || !rightRail) return;

    const composer = getComposer();
    if (!composer) {
      leftRail.style.display = "none";
      rightRail.style.display = "none";
      return;
    }

    const rect = composer.getBoundingClientRect();

    if (rect.width < 300 || rect.width > window.innerWidth * 0.82) {
      leftRail.style.display = "none";
      rightRail.style.display = "none";
      return;
    }

    const viewportWidth = window.innerWidth;
    const sideGap = 10;
    const outerMargin = 18;

    const leftAvailable = rect.left - outerMargin - sideGap;
    const rightAvailable = viewportWidth - rect.right - outerMargin - sideGap;
    const desiredLeftWidth = 440 - sideGap;

    if (leftAvailable < desiredLeftWidth || rightAvailable < 150) {
      leftRail.style.display = "none";
      rightRail.style.display = "none";
      return;
    }

    const centerY = rect.top + rect.height / 2;

    leftRail.style.display = "block";
    leftRail.style.width = `${desiredLeftWidth}px`;
    leftRail.style.left = `${rect.left - sideGap - desiredLeftWidth}px`;
    leftRail.style.top = `${centerY - 23}px`;

    rightRail.style.display = "inline-flex";
    rightRail.style.width = "max-content";
    rightRail.style.left = `${rect.right + sideGap}px`;
    rightRail.style.top = `${centerY - 23}px`;
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
      alert(
        "Could not download this Read Aloud audio.\n\nOpen DevTools → Console to inspect network details.",
      );
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

  function findButtonByMeaning(container, phrases) {
    return (
      Array.from(container.querySelectorAll("button")).find((button) => {
        if (button.classList.contains("cgpt-inline-readaloud")) return false;
        const value = textMeaning(button);
        return phrases.some((phrase) => value.includes(phrase));
      }) || null
    );
  }

  function findToolbar(turn) {
    const copy = findButtonByMeaning(turn, ["copy"]);
    if (copy?.parentElement) return copy.parentElement;

    const more = findButtonByMeaning(turn, ["more actions", "more"]);
    if (more?.parentElement) return more.parentElement;

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

          if (activeMedia && !activeMedia.paused) {
            try {
              activeMedia.pause();
            } catch (_) {}
          }

          pendingInlineButton = button;
          await triggerNativeReadAloud(turn);
        });

        const copy = findButtonByMeaning(turn, ["copy"]);
        if (copy && copy.parentElement === toolbar) {
          copy.insertAdjacentElement("afterend", button);
        } else {
          toolbar.insertBefore(button, toolbar.firstChild);
        }
      });
  }

  async function waitForReadAloudMenuItem(timeout = 1600) {
    const started = performance.now();

    return new Promise((resolve) => {
      const scan = () => {
        const candidates = document.querySelectorAll(
          '[role="menuitem"], [role="option"], [data-radix-popper-content-wrapper] button',
        );

        for (const item of candidates) {
          const text = textMeaning(item);

          if (
            text.includes("read aloud") ||
            text.includes("read out loud") ||
            text.includes("listen")
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
    const direct = findButtonByMeaning(turn, ["read aloud", "read out loud"]);

    if (direct) {
      direct.click();
      return;
    }

    const more = findButtonByMeaning(turn, ["more actions", "more"]);

    if (!more) {
      pendingInlineButton = null;
      warn("Could not find the response More Actions button.");
      return;
    }

    more.click();

    const menuItem = await waitForReadAloudMenuItem();

    if (!menuItem) {
      pendingInlineButton = null;
      warn("Could not find Read Aloud in the response menu.");
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

    log("Ready");
  }

  installEarlyHooks();
  initUI();
})();
