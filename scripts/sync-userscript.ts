import { readFileSync, writeFileSync } from 'node:fs';
import { EXTENSION_VERSION } from '../src/shared/constants';
declare const Bun: any;
const path = 'userscript/chatgpt-audio-controls.user.js';
const header = readFileSync(path, 'utf8').split('// ==/UserScript==')[0]
  .replace(/@version\s+\S+/, `@version      ${EXTENSION_VERSION}`)
  .replace(/@grant\s+\S+/, '@grant        none') + '// ==/UserScript==\n';
const result = await Bun.build({ entrypoints: ['src/content/content.ts'], target: 'browser', format: 'iife', minify: false, define: { __USERSCRIPT__: 'true', __PLAYER_CSS__: JSON.stringify(readFileSync('src/content/player.css', 'utf8')) } });
if (!result.success) throw new Error(String(result.logs));
const css = JSON.stringify(readFileSync('src/content/player.css', 'utf8'));
const style = `\n(function addPlayerStyle(){const root=document.documentElement;if(!root){requestAnimationFrame(addPlayerStyle);return;}const style=document.createElement('style');style.id='cgpt-ra-userscript-style';style.textContent=${css};const mount=()=>{if(!style.isConnected)root.append(style);};mount();new MutationObserver(mount).observe(root,{childList:true,subtree:true});})();\n`;
writeFileSync(path, header + '\n// Generated from src/content/content.ts and src/content/player.css. Do not edit.\n' + await result.outputs[0].text() + style);
console.log(`Built standalone userscript ${EXTENSION_VERSION} from shared source.`);
