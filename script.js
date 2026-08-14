// ==UserScript==
// @name         ChatGPT Read Aloud - Integrated Controls
// @namespace    https://infoxica.com/
// @version      4.1.0
// @description  Integrated Read Aloud controls beside the ChatGPT composer: compact 2-row seek player, speed, volume, download, shortcuts, and one-click per-response Read Aloud.
// @author       Anand
// @match        https://chatgpt.com/*
// @run-at       document-start
// @grant        unsafeWindow
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

  // Most recent audio payload captured from ChatGPT's network/media pipeline.
  let capturedAudioBlob = null;
  let capturedAudioMime = "";
  let capturedAudioURL = "";
  let capturedAudioAt = 0;

  const blobURLMap = new Map();

  function log(...args) {
    if (CONFIG.debug) {
      console.log(
        "%c[ChatGPT Read Aloud v4]",
        "color:#10a37f;font-weight:700",
        ...args,
      );
    }
  }

  function warn(...args) {
    console.warn("[ChatGPT Read Aloud v4]", ...args);
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

  function setIcon(button, iconName, extraHTML = "") {
    if (!button) return;
    button.innerHTML = `<i class="icon-${iconName}" aria-hidden="true"></i>${extraHTML}`;
  }

  // ---------------------------------------------------------------------
  // Lucide font
  // ---------------------------------------------------------------------

  function installLucide() {
    if (document.getElementById("cgpt-ra-lucide")) return;

    const link = document.createElement("link");
    link.id = "cgpt-ra-lucide";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/lucide-static@latest/font/lucide.css";

    (document.head || document.documentElement).appendChild(link);
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
        // Keep our own Blob reference even after ChatGPT revokes its URL.
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
  // UI
  // ---------------------------------------------------------------------

  function installStyles() {
    if (document.getElementById("cgpt-ra-v4-style")) return;

    const style = document.createElement("style");
    style.id = "cgpt-ra-v4-style";
    style.textContent = `
            @font-face {
                font-family: "LucideIcons";
                src:
                    url("https://unpkg.com/lucide-static@latest/font/Lucide.woff2") format("woff2"),
                    url("https://unpkg.com/lucide-static@latest/font/Lucide.ttf") format("truetype");
                font-weight: normal;
                font-style: normal;
                font-display: block;
            }

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

            /*
             * Left player: fixed 440px, two rows, visually one component.
             *
             * Row 1:       <10   play/pause   10>
             * Row 2:  00:00/00:00 ------------- seeker
             */
            #cgpt-ra-left {
                width: 440px;
                height: 64px;
                display: flex;
                flex-direction: column;
                align-items: stretch;
                justify-content: center;
                gap: 0;
                padding: 4px 10px 7px;
                border-radius: 22px;
                overflow: visible;
            }

            .cgpt-ra-transport-row {
                height: 31px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                padding: 0;
                margin: 0;
                border: 0;
            }

            .cgpt-ra-progress-row {
                min-height: 20px;
                display: grid;
                grid-template-columns: 69px minmax(0, 1fr);
                align-items: center;
                gap: 7px;
                padding: 0 2px;
                margin: -1px 0 0;
                border: 0;
            }

            /*
             * Right rail remains compact and on one line.
             */
            #cgpt-ra-right {
                height: 46px;
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 5px 7px;
                border-radius: 24px;
            }

            #cgpt-ra-left.cgpt-ra-no-media,
            #cgpt-ra-right.cgpt-ra-no-media {
                opacity: .42;
            }

            /*
             * Before Read Aloud exists, controls should be visible as part
             * of the layout but must not behave like live controls.
             * Help stays available.
             */
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

            .cgpt-ra-icon-btn > i {
                font-size: 18px;
                line-height: 1;
            }

            .cgpt-ra-seek10 {
                position: relative;
            }

            .cgpt-ra-seek10 i {
                font-size: 20px;
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

            .cgpt-ra-play {
                width: 36px;
                height: 36px;
                flex-basis: 36px;
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

            /*
             * Slim native range. The transparent 16px input keeps it easy
             * to grab while the visible track stays only ~2px thick.
             */
            .cgpt-ra-range {
                width: 100%;
                height: 16px;
                margin: 0;
                padding: 0;
                cursor: pointer;
                accent-color: currentColor;
                background: transparent;
            }

            .cgpt-ra-range::-webkit-slider-runnable-track {
                height: 2px;
                border-radius: 999px;
                background: color-mix(in srgb, currentColor 28%, transparent);
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
            }

            .cgpt-ra-range::-moz-range-track {
                height: 2px;
                border: 0;
                border-radius: 999px;
                background: color-mix(in srgb, currentColor 28%, transparent);
            }

            .cgpt-ra-range::-moz-range-progress {
                height: 2px;
                border-radius: 999px;
                background: currentColor;
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
                height: 142px;
                display: flex;
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 5px;
                padding: 9px 5px;
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
                width: 108px;
                height: 22px;
                margin: 38px 0;
                transform: rotate(-90deg);
                accent-color: currentColor;
            }

            .cgpt-ra-volume-value {
                position: absolute;
                left: 6px;
                right: 6px;
                bottom: 6px;
                padding-top: 6px;
                border-top: 1px solid var(--cgpt-ra-border);
                font-size: 9px;
                line-height: 1;
                color: inherit;
                opacity: .65;
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
                margin-left: auto;
            }

            .cgpt-ra-download-busy i {
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

            .cgpt-inline-readaloud i {
                font-size: 17px;
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

    installLucide();
    installStyles();

    leftRail = document.createElement("div");
    leftRail.id = "cgpt-ra-left";
    leftRail.className = "cgpt-ra-no-media";

    leftRail.innerHTML = `
            <div class="cgpt-ra-transport-row">
                <button class="cgpt-ra-icon-btn cgpt-ra-seek10 cgpt-ra-back cgpt-ra-media-control"
                        title="Back 10 seconds — hold to scrub" disabled>
                    <i class="icon-rotate-ccw" aria-hidden="true"></i>
                    <span class="cgpt-ra-ten">10</span>
                </button>

                <button class="cgpt-ra-icon-btn cgpt-ra-play cgpt-ra-media-control"
                        title="Play / Pause (Alt+P)" disabled>
                    <i class="icon-play" aria-hidden="true"></i>
                </button>

                <button class="cgpt-ra-icon-btn cgpt-ra-seek10 cgpt-ra-forward cgpt-ra-media-control"
                        title="Forward 10 seconds — hold to scrub" disabled>
                    <i class="icon-rotate-cw" aria-hidden="true"></i>
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
                    <i class="icon-volume-2" aria-hidden="true"></i>
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
                    <i class="icon-circle-help" aria-hidden="true"></i>
                </button>
                <div class="cgpt-ra-popover cgpt-ra-help">
                    <div class="cgpt-ra-help-title">Read Aloud shortcuts</div>
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
                        <span>Slower</span>
                        <span class="cgpt-ra-shortcut-key">Shift + &lt;</span>
                    </div>
                    <div class="cgpt-ra-shortcut-row">
                        <span>Faster</span>
                        <span class="cgpt-ra-shortcut-key">Shift + &gt;</span>
                    </div>
                    <div class="cgpt-ra-shortcut-row">
                        <span>Seek smoothly</span>
                        <span class="cgpt-ra-shortcut-key">Hold ◀10 / 10▶</span>
                    </div>
                </div>
            </div>

            <button class="cgpt-ra-icon-btn cgpt-ra-download cgpt-ra-media-control"
                    title="Download audio" disabled>
                <i class="icon-download" aria-hidden="true"></i>
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

    // Help must always remain available.
    const helpButton = rightRail.querySelector(".cgpt-ra-help-wrap > button");
    if (helpButton) helpButton.disabled = false;
  }

  // ---------------------------------------------------------------------
  // Position controls in the free space beside ChatGPT's composer
  // ---------------------------------------------------------------------

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

    // Guard against selecting a full-width form instead of the visible composer.
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

    if (leftAvailable < 440 || rightAvailable < 170) {
      leftRail.style.display = "none";
      rightRail.style.display = "none";
      return;
    }

    leftRail.style.display = "flex";
    rightRail.style.display = "flex";

    const centerY = rect.top + rect.height / 2;

    const desiredLeftWidth = 440;
    const desiredRightWidth = clamp(rightAvailable, 170, 250);

    /*
     * Keep left player exactly 440px as requested.
     * If 440px cannot physically fit, hide rather than squeeze it.
     */
    if (leftAvailable < desiredLeftWidth) {
      leftRail.style.display = "none";
    } else {
      leftRail.style.display = "flex";
      leftRail.style.width = `${desiredLeftWidth}px`;
      leftRail.style.left = `${rect.left - sideGap - desiredLeftWidth}px`;

      /*
       * Left rail is 64px tall, vertically centered on composer.
       */
      leftRail.style.top = `${centerY - 32}px`;
    }

    rightRail.style.width = `${desiredRightWidth}px`;
    rightRail.style.left = `${rect.right + sideGap}px`;
    rightRail.style.top = `${centerY - 23}px`;
  }

  // ---------------------------------------------------------------------
  // Smooth seek
  // ---------------------------------------------------------------------

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

  // ---------------------------------------------------------------------
  // Playback / speed / volume
  // ---------------------------------------------------------------------

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

  // ---------------------------------------------------------------------
  // Download current Read Aloud audio
  // ---------------------------------------------------------------------

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
    return match ? match[1].toLowerCase() : "audio";
  }

  async function resolveDownloadBlob() {
    // 1. The fetch/XHR interceptor is the most reliable source.
    if (capturedAudioBlob && Date.now() - capturedAudioAt < 60 * 60 * 1000) {
      return {
        blob: capturedAudioBlob,
        mime: capturedAudioMime || capturedAudioBlob.type,
        url: capturedAudioURL,
      };
    }

    if (!activeMedia) throw new Error("No active Read Aloud audio.");

    const src = activeMedia.currentSrc || activeMedia.src || "";

    // 2. Blob captured before ChatGPT revoked its object URL.
    if (src && blobURLMap.has(src)) {
      const blob = blobURLMap.get(src);
      return { blob, mime: blob.type, url: src };
    }

    // 3. Try the active source directly.
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
        "Could not download this Read Aloud audio yet.\n\n" +
          'Open DevTools → Console and copy the "[ChatGPT Read Aloud v4] Download failed" line to me. ' +
          "The v4 script now captures fetch, XHR and Blob audio, so that message will tell us which remaining transport ChatGPT is using.",
      );
    } finally {
      downloadButton.classList.remove("cgpt-ra-download-busy");
      downloadButton.disabled = false;
      setIcon(downloadButton, "download");
    }
  }

  // ---------------------------------------------------------------------
  // One-click Read Aloud button on each assistant response
  // ---------------------------------------------------------------------

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

          // Clicking the active response again stops it.
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

          // Stop another response first.
          if (activeMedia && !activeMedia.paused) {
            try {
              activeMedia.pause();
            } catch (_) {}
          }

          pendingInlineButton = button;
          await triggerNativeReadAloud(turn);
        });

        // Prefer placing it immediately after Copy, otherwise first.
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

      /*
       * YouTube-style playback speed shortcuts:
       * Shift + <  (Comma)  = slower
       * Shift + >  (Period) = faster
       */
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
