// A native pause can destroy ChatGPT's audio element. Own the paused session
// before dispatching that event; never reuse a payload from another response.
export class PlaybackSession {
  media: HTMLMediaElement | null = null;
  private host: HTMLMediaElement | null = null;
  private owned: HTMLAudioElement | null = null;
  private source = '';
  private objectURL = '';
  private generation = 0;
  private pending: Promise<void> | null = null;
  private payload: Promise<Blob> | null = null;
  private controller: AbortController | null = null;
  private wantsPlay = false;
  private savedTime = 0;
  private savedDuration = 0;
  private ready = false;
  private advancing = false;
  private playAnchor = 0;
  private playTimer: ReturnType<typeof setTimeout> | undefined;
  private playAttempt = 0;

  constructor(
    private retain: (source: string, signal: AbortSignal) => Promise<Blob>,
    private changed: (media: HTMLMediaElement | null) => void,
    private failed: () => void,
  ) {}

  isOwned(media: HTMLMediaElement): boolean { return media === this.owned; }
  get url(): string { return this.source; }
  get time(): number { return this.owned && !this.ready ? this.savedTime : this.media?.currentTime || 0; }
  get duration(): number { return this.owned && !this.ready ? this.savedDuration : this.media?.duration || 0; }
  get loading(): boolean { return this.wantsPlay && (!this.advancing || Boolean(this.pending)); }
  get playing(): boolean { return this.advancing && Boolean(this.media && !this.media.paused && !this.media.ended); }
  get paused(): boolean { return !this.wantsPlay; }

  attach(media: HTMLMediaElement): void {
    if (this.isOwned(media)) return;
    // currentSrc may still identify the previous response until resource selection.
    const source = media.src || media.currentSrc;
    if (this.host === media && this.source === source && !this.owned) return;
    this.dispose(media);
    this.host = this.media = media;
    this.source = source;
    this.wantsPlay = true;
    this.controller = new AbortController();
    this.watch(media);
    this.payload = this.retain(source, this.controller.signal);
    // Retention failure is surfaced when recovery/download actually needs it.
    void this.payload.catch(() => {});
  }

  private watch(media: HTMLMediaElement): void {
    const generation = this.generation;
    const current = () => generation === this.generation && media === this.media;
    const signal = this.controller?.signal;
    for (const name of ['play', 'pause', 'ended', 'waiting', 'timeupdate']) {
      media.addEventListener(name, () => {
        if (!current()) return;
        if (name === 'play' || name === 'waiting') {
          if (media.paused) return;
          this.advancing = false;
          this.playAnchor = media.currentTime;
          this.wantsPlay = true;
        } else if (name === 'pause' || name === 'ended') {
          // A queued pause event may arrive after another play() request.
          if (media.paused) this.wantsPlay = this.advancing = false;
        } else if (!media.paused && media.currentTime > this.playAnchor) {
          this.advancing = true;
          clearTimeout(this.playTimer);
        }
        this.changed(media);
      }, { signal });
    }
  }

  async blob(): Promise<Blob> {
    if (!this.payload) throw new Error('No active audio source');
    return this.payload;
  }

  seek(time: number): void {
    this.savedTime = time;
    if (this.media && (!this.owned || this.ready)) this.media.currentTime = time;
  }

  toggle(): void {
    if (!this.media) return;
    const attempt = ++this.playAttempt;
    if (this.owned) {
      this.wantsPlay = !this.wantsPlay;
      if (!this.wantsPlay) { this.advancing = false; clearTimeout(this.playTimer); this.media.pause(); }
      else if (!this.pending) {
        if (!this.ready) this.prepare();
        else this.playOwned();
      }
      return;
    }
    if (!this.wantsPlay) {
      this.wantsPlay = true;
      const generation = this.generation;
      void this.media.play().catch(() => {
        if (generation === this.generation && attempt === this.playAttempt) {
          this.wantsPlay = false; this.failed(); this.changed(this.media);
        }
      });
      return;
    }
    const host = this.media;
    this.savedTime = host.currentTime || 0;
    this.savedDuration = Number.isFinite(host.duration) ? host.duration : 0;
    if (!this.savedDuration && host.buffered?.length) this.savedDuration = host.buffered.end(host.buffered.length - 1);
    const owned = new Audio();
    owned.preload = 'auto';
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
    // Retain the source and switch active media BEFORE the host's pause handler.
    host.pause();
    this.prepare();
  }

  private prepare(): void {
    const owned = this.owned;
    if (!owned || this.pending) return;
    const generation = this.generation;
    const signal = this.controller!.signal;
    const current = () => this.generation === generation && this.owned === owned;
    this.pending = (async () => {
      try {
        const blob = await new Promise<Blob>((resolve, reject) => {
          const aborted = () => finish(new Error('Session replaced'));
          const timer = setTimeout(() => finish(new Error('Audio retention timed out')), 60000);
          const finish = (error?: Error, blob?: Blob) => {
            clearTimeout(timer); signal.removeEventListener('abort', aborted);
            error ? reject(error) : resolve(blob!);
          };
          signal.addEventListener('abort', aborted, { once: true });
          void this.blob().then(blob => finish(undefined, blob), error => finish(error));
        });
        if (!current()) return;
        if (this.objectURL) URL.revokeObjectURL(this.objectURL);
        this.objectURL = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => finish(new Error('Audio load timed out')), 15000);
          const finish = (error?: Error) => {
            clearTimeout(timer);
            owned.removeEventListener('loadedmetadata', loaded);
            owned.removeEventListener('error', failed);
            signal.removeEventListener('abort', aborted);
            error ? reject(error) : resolve();
          };
          const loaded = () => finish();
          const failed = () => finish(new Error('Audio load failed'));
          const aborted = () => finish(new Error('Session replaced'));
          owned.addEventListener('loadedmetadata', loaded, { once: true });
          owned.addEventListener('error', failed, { once: true });
          signal.addEventListener('abort', aborted, { once: true });
          owned.src = this.objectURL;
          owned.load();
        });
        if (!current()) return;
        owned.currentTime = Math.min(this.savedTime, Number.isFinite(owned.duration) ? owned.duration : this.savedTime);
        this.ready = true;
        if (this.wantsPlay) this.playOwned();
      } catch {
        if (current()) { this.wantsPlay = false; this.failed(); }
      } finally {
        if (current()) { this.pending = null; this.changed(owned); }
      }
    })();
  }

  private playOwned(): void {
    const owned = this.owned, generation = this.generation, attempt = this.playAttempt;
    if (!owned) return;
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
    void owned.play().catch(() => {
      if (generation === this.generation && attempt === this.playAttempt && this.wantsPlay) {
        clearTimeout(this.playTimer);
        this.wantsPlay = false;
        this.failed();
        this.changed(owned);
      }
    });
  }

  dispose(next?: HTMLMediaElement): void {
    this.generation++;
    this.playAttempt++;
    clearTimeout(this.playTimer);
    this.controller?.abort();
    this.controller = null;
    const media = this.media;
    this.media = this.host = null;
    if (media && media !== next) media.pause();
    if (this.owned) { this.owned.removeAttribute('src'); this.owned.load(); }
    if (this.objectURL) URL.revokeObjectURL(this.objectURL);
    this.owned = null;
    this.objectURL = this.source = '';
    this.pending = this.payload = null;
    this.ready = this.wantsPlay = this.advancing = false;
    this.savedTime = this.savedDuration = 0;
  }
}
