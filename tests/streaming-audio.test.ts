import { expect, test } from 'bun:test';
import { StreamingAudioCapture } from '../src/content/streaming-audio';

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
