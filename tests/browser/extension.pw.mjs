import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { SETTING_STORAGE_KEYS } from '../../src/shared/constants.ts';
let context, worker, extensionId;
const labels={en:['Copy','More actions','Read aloud'],vi:['Sao chép','Thao tác khác','Đọc to'],ja:['コピー','その他','読み上げ']};
function wav() {
  const length=8000*120;const buffer=Buffer.alloc(44+length*2);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(8000,24);buffer.writeUInt32LE(16000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(length*2,40);return buffer;
}
function fixture(lang){const [copy,more,read]=labels[lang];return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>body{font:16px system-ui;margin:0;background:#fff;color:#222}main{max-width:760px;margin:30px auto 180px}form{position:fixed;bottom:40px;left:50%;transform:translateX(-50%);width:min(760px,calc(100% - 48px));background:#eee;padding:16px;border-radius:20px;box-sizing:border-box}#prompt-textarea{height:40px}#native-voice{color:rgb(123, 45, 67);background:rgb(230, 231, 232);border-radius:7px;padding:6px;border:2px solid red}button{cursor:pointer}[role=menu]{position:fixed;top:90px;right:30px;z-index:200000;background:white;padding:20px}</style></head><body><main><article data-testid="conversation-turn-1"><div data-message-author-role="assistant"><p>${'A long response for playback and navigation testing. '.repeat(80)}</p></div><div role="toolbar"><button aria-label="${copy}">${copy}</button><button aria-label="${more}" aria-haspopup="menu" onclick="document.querySelector('[role=menu]').hidden=false">…</button></div></article></main><div role="menu" hidden><button role="menuitem" onclick="document.querySelector('audio').play();this.parentElement.hidden=true">${read}</button></div><audio src="/speech.wav" preload="auto"></audio><form data-type="unified-composer"><div id="prompt-textarea" contenteditable="true" role="textbox" aria-label="Message"></div><button type="button" id="native-voice">Native voice</button></form></body></html>`;}
test.beforeAll(async()=>{
  context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`]});
  worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker'); extensionId=worker.url().split('/')[2];
  context.on('page', page => {page.on('pageerror', error => console.log('Page error:', error.message));page.on('console', message => {if(message.type()==='error' || message.type()==='warning') console.log('Browser:',message.text());});});
  await context.route('https://chatgpt.com/**',route=>route.request().url().endsWith('/speech.wav')?route.fulfill({contentType:'audio/wav',body:wav()}):route.fulfill({contentType:'text/html',body:fixture(new URL(route.request().url()).searchParams.get('lang') || 'en')}));
});
test.afterAll(async()=>{await context?.close();});
test('native English, Vietnamese and Japanese controls work independently of selected language',async()=>{
  await worker.evaluate(()=>chrome.storage.sync.set({'cgpt-ra-settings.language':'de'}));
  for(const lang of Object.keys(labels)){
    const page=await context.newPage();await page.setViewportSize({width:1366,height:768});await page.goto(`https://chatgpt.com/?lang=${lang}`);
    await expect(page.locator('.cgpt-inline-readaloud').first()).toBeVisible();
    await page.locator('.cgpt-inline-readaloud').first().click();
    await expect(page.locator('#cgpt-ra-right')).toBeVisible();
    await expect.poll(()=>page.locator('audio').evaluate(audio=>audio.paused)).toBe(false);
    await page.locator('#cgpt-ra-right .cgpt-ra-play').click();
    await expect.poll(()=>page.locator('audio').evaluate(audio=>audio.paused)).toBe(true);
    await expect(page.locator('#cgpt-ra-right')).toBeVisible();
    const rail=await page.locator('#cgpt-ra-right').boundingBox();const composer=await page.locator('form').boundingBox();
    expect(rail.y+rail.height).toBeLessThanOrEqual(composer.y);expect(rail.x).toBeGreaterThanOrEqual(0);expect(rail.x+rail.width).toBeLessThanOrEqual(1366);
    expect(await page.locator('#native-voice').evaluate(el=>getComputedStyle(el).color)).toBe('rgb(123, 45, 67)');
    await page.screenshot({path:`build/browser-results/compact-${lang}.png`});await page.close();
  }
});
test('visibility sync, typing, popup and assigned command display use the real extension bridge',async()=>{
  await worker.evaluate(()=>chrome.storage.sync.clear());
  const page=await context.newPage();await page.setViewportSize({width:1920,height:1080});await page.goto('https://chatgpt.com/');
  await expect(page.locator('#cgpt-ra-floating-toggle')).toBeVisible();
  const popup=await context.newPage();await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  await popup.getByLabel('Hide floating controls',{exact:true}).click();
  await expect(popup.getByLabel('Hide floating controls',{exact:true})).toBeChecked();
  await expect(page.locator('#cgpt-ra-floating-toggle')).toBeHidden();
  await page.locator('.cgpt-inline-readaloud').first().click();await expect(page.locator('#cgpt-ra-right')).toBeVisible();
  await expect(page.locator('#cgpt-ra-right')).not.toHaveClass(/cgpt-ra-compact/);
  await page.locator('#cgpt-ra-right .cgpt-ra-play').click();
  await popup.getByLabel('When hidden',{exact:true}).selectOption('all');
  await expect(page.locator('#cgpt-ra-right')).toBeHidden();
  await page.getByRole('textbox',{name:'Message'}).fill('Keep typing');
  // Exercise the worker-to-isolated-content command delivery while focus is in the composer.
  await page.bringToFront();
  await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({active:true,lastFocusedWindow:true});await chrome.tabs.sendMessage(tabs[0].id,{type:'toggle-floating-ui'},{frameId:0});});
  await expect(page.locator('#cgpt-ra-right')).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Message'})).toHaveText('Keep typing');
  expect(await page.locator('audio').evaluate(audio=>audio.paused)).toBe(true);
  await popup.getByRole('button',{name:'Keys',exact:true}).click();
  await expect(popup.getByText('Show / hide floating controls',{exact:true})).toBeVisible();
  const commands=await worker.evaluate(()=>chrome.commands.getAll());expect(commands.find(command=>command.name==='toggle-floating-ui').shortcut).toBeTruthy();
  await popup.screenshot({path:'build/browser-results/popup.png'});
  await popup.getByRole('button',{name:'About',exact:true}).click();
  await expect(popup.getByRole('link',{name:'Official website'})).toHaveAttribute('href','https://infoxica.github.io/chatgpt-audio-controls/');
  const options=await context.newPage();await options.goto(`chrome-extension://${extensionId}/src/options/index.html`);
  await expect(options.getByRole('link',{name:'Official website'})).toHaveAttribute('href','https://infoxica.github.io/chatgpt-audio-controls/');
  await worker.evaluate(async key=>chrome.storage.sync.set({[key]:'ja'}),SETTING_STORAGE_KEYS.language);
  await expect(options.getByRole('link',{name:'公式サイト',exact:true})).toHaveAttribute('href','https://infoxica.github.io/chatgpt-audio-controls/ja/');
  await expect(popup.getByRole('link',{name:'公式サイト',exact:true})).toHaveAttribute('href','https://infoxica.github.io/chatgpt-audio-controls/ja/');
  await options.close();
  await page.close();await popup.close();
});
