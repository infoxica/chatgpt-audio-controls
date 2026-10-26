// ==UserScript==
// @name         ChatGPT Read Aloud & Audio Controls
// @namespace    https://infoxica.com/
// @version      1.3.0
// @description  Integrated Read Aloud controls beside the ChatGPT composer: compact seek player, speed presets, volume slider with wheel scroll, instant audio download, shortcuts.
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
class StreamingAudioCapture {
  requests = new Set;
  sources = new Map;
  urls = new Map;
  buffers = new WeakMap;
  begin() {
    let resolve, reject;
    const promise = new Promise((yes, no) => {
      resolve = yes;
      reject = no;
    });
    promise.catch(() => {});
    const controller = new AbortController;
    const request = {
      controller,
      promise,
      resolve,
      reject,
      claimed: false,
      timer: setTimeout(() => {
        controller.abort();
        reject(new Error("Audio capture timed out"));
        this.requests.delete(request);
      }, 60000)
    };
    this.requests.add(request);
    const waiting = [...this.sources.values()].filter((stream) => !stream.request && !stream.settled);
    for (const stream of waiting)
      stream.candidates.push(request);
    const active = waiting.filter((stream) => stream.active);
    if (active.length === 1 && active[0].candidates.length === 1)
      this.bind(active[0], request);
    while (this.requests.size > 4) {
      const oldest = [...this.requests].find((request) => !request.claimed) || this.requests.values().next().value;
      this.releaseRequest(oldest);
    }
    return request;
  }
  complete(request, payload) {
    payload.then((blob) => {
      clearTimeout(request.timer);
      request.resolve(blob);
    }, (error) => {
      clearTimeout(request.timer);
      request.reject(error);
      this.requests.delete(request);
    });
  }
  register(source, url) {
    let resolve, reject;
    const promise = new Promise((yes, no) => {
      resolve = yes;
      reject = no;
    });
    promise.catch(() => {});
    const candidates = [...this.requests].filter((request) => !request.claimed);
    const stream = { candidates, prefix: new Uint8Array, promise, resolve, reject, settled: false, active: false };
    this.sources.set(source, stream);
    this.urls.set(url, stream);
    while (this.sources.size > 8) {
      const oldest = [...this.sources].find(([, value]) => !value.active);
      if (!oldest)
        break;
      oldest[1].settled = true;
      oldest[1].reject(new Error("Unused stream replaced"));
      this.sources.delete(oldest[0]);
      for (const [key, value] of this.urls)
        if (value === oldest[1])
          this.urls.delete(key);
    }
  }
  addBuffer(source, buffer) {
    const stream = this.sources.get(source);
    if (stream)
      this.buffers.set(buffer, stream);
  }
  append(buffer, data) {
    const stream = this.buffers.get(buffer);
    if (!stream || stream.prefix.length >= 4096)
      return;
    const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
    const length = Math.min(bytes.length, 4096 - stream.prefix.length);
    const prefix = new Uint8Array(stream.prefix.length + length);
    prefix.set(stream.prefix);
    prefix.set(bytes.subarray(0, length), stream.prefix.length);
    stream.prefix = prefix;
    if (stream.active && !stream.request && prefix.length >= 1024)
      this.match(stream);
  }
  async match(stream) {
    const matches = await Promise.all(stream.candidates.map(async (request) => {
      try {
        return await this.matches(stream.prefix, await request.promise) ? request : undefined;
      } catch {
        return;
      }
    }));
    const eligible = matches.filter(Boolean);
    if (!stream.settled && eligible.length === 1 && !stream.request && !eligible[0].claimed)
      this.bind(stream, eligible[0]);
  }
  async matches(prefix, blob) {
    const bytes = new Uint8Array(await blob.slice(0, prefix.length).arrayBuffer());
    return bytes.length === prefix.length && bytes.every((byte, index) => byte === prefix[index]);
  }
  bind(stream, request) {
    stream.request = request;
    request.claimed = true;
    request.promise.then(async (blob) => {
      if (stream.settled)
        return;
      if (stream.prefix.length && !await this.matches(stream.prefix, blob))
        throw new Error("Audio stream mismatch");
      stream.settled = true;
      stream.resolve(blob);
    }).catch((error) => {
      stream.settled = true;
      stream.reject(error);
    });
  }
  has(url) {
    return this.urls.has(url);
  }
  retain(url) {
    const stream = this.urls.get(url);
    if (!stream)
      return;
    stream.active = true;
    if (!stream.request) {
      const eligible = stream.candidates.filter((request) => !request.claimed);
      if (eligible.length === 1)
        this.bind(stream, eligible[0]);
      else if (stream.prefix.length >= 1024)
        this.match(stream);
    }
    return stream.promise;
  }
  releaseRequest(request) {
    clearTimeout(request.timer);
    request.controller.abort();
    request.reject(new Error("Audio session replaced"));
    this.requests.delete(request);
  }
  clearExcept(url = "") {
    const keep = this.urls.get(url);
    for (const request of this.requests)
      if (request !== keep?.request && !keep?.candidates.includes(request))
        this.releaseRequest(request);
    for (const [source, stream] of this.sources)
      if (stream !== keep) {
        stream.settled = true;
        stream.reject(new Error("Audio session replaced"));
        this.sources.delete(source);
      }
    for (const [key, stream] of this.urls)
      if (stream !== keep)
        this.urls.delete(key);
  }
}



function installStreamingInterceptor() {
  const source = PAGE.MediaSource?.prototype;
  const buffer = PAGE.SourceBuffer?.prototype;
  if (!source || !buffer || source.__cgptRAStreamHook)
    return;
  const add = source.addSourceBuffer, append = buffer.appendBuffer;
  source.addSourceBuffer = function(...args) {
    const result = add.apply(this, args);
    streamingAudio.addBuffer(this, result);
    return result;
  };
  buffer.appendBuffer = function(data) {
    const result = append.call(this, data);
    streamingAudio.append(this, data);
    return result;
  };
  Object.defineProperty(source, "__cgptRAStreamHook", { value: true, configurable: true });
}



class PlaybackSession {
  retain;
  changed;
  failed;
  media = null;
  host = null;
  owned = null;
  source = "";
  objectURL = "";
  generation = 0;
  pending = null;
  payload = null;
  controller = null;
  wantsPlay = false;
  savedTime = 0;
  savedDuration = 0;
  ready = false;
  advancing = false;
  playAnchor = 0;
  playTimer;
  playAttempt = 0;
  constructor(retain, changed, failed) {
    this.retain = retain;
    this.changed = changed;
    this.failed = failed;
  }
  isOwned(media) {
    return media === this.owned;
  }
  get url() {
    return this.source;
  }
  get time() {
    return this.owned && !this.ready ? this.savedTime : this.media?.currentTime || 0;
  }
  get duration() {
    return this.owned && !this.ready ? this.savedDuration : this.media?.duration || 0;
  }
  get loading() {
    return this.wantsPlay && (!this.advancing || Boolean(this.pending));
  }
  get playing() {
    return this.advancing && Boolean(this.media && !this.media.paused && !this.media.ended);
  }
  get paused() {
    return !this.wantsPlay;
  }
  attach(media) {
    if (this.isOwned(media))
      return;
    const source = media.src || media.currentSrc;
    if (this.host === media && this.source === source && !this.owned)
      return;
    this.dispose(media);
    this.host = this.media = media;
    this.source = source;
    this.wantsPlay = true;
    this.controller = new AbortController;
    this.watch(media);
    this.payload = this.retain(source, this.controller.signal);
    this.payload.catch(() => {});
  }
  watch(media) {
    const generation = this.generation;
    const current = () => generation === this.generation && media === this.media;
    const signal = this.controller?.signal;
    for (const name of ["play", "pause", "ended", "waiting", "timeupdate"]) {
      media.addEventListener(name, () => {
        if (!current())
          return;
        if (name === "play" || name === "waiting") {
          if (media.paused)
            return;
          this.advancing = false;
          this.playAnchor = media.currentTime;
          this.wantsPlay = true;
        } else if (name === "pause" || name === "ended") {
          if (media.paused)
            this.wantsPlay = this.advancing = false;
        } else if (!media.paused && media.currentTime > this.playAnchor) {
          this.advancing = true;
          clearTimeout(this.playTimer);
        }
        this.changed(media);
      }, { signal });
    }
  }
  async blob() {
    if (!this.payload)
      throw new Error("No active audio source");
    return this.payload;
  }
  seek(time) {
    this.savedTime = time;
    if (this.media && (!this.owned || this.ready)) {
      this.media.currentTime = time;
      // Measure playback progress from the seek destination, not the old position.
      this.playAnchor = this.media.currentTime;
    }
  }
  toggle() {
    if (!this.media)
      return;
    const attempt = ++this.playAttempt;
    if (this.owned) {
      this.wantsPlay = !this.wantsPlay;
      if (!this.wantsPlay) {
        this.advancing = false;
        clearTimeout(this.playTimer);
        this.media.pause();
      } else if (!this.pending) {
        if (!this.ready)
          this.prepare();
        else
          this.playOwned();
      }
      return;
    }
    if (!this.wantsPlay) {
      this.wantsPlay = true;
      const generation = this.generation;
      this.media.play().catch(() => {
        if (generation === this.generation && attempt === this.playAttempt) {
          this.wantsPlay = false;
          this.failed();
          this.changed(this.media);
        }
      });
      return;
    }
    const host = this.media;
    this.savedTime = host.currentTime || 0;
    this.savedDuration = Number.isFinite(host.duration) ? host.duration : 0;
    if (!this.savedDuration && host.buffered?.length)
      this.savedDuration = host.buffered.end(host.buffered.length - 1);
    const owned = new Audio;
    owned.preload = "auto";
    owned.playbackRate = host.playbackRate;
    owned.defaultPlaybackRate = host.playbackRate;
    owned.volume = host.volume;
    owned.muted = host.muted;
    this.owned = owned;
    this.media = owned;
    this.wantsPlay = false;
    this.advancing = false;
    this.watch(owned);
    this.changed(owned);
    host.pause();
    this.prepare();
  }
  prepare() {
    const owned = this.owned;
    if (!owned || this.pending)
      return;
    const generation = this.generation;
    const signal = this.controller.signal;
    const current = () => this.generation === generation && this.owned === owned;
    this.pending = (async () => {
      try {
        const blob = await new Promise((resolve, reject) => {
          const aborted = () => finish(new Error("Session replaced"));
          const timer = setTimeout(() => finish(new Error("Audio retention timed out")), 60000);
          const finish = (error, blob) => {
            clearTimeout(timer);
            signal.removeEventListener("abort", aborted);
            error ? reject(error) : resolve(blob);
          };
          signal.addEventListener("abort", aborted, { once: true });
          this.blob().then((blob) => finish(undefined, blob), (error) => finish(error));
        });
        if (!current())
          return;
        if (this.objectURL)
          URL.revokeObjectURL(this.objectURL);
        this.objectURL = URL.createObjectURL(blob);
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => finish(new Error("Audio load timed out")), 15000);
          const finish = (error) => {
            clearTimeout(timer);
            owned.removeEventListener("loadedmetadata", loaded);
            owned.removeEventListener("error", failed);
            signal.removeEventListener("abort", aborted);
            error ? reject(error) : resolve();
          };
          const loaded = () => finish();
          const failed = () => finish(new Error("Audio load failed"));
          const aborted = () => finish(new Error("Session replaced"));
          owned.addEventListener("loadedmetadata", loaded, { once: true });
          owned.addEventListener("error", failed, { once: true });
          signal.addEventListener("abort", aborted, { once: true });
          owned.src = this.objectURL;
          owned.load();
        });
        if (!current())
          return;
        owned.currentTime = Math.min(this.savedTime, Number.isFinite(owned.duration) ? owned.duration : this.savedTime);
        this.ready = true;
        if (this.wantsPlay)
          this.playOwned();
      } catch {
        if (current()) {
          this.wantsPlay = false;
          this.failed();
        }
      } finally {
        if (current()) {
          this.pending = null;
          this.changed(owned);
        }
      }
    })();
  }
  playOwned() {
    const owned = this.owned, generation = this.generation, attempt = this.playAttempt;
    if (!owned)
      return;
    this.advancing = false;
    this.playAnchor = owned.currentTime;
    clearTimeout(this.playTimer);
    this.playTimer = setTimeout(() => {
      if (generation === this.generation && attempt === this.playAttempt && this.wantsPlay && !this.advancing) {
        this.wantsPlay = false;
        owned.pause();
        this.failed();
        this.changed(owned);
      }
    }, 15000);
    owned.play().catch(() => {
      if (generation === this.generation && attempt === this.playAttempt && this.wantsPlay) {
        clearTimeout(this.playTimer);
        this.wantsPlay = false;
        this.failed();
        this.changed(owned);
      }
    });
  }
  dispose(next) {
    this.generation++;
    this.playAttempt++;
    clearTimeout(this.playTimer);
    this.controller?.abort();
    this.controller = null;
    const media = this.media;
    this.media = this.host = null;
    if (media && media !== next)
      media.pause();
    if (this.owned) {
      this.owned.removeAttribute("src");
      this.owned.load();
    }
    if (this.objectURL)
      URL.revokeObjectURL(this.objectURL);
    this.owned = null;
    this.objectURL = this.source = "";
    this.pending = this.payload = null;
    this.ready = this.wantsPlay = this.advancing = false;
    this.savedTime = this.savedDuration = 0;
  }
}



function floatingVisibility(hidden, mode, session, expanded) {
  const hideAll = hidden && mode === "all";
  return { player: !hideAll && expanded, launcher: !hideAll && !expanded && (!hidden || session) };
}

let observedComposer = null;
const composerObserver = new ResizeObserver(scheduleLayoutSync);
const composerAttributes = new MutationObserver(scheduleLayoutSync);
let conversationPath = location.pathname;

function getSavedSettings() { return {}; }
function recoveryCopy() { return { pending: 'Loading audio…', playError: 'Playback could not resume. Start Read Aloud again using ChatGPT’s response button.' }; }
function showStatus(message) { let status=document.getElementById('cgpt-ra-status'); if(!status){status=document.createElement('div');status.id='cgpt-ra-status';status.setAttribute('role','status');document.body.append(status);}status.textContent=message;status.hidden=false;setTimeout(()=>status.hidden=true,8000); }

  const PAGE = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

  const CONFIG = {
    tapSeekSeconds: 10,
    speeds: [0.5, 0.75, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3],
    defaultSpeed: 1,
    defaultVolume: 1,
    speedStorage: "cgpt-ra-v4-speed",
    volumeStorage: "cgpt-ra-v4-volume",
    debug: false,
  };

  let activeMedia = null;
  let userForcedExpand = false;
  let userForcedCollapsed = false;

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


const MAX_BLOB_MAP_ENTRIES = 4;
const MAX_BLOB_MAP_BYTES = 64 * 1024 * 1024;
const blobURLMap = new Map;
let blobURLBytes = 0;
function removeBlobURL(url) {
  const blob = blobURLMap.get(url);
  if (!blob)
    return;
  blobURLBytes -= blob.size;
  blobURLMap.delete(url);
}
function pruneBlobMap() {
  while (blobURLMap.size > MAX_BLOB_MAP_ENTRIES || blobURLBytes > MAX_BLOB_MAP_BYTES) {
    const firstEntry = blobURLMap.entries().next().value;
    if (!firstEntry)
      break;
    removeBlobURL(firstEntry[0]);
  }
}
function rememberBlobURL(url, blob) {
  removeBlobURL(url);
  blobURLMap.set(url, blob);
  blobURLBytes += blob.size;
  pruneBlobMap();
}

  const mediaListenersInstalled = new WeakSet();

  // Cached DOM state to completely eliminate flickering and redundant reflows
  const cache = {
    currentTimeStr: "",
    durationStr: "",
    isPaused: true,
    speed: 1,
    volume: 1,
    isMuted: false,
    controlsEnabled: false,
    isCollapsed: true,
    floatingHidden: false,
    lastBroadcast: 0,
  };

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

  function broadcastLiveAudioState(force = false) {
  const now = Date.now();
  if (!force && now - cache.lastBroadcast < 500)
    return;
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
    updatedAt: now
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
        <circle cx="0" cy="0" r="10" fill="var(--cgpt-ra-accent)" stroke="#ffffff" stroke-width="1.5" />
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
  return type.startsWith("audio/") || type.includes("application/ogg") || type.includes("application/octet-stream") && /(audio|speech|voice|tts|synth)/.test(u) || /\.(mp3|m4a|aac|wav|ogg|opus|webm)(?:$|\?)/i.test(u) || /(read.?aloud|text.?to.?speech|tts|synthesi[sz]e|speech)/i.test(u);
}


  function rememberAudioBlob(blob, sourceURL = "") {
  if (blob.size && blob.size <= MAX_BLOB_MAP_BYTES && looksLikeAudio(sourceURL, blob.type))
    rememberBlobURL(sourceURL, blob);
}
const retentionFetch = PAGE.fetch.bind(PAGE);
const streamingAudio = new StreamingAudioCapture();
async function readAudio(response) {
  if (Number(response.headers.get("content-length")) > MAX_BLOB_MAP_BYTES || !response.body)
    throw new Error("Audio size unsupported");
  const reader = response.body.getReader();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        break;
      size += value.byteLength;
      if (size > MAX_BLOB_MAP_BYTES) {
        reader.cancel().catch(() => {});
        throw new Error("Audio size unsupported");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size)
    throw new Error("Empty audio");
  return new Blob(parts, { type: response.headers.get("content-type") || "application/octet-stream" });
}
async function retainAudio(source, signal) {
  if (!source)
    throw new Error("No audio source");
  const stream = streamingAudio.retain(source);
  if (stream)
    return stream;
  const cached = blobURLMap.get(source);
  if (cached)
    return cached;
  const response = await retentionFetch(source, { credentials: "include", signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]) });
  if (!response.ok)
    throw new Error("Audio unavailable");
  return readAudio(response);
}



const playback = new PlaybackSession(retainAudio, (media) => {
  activeMedia = media;
  if (media)
    installMediaListeners(media);
  updateControls();
  broadcastLiveAudioState(true);
  scheduleLayoutSync();
}, () => showStatus(recoveryCopy().playError, true));
window.addEventListener("pagehide", () => {
  playback.dispose();
  activeMedia = null;
  blobURLMap.clear();
  blobURLBytes = 0;

  streamingAudio.clearExcept();
});


  function installObjectURLInterceptor() {
  try {
    const urlObj = PAGE.URL;
    if (!urlObj || urlObj.__cgptRAObjectURLHook)
      return;
    const originalCreate = urlObj.createObjectURL.bind(urlObj);
    const originalRevoke = urlObj.revokeObjectURL.bind(urlObj);
    urlObj.createObjectURL = function(object) {
      const url = originalCreate(object);
      if (PAGE.MediaSource && object instanceof PAGE.MediaSource)
        streamingAudio.register(object, url);
      try {
        if (object instanceof PAGE.Blob && object.size && looksLikeAudio(url, object.type)) {
          rememberBlobURL(url, object);
          rememberAudioBlob(object, url);
        }
      } catch (_) {}
      return url;
    };
    urlObj.revokeObjectURL = function(url) {
      removeBlobURL(url);
      return originalRevoke(url);
    };
    Object.defineProperty(urlObj, "__cgptRAObjectURLHook", {
      value: true,
      configurable: true
    });
  } catch (error) {
    warn("Object URL interception failed:", error);
  }
}





  function installFetchInterceptor() {
  try {
    if (!PAGE.fetch || PAGE.fetch.__cgptRAFetchHook)
      return;
    const originalFetch = PAGE.fetch.bind(PAGE);
    async function wrappedFetch(...args) {
      const inputURL = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      const signal = args[1]?.signal || args[0]?.signal;
      const capture = looksLikeAudio(inputURL, "") && !signal?.aborted ? streamingAudio.begin() : null;
      let response;
      try {
        response = await originalFetch(...capture ? [args[0], { ...args[1], signal: capture.controller.signal }] : args);
      } catch (error) {
        if (capture)
          streamingAudio.complete(capture, Promise.reject(error));
        throw error;
      }
      try {
        const requestURL = typeof args[0] === "string" ? args[0] : args[0]?.url || response.url || "";
        const type = response.headers?.get("content-type") || "";
        if (looksLikeAudio(requestURL, type)) {
          const pending = readAudio(response.clone());
          if (capture)
            streamingAudio.complete(capture, pending);
          pending.catch(() => {});
        } else if (capture)
          streamingAudio.complete(capture, Promise.reject(new Error("Not audio")));
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
    if (!proto || proto.__cgptRAXHRHook)
      return;
    const originalOpen = proto.open;
    const originalSend = proto.send;
    proto.open = function(method, url, ...rest) {
      this.__cgptRAURL = String(url || "");
      return originalOpen.call(this, method, url, ...rest);
    };
    proto.send = function(...args) {
      this.addEventListener("load", () => {
        try {
          const type = this.getResponseHeader("content-type") || "";
          const url = this.responseURL || this.__cgptRAURL || "";
          if (!looksLikeAudio(url, type))
            return;
          if (this.response instanceof PAGE.Blob) {
            rememberAudioBlob(this.response, url);
          } else if (this.response instanceof PAGE.ArrayBuffer) {
            rememberAudioBlob(new Blob([this.response], { type }), url);
          }
        } catch (_) {}
      }, { once: true });
      return originalSend.apply(this, args);
    };
    Object.defineProperty(proto, "__cgptRAXHRHook", {
      value: true,
      configurable: true
    });
  } catch (error) {
    warn("XHR interception failed:", error);
  }
}


  // ---------------------------------------------------------------------
  // Media interception
  // ---------------------------------------------------------------------

  function getSeekInfo(media = activeMedia) {
  if (!media)
    return { start: 0, end: 0, seekable: false };
  try {
    if (playback.isOwned(media) && playback.duration > 0)
      return { start: 0, end: playback.duration, seekable: true };
    if (Number.isFinite(media.duration) && media.duration > 0) {
      return { start: 0, end: media.duration, seekable: true };
    }
    if (media.seekable?.length) {
      return {
        start: media.seekable.start(0),
        end: media.seekable.end(media.seekable.length - 1),
        seekable: true
      };
    }
    if (media.buffered?.length) {
      return {
        start: 0,
        end: media.buffered.end(media.buffered.length - 1),
        seekable: true
      };
    }
  } catch (_) {}
  return { start: 0, end: 0, seekable: false };
}


  function isReadAloudMedia(media) {
  if (media.tagName !== "AUDIO")
    return false;
  const source = media.src || media.currentSrc || "";
  return blobURLMap.has(source) || streamingAudio.has(source) || looksLikeAudio(source, "");
}





  function attachMedia(media, reason = "detected") {
  if (!media || playback.isOwned(media) || typeof media.play !== "function" || !isReadAloudMedia(media))
    return;
  const source = media.src || media.currentSrc;
  const changed = activeMedia !== media || playback.url !== source;
  playback.attach(media);
  if (changed) {
    streamingAudio.clearExcept(source);
    for (const url of blobURLMap.keys())
      if (url !== source)
        removeBlobURL(url);
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
  if (changed)
    installMediaListeners(media);
  setControlsEnabled(true);
  updateControls();
  broadcastLiveAudioState(true);
  scheduleLayoutSync();
  log("Attached media:", reason, media);
}





  function installMediaListeners(media) {
  if (mediaListenersInstalled.has(media))
    return;
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
    "canplay"
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


  function installMediaInterceptor() {
  try {
    const proto = PAGE.HTMLMediaElement?.prototype;
    if (!proto || proto.__cgptRAV4Hook)
      return;
    const originalPlay = proto.play;
    const originalPause = proto.pause;
    proto.play = function(...args) {
      const isReadAloud = !playback.isOwned(this) && isReadAloudMedia(this);
      if (isReadAloud)
        attachMedia(this, "play() intercepted");
      const result = originalPlay.apply(this, args);
      queueMicrotask(() => {
        try {
          if (!isReadAloud)
            return;
          this.playbackRate = getSavedSpeed();
          this.defaultPlaybackRate = getSavedSpeed();
          this.volume = getSavedVolume();
        } catch (_) {}
        updateControls();
        broadcastLiveAudioState(true);
      });
      return result;
    };
    proto.pause = function(...args) {
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
      configurable: true
    });
    log("HTMLMediaElement hook installed");
  } catch (error) {
    warn("Media hook failed:", error);
  }
}


  // ---------------------------------------------------------------------
  // Styles (Using ChatGPT Native CSS Vars)
  // ---------------------------------------------------------------------

  function installStyles() { const style=document.createElement('style'); style.textContent="/*\r\n * ChatGPT Audio Controls Styles\r\n * Strictly scoped to #cgpt-ra-* to NEVER override or affect any native ChatGPT elements.\r\n */\r\n\r\n#cgpt-ra-left,\r\n#cgpt-ra-right,\r\n#cgpt-ra-floating-toggle {\r\n    --cgpt-ra-bg: var(--main-surface-primary, var(--bg-primary, #212121));\r\n    --cgpt-ra-bg-surface: var(--main-surface-secondary, var(--bg-secondary, #303030));\r\n    --cgpt-ra-bg-surface-hover: var(--interactive-bg-secondary-hover, rgba(255, 255, 255, .10));\r\n    --cgpt-ra-border: var(--border-default, rgba(255, 255, 255, .15));\r\n    --cgpt-ra-border-light: var(--border-extra-light, rgba(255, 255, 255, .10));\r\n    --cgpt-ra-text: var(--text-primary, #ffffff);\r\n    --cgpt-ra-muted: var(--text-tertiary, #afafaf);\r\n    --cgpt-ra-disabled: var(--border-extra-light, rgba(255, 255, 255, .28));\r\n    --cgpt-ra-accent: var(--theme-submit-btn-bg, var(--interactive-bg-accent-secondary-default, var(--theme-blue-default, #3a83f7)));\r\n    --cgpt-ra-accent-text: var(--theme-submit-btn-text, var(--interactive-label-primary-default, #ffffff));\r\n}\r\n\r\nhtml.light #cgpt-ra-left,\r\nhtml.light #cgpt-ra-right,\r\nhtml.light #cgpt-ra-floating-toggle,\r\n[data-theme='light'] #cgpt-ra-left,\r\n[data-theme='light'] #cgpt-ra-right,\r\n[data-theme='light'] #cgpt-ra-floating-toggle {\r\n    --cgpt-ra-bg: var(--main-surface-primary, var(--bg-primary, #ffffff));\r\n    --cgpt-ra-bg-surface: var(--main-surface-secondary, var(--bg-secondary, #f9f9f9));\r\n    --cgpt-ra-bg-surface-hover: var(--interactive-bg-secondary-hover, rgba(0, 0, 0, .07));\r\n    --cgpt-ra-border: var(--border-default, rgba(0, 0, 0, .12));\r\n    --cgpt-ra-border-light: var(--border-extra-light, rgba(0, 0, 0, .08));\r\n    --cgpt-ra-text: var(--text-primary, #0d0d0d);\r\n    --cgpt-ra-muted: var(--text-tertiary, #5d5d5d);\r\n    --cgpt-ra-disabled: var(--border-extra-light, rgba(0, 0, 0, .25));\r\n    --cgpt-ra-accent: var(--theme-submit-btn-bg, var(--interactive-bg-accent-secondary-default, var(--theme-blue-default, #3a83f7)));\r\n    --cgpt-ra-accent-text: var(--theme-submit-btn-text, var(--interactive-label-primary-default, #ffffff));\r\n}\r\n\r\n/*\r\n * ChatGPT defines these theme variables on the [data-chat-theme] subtree.\r\n * Reuse them only on our own elements; no rule here targets native ChatGPT\r\n * controls or writes variables on :root/body.\r\n */\r\n[data-chat-theme='blue'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--blue-theme-submit-btn-bg, #3a83f7);\r\n    --cgpt-ra-accent-text: var(--blue-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='green'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--green-theme-submit-btn-bg, #53b559);\r\n    --cgpt-ra-accent-text: var(--green-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='purple'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--purple-theme-submit-btn-bg, #8952ee);\r\n    --cgpt-ra-accent-text: var(--purple-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='orange'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--orange-theme-submit-btn-bg, #ee7c37);\r\n    --cgpt-ra-accent-text: var(--orange-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='pink'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--pink-theme-submit-btn-bg, #f077af);\r\n    --cgpt-ra-accent-text: var(--pink-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='yellow'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--yellow-theme-submit-btn-bg, #f6c543);\r\n    --cgpt-ra-accent-text: var(--yellow-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n[data-chat-theme='black'] :is(#cgpt-ra-left, #cgpt-ra-right, #cgpt-ra-floating-toggle) {\r\n    --cgpt-ra-accent: var(--black-theme-submit-btn-bg, #000000);\r\n    --cgpt-ra-accent-text: var(--black-theme-submit-btn-text, #ffffff);\r\n}\r\n\r\n#cgpt-ra-left,\r\n#cgpt-ra-right {\r\n    box-sizing: border-box;\r\n    position: fixed;\r\n    z-index: 9999;\r\n    border: 1px solid var(--cgpt-ra-border);\r\n    background: var(--cgpt-ra-bg);\r\n    color: var(--cgpt-ra-text);\r\n    backdrop-filter: blur(20px);\r\n    -webkit-backdrop-filter: blur(20px);\r\n    box-shadow: 0 2px 10px rgba(0, 0, 0, .14);\r\n    opacity: 1 !important;\r\n    transition: opacity .18s ease, transform .18s ease, visibility .18s ease;\r\n}\r\n\r\n/*\r\n * Fused left player layout (Height 48px, Radius 24px)\r\n */\r\n#cgpt-ra-left {\r\n    min-width: 240px;\r\n    max-width: 430px;\r\n    height: 48px;\r\n    display: block;\r\n    padding: 0 14px;\r\n    border-radius: 24px;\r\n    overflow: visible;\r\n}\r\n\r\n/* Transport controls live in the right rail beside speed/volume controls. */\r\n.cgpt-ra-transport-row {\r\n    position: static;\r\n    z-index: auto;\r\n    height: 36px;\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    gap: 2px;\r\n    padding: 0;\r\n    margin: 0;\r\n    border: 0;\r\n    border-radius: 0;\r\n    background: transparent;\r\n    box-shadow: none;\r\n}\r\n\r\n.cgpt-ra-transport-row > * {\r\n    position: relative;\r\n    z-index: 1;\r\n}\r\n\r\n/* Buttons in transport row: 36px size, play button 40px primary */\r\n.cgpt-ra-transport-row .cgpt-ra-icon-btn {\r\n    width: 36px;\r\n    height: 36px;\r\n    flex: 0 0 36px;\r\n    border-radius: 50%;\r\n}\r\n\r\n.cgpt-ra-play {\r\n    width: 40px !important;\r\n    height: 40px !important;\r\n    flex: 0 0 40px !important;\r\n    border-radius: 50% !important;\r\n    background-color: var(--cgpt-ra-accent) !important;\r\n    color: var(--cgpt-ra-accent-text) !important;\r\n    box-shadow: none !important;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n}\r\n\r\n.cgpt-ra-play:hover {\r\n    filter: brightness(1.08);\r\n}\r\n\r\n.cgpt-ra-play svg {\r\n    stroke: currentColor;\r\n    fill: currentColor;\r\n}\r\n\r\n.cgpt-ra-seek10 {\r\n    position: relative;\r\n}\r\n\r\n.cgpt-ra-seek10 .cgpt-ra-lucide {\r\n    width: 22px;\r\n    height: 22px;\r\n}\r\n\r\n.cgpt-ra-seek10 .cgpt-ra-ten {\r\n    position: absolute;\r\n    inset: 0;\r\n    display: grid;\r\n    place-items: center;\r\n    padding-top: 2px;\r\n    font-size: 9px;\r\n    font-weight: 700;\r\n    font-family: system-ui, sans-serif;\r\n    pointer-events: none;\r\n}\r\n\r\n.cgpt-ra-progress-row {\r\n    height: 46px;\r\n    display: grid;\r\n    grid-template-columns: 70px minmax(0, 1fr);\r\n    align-items: center;\r\n    gap: 10px;\r\n    padding: 0;\r\n    margin: 0;\r\n    border: 0;\r\n}\r\n\r\n/* Right rail (Height 48px, Radius 24px) */\r\n#cgpt-ra-right {\r\n    width: max-content;\r\n    min-width: 0;\r\n    height: 48px;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    gap: 4px;\r\n    padding: 5px 8px;\r\n    border-radius: 24px;\r\n    white-space: nowrap;\r\n}\r\n\r\n/* Right rail ordering */\r\n.cgpt-ra-speed-wrap { order: 1; }\r\n.cgpt-ra-volume-wrap { order: 2; }\r\n.cgpt-ra-download { order: 3; margin-left: 2px; }\r\n.cgpt-ra-help-wrap { order: 4; margin-left: 2px; }\r\n.cgpt-ra-collapse-btn { order: 5; margin-left: 4px; }\r\n\r\n/* Floating Mini Toggle Button (shown when collapsed / idle) */\r\n#cgpt-ra-floating-toggle {\r\n    box-sizing: border-box;\r\n    position: fixed;\r\n    z-index: 9999;\r\n    width: 42px;\r\n    height: 42px;\r\n    border-radius: 50%;\r\n    border: 1px solid var(--cgpt-ra-border);\r\n    background: var(--cgpt-ra-bg);\r\n    color: var(--cgpt-ra-text);\r\n    backdrop-filter: blur(16px);\r\n    -webkit-backdrop-filter: blur(16px);\r\n    box-shadow: 0 2px 8px rgba(0, 0, 0, .14);\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    cursor: pointer;\r\n    padding: 0;\r\n    transition: transform .15s ease, background .15s ease, opacity .15s ease;\r\n}\r\n\r\n#cgpt-ra-floating-toggle:hover {\r\n    transform: scale(1.08);\r\n    border-color: var(--cgpt-ra-accent);\r\n}\r\n\r\n#cgpt-ra-floating-toggle img,\r\n#cgpt-ra-floating-toggle svg {\r\n    width: 24px;\r\n    height: 24px;\r\n    display: block;\r\n}\r\n\r\n#cgpt-ra-floating-toggle.cgpt-ra-hidden {\r\n    display: none !important;\r\n}\r\n\r\n#cgpt-ra-left.cgpt-ra-collapsed,\r\n#cgpt-ra-right.cgpt-ra-collapsed {\r\n    opacity: 0 !important;\r\n    visibility: hidden !important;\r\n    pointer-events: none !important;\r\n    transform: scale(0.95);\r\n}\r\n\r\n/* Disabled controls */\r\n#cgpt-ra-left.cgpt-ra-compact {\r\n    min-width: 0;\r\n    box-sizing: border-box;\r\n    border-radius: 24px;\r\n}\r\n#cgpt-ra-right.cgpt-ra-compact {\r\n    min-width: 0;\r\n    box-sizing: border-box;\r\n    height: auto;\r\n    min-height: 48px;\r\n    flex-wrap: wrap;\r\n    justify-content: center;\r\n    border-radius: 24px;\r\n    padding: 5px;\r\n}\r\n#cgpt-ra-status {\r\n    position: fixed;\r\n    z-index: 10001;\r\n    bottom: 16px;\r\n    left: 50%;\r\n    transform: translateX(-50%);\r\n    max-width: min(540px, calc(100vw - 32px));\r\n    padding: 12px 16px;\r\n    border-radius: 10px;\r\n    background: #202938;\r\n    color: #fff;\r\n    box-shadow: 0 2px 12px #0004;\r\n    font: 14px/1.5 system-ui, sans-serif;\r\n}\r\n#cgpt-ra-status[hidden] { display: none; }\r\n\r\n#cgpt-ra-left.cgpt-ra-no-media .cgpt-ra-media-control,\r\n#cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-media-control,\r\n#cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-volume-popover,\r\n#cgpt-ra-right.cgpt-ra-no-media .cgpt-ra-speed-menu {\r\n    pointer-events: none !important;\r\n}\r\n\r\n.cgpt-ra-icon-btn {\r\n    position: relative;\r\n    width: 36px;\r\n    height: 36px;\r\n    flex: 0 0 36px;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    border: 0;\r\n    border-radius: 50%;\r\n    background: transparent;\r\n    color: inherit;\r\n    cursor: pointer;\r\n    padding: 0;\r\n    font-size: 17px;\r\n    transition: background .12s ease, opacity .12s ease;\r\n}\r\n\r\n.cgpt-ra-icon-btn:hover {\r\n    background: var(--cgpt-ra-bg-surface-hover);\r\n}\r\n\r\n.cgpt-ra-icon-btn:disabled {\r\n    opacity: 0.38;\r\n    cursor: default;\r\n    background: transparent;\r\n}\r\n\r\n.cgpt-ra-lucide {\r\n    display: block;\r\n    width: 19px;\r\n    height: 19px;\r\n    flex: 0 0 19px;\r\n    overflow: visible;\r\n    pointer-events: none;\r\n}\r\n\r\n.cgpt-ra-icon-btn svg {\r\n    stroke: currentColor;\r\n}\r\n\r\n.cgpt-ra-time {\r\n    min-width: 0;\r\n    color: var(--cgpt-ra-muted);\r\n    font-size: 10.5px;\r\n    line-height: 1;\r\n    font-variant-numeric: tabular-nums;\r\n    white-space: nowrap;\r\n    text-align: left;\r\n}\r\n\r\n.cgpt-ra-seek-wrap {\r\n    min-width: 0;\r\n    display: flex;\r\n    align-items: center;\r\n    padding: 0;\r\n}\r\n\r\n/*\r\n * Sleek seeker range track:\r\n * - 2px visual track normally\r\n * - 4px track on hover / focus\r\n */\r\n.cgpt-ra-range {\r\n    -webkit-appearance: none;\r\n    appearance: none;\r\n    width: 100%;\r\n    height: 18px;\r\n    margin: 0;\r\n    padding: 0;\r\n    border: 0;\r\n    outline: 0;\r\n    cursor: pointer;\r\n    color: var(--cgpt-ra-text);\r\n    background: transparent;\r\n}\r\n\r\n.cgpt-ra-range::-webkit-slider-runnable-track {\r\n    height: 2px;\r\n    border: 0;\r\n    border-radius: 999px;\r\n    background: var(--cgpt-ra-border);\r\n    transition: height .12s ease, background .12s ease;\r\n}\r\n\r\n.cgpt-ra-range:hover::-webkit-slider-runnable-track,\r\n.cgpt-ra-range:focus-visible::-webkit-slider-runnable-track {\r\n    height: 4px;\r\n    background: var(--cgpt-ra-accent);\r\n}\r\n\r\n.cgpt-ra-range::-webkit-slider-thumb {\r\n    -webkit-appearance: none;\r\n    appearance: none;\r\n    width: 10px;\r\n    height: 10px;\r\n    margin-top: -4px;\r\n    border: 0;\r\n    border-radius: 50%;\r\n    background: var(--cgpt-ra-text);\r\n    box-shadow: 0 0 0 1px var(--cgpt-ra-bg);\r\n    transition: width .12s ease, height .12s ease, margin-top .12s ease;\r\n}\r\n\r\n.cgpt-ra-range:hover::-webkit-slider-thumb,\r\n.cgpt-ra-range:focus-visible::-webkit-slider-thumb {\r\n    width: 11px;\r\n    height: 11px;\r\n    margin-top: -3.5px;\r\n    background: var(--cgpt-ra-accent);\r\n}\r\n\r\n.cgpt-ra-range::-moz-range-track {\r\n    height: 2px;\r\n    border: 0;\r\n    border-radius: 999px;\r\n    background: var(--cgpt-ra-border);\r\n    transition: height .12s ease, background .12s ease;\r\n}\r\n\r\n.cgpt-ra-range:hover::-moz-range-track,\r\n.cgpt-ra-range:focus-visible::-moz-range-track {\r\n    height: 4px;\r\n    background: var(--cgpt-ra-accent);\r\n}\r\n\r\n.cgpt-ra-range::-moz-range-progress {\r\n    height: 2px;\r\n    border: 0;\r\n    border-radius: 999px;\r\n    background: var(--cgpt-ra-accent);\r\n}\r\n\r\n.cgpt-ra-range::-moz-range-thumb {\r\n    width: 10px;\r\n    height: 10px;\r\n    border: 0;\r\n    border-radius: 50%;\r\n    background: var(--cgpt-ra-text);\r\n}\r\n\r\n.cgpt-ra-range:disabled {\r\n    opacity: .35;\r\n    cursor: default;\r\n}\r\n\r\n.cgpt-ra-speed-wrap,\r\n.cgpt-ra-volume-wrap,\r\n.cgpt-ra-help-wrap {\r\n    position: relative;\r\n}\r\n\r\n.cgpt-ra-speed-btn {\r\n    width: auto;\r\n    min-width: 48px;\r\n    height: 36px;\r\n    padding: 0 10px;\r\n    border-radius: 18px;\r\n    font-size: 12.5px;\r\n    font-weight: 600;\r\n    font-family: system-ui, sans-serif;\r\n}\r\n\r\n.cgpt-ra-popover {\r\n    position: absolute;\r\n    right: 0;\r\n    bottom: calc(100% + 9px);\r\n    display: none;\r\n    border: 1px solid var(--cgpt-ra-border);\r\n    border-radius: 12px;\r\n    background: var(--cgpt-ra-bg-surface);\r\n    color: var(--cgpt-ra-text);\r\n    box-shadow: 0 4px 16px rgba(0, 0, 0, .18);\r\n    overflow: hidden;\r\n    z-index: 10002;\r\n}\r\n\r\n.cgpt-ra-speed-wrap.cgpt-open .cgpt-ra-popover,\r\n.cgpt-ra-help-wrap:hover .cgpt-ra-popover,\r\n.cgpt-ra-help-wrap:focus-within .cgpt-ra-popover {\r\n    display: block;\r\n}\r\n\r\n.cgpt-ra-speed-menu {\r\n    min-width: 90px;\r\n    padding: 5px;\r\n}\r\n\r\n.cgpt-ra-speed-option {\r\n    width: 100%;\r\n    height: 30px;\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    border: 0;\r\n    border-radius: 7px;\r\n    background: transparent;\r\n    color: inherit;\r\n    cursor: pointer;\r\n    font-size: 12px;\r\n}\r\n\r\n.cgpt-ra-speed-option:hover,\r\n.cgpt-ra-speed-option.cgpt-selected {\r\n    background: var(--cgpt-ra-bg-surface-hover);\r\n}\r\n\r\n/* Vertical Volume Popover */\r\n.cgpt-ra-volume-popover {\r\n    position: absolute;\r\n    left: 50%;\r\n    bottom: calc(100% + 6px);\r\n    transform: translateX(-50%);\r\n    width: 44px;\r\n    height: 165px;\r\n    display: flex;\r\n    opacity: 0;\r\n    visibility: hidden;\r\n    pointer-events: none;\r\n    flex-direction: column;\r\n    align-items: center;\r\n    justify-content: flex-start;\r\n    gap: 0;\r\n    padding: 6px 5px 6px;\r\n    border: 1px solid var(--cgpt-ra-border);\r\n    border-radius: 22px;\r\n    background: var(--cgpt-ra-bg-surface);\r\n    color: var(--cgpt-ra-text);\r\n    box-shadow: 0 4px 16px rgba(0, 0, 0, .18);\r\n    transition: opacity .12s ease, visibility .12s ease;\r\n    z-index: 10002;\r\n}\r\n\r\n.cgpt-ra-volume-wrap:hover .cgpt-ra-volume-popover,\r\n.cgpt-ra-volume-wrap:focus-within .cgpt-ra-volume-popover {\r\n    opacity: 1;\r\n    visibility: visible;\r\n    pointer-events: auto;\r\n}\r\n\r\n.cgpt-ra-volume-popover input[type=\"range\"] {\r\n    position: absolute;\r\n    top: 56px;\r\n    left: 50%;\r\n    width: 96px;\r\n    height: 18px;\r\n    margin: 0;\r\n    transform: translate(-50%, -50%) rotate(-90deg);\r\n    cursor: pointer;\r\n}\r\n\r\n.cgpt-ra-volume-value {\r\n    position: absolute;\r\n    left: 4px;\r\n    right: 4px;\r\n    bottom: 6px;\r\n    height: 24px;\r\n    display: flex;\r\n    align-items: center;\r\n    justify-content: center;\r\n    border-top: 1px solid var(--cgpt-ra-border);\r\n    font-size: 9.5px;\r\n    font-weight: 600;\r\n    font-family: system-ui, sans-serif;\r\n    line-height: 1;\r\n    color: inherit;\r\n    opacity: .80;\r\n    text-align: center;\r\n}\r\n\r\n.cgpt-ra-help {\r\n    width: 300px;\r\n    padding: 12px 14px;\r\n    font-family: system-ui, sans-serif;\r\n}\r\n\r\n.cgpt-ra-help-title {\r\n    margin-bottom: 8px;\r\n    font-size: 12px;\r\n    font-weight: 700;\r\n}\r\n\r\n.cgpt-ra-shortcut-row {\r\n    display: flex;\r\n    justify-content: space-between;\r\n    gap: 20px;\r\n    padding: 4px 0;\r\n    font-size: 11px;\r\n}\r\n\r\n.cgpt-ra-shortcut-key {\r\n    color: inherit;\r\n    opacity: .65;\r\n    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;\r\n    white-space: nowrap;\r\n}\r\n\r\n.cgpt-ra-download-busy svg {\r\n    animation: cgpt-ra-spin .8s linear infinite;\r\n}\r\n\r\n@keyframes cgpt-ra-spin {\r\n    to { transform: rotate(360deg); }\r\n}\r\n/* Keep Pause available while a retained source is loading. */\r\n.cgpt-ra-buffering { outline: 2px dotted currentColor !important; outline-offset: -3px; }\r\n"; document.documentElement.append(style); }

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
          ${lucideIcon("rotate-ccw")}
          <span class="cgpt-ra-ten">10</span>
        </button>

        <button class="cgpt-ra-icon-btn cgpt-ra-play cgpt-ra-media-control"
                title="Play / Pause (Space or K; Alt+P legacy)" disabled>
          ${lucideIcon("play")}
        </button>

        <button class="cgpt-ra-icon-btn cgpt-ra-seek10 cgpt-ra-forward cgpt-ra-media-control"
                title="Forward 10 seconds — hold to scrub" disabled>
          ${lucideIcon("rotate-cw")}
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
        ${lucideIcon("minimize-2")}
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

    installHoldSeek(rightRail.querySelector(".cgpt-ra-back"), -1);
    installHoldSeek(rightRail.querySelector(".cgpt-ra-forward"), 1);

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
    syncComposerLayout();
  }

  function setControlsEnabled(enabled) {
    if (!leftRail || !rightRail || cache.controlsEnabled === enabled) return;
    cache.controlsEnabled = enabled;

    leftRail.classList.toggle("cgpt-ra-no-media", !enabled);
    rightRail.classList.toggle("cgpt-ra-no-media", !enabled);

    leftRail.querySelectorAll("button, input").forEach((el) => {
      el.disabled = !enabled;
    });

    rightRail
      .querySelectorAll(
        ".cgpt-ra-transport-row button, .cgpt-ra-speed-btn, .cgpt-ra-volume-btn, .cgpt-ra-volume-slider, .cgpt-ra-download",
      )
      .forEach((el) => {
        el.disabled = !enabled;
      });

    const helpButton = rightRail.querySelector(".cgpt-ra-help-wrap > button");
    if (helpButton) helpButton.disabled = false;

    if (collapseButton) collapseButton.disabled = false;
  }

  let layoutRaf = null;
  function scheduleLayoutSync() {
    if (layoutRaf) return;
    layoutRaf = requestAnimationFrame(() => {
      layoutRaf = null;
      syncComposerLayout();
    });
  }

  function getComposer() {
  const candidates = document.querySelectorAll('[data-chatgpt-composer], [data-type="unified-composer"]');
  const composer = Array.from(candidates).find((el) => el.getBoundingClientRect().height > 0 && el.querySelector('[data-composer-markdown], #prompt-textarea, [data-testid="composer-text-input"]'));
  if (composer)
    return composer;
  const prompt = document.querySelector('#prompt-textarea, [data-testid="composer-text-input"], textarea[placeholder*="Ask"]');
  return prompt?.closest("form") || prompt?.parentElement || null;
}


  function syncComposerLayout() {
  if (!leftRail || !rightRail || !floatingToggle)
    return;
  if (location.pathname !== conversationPath) {
    conversationPath = location.pathname;
    playback.dispose();
    activeMedia = null;
    userForcedExpand = false;
    streamingAudio.clearExcept();
    blobURLMap.clear();
    blobURLBytes = 0;
    updateControls();
  }
  const composer = getComposer();
  if (composer !== observedComposer) {
    composerObserver.disconnect();
    composerAttributes.disconnect();
    observedComposer = composer;
    for (let parent = composer;parent; parent = parent.parentElement) {
      composerObserver.observe(parent);
      composerAttributes.observe(parent, { attributes: true, attributeFilter: ["class", "style", "hidden", "data-state"] });
    }
  }
  const settings = getSavedSettings();
  const hasSession = Boolean(activeMedia && !activeMedia.ended);
  const shouldExpand = !userForcedCollapsed && (hasSession || userForcedExpand);
  const visible = floatingVisibility(Boolean(settings.floatingUiHidden), settings.floatingUiHideMode || "idle-only", hasSession, shouldExpand);
  leftRail.classList.toggle("cgpt-ra-collapsed", !visible.player);
  rightRail.classList.toggle("cgpt-ra-collapsed", !visible.player);
  floatingToggle.classList.toggle("cgpt-ra-hidden", !visible.launcher);
  cache.isCollapsed = !visible.player;
  cache.floatingHidden = !visible.launcher;
  const viewportWidth = window.innerWidth;
  const rect = composer?.getBoundingClientRect() || { left: 16, right: viewportWidth - 16, top: window.innerHeight - 72, height: 48 };
  floatingToggle.style.left = `${Math.round(Math.max(8, Math.min(viewportWidth - 52, rect.right + 12)))}px`;
  floatingToggle.style.top = `${Math.round(Math.max(8, Math.min(window.innerHeight - 52, rect.top + rect.height / 2 - 21)))}px`;
  floatingToggle.style.right = "";
  floatingToggle.style.bottom = "";
  const sideGap = 10, outerMargin = 14, minLeftWidth = 240, maxLeftWidth = 430;
  const leftAvailable = rect.left - outerMargin - sideGap;
  const rightAvailable = viewportWidth - rect.right - outerMargin - sideGap;
  rightRail.style.width = "";
  const railWidth = rightRail.scrollWidth + 2;
  const compact = leftAvailable < minLeftWidth || rightAvailable < railWidth;
  leftRail.classList.toggle("cgpt-ra-compact", compact);
  rightRail.classList.toggle("cgpt-ra-compact", compact);
  if (!visible.player)
    return;
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
  rightRail.style.width = "";
  const computedLeftWidth = `${Math.round(clamp(leftAvailable, minLeftWidth, maxLeftWidth))}px`;
  const leftX = `${Math.round(rect.left - sideGap - parseFloat(computedLeftWidth))}px`;
  const leftY = `${Math.round(rect.top + rect.height / 2 - 24)}px`;
  const rightX = `${Math.round(rect.right + sideGap)}px`;
  if (leftRail.style.width !== computedLeftWidth)
    leftRail.style.width = computedLeftWidth;
  if (leftRail.style.left !== leftX)
    leftRail.style.left = leftX;
  if (leftRail.style.top !== leftY)
    leftRail.style.top = leftY;
  if (rightRail.style.left !== rightX)
    rightRail.style.left = rightX;
  if (rightRail.style.top !== leftY)
    rightRail.style.top = leftY;
}





  function installHoldSeek(button, direction) {
    if (!button) return;

    let holding = false;
    let holdStarted = 0;
    let lastFrame = 0;
    let becameHold = false;
    let raf = null;
    let pointerId = null;

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
      pointerId = event.pointerId;
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
      if (event?.pointerId !== undefined && event.pointerId !== pointerId) return;
      holding = false;

      if (raf) cancelAnimationFrame(raf);

      if (!becameHold) {
        seekRelative(direction * CONFIG.tapSeekSeconds);
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

  function seekAbsolute(target, update = true) {
  if (!activeMedia)
    return;
  const info = getSeekInfo(activeMedia);
  if (!info.seekable)
    return;
  target = clamp(target, info.start, info.end);
  try {
    playback.seek(target);
  } catch (error) {
    warn("Seek failed:", error);
  }
  if (update)
    updateControls();
}


  function seekRelative(seconds, update = true) {
  if (!activeMedia)
    return;
  seekAbsolute(playback.time + seconds, update);
}


  function togglePlayback() {
  playback.toggle();
  updateControls();
  broadcastLiveAudioState(true);
  scheduleLayoutSync();
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
    broadcastLiveAudioState(true);
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
    broadcastLiveAudioState(true);
  }

  function updateControls() {
  if (!leftRail || !rightRail)
    return;
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
  const durationNum = Number.isFinite(playback.duration) ? playback.duration : info.seekable ? info.end : 0;
  const formattedDur = durationNum > 0 ? formatTime(durationNum) : "--:--";
  if (durationLabel && cache.durationStr !== formattedDur) {
    cache.durationStr = formattedDur;
    durationLabel.textContent = formattedDur;
  }
  if (seekSlider) {
    if (info.seekable) {
      if (seekSlider.disabled)
        seekSlider.disabled = false;
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
  playButton?.setAttribute("aria-busy", String(playback.loading));
  playButton?.classList.toggle("cgpt-ra-buffering", playback.loading);
  if (playButton) {
    playButton.dataset.defaultTitle ||= playButton.title;
    playButton.title = playback.loading ? recoveryCopy().pending : playButton.dataset.defaultTitle;
    playButton.setAttribute("aria-label", playButton.title);
  }
  if (cache.isPaused !== isPaused) {
    cache.isPaused = isPaused;
    setIcon(playButton, isPaused ? "play" : "pause");
  }
  const speed = activeMedia.playbackRate || getSavedSpeed();
  if (cache.speed !== speed) {
    cache.speed = speed;
    if (speedButton)
      speedButton.textContent = `${speed}×`;
    speedMenu?.querySelectorAll(".cgpt-ra-speed-option").forEach((item) => {
      item.classList.toggle("cgpt-selected", Math.abs(parseFloat(item.dataset.speed || "0") - speed) < 0.001);
    });
  }
  const volume = activeMedia.volume;
  const isMuted = activeMedia.muted || volume <= 0;
  if (cache.volume !== volume || cache.isMuted !== isMuted) {
    cache.volume = volume;
    cache.isMuted = isMuted;
    if (volumeSlider)
      volumeSlider.value = String(volume);
    if (volumeLabel)
      volumeLabel.textContent = `${Math.round(volume * 100)}%`;
    const volumeButton = rightRail.querySelector(".cgpt-ra-volume-btn");
    if (isMuted) {
      setIcon(volumeButton, "volume-x");
    } else if (volume < 0.5) {
      setIcon(volumeButton, "volume-1");
    } else {
      setIcon(volumeButton, "volume-2");
    }
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
  const blob = await playback.blob();
  return { blob, mime: blob.type, url: activeMedia?.currentSrc || activeMedia?.src || "" };
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

    // ---------------------------------------------------------------------
  // Shortcuts
  // ---------------------------------------------------------------------

  window.addEventListener(
    "keydown",
    (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;

      if (
        target?.matches("input, textarea, select, [contenteditable='true']") ||
        target?.isContentEditable ||
        target?.closest("button, a, input, textarea, select, [role='button']")
      ) {
        return;
      }

      if (!activeMedia) return;

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
  // DOM Observer & Poller (Zero Thrashing)
  // ---------------------------------------------------------------------

  function scanDOMForPlayingMedia() {
    document.querySelectorAll("audio, video").forEach((media) => {
      if (!media.paused && !media.ended && isReadAloudMedia(media)) {
        attachMedia(media, "DOM fallback");
      }
    });
  }

  let observerTimeout = null;
  function startObserver() {
    const observer = new MutationObserver(() => {
      if (observerTimeout) return;
      observerTimeout = setTimeout(() => {
        observerTimeout = null;
        scheduleLayoutSync();
      }, 250);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", scheduleLayoutSync, { passive: true });
window.visualViewport?.addEventListener('resize', scheduleLayoutSync, { passive: true });
window.visualViewport?.addEventListener('scroll', scheduleLayoutSync, { passive: true });
    window.addEventListener("scroll", scheduleLayoutSync, { passive: true });

    setInterval(() => {
      const scan = () => {
        scanDOMForPlayingMedia();
        scheduleLayoutSync();
      };

      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(scan, { timeout: 2000 });
      } else {
        window.setTimeout(scan, 0);
      }
    }, 5000);
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  function installEarlyHooks() {
  installStreamingInterceptor();
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
    startObserver();

    log("ChatGPT Audio Controls Userscript Ready");
  }

  installEarlyHooks();
  initUI();
})();
