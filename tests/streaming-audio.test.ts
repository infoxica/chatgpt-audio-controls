import { expect, test } from 'bun:test';
import { StreamingAudioCapture } from '../src/content/streaming-audio';

function captureClock() {
  const set = globalThis.setTimeout, clear = globalThis.clearTimeout;
  let now = 0, id = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  globalThis.setTimeout = ((run: () => void, delay: number) => {
    timers.set(++id, { at: now + delay, run }); return id;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((key: number) => { timers.delete(key); }) as typeof clearTimeout;
  return {
    advance(ms: number) { now += ms; for (const [key, timer] of timers) if (timer.at <= now) { timers.delete(key); timer.run(); } },
    restore() { globalThis.setTimeout = set; globalThis.clearTimeout = clear; },
  };
}

test('capture expiry cancels only retention and then honors native cancellation', async () => {
  const clock = captureClock();
  try {
    const capture = new StreamingAudioCapture(), host = new AbortController();
    const request = capture.begin(host.signal);
    clock.advance(60000);
    await expect(request.promise).rejects.toThrow('timed out');
    expect(request.retentionController.signal.aborted).toBe(true);
    expect(request.controller.signal.aborted).toBe(false);
    host.abort();
    expect(request.controller.signal.aborted).toBe(true);
  } finally { clock.restore(); }
});

test('advancing capture can exceed one minute; late completion cannot revive expired retention', async () => {
  const clock = captureClock();
  try {
    const capture = new StreamingAudioCapture(), request = capture.begin();
    for (let i=0;i<3;i++) { clock.advance(59000); capture.progress(request); }
    expect(request.retentionController.signal.aborted).toBe(false);
    const blob = new Blob(['complete audio']); capture.complete(request, Promise.resolve(blob));
    expect(await request.promise).toBe(blob);
    clock.advance(60000);
    expect(request.controller.signal.aborted).toBe(false);
    const expired = capture.begin(); clock.advance(60000);
    capture.complete(expired, Promise.resolve(blob));
    await expect(expired.promise).rejects.toThrow('timed out');
    capture.clearExcept();
  } finally { clock.restore(); }
});

test('a native pause retains capture until expiry or explicit session replacement', async () => {
  const clock = captureClock();
  try {
    const capture = new StreamingAudioCapture(), host = new AbortController();
    const request = capture.begin(host.signal); host.abort();
    expect(request.controller.signal.aborted).toBe(false);
    clock.advance(60000);
    expect(request.controller.signal.aborted).toBe(true);
    const next = capture.begin(); capture.clearExcept();
    expect(next.controller.signal.aborted).toBe(true);
    expect(next.retentionController.signal.aborted).toBe(true);
  } finally { clock.restore(); }
});

test('MediaSource retains its request through immediate host cleanup', async () => {
  const capture = new StreamingAudioCapture();
  const request = capture.begin();
  capture.register({}, 'blob:first');
  const retained = capture.retain('blob:first')!;
  const payload = new Blob(['first audio']);
  capture.complete(request, Promise.resolve(payload));
  expect(await retained).toBe(payload);
  capture.clearExcept();
});

test('MediaSource created before fetch binds once and ignores later responses', async () => {
  const capture = new StreamingAudioCapture();
  capture.register({}, 'blob:first');
  const retained = capture.retain('blob:first')!;
  const first = capture.begin(), second = capture.begin();
  capture.complete(second, Promise.resolve(new Blob(['second'])));
  capture.complete(first, Promise.resolve(new Blob(['first'])));
  expect(await (await retained).text()).toBe('first');
  capture.clearExcept();
});

test('concurrent speech requests match stream bytes rather than completion order', async () => {
  const capture = new StreamingAudioCapture();
  const first = capture.begin(), second = capture.begin(), source = {}, buffer = {};
  capture.register(source, 'blob:second'); capture.addBuffer(source, buffer);
  const bytes = new Uint8Array(4096).fill(2);
  capture.append(buffer, bytes.subarray(0, 2048));
  capture.complete(second, Promise.resolve(new Blob([bytes])));
  capture.complete(first, Promise.resolve(new Blob([new Uint8Array(4096).fill(1)])));
  expect(new Uint8Array(await (await capture.retain('blob:second')!).arrayBuffer())[0]).toBe(2);
  capture.clearExcept();
});

test('mismatched payloads and replaced pending sessions cannot become playable', async () => {
  const capture = new StreamingAudioCapture();
  const request = capture.begin(), source = {}, buffer = {};
  capture.register(source, 'blob:mismatch'); capture.addBuffer(source, buffer);
  capture.append(buffer, new Uint8Array([1, 2, 3]));
  capture.complete(request, Promise.resolve(new Blob([new Uint8Array([4, 5, 6])])));
  await expect(capture.retain('blob:mismatch')!).rejects.toThrow('mismatch');
  const next = capture.begin(); capture.register({}, 'blob:replaced');
  const retained = capture.retain('blob:replaced')!;
  capture.clearExcept();
  expect(next.controller.signal.aborted).toBe(true);
  await expect(retained).rejects.toThrow('replaced');
});
