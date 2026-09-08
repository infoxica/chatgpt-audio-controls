import { expect, test } from 'bun:test';
import { playbackAction, platformKeys } from '../src/shared/shortcuts';
import { floatingVisibility } from '../src/shared/visibility';

test('idle hiding preserves paused/playing access; all hiding never changes audio', () => {
  expect(floatingVisibility(true, 'idle-only', false, false)).toEqual({ player: false, launcher: false });
  expect(floatingVisibility(true, 'idle-only', true, true)).toEqual({ player: true, launcher: false });
  expect(floatingVisibility(true, 'idle-only', true, false)).toEqual({ player: false, launcher: true });
  expect(floatingVisibility(true, 'all', true, true)).toEqual({ player: false, launcher: false });
  expect(floatingVisibility(false, 'all', false, false)).toEqual({ player: false, launcher: true });
});
test('Option physical keys work without stealing Cmd/Ctrl/AltGr or IME', () => {
  const key = { code: 'KeyP', key: 'π', altKey: true, shiftKey: false, ctrlKey: false, metaKey: false, isComposing: false };
  expect(playbackAction(key)).toBe('play');
  expect(playbackAction({ ...key, ctrlKey: true })).toBe(null);
  expect(playbackAction({ ...key, metaKey: true })).toBe(null);
  expect(playbackAction({ ...key, isComposing: true })).toBe(null);
  expect(playbackAction({ ...key, altKey: false, shiftKey: true, code: 'Comma' })).toBe('slower');
  expect(playbackAction({ ...key, altKey: true, shiftKey: true, code: 'Comma' })).toBe(null);
  expect(platformKeys('Alt + Shift + Y', true)).toBe('Option ⌥ + Shift ⇧ + Y');
});
