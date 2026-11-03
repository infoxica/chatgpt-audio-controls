import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { EXTENSION_VERSION } from '../src/shared/constants';

test('delivered userscript contains the exact shared player bundle and current CSS', async () => {
  const delivered = readFileSync('userscript/chatgpt-audio-controls.user.js', 'utf8');
  const result = await Bun.build({ entrypoints: ['src/content/content.ts'], target: 'browser', format: 'iife', minify: false, define: { __USERSCRIPT__: 'true', __PLAYER_CSS__: JSON.stringify(readFileSync('src/content/player.css', 'utf8')) } });
  expect(result.success).toBe(true);
  const bundle = await result.outputs[0].text();
  expect(delivered.match(/@version\s+(\S+)/)?.[1]).toBe(EXTENSION_VERSION);
  expect(delivered.includes(bundle)).toBe(true);
  expect(delivered.includes('style.textContent=' + JSON.stringify(readFileSync('src/content/player.css', 'utf8')) + ';')).toBe(true);
  expect(readFileSync('dist/content/player.css', 'utf8')).toBe(readFileSync('src/content/player.css', 'utf8'));
});
