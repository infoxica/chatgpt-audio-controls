// MediaSource URLs are not fetchable. Retain the HTTP payload belonging to the
// stream instead, before ChatGPT aborts its reader and clears the source on pause.
type AudioRequest = {
  controller: AbortController;
  retentionController: AbortController;
  hostSignal?: AbortSignal;
  timer?: ReturnType<typeof setTimeout>;
  capturing: boolean;
  promise: Promise<Blob>;
  resolve: (blob: Blob) => void;
  reject: (error: unknown) => void;
  claimed: boolean;
};
type AudioStream = {
  request?: AudioRequest;
  candidates: AudioRequest[];
  prefix: Uint8Array;
  promise: Promise<Blob>;
  resolve: (blob: Blob) => void;
  reject: (error: unknown) => void;
  settled: boolean;
  active: boolean;
};

export class StreamingAudioCapture {
  private requests = new Set<AudioRequest>();
  private sources = new Map<object, AudioStream>();
  private urls = new Map<string, AudioStream>();
  private buffers = new WeakMap<object, AudioStream>();

  begin(hostSignal?: AbortSignal): AudioRequest {
    let resolve!: AudioRequest['resolve'], reject!: AudioRequest['reject'];
    const promise = new Promise<Blob>((yes, no) => { resolve = yes; reject = no; });
    void promise.catch(() => {});
    const controller = new AbortController();
    const request: AudioRequest = { controller, retentionController: new AbortController(), hostSignal,
      promise, resolve, reject, claimed: false, capturing: true };
    this.requests.add(request);
    this.progress(request);
    const waiting = [...this.sources.values()].filter(stream => !stream.request && !stream.settled);
    for (const stream of waiting) stream.candidates.push(request);
    const active = waiting.filter(stream => stream.active);
    if (active.length === 1 && active[0].candidates.length === 1) this.bind(active[0], request);
    // Bound unclaimed capture jobs as well as each response's byte count.
    while (this.requests.size > 4) {
      const oldest = [...this.requests].find(request => !request.claimed) || this.requests.values().next().value!;
      this.releaseRequest(oldest);
    }
    return request;
  }

  complete(request: AudioRequest, payload: Promise<Blob>): void {
    void payload.then(blob => {
      if (!request.capturing) return;
      request.capturing = false; clearTimeout(request.timer); request.resolve(blob);
    }, error => this.failCapture(request, error));
  }

  progress(request: AudioRequest): void {
    if (!request.capturing) return;
    clearTimeout(request.timer);
    // Bound inactivity, not total synthesis time. Expiring the optional clone
    // must never abort the response that ChatGPT is still consuming.
    request.timer = setTimeout(() => this.failCapture(request, new Error('Audio capture timed out')), 60000);
  }

  private failCapture(request: AudioRequest, error: unknown): void {
    if (!request.capturing) return;
    request.capturing = false; clearTimeout(request.timer);
    request.retentionController.abort(error); request.reject(error); this.requests.delete(request);
    // Retention no longer needs to outlive a native pause/cancel. Restore the
    // caller's cancellation semantics, including an abort that already happened.
    const host = request.hostSignal;
    if (host) {
      const abort = () => request.controller.abort(host.reason);
      if (host.aborted) abort();
      else host.addEventListener('abort', abort, { once: true, signal: request.controller.signal });
    }
  }

  register(source: object, url: string): void {
    let resolve!: AudioStream['resolve'], reject!: AudioStream['reject'];
    const promise = new Promise<Blob>((yes, no) => { resolve = yes; reject = no; });
    void promise.catch(() => {});
    const candidates = [...this.requests].filter(request => !request.claimed);
    const stream: AudioStream = { candidates, prefix: new Uint8Array(), promise, resolve, reject, settled: false, active: false };
    this.sources.set(source, stream); this.urls.set(url, stream);
    while (this.sources.size > 8) {
      const oldest = [...this.sources].find(([, value]) => !value.active);
      if (!oldest) break;
      oldest[1].settled = true; oldest[1].reject(new Error('Unused stream replaced')); this.sources.delete(oldest[0]);
      for (const [key, value] of this.urls) if (value === oldest[1]) this.urls.delete(key);
    }
  }

  addBuffer(source: object, buffer: object): void {
    const stream = this.sources.get(source);
    if (stream) this.buffers.set(buffer, stream);
  }

  append(buffer: object, data: ArrayBuffer | ArrayBufferView): void {
    const stream = this.buffers.get(buffer);
    if (!stream || stream.prefix.length >= 4096) return;
    const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
    const length = Math.min(bytes.length, 4096 - stream.prefix.length);
    const prefix = new Uint8Array(stream.prefix.length + length);
    prefix.set(stream.prefix); prefix.set(bytes.subarray(0, length), stream.prefix.length); stream.prefix = prefix;
    if (stream.active && !stream.request && prefix.length >= 1024) void this.match(stream);
  }

  private async match(stream: AudioStream): Promise<void> {
    const matches = await Promise.all(stream.candidates.map(async request => {
      try { return await this.matches(stream.prefix, await request.promise) ? request : undefined; } catch { return undefined; }
    }));
    const eligible = matches.filter(Boolean) as AudioRequest[];
    if (!stream.settled && eligible.length === 1 && !stream.request && !eligible[0].claimed) this.bind(stream, eligible[0]);
  }

  private async matches(prefix: Uint8Array, blob: Blob): Promise<boolean> {
    const bytes = new Uint8Array(await blob.slice(0, prefix.length).arrayBuffer());
    return bytes.length === prefix.length && bytes.every((byte, index) => byte === prefix[index]);
  }

  private bind(stream: AudioStream, request: AudioRequest): void {
    stream.request = request; request.claimed = true;
    void request.promise.then(async blob => {
      if (stream.settled) return;
      if (stream.prefix.length && !await this.matches(stream.prefix, blob)) throw new Error('Audio stream mismatch');
      stream.settled = true; stream.resolve(blob);
    }).catch(error => { stream.settled = true; stream.reject(error); });
  }

  has(url: string): boolean { return this.urls.has(url); }
  retain(url: string): Promise<Blob> | undefined {
    const stream = this.urls.get(url);
    if (!stream) return;
    stream.active = true;
    // Associate only when an AUDIO element starts this source. Unrelated video
    // MediaSources cannot claim a speech request. Concurrent requests must match
    // source bytes; never fall back to a globally most-recent response.
    if (!stream.request) {
      const eligible = stream.candidates.filter(request => !request.claimed);
      if (eligible.length === 1) this.bind(stream, eligible[0]);
      else if (stream.prefix.length >= 1024) void this.match(stream);
    }
    return stream.promise;
  }

  private releaseRequest(request: AudioRequest): void {
    request.capturing = false; clearTimeout(request.timer);
    const error = new Error('Audio session replaced');
    request.retentionController.abort(error); request.controller.abort(error);
    request.reject(error); this.requests.delete(request);
  }

  clearExcept(url = ''): void {
    const keep = this.urls.get(url);
    for (const request of this.requests) if (request !== keep?.request && !keep?.candidates.includes(request)) this.releaseRequest(request);
    for (const [source, stream] of this.sources) if (stream !== keep) {
      stream.settled = true; stream.reject(new Error('Audio session replaced')); this.sources.delete(source);
    }
    for (const [key, stream] of this.urls) if (stream !== keep) this.urls.delete(key);
  }
}
