import { afterEach, expect, test } from 'bun:test';
import { PlaybackSession } from '../src/content/playback-session';

class Media extends EventTarget {
  static instances: Media[] = [];
  src = ''; currentSrc = ''; currentTime = 0; duration = 3600;
  playbackRate = 1; defaultPlaybackRate = 1; volume = 1; muted = false;
  paused = true; ended = false; preload = ''; failPlay = false;
  constructor() { super(); Media.instances.push(this); }
  async play() { if (this.failPlay) throw Error('NotAllowedError'); this.paused = false; this.dispatchEvent(new Event('play')); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  load() { if (this.src) queueMicrotask(() => this.dispatchEvent(new Event('loadedmetadata'))); }
  removeAttribute(name: string) { if (name === 'src') this.src = ''; }
  advance(time: number) { this.currentTime += time; this.dispatchEvent(new Event('timeupdate')); }
}
const original = globalThis.Audio;
const sessions: PlaybackSession[] = [];
afterEach(() => { sessions.forEach(s => s.dispose()); sessions.length = 0; globalThis.Audio = original; Media.instances.length = 0; });
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
function setup(retain: (source: string, signal: AbortSignal) => Promise<Blob> = async () => new Blob(['audio'])) {
  globalThis.Audio = Media as unknown as typeof Audio;
  let failures = 0;
  const session = new PlaybackSession(retain, () => {}, () => failures++);
  sessions.push(session);
  const host = new Media(); host.src = 'new-response.wav'; host.currentSrc = 'old-response.wav';
  host.currentTime = 42; host.playbackRate = 1.5; host.volume = .4; host.paused = false;
  host.addEventListener('pause', () => { host.src = ''; host.currentTime = 0; host.duration = 0; });
  session.attach(host as unknown as HTMLMediaElement);
  return { session, host, failures: () => failures };
}

test('destructive pause retains exact position, rate, volume and duration; resume needs progress', async () => {
  const sources: string[] = [];
  const { session, host } = setup(async source => { sources.push(source); return new Blob(['exact source']); });
  session.toggle();
  expect(host.src).toBe(''); expect(session.time).toBe(42); expect(session.duration).toBe(3600);
  await flush();
  const owned = session.media as unknown as Media;
  expect(owned.playbackRate).toBe(1.5); expect(owned.volume).toBe(.4);
  expect(sources).toEqual(['new-response.wav']);
  session.toggle(); expect(session.playing).toBe(false); expect(session.loading).toBe(true);
  owned.advance(1); expect(session.playing).toBe(true); expect(session.loading).toBe(false);
  for (let i = 0; i < 3; i++) { session.toggle(); expect(session.time).toBe(43 + i); session.toggle(); owned.advance(1); }
  expect(session.time).toBe(46); session.seek(2700); expect(session.time).toBe(2700);
  expect(await (await session.blob()).text()).toBe('exact source');
});

test('pause while retention is pending cancels playback intent without losing seek position', async () => {
  let resolve!: (blob: Blob) => void;
  const { session } = setup(() => new Promise(r => { resolve = r; }));
  session.toggle(); session.toggle(); expect(session.loading).toBe(true);
  session.toggle(); session.seek(60); resolve(new Blob(['audio'])); await flush();
  expect(session.paused).toBe(true); expect(session.media?.paused).toBe(true); expect(session.time).toBe(60);
  session.toggle(); (session.media as unknown as Media).advance(1); expect(session.playing).toBe(true);
});

test('streaming pause preserves buffered duration while the complete payload loads', async () => {
  let resolve!: (blob: Blob) => void;
  const { session, host } = setup(() => new Promise(r => { resolve = r; }));
  host.duration = Infinity;
  Object.assign(host, { buffered: { length: 1, end: () => 70 } });
  session.toggle();
  expect(session.time).toBe(42); expect(session.duration).toBe(70);
  resolve(new Blob(['audio'])); await flush();
  expect(session.paused).toBe(true);
});

test('replacement ignores stale payload and aborts its retention', async () => {
  const resolvers: ((blob: Blob) => void)[] = []; const signals: AbortSignal[] = [];
  const { session } = setup((_, s) => { signals.push(s); return new Promise(r => { resolvers.push(r); }); });
  session.toggle(); const old = session.media as unknown as Media;
  const next = new Media(); next.src = 'next.wav'; session.attach(next as unknown as HTMLMediaElement);
  expect(signals[0].aborted).toBe(true); expect(signals[1].aborted).toBe(false);
  resolvers[0](new Blob(['old'])); resolvers[1](new Blob(['next'])); await flush();
  expect(session.media).toBe(next as unknown as HTMLMediaElement); expect(old.paused).toBe(true); expect(old.src).toBe('');
});

test('revoked source and rejected play report recovery without false playing', async () => {
  const first = setup(async () => { throw Error('revoked'); }); first.session.toggle(); await flush();
  expect(first.failures()).toBe(1); expect(first.session.playing).toBe(false);
  const second = setup(); second.session.toggle(); await flush();
  (second.session.media as unknown as Media).failPlay = true; second.session.toggle(); await flush();
  expect(second.failures()).toBe(1); expect(second.session.playing).toBe(false); expect(second.session.paused).toBe(true);
});

test('an older rejected play promise cannot cancel a newer resume', async () => {
  const { session, failures } = setup(); session.toggle(); await flush();
  const owned = session.media as unknown as Media;
  const originalPlay = owned.play.bind(owned); let reject!: (error: Error) => void;
  owned.play = () => { void originalPlay(); return new Promise((_, r) => { reject = r; }); };
  session.toggle(); session.toggle(); owned.play = originalPlay; session.toggle();
  reject(new Error('Aborted by intervening pause')); await flush(); owned.advance(1);
  expect(session.playing).toBe(true); expect(session.paused).toBe(false); expect(failures()).toBe(0);
});
