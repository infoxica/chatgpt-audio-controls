import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const localizationTargets=Object.keys(JSON.parse(await fs.readFile('site/navigation-copy.json','utf8')));
// Read the TypeScript/JSON catalogs with the same runtime as the build.
const localized=JSON.parse(execFileSync('bun',['-e',`
  import { getTranslations } from './src/shared/i18n/core';
  import { featureCopy } from './src/shared/i18n/features';
  import { getReleaseCopy } from './src/shared/i18n/release-copy';
  import { polishCopy } from './src/shared/i18n/polish';
  console.log(JSON.stringify(Object.fromEntries(${JSON.stringify(localizationTargets)}.map(code=>[code,{t:getTranslations(code),f:featureCopy(code),r:getReleaseCopy(code),p:polishCopy(code)}]))));
`],{encoding:'utf8',maxBuffer:4*1024*1024}));

function wav() {
  const b=Buffer.alloc(44+8000*120*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);for(let i=0;i<8000*120;i++)b.writeInt16LE(Math.round(1000*Math.sin(2*Math.PI*440*i/8000)),44+i*2);return b;
}
function fixture() { return `<!doctype html><html><head><meta charset="utf-8"><style>body{font:16px system-ui;margin:0;background:#fff;color:#222}main{max-width:760px;margin:30px auto 180px}form{position:fixed;bottom:40px;left:50%;transform:translateX(-50%);width:min(760px,calc(100% - 48px));background:#eee;padding:16px;border-radius:20px;box-sizing:border-box}[data-composer-markdown]{min-height:40px}#native-voice{color:rgb(123,45,67);background:rgb(230,231,232);border-radius:7px;padding:6px;border:2px solid red}</style></head><body><main><article><p>A completed response.</p><div contenteditable="true" role="textbox" aria-label="Start writing">Embedded editor</div><button id="native-read" aria-label="Read aloud">Read aloud</button><button id="new-read">Read next response</button></article></main><audio id="host"></audio><form data-chatgpt-composer><div data-composer-markdown contenteditable="true" role="textbox" aria-label="Message"></div><button type="button" id="native-voice">Native voice</button></form><script>
const host=document.getElementById('host');
async function start(){const r=await fetch('/speech.wav');const blob=await r.blob();host.src=URL.createObjectURL(blob);await host.play();}
document.getElementById('native-read').onclick=start;document.getElementById('new-read').onclick=start;
host.addEventListener('pause',()=>{if(host.src){URL.revokeObjectURL(host.src);host.removeAttribute('src');host.load();}});
</script></body></html>`; }

for (const distribution of ['extension','userscript']) test.describe(distribution,()=>{
  let context, worker, extensionId;
  test.beforeAll(async()=>{
    // The Windows host sends OS media-pause events to headless Chromium, even on a
    // bare audio page. Isolate OS integration in fixtures; live acceptance uses defaults.
    context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:[...(process.platform==='win32'?['--disable-features=HardwareMediaKeyHandling,MediaSessionService']:[]),...(distribution==='extension'?[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`]:[])]});
    if(distribution==='extension'){worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');extensionId=worker.url().split('/')[2];}
    else await context.addInitScript({content:await fs.readFile('userscript/chatgpt-audio-controls.user.js','utf8')});
    await context.route('https://chatgpt.com/**',async route=>route.request().url().endsWith('/speech.mp3')?route.fulfill({contentType:'audio/mpeg',body:await fs.readFile('tests/fixtures/speech.mp3')}):route.request().url().endsWith('/speech.wav')?route.fulfill({contentType:'audio/wav',body:wav()}):route.fulfill({contentType:'text/html',body:fixture()}));
  });
  test.afterAll(async()=>{await context?.close();});
  async function open(width=1366){
    const page=await context.newPage();await page.setViewportSize({width,height:800});
    await page.addInitScript(()=>{window.fixtureAudios=[];const Original=window.Audio;window.Audio=function(...args){const audio=new Original(...args);window.fixtureAudios.push(audio);return audio;};});
    await page.goto('https://chatgpt.com/');await expect(page.locator('#cgpt-ra-floating-toggle')).toBeVisible();return page;
  }
  test('player hides on non-chat pages and native settings without changing saved visibility',async()=>{
    const page=await open();
    for(const route of ['/spaces','/dots','/settings','/apps','/gpts','/library','/c/test#settings/General']) {
      await page.evaluate(route=>history.pushState({},'',route),route);
      await expect(page.locator('#cgpt-ra-layer')).toBeHidden();
      await expect(page.locator('#cgpt-ra-floating-toggle')).toBeHidden();
    }
    for(const route of ['/c/test','/g/g-p-test/project','/g/g-p-test/c/test','/codex','/codex/tasks/test','/']) {
      await page.evaluate(route=>history.replaceState({},'',route),route);
      await expect(page.locator('#cgpt-ra-floating-toggle')).toBeVisible();
    }
    await page.locator('#native-read').click();
    await expect.poll(()=>page.locator('#host').evaluate(audio=>!audio.paused)).toBe(true);
    const saved=await storedLayout(page);
    await page.evaluate(()=>{const dialog=document.createElement('dialog');dialog.id='native-settings';document.body.append(dialog);dialog.showModal();});
    await expect(page.locator('#cgpt-ra-layer')).toBeHidden();
    expect(await page.locator('#host').evaluate(audio=>audio.paused)).toBe(false);
    await page.evaluate(()=>document.querySelector('#native-settings').close());
    await expect(page.locator('#cgpt-ra-floating-toggle')).toBeVisible();
    expect(await storedLayout(page)).toEqual(saved);
    await page.close();
  });
  test('feature tour is accessible from player help in both distributions',async()=>{
    const page=await open(); await page.locator('#cgpt-ra-floating-toggle').click();
    await expect(page.locator('#cgpt-ra-right')).toBeVisible();
    if(await page.locator('.cgpt-ra-more').isVisible()) await page.locator('.cgpt-ra-more').click();
    await page.locator('.cgpt-ra-help-wrap > button').click();
    const link=page.locator('.cgpt-ra-help').getByRole('button',{name:'Feature tour',exact:true});
    if(distribution==='extension') {
      const created=context.waitForEvent('page'); await link.click(); const tour=await created;
      await expect(tour).toHaveURL(`chrome-extension://${extensionId}/src/tour/index.html`);
      await expect(tour.locator('#progress')).toHaveText('1 / 5'); await tour.close();
      const surface=await context.newPage();
      await surface.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
      await expect(surface.locator('aside').getByRole('link',{name:'Feature tour',exact:true})).toBeVisible();
      await surface.getByRole('button',{name:'About',exact:true}).click();
      await expect(surface.locator('.popup-about').getByRole('link',{name:'Feature tour',exact:true})).toHaveAttribute('href','../tour/index.html');
      await surface.goto(`chrome-extension://${extensionId}/src/options/index.html`);
      const replay=surface.locator('.sidebar-footer').getByRole('link',{name:'Feature tour',exact:true});
      await expect(replay).toBeVisible(); await replay.focus(); await expect(replay).toBeFocused();
      const reopened=context.waitForEvent('page'); await replay.click(); const replayed=await reopened;
      await expect(replayed.locator('#progress')).toHaveText('1 / 5'); await replayed.close(); await surface.close();
    } else {
      await link.click(); await expect(page.locator('#cgpt-ra-tour')).toBeVisible();
      await expect(page.locator('#cgpt-ra-tour #progress')).toHaveText('1 / 5');
      await page.locator('#cgpt-ra-tour #next').press('Escape');
      await expect(page.locator('#cgpt-ra-tour')).toHaveCount(0);
      expect(await page.evaluate(()=>localStorage.getItem('cgpt-ra-tour-v1'))).toBe('skipped');
      await page.locator('.cgpt-ra-help').getByRole('button',{name:'Open Dashboard & Settings'}).click();
      const settings=page.locator('#cgpt-ra-settings-dialog');
      const replay=settings.getByRole('button',{name:'Feature tour',exact:true});
      await replay.click(); await expect(page.locator('#cgpt-ra-tour #progress')).toHaveText('1 / 5');
      await page.locator('#cgpt-ra-tour #next').press('Escape');
      await expect(settings).toBeVisible(); await expect(replay).toBeFocused();
      await page.keyboard.press('Escape');
    }
    await page.close();
  });
  test('transport order and nested accent changes propagate without changing appearance',async()=>{
    const page=await open(1512);await page.locator('#cgpt-ra-floating-toggle').click();
    expect(await page.locator('.cgpt-ra-transport-row > button').evaluateAll(els=>els.map(e=>e.classList.contains('cgpt-ra-play')?'play':e.classList.contains('cgpt-ra-back')?'back':'next'))).toEqual(['play','back','next']);
    const appearance=await page.locator('html').getAttribute('class');
    let dashboard;
    if(distribution==='extension'){dashboard=await context.newPage();await dashboard.goto(`chrome-extension://${extensionId}/src/options/index.html`);}
    for(const [name,color,text] of [['green','#53b559','#ffffff'],['purple','#8952ee','#ffffff'],['orange','#ee7c37','#ffffff'],['pink','#f077af','#ffffff'],['yellow','#f6c543','#000000'],['black','#000000','#ffffff'],['blue','#3a83f7','#ffffff'],['custom','#234567','#ffffff'],['custom','#345678','#ffffff'],['white','#ffffff','#000000']]){
      await page.evaluate(({color,text})=>{
        let owner=document.querySelector('#theme-owner');if(!owner){owner=document.createElement('section');owner.id='theme-owner';const form=document.querySelector('form');form.before(owner);owner.append(form);const irrelevant=document.createElement('div');irrelevant.dataset.chatTheme='pink';document.body.prepend(irrelevant);}
        owner.style.setProperty('--color-background-accent-action',color);owner.style.setProperty('--color-text-accent-action',text);
      },{color,text});
      await expect.poll(()=>page.locator('.cgpt-ra-play').evaluate(e=>getComputedStyle(e).getPropertyValue('--cgpt-ra-accent').trim())).toBe(color);
      if(dashboard){await expect.poll(()=>dashboard.locator('html').evaluate(e=>e.style.getPropertyValue('--accent'))).toBe(color);await expect.poll(()=>dashboard.locator('html').evaluate(e=>e.style.getPropertyValue('--accent-foreground'))).toBe(text);}
      else await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cgpt-ra-theme-cache')).accent)).toBe(color);
    }
    await page.evaluate(()=>{const old=document.querySelector('#theme-owner'),next=document.createElement('section');next.id='theme-owner';next.dataset.chatTheme='green';old.replaceWith(next);next.append(old.querySelector('form'));});
    await expect.poll(()=>page.locator('.cgpt-ra-play').evaluate(e=>getComputedStyle(e).getPropertyValue('--cgpt-ra-accent').trim())).toBe('#53b559');
    expect(await page.locator('html').getAttribute('class')).toBe(appearance);
    if(dashboard){const popup=await context.newPage();await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);await expect.poll(()=>popup.locator('html').evaluate(e=>e.style.getPropertyValue('--accent'))).toBe('#53b559');await popup.close();await dashboard.close();}
    await page.close();
  });
  async function revealSecondary(page) {
    await expect(page.locator('#cgpt-ra-right')).toBeVisible();
    const more=page.locator('.cgpt-ra-more');
    if(await more.isVisible() && await more.getAttribute('aria-expanded')!=='true') await more.click();
  }
  async function time(page){return (await page.locator('.cgpt-ra-current').textContent()).split(':').reduce((total,n)=>total*60+Number(n),0);}
  const layoutKey = 'cgpt-ra-layout-v1';
  const profile = (overrides={}) => ({preset:'original',seekFirst:true,...overrides});
  async function layout(page, desktop=profile(), narrow=profile({preset:'composer'})) {
    const value={version:2,desktop,narrow};
    if(distribution==='extension') await worker.evaluate(({layoutKey,value})=>chrome.storage.local.set({[layoutKey]:value}),{layoutKey,value});
    else await page.evaluate(({layoutKey,value})=>{localStorage.setItem(layoutKey,JSON.stringify(value));window.postMessage({source:'chatgpt-audio-controls-settings-bridge',type:'CGPT_RA_LAYOUT_UPDATE',layout:value},'*');},{layoutKey,value});
    return value;
  }
  async function storedLayout(page) {
    return distribution==='extension' ? worker.evaluate(key=>chrome.storage.local.get(key).then(data=>data[key]),layoutKey) : page.evaluate(key=>JSON.parse(localStorage.getItem(key)),layoutKey);
  }
  let lastSettingsWrite = 0;
  async function setting(page, value) {
    // Locale sweeps share a real extension: respect Chrome's 120 sync writes/minute.
    if (distribution === 'extension') {
      const delay = Math.max(0, 650 - (Date.now() - lastSettingsWrite));
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      lastSettingsWrite = Date.now();
    }
    if(distribution==='extension') await worker.evaluate(value=>chrome.storage.sync.set({'cgpt-ra-settings':value}),value);
    else await page.evaluate(value=>{localStorage.setItem('cgpt-ra-settings',JSON.stringify(value));window.postMessage({source:'chatgpt-audio-controls-settings-bridge',type:'CGPT_RA_SETTINGS_UPDATE',settings:value},'*');},value);
  }
  async function startDrag(page, selector) {
    await page.locator(selector).hover();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    // Layout saves settle with a FLIP animation. Read coordinates after it
    // finishes so a normal drag cannot miss the moving handle.
    await page.locator(selector).evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
    const box=await page.locator(selector).boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-12,box.y+box.height/2-12);
    await expect(page.locator('#cgpt-ra-drop-targets')).toBeVisible();
  }
  async function drop(page, selector) {
    const box=await page.locator(selector).boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.up();
    await expect(page.locator('#cgpt-ra-drop-targets')).toHaveCount(0);
  }
  test('player survives host DOM replacement without resetting visibility or playback',async()=>{
    const page=await open();
    const savedLayout=await storedLayout(page);
    await page.locator('#cgpt-ra-floating-toggle').click();
    await page.locator('#native-read').click();
    await expect.poll(()=>time(page)).toBeGreaterThan(0);
    await page.evaluate(()=>{
      window.savedPlayerLayer=document.getElementById('cgpt-ra-layer');
      window.savedPlayerLayer.remove();
      document.getElementById('cgpt-ra-userscript-style')?.remove();
    });
    await expect(page.locator('#cgpt-ra-floating-toggle')).toBeVisible();
    expect(await page.evaluate(()=>document.getElementById('cgpt-ra-layer')===window.savedPlayerLayer)).toBe(true);
    await expect(page.locator('#cgpt-ra-layer')).toHaveCount(1);
    await expect(page.locator('.cgpt-ra-grip')).toHaveCount(2);
    if(distribution==='userscript')await expect(page.locator('#cgpt-ra-userscript-style')).toHaveCount(1);
    const resumed=await time(page);await expect.poll(()=>time(page)).toBeGreaterThan(resumed);
    await page.locator('#cgpt-ra-floating-toggle').click();
    await page.evaluate(()=>document.getElementById('cgpt-ra-layer').remove());
    await expect(page.locator('#cgpt-ra-floating-toggle')).toBeVisible();
    await expect(page.locator('#cgpt-ra-floating-toggle')).toHaveAttribute('aria-expanded','false');
    expect(await storedLayout(page)).toEqual(savedLayout);
    await setting(page,{floatingUiHidden:true,floatingUiHideMode:'all'});
    await expect(page.locator('#cgpt-ra-floating-toggle')).toBeHidden();
    await page.evaluate(()=>document.getElementById('cgpt-ra-layer').remove());
    await expect(page.locator('#cgpt-ra-layer')).toHaveCount(1);
    await expect(page.locator('#cgpt-ra-floating-toggle')).toBeHidden();
    await setting(page,{});
    await page.close();
  });

  test('requested locales translate player labels and readiness without changing page direction',async()=>{
    test.setTimeout(180000);
    if(distribution==='extension') await worker.evaluate(()=>chrome.storage.sync.clear());
    const page=await open(1600); await layout(page);
    for(const language of localizationTargets) {
      const {t,f,r,p}=localized[language], direction=['ar','fa','he','ur'].includes(language)?'rtl':'ltr';
      await setting(page,{language,notifyDownloadReady:true,tapSeekSeconds:5});
      await expect(page.locator('#cgpt-ra-left')).toHaveAttribute('lang',language);
      await expect(page.locator('#cgpt-ra-right')).toHaveAttribute('dir',direction);
      await page.locator('#new-read').click();
      const toast=page.locator('#cgpt-ra-ready-toast');
      await toast.hover(); // Pause its five-second timer while checking translated controls.
      await expect(page.locator('.cgpt-ra-seek-slider')).toHaveAccessibleName(p.seekPosition);
      await expect(page.locator('.cgpt-ra-back')).toHaveAttribute('title',t.content.tooltips.back.replace('{s}','5'));
      await expect(page.locator('.cgpt-ra-volume-slider')).toHaveAttribute('aria-label',t.content.tooltips.volumeSlider);
      await expect(page.locator('.cgpt-ra-help-title')).toHaveText(t.content.shortcutsPopover.title);
      await expect(page.locator('html')).not.toHaveAttribute('dir','rtl');
      expect(await page.locator('.cgpt-ra-time').evaluate(el=>getComputedStyle(el).direction)).toBe('ltr');
      await expect(toast).toHaveAttribute('dir',direction);
      await expect(toast).toHaveAttribute('lang',language);
      await expect(toast.getByRole('status')).toHaveText(f.ready);
      await expect(toast.getByRole('button',{name:t.content.tooltips.download,exact:true})).toBeVisible();
      await toast.getByRole('button',{name:r.dismiss,exact:true}).click();
      await revealSecondary(page);
      await expect(page.locator('.cgpt-ra-download')).toHaveAccessibleName(t.content.tooltips.download);
      await page.keyboard.press('Escape');
    }
    await page.reload();
    await expect(page.locator('#cgpt-ra-right')).toHaveAttribute('lang',localizationTargets.at(-1));
    await setting(page,{language:'en'}); await page.close();
  });
  if(distribution==='extension') test('requested locales render popup, onboarding, options, gestures and command help',async()=>{
    test.setTimeout(300000);
    await worker.evaluate(async()=>{await chrome.storage.sync.clear();await chrome.storage.local.clear();});
    const page=await context.newPage();
    for(const language of localizationTargets) {
      const {t,r,p}=localized[language], direction=['ar','fa','he','ur'].includes(language)?'rtl':'ltr';
      await setting(page,{language});
      await page.setViewportSize({width:360,height:800});
      await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
      await expect(page.locator('html')).toHaveAttribute('lang',language);
      await expect(page.locator('html')).toHaveAttribute('dir',direction);
      await expect(page.getByText(r.quickStart,{exact:true})).toBeVisible();
      await expect(page.getByRole('radiogroup')).toHaveAccessibleName(r.appearance);
      await page.getByRole('button',{name:t.popup.tabs.shortcuts,exact:true}).click();
      await expect(page.getByText(t.popup.shortcuts.smoothAudioScrub,{exact:true})).toBeVisible();
      expect(await page.locator('.key-combo').first().evaluate(el=>getComputedStyle(el).direction)).toBe('ltr');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.getByRole('button',{name:t.popup.tabs.about,exact:true}).click();
      await expect(page.getByText(t.popup.about.documentation,{exact:true}).first()).toBeVisible();
      await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);
      await expect(page.locator('html')).toHaveAttribute('lang',language);
      await expect(page.locator('html')).toHaveAttribute('dir',direction);
      await expect(page.getByRole('heading',{level:1})).toHaveText(t.options.headers.preferencesTitle);
      await page.getByRole('button',{name:t.options.nav.shortcuts,exact:true}).click();
      await expect(page.getByText(p.gestureReleaseLabel+':',{exact:true})).toBeVisible();
      expect(await page.locator('.kbd').first().evaluate(el=>getComputedStyle(el).direction)).toBe('ltr');
      expect(await page.locator('.kbd').first().evaluate(el=>getComputedStyle(el.parentElement).direction)).toBe('ltr');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      if(['ar','fa','he','ur'].includes(language)) await page.screenshot({path:`build/localization-${language}-shortcuts.png`,fullPage:true});
    }
    await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',localizationTargets.at(-1));
    await setting(page,{language:'en'});await page.close();
  });
  test('Arabic and Persian recovery messages keep their own language and direction',async()=>{
    const page=await open();await setting(page,{language:'en',notifyDownloadReady:false});await layout(page);
    await page.locator('#native-read').click();await expect.poll(()=>time(page)).toBeGreaterThanOrEqual(1);
    await page.locator('.cgpt-ra-play').click();
    await page.evaluate(()=>{window.fixtureAudios.at(-1).play=()=>Promise.reject(new DOMException('Fixture rejection','NotAllowedError'));});
    for(const language of ['ar','fa']) {
      await setting(page,{language,notifyDownloadReady:false});
      await expect(page.locator('#cgpt-ra-right')).toHaveAttribute('lang',language);
      await page.locator('.cgpt-ra-play').click();
      const status=page.locator('#cgpt-ra-status');
      await expect(status).toHaveText(localized[language].r.playError);
      await expect(status).toHaveAttribute('dir','rtl');await expect(status).toHaveAttribute('lang',language);
      await expect(page.locator('html')).not.toHaveAttribute('dir','rtl');
      if(distribution==='userscript') {
        if(!await page.locator('.cgpt-ra-help-wrap').evaluate(el=>el.classList.contains('cgpt-open'))) { await revealSecondary(page);await page.locator('.cgpt-ra-help-wrap > button').click(); }
        await page.locator('.cgpt-ra-help').getByRole('button',{name:localized[language].t.popup.header.openOptions}).click();
        const dialog=page.locator('#cgpt-ra-settings-dialog');
        await expect(dialog).toHaveAttribute('dir','rtl');await expect(dialog).toHaveAttribute('lang',language);
        await expect(dialog.locator('option[value="auto"]')).toHaveText(localized[language].t.options.general.languageAuto);
        await page.keyboard.press('Escape');
      }
    }
    await setting(page,{language:'en'});await page.close();
  });
  test('drag threshold, completed-drop persistence, cancellation and pill swapping',async()=>{
    const page=await open(1600);await layout(page);await page.locator('#native-read').click();
    const circle=page.locator('#cgpt-ra-floating-toggle');await expect(circle).toHaveAttribute('aria-expanded','true');
    await circle.click();await expect(circle).toHaveAttribute('aria-expanded','false');await circle.click();
    const box=await circle.boundingBox();await page.mouse.move(box.x+22,box.y+22);await page.mouse.down();await page.mouse.move(box.x+25,box.y+22);
    await expect(page.locator('#cgpt-ra-drop-targets')).toHaveCount(0);await page.mouse.up();await expect(circle).toHaveAttribute('aria-expanded','false');await circle.click();await expect(circle).toHaveAttribute('aria-expanded','true');
    await startDrag(page,'#cgpt-ra-floating-toggle');await expect(page.locator('.cgpt-ra-drop-target')).toHaveCount(8);
    await drop(page,'.cgpt-ra-drop-target[data-preset="top-left"] [data-part="circle"]');
    await expect.poll(async()=>(await storedLayout(page)).desktop.preset).toBe('top-left');await expect(circle).toHaveAttribute('aria-expanded','true');
    const saved=await storedLayout(page);
    for(const cancel of ['escape','invalid','pointercancel']) {
      await startDrag(page,'#cgpt-ra-floating-toggle');
      if(cancel==='escape')await page.keyboard.press('Escape');
      else if(cancel==='pointercancel')await circle.dispatchEvent('pointercancel',{pointerId:1});
      else await page.mouse.move(780,200);
      await page.mouse.up();await expect(page.locator('#cgpt-ra-drop-targets')).toHaveCount(0);expect(await storedLayout(page)).toEqual(saved);
    }
    await circle.press('Enter');await expect(circle).toHaveAttribute('aria-expanded','false');await circle.press('Enter');await expect(circle).toHaveAttribute('aria-expanded','true');
    await startDrag(page,'#cgpt-ra-left .cgpt-ra-grip');await drop(page,'.cgpt-ra-drop-target[data-seek-first="false"] [data-part="seek"]');
    await expect.poll(async()=>(await storedLayout(page)).desktop.seekFirst).toBe(false);
    await expect.poll(()=>page.evaluate(()=>document.getElementById('cgpt-ra-right').getBoundingClientRect().top<document.getElementById('cgpt-ra-left').getBoundingClientRect().top)).toBe(true);
    await page.reload();await page.locator('#native-read').click();await expect.poll(async()=>(await storedLayout(page)).desktop.preset).toBe('top-left');
    await expect.poll(()=>page.evaluate(()=>document.getElementById('cgpt-ra-right').getBoundingClientRect().top)).toBeLessThan(30);
    await layout(page);await page.close();
  });
  test('main drag reveals circles first and one exact destination with a compact inert preview',async()=>{
    const page=await open(1512); await page.setViewportSize({width:1512,height:850});
    await layout(page); await page.locator('#native-read').click();
    await startDrag(page,'#cgpt-ra-floating-toggle'); await page.mouse.move(750,360);
    await expect(page.locator('.cgpt-ra-drop-active')).toHaveCount(0);
    await expect(page.locator('.cgpt-ra-target-detail:visible')).toHaveCount(0);
    expect(await page.locator('.cgpt-ra-drop-marker:visible').count()).toBeGreaterThan(1);
    const preview=page.locator('.cgpt-ra-drag-preview'); await expect(preview).toHaveAttribute('inert','');
    await expect.poll(async()=>{const r=await preview.boundingBox();return r.width<=240.1&&r.height<=120.1;}).toBe(true);
    const target=page.locator('.cgpt-ra-drop-target[data-preset="top-right"]');
    const circle=await target.locator('[data-part="marker"]').boundingBox();
    await page.mouse.move(circle.x+22,circle.y+22);
    await expect(target).toHaveClass(/cgpt-ra-drop-active/);
    await expect(page.locator('.cgpt-ra-drop-active')).toHaveCount(1);
    expect(await target.locator('.cgpt-ra-target-detail:visible').count()).toBeGreaterThan(1);
    await expect(page.locator('.cgpt-ra-drop-target:not(.cgpt-ra-drop-active) .cgpt-ra-target-detail:visible')).toHaveCount(0);
    await page.screenshot({path:`build/browser-results/${distribution}-compact-drag-1512.png`});
    await page.keyboard.press('Escape');await page.mouse.up();
    await expect(preview).toHaveCount(0);await expect(page.locator('.cgpt-ra-drag-source')).toHaveCount(0);
    expect((await storedLayout(page)).desktop.preset).toBe('original');
    await page.emulateMedia({reducedMotion:'reduce'});await startDrag(page,'#cgpt-ra-floating-toggle');
    expect(await page.locator('#cgpt-ra-drop-targets').evaluate(e=>e.getAnimations({subtree:true}).length)).toBe(0);
    await page.keyboard.press('Escape');await page.mouse.up();await page.close();
  });
  test('left layouts follow only the visible sidebar, including matching drag destinations',async()=>{
    const page=await open(2200);await page.setViewportSize({width:2200,height:1100});await page.locator('#native-read').click();
    await page.evaluate(()=>{
      const shell=document.createElement('div');shell.id='sidebar-clip';
      shell.style.cssText='position:fixed;left:0;top:0;width:52px;height:100vh;overflow:hidden';
      shell.innerHTML='<div id="app-shell-sidebar" style="position:relative;width:340px;height:100%;background:#eee"><nav aria-label="App navigation" style="width:52px;height:100%"></nav><div id="sidebar-panel" style="position:absolute;left:36px;top:0;width:288px;height:100%;opacity:0"><nav aria-label="Home" style="width:100%;height:100%"></nav></div></div>';
      document.body.prepend(shell);
    });
    const leftEdge=()=>page.evaluate(()=>Math.min(...['cgpt-ra-left','cgpt-ra-right','cgpt-ra-floating-toggle'].map(id=>document.getElementById(id).getBoundingClientRect().left)));
    for(const [width,opacity,expected] of [[52,0,60],[52,1,60],[340,1,348],[52,0,60],[0,1,12]]) {
      await page.evaluate(({width,opacity})=>{document.getElementById('sidebar-clip').style.width=width+'px';document.getElementById('sidebar-panel').style.opacity=String(opacity);},{width,opacity});
      for(const preset of ['top-left','left','bottom-left'])for(const seekFirst of [true,false]) {
        const saved=await layout(page,profile({preset,seekFirst}));
        await expect(page.locator('#cgpt-ra-floating-toggle')).toHaveAttribute('data-preset',preset);
        await expect.poll(leftEdge,{message:`${preset}, seekFirst=${seekFirst}, sidebar=${width}px, opacity=${opacity}`}).toBeCloseTo(expected,0);
        await startDrag(page,'#cgpt-ra-floating-toggle');
        const target=page.locator('.cgpt-ra-drop-target[data-preset="'+preset+'"]');
        await expect(target.locator('[data-part="marker"]')).toBeAttached();
        expect(await target.locator('[data-part]').evaluateAll(els=>Math.min(...els.map(e=>e.getBoundingClientRect().left)))).toBeCloseTo(expected,0);
        await page.keyboard.press('Escape');await page.mouse.up();
        await expect(page.locator('#cgpt-ra-drop-targets')).toHaveCount(0);
        expect(await storedLayout(page)).toEqual(saved);
      }
    }
    await layout(page);await page.close();
  });
  test('all desktop arrangements and orders fit, narrow fallback preserves preference',async()=>{
    const page=await open(1600);await page.setViewportSize({width:1600,height:1100});await page.locator('#native-read').click();
    for(const preset of ['original','composer','top-left','top-right','bottom-left','bottom-right','left','right'])for(const seekFirst of [true,false]) {
      await layout(page,profile({preset,seekFirst}));
      await expect(page.locator('#cgpt-ra-floating-toggle')).toHaveAttribute('data-preset',preset);
      await expect.poll(()=>page.evaluate(()=>{const ids=['cgpt-ra-left','cgpt-ra-right','cgpt-ra-floating-toggle'];const rects=ids.map(id=>document.getElementById(id).getBoundingClientRect());return rects.every((r,i)=>r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&rects.every((s,j)=>i===j||r.right<=s.left||r.left>=s.right||r.bottom<=s.top||r.top>=s.bottom));})).toBe(true);
      await expect(page.locator('#cgpt-ra-right')).toHaveClass(preset==='left'||preset==='right'||preset.startsWith('top')&&seekFirst||preset.startsWith('bottom')&&!seekFirst?/cgpt-ra-vertical/:/^(?!.*cgpt-ra-vertical)/);
      await page.evaluate(()=>Promise.all(['cgpt-ra-left','cgpt-ra-right','cgpt-ra-floating-toggle'].flatMap(id=>document.getElementById(id).getAnimations().map(a=>a.finished.catch(()=>{})))));
      // A resize/readiness update can replace the animation we just awaited.
      // Check the settled hit areas, while still failing persistently undersized controls.
      await expect.poll(()=>page.locator('#cgpt-ra-right button:not(.cgpt-ra-speed-option):not(.cgpt-ra-popover *)').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {name:e.className,w:r.width,h:r.height};}).filter(r=>r.w<44||r.h<44)),{message:`44px controls after ${preset}, seekFirst=${seekFirst} settles`}).toEqual([]);
      await expect.poll(()=>page.locator('.cgpt-ra-seek-slider').evaluate(e=>{const r=e.getBoundingClientRect(),p=document.getElementById('cgpt-ra-left').getBoundingClientRect();return r.left>=p.left&&r.right<=p.right+1&&r.top>=p.top&&r.bottom<=p.bottom+1;})).toBe(true);
    }
    const saved=await storedLayout(page);
    for(const width of [320,360,390,768,1600]){
      await page.setViewportSize({width,height:width===1600?1100:800});
      await expect.poll(()=>page.evaluate(()=>['cgpt-ra-left','cgpt-ra-right','cgpt-ra-floating-toggle'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();const c=document.querySelector('form').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&(r.bottom<=c.top||r.right<=c.left||r.left>=c.right);}))).toBe(true);
      if(width<768)await expect(page.locator('#cgpt-ra-left')).not.toHaveClass(/cgpt-ra-vertical/);
      expect(await storedLayout(page)).toEqual(saved);
    }
    await page.setViewportSize({width:390,height:400});await expect(page.locator('#cgpt-ra-floating-toggle')).toBeVisible();expect(await storedLayout(page)).toEqual(saved);
    await layout(page);await page.close();
  });
  test('download readiness precedes playback end, reuses bytes, obeys preference and clears on navigation',async()=>{
    const page=await open();await setting(page,{notifyDownloadReady:true,enableShortcuts:true,language:'en'});await page.locator('#native-read').click();
    const toast=page.locator('#cgpt-ra-ready-toast');await expect(toast).toContainText('Full audio is ready to download');expect(await page.locator('#host').evaluate(a=>a.ended)).toBe(false);
    const downloading=page.waitForEvent('download');await toast.getByRole('button',{name:'Download'}).click();expect(await fs.readFile(await(await downloading).path())).toEqual(wav());await expect(toast).toHaveCount(0);
    await page.locator('.cgpt-ra-play').click();await page.locator('.cgpt-ra-play').click();await expect(toast).toHaveCount(0);
    await setting(page,{notifyDownloadReady:false,language:'en'});await page.locator('#new-read').click();await expect.poll(()=>page.locator('#host').evaluate(a=>a.readyState)).toBeGreaterThan(1);await expect(toast).toHaveCount(0);
    await setting(page,{notifyDownloadReady:true,language:'en'});await page.locator('#new-read').click();await expect(toast).toBeVisible();
    await toast.hover();await page.waitForTimeout(8200);await expect(toast).toBeVisible();
    await page.evaluate(()=>history.pushState({},'', '/c/new'));await expect(toast).toHaveCount(0,{timeout:7000});await page.close();
  });
  test('email response headers do not undock and native menus stay above the dock', async () => {
    const page = await open(1600); await layout(page, profile({preset:'composer'}));
    await page.locator('#native-read').click();
    await page.evaluate(() => {
      const article=document.querySelector('article');
      article.insertAdjacentHTML('beforeend','<header style="position:fixed;left:420px;bottom:150px;width:760px;height:80px">Email subject</header>');
      const composer=document.querySelector('form'); composer.style.border='1px solid rgb(80, 90, 100)';
      const menu=document.createElement('div'); menu.id='native-menu'; menu.style.cssText='position:fixed;left:450px;bottom:150px;width:200px;height:60px;background:white;z-index:50'; document.body.append(menu);
    });
    await expect.poll(() => page.evaluate(() => {
      const d=document.getElementById('cgpt-ra-dock').getBoundingClientRect(), c=document.querySelector('form').getBoundingClientRect();
      return Math.abs(d.bottom-c.top)<1 && Math.abs(d.width-c.width)<1;
    })).toBe(true);
    await expect(page.locator('#cgpt-ra-dock')).toHaveCSS('border-left-color','rgb(80, 90, 100)');
    expect(await page.evaluate(()=>document.elementFromPoint(500,620)?.id)).toBe('native-menu');
    await page.locator('#cgpt-ra-floating-toggle').click();
    await expect(page.locator('#cgpt-ra-floating-toggle g')).toHaveCount(1);
    expect(await page.locator('#cgpt-ra-floating-toggle').evaluate(e=>getComputedStyle(e,'::before').width)).toBe('32px');
    expect((await storedLayout(page)).desktop.preset).toBe('composer');
    await layout(page); await page.close();
  });
  test('volume opens clear of vertical and inverted rails without scrollbars', async () => {
    const page=await open(1600); await page.setViewportSize({width:1600,height:1100}); await page.locator('#native-read').click();
    for(const preset of ['left','right','top-left','top-right']) for(const seekFirst of [true,false]) {
      await layout(page,profile({preset,seekFirst}));
      await page.locator('.cgpt-ra-volume-wrap button').click();
      await expect.poll(()=>page.locator('.cgpt-ra-volume-popover').evaluate(e=>{
        const r=e.getBoundingClientRect(), c=document.getElementById('cgpt-ra-right').getBoundingClientRect();
        return (r.right<=c.left || r.left>=c.right) && e.scrollHeight===e.clientHeight && e.scrollWidth===e.clientWidth;
      })).toBe(true);
      await page.locator('.cgpt-ra-volume-wrap button').click();
    }
    await layout(page); await page.close();
  });
  test('success toast expires after five active seconds and pauses with keyboard focus', async () => {
    const page=await open(); await page.clock.install({time:new Date('2026-01-01T00:00:00Z')});
    // Freeze wall-clock drift before creating the toast, so slow host/browser
    // round trips cannot consume part of the five-second assertion window.
    await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z')); await setting(page,{notifyDownloadReady:true,language:'en'});
    await page.locator('#native-read').click({force:true}); const toast=page.locator('#cgpt-ra-ready-toast'); await expect(toast).toBeVisible();
    await toast.locator('button').first().focus(); await page.clock.runFor(6000); await expect(toast).toBeVisible();
    await page.locator('#native-read').focus(); await page.clock.runFor(4900); await expect(toast).toBeVisible();
    await page.clock.runFor(200); await expect(toast).toHaveCount(0);
    // Clock overrides apply to this persistent context, including later pages.
    await page.clock.resume(); await page.close();
  });
  test('magnetic capture shares preview geometry and pill drags expose only their destination',async()=>{
    const page=await open(1600);await page.setViewportSize({width:1600,height:1100});await layout(page);await page.locator('#native-read').click();
    await page.emulateMedia({reducedMotion:'reduce'});
    await startDrag(page,'#cgpt-ra-floating-toggle');
    const target=page.locator('.cgpt-ra-drop-target[data-preset="top-right"]');
    const hit=await target.locator('[data-part="marker"]').boundingBox();
    await page.mouse.move(hit.x-25,hit.y+22);await expect(target).not.toHaveClass(/cgpt-ra-drop-active/);
    await page.mouse.move(hit.x-24,hit.y+22);await expect(target).toHaveClass(/cgpt-ra-drop-active/);
    const previews=await target.locator('[data-part]').evaluateAll(nodes=>Object.fromEntries(nodes.map(e=>{const r=e.getBoundingClientRect();return [e.dataset.part,{x:r.x,y:r.y,width:r.width,height:r.height}];})));
    await page.mouse.up();await expect.poll(async()=>(await storedLayout(page)).desktop.preset).toBe('top-right');
    await expect.poll(()=>page.evaluate(expected=>Object.entries({seek:'cgpt-ra-left',controls:'cgpt-ra-right',circle:'cgpt-ra-floating-toggle'}).every(([part,id])=>{const r=document.getElementById(id).getBoundingClientRect();return ['x','y','width','height'].every(k=>Math.abs(r[k]-expected[part][k])<.5);}),previews)).toBe(true);
    await startDrag(page,'#cgpt-ra-left .cgpt-ra-grip');await expect(page.locator('.cgpt-ra-drop-shape')).toHaveCount(1);
    await page.keyboard.press('Escape');await page.mouse.up();
    const slider=await page.locator('.cgpt-ra-seek-slider').boundingBox();await page.mouse.move(slider.x+slider.width/2,slider.y+slider.height/2);await page.mouse.down();await page.mouse.move(slider.x+slider.width/2,slider.y+slider.height/2+15);await page.mouse.up();await expect(page.locator('#cgpt-ra-drop-targets')).toHaveCount(0);
    await layout(page);await page.close();
  });
  test('composer dock joins cleanly, stays two rows on phones and respects reduced motion',async()=>{
    const page=await open(390);await setting(page,{language:'en',notifyDownloadReady:false});await layout(page,profile({preset:'composer'}));await page.locator('#native-read').click();
    for(const width of [320,360,390,768,1280])for(const seekFirst of [true,false]) {
      await page.setViewportSize({width,height:800});await layout(page,profile({preset:'composer',seekFirst}),profile({preset:'composer',seekFirst}));
      await expect.poll(()=>page.evaluate(()=>{const dock=document.getElementById('cgpt-ra-dock').getBoundingClientRect(),c=document.querySelector('form').getBoundingClientRect();return Math.abs(dock.bottom-c.top)<.5&&Math.abs(dock.width-c.width)<.5&&dock.height===(innerWidth<768?100:52);})).toBe(true);
      await expect(page.locator('form')).toHaveCSS('border-top-left-radius','20px');
      await expect(page.locator('#native-voice')).toHaveCSS('border-radius','7px');
    }
    await page.setViewportSize({width:320,height:800});
    await page.locator('.cgpt-ra-more').click();await expect(page.locator('.cgpt-ra-download')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.cgpt-ra-more')).toBeFocused();await expect(page.locator('.cgpt-ra-download')).toBeHidden();
    await page.emulateMedia({reducedMotion:'reduce'});
    const circle=page.locator('#cgpt-ra-floating-toggle');
    for(let i=0;i<4;i++)await circle.click();
    await expect(circle).toHaveAttribute('aria-expanded','true');
    expect(await page.evaluate(()=>['cgpt-ra-left','cgpt-ra-right','cgpt-ra-floating-toggle','cgpt-ra-dock'].flatMap(id=>document.getElementById(id).getAnimations()).length)).toBe(0);
    await circle.click();await expect(page.locator('form')).toHaveCSS('border-top-left-radius','20px');await expect(page.locator('#cgpt-ra-dock')).toBeHidden();
    await expect.poll(()=>circle.evaluate(e=>{const r=e.getBoundingClientRect(),c=document.querySelector('form').getBoundingClientRect();return Math.abs(r.bottom-c.top)<.5&&r.right<=c.right;})).toBe(true);
    await circle.click();await page.screenshot({path:`build/browser-results/${distribution}-composer-dock-320.png`});
    // Current ChatGPT wraps its painted surface in a transparent unified composer.
    await page.evaluate(()=>{
      const form=document.querySelector('form'),surface=document.createElement('div');surface.id='painted-composer';
      surface.style.cssText='background:#eee;border-radius:26px;width:100%';
      surface.append(...form.childNodes);form.append(surface);form.removeAttribute('data-chatgpt-composer');form.dataset.type='unified-composer';form.style.cssText+=';background:transparent;border-radius:0';
      const input=surface.querySelector('[contenteditable]');input.classList.add('ProseMirror');input.setAttribute('aria-label','Ask ChatGPT');
    });
    await expect(page.locator('#painted-composer')).toHaveCSS('border-top-left-radius','26px');
    await expect(page.locator('#cgpt-ra-dock')).toHaveCSS('border-top-left-radius','26px');
    await expect.poll(()=>page.evaluate(()=>Math.abs(document.getElementById('cgpt-ra-dock').getBoundingClientRect().bottom-document.getElementById('painted-composer').getBoundingClientRect().top))).toBeLessThan(.5);
    await circle.click();await expect(page.locator('#painted-composer')).toHaveCSS('border-top-left-radius','26px');
    await layout(page);await page.close();
  });
  test('missing mobile composer retains an expandable fallback without saving it',async()=>{
    const page=await open(320);await layout(page);await page.locator('#native-read').click();const saved=await storedLayout(page);
    await page.evaluate(()=>{document.documentElement.classList.add('light');document.querySelector('form').remove();});
    await expect(page.locator('#cgpt-ra-right')).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>{const r=document.getElementById('cgpt-ra-dock').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
    const circle=page.locator('#cgpt-ra-floating-toggle');await circle.click();await expect(page.locator('#cgpt-ra-right')).toBeHidden();await circle.click();await expect(page.locator('#cgpt-ra-right')).toBeVisible();
    expect(await storedLayout(page)).toEqual(saved);await page.close();
  });
  test('native composer styling is immutable and collapsed tab clears its curve',async()=>{
    const page=await open(1366);await setting(page,{language:'en',notifyDownloadReady:false});
    await page.evaluate(()=>document.querySelector('form').style.cssText+=';border:2px solid rgb(87,93,99);border-radius:28px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)');
    const before=await page.locator('form').getAttribute('style');
    await layout(page,profile({preset:'composer'}));await page.locator('#native-read').click();
    for(const lang of ['en','ar']) {
      await setting(page,{language:lang});
      const circle=page.locator('#cgpt-ra-floating-toggle');
      await expect(circle).toHaveAttribute('aria-expanded','true');
      await circle.click();await expect(circle).toHaveAttribute('aria-expanded','false');
      await expect.poll(()=>circle.evaluate(e=>{const r=e.getBoundingClientRect(), c=document.querySelector('form').getBoundingClientRect(),rtl=e.dir==='rtl';return rtl?r.left+6-c.left:c.right-(r.right-6);})).toBe(34);
      expect(await page.locator('form').getAttribute('style')).toBe(before);
      await circle.click();await expect(page.locator('form')).toHaveCSS('border-top-width','2px');
      await expect(page.locator('form')).toHaveCSS('border-top-left-radius','28px');
      expect(await page.locator('form').getAttribute('style')).toBe(before);
    }
    await setting(page,{language:'en'});await page.close();
  });
  test('renamed and localized composers use the painted surface and inset the collapsed tab',async()=>{
    const page=await open(1512);await page.emulateMedia({reducedMotion:'reduce'});
    await setting(page,{language:'en',notifyDownloadReady:false});
    await page.evaluate(()=>{
      const form=document.querySelector('form'),surface=document.createElement('div');surface.id='painted-composer';
      surface.style.cssText='background:#212121;border-radius:28px;border:1px solid #424242;padding:12px';
      surface.append(...form.childNodes);form.append(surface);form.dataset.type='unified-composer';
      form.style.cssText+=';background:transparent;border-radius:0;padding:10px';
      const input=surface.querySelector('[contenteditable]');input.classList.add('ProseMirror');input.setAttribute('aria-label','Work with ChatGPT');
    });
    const nativeStyle=await page.locator('#painted-composer').getAttribute('style');
    await layout(page,profile({preset:'composer'}));
    for(const [label,lang] of [['Work with ChatGPT','en'],['Trabaja con ChatGPT','es'],['اكتب رسالة','ar']]) {
      await page.locator('#painted-composer [contenteditable]').evaluate((e,label)=>e.setAttribute('aria-label',label),label);
      await setting(page,{language:lang,notifyDownloadReady:false});
      const circle=page.locator('#cgpt-ra-floating-toggle');
      await expect(circle).toHaveAttribute('aria-expanded','false');
      await expect.poll(()=>circle.evaluate(e=>{const r=e.getBoundingClientRect(),c=document.querySelector('#painted-composer').getBoundingClientRect();return e.dir==='rtl'?r.left+6-c.left:c.right-r.right+6;})).toBe(34);
      const c=await page.locator('#painted-composer').boundingBox();
      if(lang==='en')await page.screenshot({path:`build/dock-corrected-collapsed-${distribution}.png`,clip:{x:c.x-2,y:c.y-54,width:c.width+4,height:c.height+56}});
      await circle.click();
      await expect(page.locator('#cgpt-ra-dock')).toHaveCSS('border-top-left-radius','28px');
      await expect.poll(()=>page.evaluate(()=>{const d=document.querySelector('#cgpt-ra-dock').getBoundingClientRect(),c=document.querySelector('#painted-composer').getBoundingClientRect();return Math.abs(d.bottom-c.top)<.5&&Math.abs(d.width-c.width)<.5;})).toBe(true);
      expect(await page.locator('#painted-composer').getAttribute('style')).toBe(nativeStyle);
      if(lang==='en')await page.screenshot({path:`build/dock-corrected-expanded-${distribution}.png`,clip:{x:c.x-2,y:c.y-54,width:c.width+4,height:c.height+56}});
      await circle.click();
    }
    await setting(page,{language:'en'});await layout(page);await page.close();
  });
  test('docking reserves eight pixels around nearby native buttons and restores the saved dock',async()=>{
    const page=await open(1512);await page.emulateMedia({reducedMotion:'reduce'});
    await setting(page,{language:'en',notifyDownloadReady:false});
    await layout(page,profile({preset:'composer'}));await page.locator('#cgpt-ra-floating-toggle').click();
    const saved=await storedLayout(page),nativeStyle=await page.locator('form').getAttribute('style');
    await page.evaluate(()=>{
      const c=document.querySelector('form').getBoundingClientRect(),button=document.createElement('button');
      button.id='nearby-native-action';button.textContent='Copy response';
      button.style.cssText=`position:fixed;left:${c.left+12}px;top:${c.top-42}px;width:44px;height:36px`;
      button.onclick=()=>button.dataset.clicked='true';document.querySelector('article').append(button);
    });
    const action=page.locator('#nearby-native-action'),style=await action.getAttribute('style');
    await expect.poll(()=>page.evaluate(()=>{
      const a=document.querySelector('#nearby-native-action').getBoundingClientRect();
      return ['#cgpt-ra-dock','#cgpt-ra-floating-toggle'].every(id=>{const r=document.querySelector(id).getBoundingClientRect();return r.bottom<=a.top-8||r.top>=a.bottom+8||r.right<=a.left-8||r.left>=a.right+8;});
    })).toBe(true);
    await action.click();await expect(action).toHaveAttribute('data-clicked','true');
    expect(await action.getAttribute('style')).toBe(style);expect(await page.locator('form').getAttribute('style')).toBe(nativeStyle);
    await action.evaluate(e=>e.remove());
    await expect.poll(()=>page.evaluate(()=>Math.abs(document.querySelector('#cgpt-ra-dock').getBoundingClientRect().bottom-document.querySelector('form').getBoundingClientRect().top))).toBeLessThan(.5);
    expect(await storedLayout(page)).toEqual(saved);await layout(page);await page.close();
  });
  test('rounded composer corners join visually without covering native input',async()=>{
    const page=await open(1366);await setting(page,{notifyDownloadReady:false});
    await layout(page,profile({preset:'composer'}));await page.locator('#native-read').click();
    for(const width of [1366,768,390,320]) for(const dark of [false,true]) {
      await page.setViewportSize({width,height:800});
      await page.evaluate(dark=>{
        document.documentElement.className=dark?'dark':'light';
        document.body.style.background=dark?'#101010':'#fff';
        document.querySelector('form').style.cssText+=`;background:${dark?'#212121':'#eee'};border-radius:28px;box-shadow:inset 0 0 0 1px #8884`;
      },dark);
      const nativeStyle=await page.locator('form').getAttribute('style');
      await expect(page.locator('#cgpt-ra-layer > .cgpt-ra-dock-join')).toBeVisible();
      // Theme sampling is scheduled independently of unchanged composer geometry.
      await expect(page.locator('#cgpt-ra-dock')).toHaveCSS('background-color',dark?'rgb(33, 33, 33)':'rgb(238, 238, 238)');
      await expect.poll(()=>page.evaluate(()=>{
        const join=document.querySelector('#cgpt-ra-layer > .cgpt-ra-dock-join').getBoundingClientRect(), c=document.querySelector('form').getBoundingClientRect();
        return Math.abs(join.left-c.left)<.5&&Math.abs(join.top-c.top)<.5&&Math.abs(join.width-c.width)<.5;
      })).toBe(true);
      const screenshot=await page.screenshot({animations:'disabled'});
      const pixels=await page.evaluate(async data=>{
        const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
        const r=document.querySelector('form').getBoundingClientRect();
        return [r.left+2,r.right-3].map(x=>Array.from(ctx.getImageData(Math.floor(x),Math.floor(r.top+2),1,1).data).slice(0,3));
      },screenshot.toString('base64'));
      expect(pixels).toEqual(dark?[[33,33,33],[33,33,33]]:[[238,238,238],[238,238,238]]);
      expect(await page.locator('form').getAttribute('style')).toBe(nativeStyle);
      await page.getByRole('textbox',{name:'Message',exact:true}).fill('Native input remains reachable');
      if(dark&&width===1366) {
        const r=await page.locator('form').boundingBox();
        await page.screenshot({path:`build/dock-join-${distribution}.png`,clip:{x:r.x-2,y:r.y-54,width:r.width+4,height:r.height+56}});
      }
    }
    await page.locator('#cgpt-ra-floating-toggle').click();
    await expect(page.locator('#cgpt-ra-layer > .cgpt-ra-dock-join')).toBeHidden();
    await page.close();
  });
  test('L seek uses side gap and top presets avoid native action clusters',async()=>{
    const page=await open(1600);await setting(page,{notifyDownloadReady:false});await page.locator('#native-read').click();
    for(const preset of ['bottom-left','bottom-right']) {
      await layout(page,profile({preset,seekFirst:false}));
      await expect.poll(()=>page.evaluate(preset=>{
        const s=document.getElementById('cgpt-ra-left').getBoundingClientRect(),c=document.querySelector('form').getBoundingClientRect();
        return s.width>244&&s.width<400&&(preset==='bottom-left'?s.right<=c.left-6:s.left>=c.right+6);
      },preset)).toBe(true);
    }
    await page.evaluate(()=>{const actions=document.createElement('div');actions.id='conversation-header-actions';actions.style.cssText='position:fixed;right:12px;top:8px;display:flex';actions.innerHTML='<button style="width:120px;height:44px">Native actions</button>';document.body.append(actions);});
    for(const seekFirst of [true,false]) {
      await layout(page,profile({preset:'top-right',seekFirst}));
      await expect.poll(()=>page.locator('#cgpt-ra-floating-toggle').evaluate(e=>e.getBoundingClientRect().top)).toBeGreaterThanOrEqual(60);
      await page.locator('#conversation-header-actions button').click();
    }
    await layout(page);await page.close();
  });
  test('RTL is scoped to player and popovers remain reachable at narrow widths',async()=>{
    const page=await open(320);await setting(page,{language:'ar',notifyDownloadReady:false});await layout(page);await page.locator('#native-read').click();
    await expect(page.locator('#cgpt-ra-right')).toHaveAttribute('dir','rtl');expect(await page.locator('html').getAttribute('dir')).toBeNull();
    await expect(page.locator('.cgpt-ra-seek-slider')).toHaveCSS('direction','ltr');
    await page.locator('.cgpt-ra-more').click();
    for(const selector of ['.cgpt-ra-speed-wrap','.cgpt-ra-volume-wrap','.cgpt-ra-help-wrap']) {
      await page.locator(`${selector} > button`).click();
      await expect.poll(()=>page.locator(`${selector} [class*="popover"], ${selector} .cgpt-ra-speed-menu`).first().evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})).toBe(true);
      await page.locator(`${selector} > button`).click();
    }
    await page.screenshot({path:`build/browser-results/${distribution}-mobile-rtl-v1.4.0.png`});await setting(page,{language:'en'});await page.close();
  });
  if(distribution==='userscript')test('standalone keyboard settings and failed layout saves are honest',async()=>{
    const page=await open();await setting(page,{language:'en',notifyDownloadReady:false});await layout(page);await page.locator('#native-read').click();
    await revealSecondary(page);await page.locator('.cgpt-ra-help-wrap > button').click();await page.locator('.cgpt-ra-help').getByRole('button',{name:'Open Dashboard & Settings'}).click();
    const dialog=page.locator('#cgpt-ra-settings-dialog');await expect(dialog).toBeVisible();
    await dialog.locator('select').nth(1).selectOption('top-left');await dialog.getByRole('button',{name:'Got it'}).click();
    await expect.poll(async()=>(await storedLayout(page)).desktop.preset).toBe('top-left');
    await expect(page.locator('#cgpt-ra-floating-toggle')).toHaveAttribute('data-preset','top-left');
    const saved=await storedLayout(page);
    await page.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='cgpt-ra-layout-v1')throw new DOMException('Quota reached','QuotaExceededError');return set.call(this,key,value);};});
    await startDrag(page,'#cgpt-ra-floating-toggle');await drop(page,'.cgpt-ra-drop-target[data-preset="bottom-right"] [data-part="circle"]');
    await expect(page.locator('#cgpt-ra-status')).toContainText('save');expect(await storedLayout(page)).toEqual(saved);
    await page.reload();await expect(page.locator('#cgpt-ra-floating-toggle')).toBeVisible();await layout(page);await page.close();
  });
  test('compact vertical controls expose unclipped secondary actions beside the rail',async()=>{
    const page=await open(1200);await page.setViewportSize({width:1200,height:580});await page.locator('#native-read').click();
    for(const preset of ['left','right'])for(const seekFirst of [true,false]){
      await layout(page,profile({preset,seekFirst}));
      await expect(page.locator('#cgpt-ra-floating-toggle')).toHaveAttribute('data-preset',preset);
      await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
      await expect(page.locator('#cgpt-ra-right')).toHaveClass(/cgpt-ra-compact-controls/);
      await expect(page.locator('#cgpt-ra-right')).toHaveClass(/cgpt-ra-vertical/);
      await revealSecondary(page);
      const rail=await page.locator('#cgpt-ra-right').boundingBox(), menu=await page.locator('.cgpt-ra-extras').boundingBox();
      expect(menu.x+menu.width<=rail.x||menu.x>=rail.x+rail.width).toBe(true);
      for(const selector of ['.cgpt-ra-speed-btn','.cgpt-ra-volume-btn','.cgpt-ra-download','.cgpt-ra-help-wrap > button']){
        const box=await page.locator(selector).boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(menu.x);expect(box.x+box.width).toBeLessThanOrEqual(menu.x+menu.width+0.5);
      }
      await page.keyboard.press('Escape');
    }
    await page.close();
  });
  test('uninterrupted native audio keeps advancing',async()=>{
    const page=await open();await page.locator('#native-read').click();
    await expect.poll(()=>page.locator('#host').evaluate(a=>a.currentTime),{timeout:10000}).toBeGreaterThan(5);
    await page.close();
  });
  test('native start, destructive host pause, repeated resume and replacement',async()=>{
    const page=await open();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await expect(page.locator('.cgpt-inline-readaloud')).toHaveCount(0);await page.locator('#native-read').click();
    await expect.poll(()=>time(page)).toBeGreaterThanOrEqual(2);
    for(let i=0;i<3;i++){
      const before=await time(page);await page.locator('.cgpt-ra-play').click();
      await expect(page.locator('.cgpt-ra-play polygon')).toHaveCount(1);
      await expect(page.locator('#host')).not.toHaveAttribute('src');await expect(page.locator('#cgpt-ra-right')).toBeVisible();
      expect(await time(page)).toBeGreaterThanOrEqual(before);
      await page.locator('.cgpt-ra-play').click();
      await expect(page.locator('.cgpt-ra-play rect')).toHaveCount(2);
      await expect.poll(()=>time(page)).toBeGreaterThan(before);
    }
    await page.locator('.cgpt-ra-play').click();const saved=await time(page);await page.locator('.cgpt-ra-forward').click();expect(await time(page)).toBeGreaterThanOrEqual(saved+9);
    await revealSecondary(page);await page.locator('.cgpt-ra-speed-btn').click();await page.locator('[data-speed="1.5"]').click();await expect(page.locator('.cgpt-ra-speed-btn')).toHaveText('1.5×');
    await page.locator('#new-read').click();await expect.poll(()=>page.locator('#host').evaluate(a=>!a.paused&&a.readyState>=2)).toBe(true);await expect.poll(()=>time(page)).toBeLessThan(3);
    await page.evaluate(()=>history.pushState({},'', '/c/another'));await expect(page.locator('#cgpt-ra-right')).toBeHidden({timeout:7000});
    expect(errors).toEqual([]);await page.close();
  });
  test('early pause and rapid toggles preserve the session',async()=>{
    const page=await open();await page.locator('#native-read').click();await expect(page.locator('.cgpt-ra-play')).toBeEnabled();
    await page.locator('.cgpt-ra-play').click();await page.locator('.cgpt-ra-play').click();await page.locator('.cgpt-ra-play').click();
    await expect(page.locator('.cgpt-ra-play polygon')).toHaveCount(1);await page.locator('.cgpt-ra-play').click();await expect.poll(()=>time(page)).toBeGreaterThanOrEqual(1);await page.close();
  });
  test('direct audio URL retains recovery payload through destructive pause',async()=>{
    const page=await open();
    await page.evaluate(()=>{const host=document.getElementById('host');host.src='/speech.wav';void host.play();});
    await expect.poll(()=>time(page)).toBeGreaterThanOrEqual(2);
    const before=await time(page);await page.locator('.cgpt-ra-play').click();
    await expect(page.locator('#host')).not.toHaveAttribute('src');
    await page.locator('.cgpt-ra-play').click();
    await expect.poll(()=>time(page)).toBeGreaterThan(before);
    await expect(page.locator('.cgpt-ra-duration')).toHaveText('2:00');
    const downloading=page.waitForEvent('download');await revealSecondary(page);await page.locator('.cgpt-ra-download').click();
    expect(await fs.readFile(await (await downloading).path())).toEqual(wav());
    await page.close();
  });
  test('download filename respects retained AAC MIME without converting bytes',async()=>{
    const page=await open();
    // The playable tone isolates MIME-to-filename selection; native AAC decoding
    // is covered separately by real-device acceptance.
    await page.route('**/speech.wav',route=>route.fulfill({contentType:'audio/aac',body:wav()}));
    await page.locator('#native-read').click();
    await expect.poll(()=>time(page)).toBeGreaterThanOrEqual(1);
    const downloading=page.waitForEvent('download');await revealSecondary(page);await page.locator('.cgpt-ra-download').click();
    const download=await downloading;expect(download.suggestedFilename()).toMatch(/\.aac$/);
    expect(await fs.readFile(await download.path())).toEqual(wav());await page.close();
  });
  for(const cancel of [false,true]) test(`slow native speech requests survive the capture timeout (${cancel?'then canceled by host':'then completed'})`,async()=>{
    const page=await open(); await page.clock.install();
    let release;
    const gate=new Promise(resolve=>release=resolve);
    await page.route('**/slow-speech',async route=>{await gate;await route.fulfill({contentType:'audio/mpeg',body:'native response continues'}).catch(()=>{});});
    const requested=page.waitForRequest('**/slow-speech');
    await page.evaluate(()=>{
      window.slowResult='pending';
      window.slowAbort=new AbortController();
      fetch('/slow-speech',{signal:window.slowAbort.signal}).then(r=>r.text()).then(value=>window.slowResult=value,error=>window.slowResult=error.name);
    });
    await requested;
    try {
      await page.clock.fastForward(61000);
      expect(await page.evaluate(()=>window.slowResult)).toBe('pending');
      if(cancel) {
        await page.evaluate(()=>window.slowAbort.abort());
        await expect.poll(()=>page.evaluate(()=>window.slowResult)).toBe('AbortError');
      } else {
        release();
        await expect.poll(()=>page.evaluate(()=>window.slowResult)).toBe('native response continues');
      }
    } finally {release();await page.close();}
  });
  test('progressing speech retention beyond one minute preserves pause, backward seek and download',async()=>{
    const page=await open();await setting(page,{notifyDownloadReady:false});await page.clock.install();
    let requests=0;page.on('request',r=>{if(r.url().endsWith('/speech.mp3'))requests++;});
    await page.evaluate(async()=>{
      // Delay the retained response body, independently of the native consumer.
      // This exercises the real clone reader and inactivity deadline, not just headers.
      const clone=Response.prototype.clone;
      Response.prototype.clone=function(){
        const copy=clone.call(this);if(!this.url.endsWith('/speech.mp3'))return copy;
        const stream=new ReadableStream({start(controller){window.retainedBody=controller;},cancel(){window.retainedCanceled=true;}});
        void copy.arrayBuffer().then(bytes=>window.retainedBytes=new Uint8Array(bytes));
        return new Response(stream,{headers:this.headers});
      };
      const response=await fetch('/speech.mp3',{signal:(window.speechAbort=new AbortController()).signal});
      const source=new MediaSource(),host=document.getElementById('host');
      host.addEventListener('pause',()=>window.speechAbort.abort(),{once:true});
      source.addEventListener('sourceopen',async()=>{
        const buffer=source.addSourceBuffer('audio/mpeg'),bytes=await response.arrayBuffer();
        buffer.addEventListener('updateend',()=>{if(source.readyState==='open')source.endOfStream();},{once:true});buffer.appendBuffer(bytes);
      },{once:true});
      host.src=URL.createObjectURL(source);void host.play().catch(()=>{});
    });
    await expect.poll(()=>page.evaluate(()=>!!window.retainedBytes)).toBe(true);
    await expect(page.locator('.cgpt-ra-play')).toBeEnabled();
    for(const last of [false,true]) {
      await page.clock.fastForward(59000);
      expect(await page.evaluate(()=>!!window.retainedCanceled)).toBe(false);
      await page.evaluate(last=>{
        const bytes=window.retainedBytes,half=Math.floor(bytes.length/2);
        window.retainedBody.enqueue(last?bytes.slice(half):bytes.slice(0,half));
        if(last)window.retainedBody.close();
      },last);
      // Allow the clone's read loop to observe the chunk before advancing time.
      await page.evaluate(()=>new Promise(resolve=>queueMicrotask(resolve)));
    }
    await page.clock.resume();
    await page.locator('#host').evaluate(audio=>audio.currentTime=15);
    await expect.poll(()=>time(page)).toBeGreaterThanOrEqual(15);
    await page.locator('.cgpt-ra-play').click();
    await expect(page.locator('#host')).not.toHaveAttribute('src');
    await page.locator('.cgpt-ra-back').click();
    await expect.poll(()=>time(page)).toBeLessThan(10);
    const pausedAt=await time(page);
    await page.locator('.cgpt-ra-play').click();
    await expect.poll(()=>time(page)).toBeGreaterThan(pausedAt);
    await page.locator('.cgpt-ra-play').click();await page.locator('.cgpt-ra-play').click();
    await expect(page.locator('.cgpt-ra-play rect')).toHaveCount(2);
    const downloading=page.waitForEvent('download');await revealSecondary(page);await page.locator('.cgpt-ra-download').click();
    expect(await fs.readFile(await (await downloading).path())).toEqual(await fs.readFile('tests/fixtures/speech.mp3'));
    expect(requests).toBe(1);await page.close();
  });
  test('MediaSource speech survives host abort, source removal and file-decoder rejection',async()=>{
    const page=await open();
    let requests=0;page.on('request',r=>{if(r.url().endsWith('/speech.mp3'))requests++;});
    await page.evaluate(()=>{const load=HTMLMediaElement.prototype.load;HTMLMediaElement.prototype.load=function(...args){if(window.rejectRetainedFile&&this.id!=='host'&&this.src.startsWith('blob:')){window.rejectRetainedFile=false;queueMicrotask(()=>this.dispatchEvent(new Event('error')));return;}return load.apply(this,args);};});
    for(const forcedFallback of [false,true])for(const immediate of [false,true]){
      await page.evaluate(value=>window.rejectRetainedFile=value,forcedFallback);
      await page.evaluate(async()=>{
        const response=await fetch('/speech.mp3',{signal:(window.speechAbort=new AbortController()).signal});
        const source=new MediaSource(),host=document.getElementById('host');
        host.addEventListener('pause',()=>window.speechAbort.abort(),{once:true});
        source.addEventListener('sourceopen',async()=>{
          if(source.readyState!=='open')return;
          const buffer=source.addSourceBuffer('audio/mpeg');
          const bytes=await response.arrayBuffer();
          if(source.readyState!=='open')return;
          buffer.addEventListener('updateend',()=>{if(source.readyState==='open')source.endOfStream();},{once:true});
          buffer.appendBuffer(bytes);
        },{once:true});
        host.src=URL.createObjectURL(source);void host.play().catch(()=>{});
      });
      await expect(page.locator('.cgpt-ra-play')).toBeEnabled();
      if(!immediate)await expect.poll(()=>time(page)).toBeGreaterThanOrEqual(2);
      const before=await time(page);await page.locator('.cgpt-ra-play').click();
      await expect(page.locator('#host')).not.toHaveAttribute('src');
      expect(await page.evaluate(()=>window.speechAbort.signal.aborted)).toBe(true);
      await page.locator('.cgpt-ra-play').click();
      await expect.poll(()=>time(page)).toBeGreaterThan(before);
      await expect(page.locator('.cgpt-ra-duration')).toHaveText('0:30');
    }
    expect(requests).toBe(4);
    await page.close();
  });
  test('capsules avoid composer across viewport and content sizes',async()=>{
    const page=await open(2124);await page.locator('#native-read').click();await expect(page.locator('#cgpt-ra-right')).not.toHaveClass(/cgpt-ra-compact/);
    for(const width of [2124,1366,1093,910,800,390]){
      await page.setViewportSize({width,height:800});await page.getByRole('textbox',{name:'Message',exact:true}).fill('Expanded composer\n'.repeat(5));
      await expect.poll(()=>page.evaluate(()=>{const c=document.querySelector('form').getBoundingClientRect();return ['cgpt-ra-left','cgpt-ra-right'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&(r.bottom<=c.top||r.right<=c.left||r.left>=c.right);});})).toBe(true);
    }
    await page.screenshot({path:`build/browser-results/${distribution}-capsules.png`});expect(await page.locator('#native-voice').evaluate(e=>getComputedStyle(e).color)).toBe('rgb(123, 45, 67)');
    if(distribution==='extension') {
      await page.evaluate(()=>document.documentElement.classList.add('light'));
      await page.setViewportSize({width:1366,height:800});
      await page.getByRole('textbox',{name:'Message',exact:true}).fill('');
      await layout(page,profile({preset:'composer'}));
      await expect(page.locator('#cgpt-ra-dock')).toBeVisible();
      await expect(page.locator('#cgpt-ra-right')).toHaveCSS('color','rgb(13, 13, 13)');
      await expect.poll(()=>time(page)).toBeGreaterThan(0);
      await fs.mkdir('assets/store/screenshots',{recursive:true});
      await page.locator('#cgpt-ra-dock').screenshot({path:'build/browser-results/v1.4.1-playback-demo.png'});
    }
    await page.close();
  });
  test('legacy composer, sidebar shifts and theme changes keep capsule bounds clear',async()=>{
    const page=await open(1800);await page.locator('#native-read').click();
    for(const dark of [false,true]){
      await page.evaluate(dark=>{document.documentElement.classList.toggle('dark',dark);const form=document.querySelector('form');form.removeAttribute('data-chatgpt-composer');const input=form.querySelector('[data-composer-markdown], #prompt-textarea');input.removeAttribute('data-composer-markdown');input.id='prompt-textarea';form.style.left=dark?'65%':'45%';form.style.width='600px';},dark);
      await expect.poll(()=>page.evaluate(()=>{const c=document.querySelector('form').getBoundingClientRect();return ['cgpt-ra-left','cgpt-ra-right'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.bottom<=c.top||r.right<=c.left||r.left>=c.right;});}),{timeout:7000}).toBe(true);
    }
    await page.close();
  });
  test('keyboard, volume, exact-source download and rejected resume',async()=>{
    const page=await open();await page.locator('#native-read').click();await expect.poll(()=>time(page)).toBeGreaterThanOrEqual(1);
    await page.getByRole('textbox',{name:'Message',exact:true}).fill('typing');await page.keyboard.press('k');
    await expect(page.locator('.cgpt-ra-play rect')).toHaveCount(2);
    await page.locator('main p').click();await page.keyboard.press('k');await expect(page.locator('.cgpt-ra-play polygon')).toHaveCount(1);
    await page.locator('.cgpt-ra-volume-slider').evaluate(input=>{input.value='0.4';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await expect(page.locator('.cgpt-ra-volume-value')).toHaveText('40%');
    const downloading=page.waitForEvent('download');await revealSecondary(page);await page.locator('.cgpt-ra-download').click();const download=await downloading;
    expect(await fs.readFile(await download.path())).toEqual(wav());
    await page.evaluate(()=>{const audio=window.fixtureAudios.at(-1);audio.play=()=>Promise.reject(new DOMException('Fixture rejection','NotAllowedError'));});
    await page.locator('.cgpt-ra-play').click();await expect(page.locator('#cgpt-ra-status')).toContainText('could not resume');
    await expect(page.locator('.cgpt-ra-play')).toHaveAttribute('aria-busy','false');
    await expect(page.locator('.cgpt-ra-play polygon')).toHaveCount(1);await page.close();
  });
  if(distribution==='extension') test('responsive popup and dashboard, local settings, reset and actual command bindings',async()=>{
    await worker.evaluate(async()=>{await chrome.storage.sync.clear();await chrome.storage.local.clear();});
    const page=await context.newPage();
    for(const language of ['en','ta','ar','he']) {
      await setting(page,{language});
      for(const surface of ['popup','options']) {
        await page.goto(`chrome-extension://${extensionId}/src/${surface}/index.html`);
        await expect(page.locator('html')).toHaveAttribute('dir',language==='ar'||language==='he'?'rtl':'ltr');
        for(const width of [320,360,390,768,1280]) {
          await page.setViewportSize({width,height:800});
          await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth ? [] : [...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({element:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right}))),{message:`${surface} ${language} ${width}`}).toEqual([]);
        }
        if(language==='ar') {await page.setViewportSize({width:390,height:800});await page.screenshot({path:`build/browser-results/${surface}-rtl-v1.4.0.png`,fullPage:true});}
      }
    }
    await setting(page,{language:'en'});await page.reload();
    await page.locator('.layout-settings').getByLabel('Placement',{exact:true}).selectOption('top-left');
    await expect.poll(async()=>(await storedLayout(page)).desktop.preset).toBe('top-left');
    await page.locator('.layout-settings').getByLabel('Seek pill first',{exact:true}).uncheck();
    await expect.poll(async()=>(await storedLayout(page)).desktop.seekFirst).toBe(false);
    await page.locator('.layout-settings').getByRole('button',{name:'Reset layout'}).click();
    await expect.poll(async()=>(await storedLayout(page)).desktop.preset).toBe('original');
    await page.getByRole('button',{name:'Shortcuts & Gestures'}).click();
    await expect(page.locator('.release-ui kbd')).toHaveCount(15);await expect(page.locator('.release-ui')).toContainText('Alt+Shift+Y');
    await page.close();
  });
  if(distribution==='extension') test('compact settings support, language order, shortcut edit guidance and screenshots',async()=>{
    const page=await context.newPage();await setting(page,{language:'en'});
    await page.setViewportSize({width:1280,height:900});
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);
    const support=page.locator('.support-card .support-actions');await expect(support.locator('a')).toHaveCount(4);
    await expect(support.locator('a').nth(0)).toHaveAttribute('href',/intent=suggestion/);
    await expect(support.locator('a').nth(1)).toHaveAttribute('href',/intent=bug/);
    await expect(support.locator('a').nth(2)).toHaveAttribute('href',/chromewebstore.*reviews/);
    await expect(support.locator('a').nth(3)).toHaveAttribute('href',/microsoftedge.*#review-section/);
    await expect(page.locator('.settings-section .card').first()).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
    await expect(page.locator('.sidebar-footer > :first-child')).toHaveAttribute('role','radiogroup');
    await fs.mkdir('assets/store/screenshots',{recursive:true});
    await page.screenshot({path:'build/browser-results/v1.4.1-dashboard.png'});
    await page.getByRole('button',{name:'Shortcuts & Gestures'}).click();
    const edit=page.locator('.shortcut-edit').first();await expect(edit).toHaveAccessibleName(/Edit in browser:/);const command=(await edit.getAttribute('aria-label')).split(': ').slice(1).join(': ');
    const created=context.waitForEvent('page');await edit.click();const shortcuts=await created;
    await expect.poll(()=>shortcuts.url()).toMatch(/^chrome:\/\/extensions\/shortcuts/);
    await shortcuts.close();await page.bringToFront();
    await expect(page.locator('[role=status]')).toContainText(command);
    await expect(page.locator('[role=status]')).toContainText('browser');
    await page.close();
  });
  if(distribution==='userscript') test('restores saved player speed and volume after reload',async()=>{
    const page=await open();await layout(page);
    await page.evaluate(()=>{localStorage.removeItem('cgpt-ra-v4-speed');localStorage.removeItem('cgpt-ra-v4-volume');});
    await setting(page,{language:'en',notifyDownloadReady:false,defaultSpeed:1.25,defaultVolume:0.8});
    await page.reload();await page.locator('#native-read').click();
    await expect(page.locator('.cgpt-ra-speed-btn')).toHaveText('1.25×');
    await revealSecondary(page);await page.locator('.cgpt-ra-speed-btn').click();await page.locator('[data-speed="1.75"]').click();
    await revealSecondary(page);await page.locator('.cgpt-ra-volume-btn').click();
    await expect(page.locator('.cgpt-ra-volume-slider')).toBeVisible();
    await page.locator('.cgpt-ra-volume-slider').press('Home');await page.locator('.cgpt-ra-volume-slider').press('ArrowRight');
    await expect(page.locator('.cgpt-ra-volume-value')).toHaveText('1%');
    await page.reload();await page.locator('#native-read').click();
    await expect(page.locator('.cgpt-ra-speed-btn')).toHaveText('1.75×');
    await expect.poll(()=>page.locator('#host').evaluate(audio=>({speed:audio.playbackRate,volume:audio.volume}))).toEqual({speed:1.75,volume:0.01});
    await revealSecondary(page);await page.locator('.cgpt-ra-volume-btn').click();await expect(page.locator('.cgpt-ra-volume-slider')).toBeVisible();
    await page.locator('.cgpt-ra-volume-slider').press('Home');await expect(page.locator('.cgpt-ra-volume-value')).toHaveText('0%');
    await page.reload();await page.locator('#native-read').click();
    await expect.poll(()=>page.locator('#host').evaluate(audio=>audio.volume)).toBe(0);
    // Corrupt legacy values must fall back to the configured defaults.
    await page.evaluate(()=>{localStorage.setItem('cgpt-ra-v4-speed','invalid');localStorage.setItem('cgpt-ra-v4-volume','2');});
    await page.reload();await page.locator('#native-read').click();
    await expect.poll(()=>page.locator('#host').evaluate(audio=>({speed:audio.playbackRate,volume:audio.volume}))).toEqual({speed:1.25,volume:0.8});
    await page.evaluate(()=>{localStorage.removeItem('cgpt-ra-v4-speed');localStorage.removeItem('cgpt-ra-v4-volume');});
    await setting(page,{language:'en'});await page.close();
  });
  test('Escape closes wide player popovers and restores their visible trigger',async()=>{
    const page=await open(1800);await setting(page,{language:'en'});await layout(page);await page.locator('#native-read').click();
    await expect(page.locator('.cgpt-ra-more')).toBeHidden();
    for(const selector of ['.cgpt-ra-help-wrap','.cgpt-ra-volume-wrap','.cgpt-ra-speed-wrap']) {
      const trigger=page.locator(selector+' > button');
      await trigger.click();await expect(page.locator(selector)).toHaveClass(/cgpt-open/);
      await trigger.press('Escape');await expect(page.locator(selector)).not.toHaveClass(/cgpt-open/);
      await expect(trigger).toBeFocused();
    }
    await page.close();
  });
  test('help command opens compact composer overflow',async()=>{
    const page=await open();await setting(page,{language:'en',enableShortcuts:true});
    await page.locator('form').evaluate(form=>form.style.width='560px');
    await layout(page,profile({preset:'composer'}));
    await expect(page.locator('#cgpt-ra-floating-toggle')).toHaveAttribute('data-preset','composer');
    const help=()=>page.evaluate(()=>window.postMessage({source:'chatgpt-audio-controls-settings-bridge',type:'CGPT_RA_COMMAND',command:'open-help'},'*'));
    await help();await expect(page.locator('#cgpt-ra-right')).toHaveClass(/cgpt-ra-compact-controls/);
    await expect(page.locator('.cgpt-ra-help')).toBeVisible();
    await expect(page.locator('.cgpt-ra-more')).toHaveAttribute('aria-expanded','true');
    await help();await expect(page.locator('.cgpt-ra-help')).toBeVisible();
    await page.locator('.cgpt-ra-more').press('Escape');
    await expect(page.locator('.cgpt-ra-help')).toBeHidden();
    await expect(page.locator('.cgpt-ra-more')).toHaveAttribute('aria-expanded','false');
    await help();await expect(page.locator('.cgpt-ra-help')).toBeVisible();
    await layout(page);await page.close();
  });
  if(distribution==='extension') test('every browser command dispatches, respects disable, and ignores other tabs',async()=>{
    const page=await open();await worker.evaluate(()=>chrome.storage.sync.clear());await setting(page,{language:'en',notifyDownloadReady:false,tapSeekSeconds:5});await page.locator('#native-read').click();
    await expect.poll(()=>time(page)).toBeGreaterThanOrEqual(1);
    await page.bringToFront();const tabId=await worker.evaluate(async()=> (await chrome.tabs.query({active:true,lastFocusedWindow:true}))[0].id);
    const command=type=>worker.evaluate(({tabId,type})=>chrome.tabs.sendMessage(tabId,{type},{frameId:0}),{tabId,type});
    await command('play-pause');await expect(page.locator('.cgpt-ra-play polygon')).toHaveCount(1);
    const start=await time(page);await command('seek-forward');expect(await time(page)).toBeGreaterThanOrEqual(start+4);await command('seek-back');expect(await time(page)).toBeLessThanOrEqual(start+1);
    await command('speed-increase');await expect(page.locator('.cgpt-ra-speed-btn')).toHaveText('1.1×');await command('speed-decrease');await expect(page.locator('.cgpt-ra-speed-btn')).toHaveText('1×');
    await command('speed-increase');await command('speed-reset');await expect(page.locator('.cgpt-ra-speed-btn')).toHaveText('1×');
    await command('volume-decrease');await expect(page.locator('.cgpt-ra-volume-value')).toHaveText('95%');await command('volume-increase');await expect(page.locator('.cgpt-ra-volume-value')).toHaveText('100%');
    await command('toggle-mute');await expect(page.locator('.cgpt-ra-volume-value')).toHaveText('0%');await command('toggle-mute');
    const downloading=page.waitForEvent('download');await command('download-audio');expect(await fs.readFile(await(await downloading).path())).toEqual(wav());
    await command('toggle-collapse');await expect(page.locator('#cgpt-ra-floating-toggle')).toHaveAttribute('aria-expanded','false');await command('toggle-collapse');
    await command('toggle-floating-ui');await expect.poll(()=>worker.evaluate(()=>chrome.storage.sync.get('cgpt-ra-settings.floatingUiHidden').then(v=>v['cgpt-ra-settings.floatingUiHidden']))).toBe(true);await command('toggle-floating-ui');
    await layout(page,profile({preset:'top-left'}));await command('reset-layout');await expect.poll(async()=>(await storedLayout(page)).desktop.preset).toBe('original');
    await command('open-help');await expect(page.locator('.cgpt-ra-help')).toBeVisible();
    const opened=context.waitForEvent('page');await command('open-settings');const options=await opened;await options.waitForLoadState();await options.close();
    await worker.evaluate(()=>chrome.storage.sync.set({'cgpt-ra-settings.enableShortcuts':false}));await command('play-pause');await expect(page.locator('.cgpt-ra-play polygon')).toHaveCount(1);
    const unrelated=await context.newPage();await unrelated.goto('data:text/html,Other');
    expect(await worker.evaluate(async()=>{const tab=(await chrome.tabs.query({active:true,lastFocusedWindow:true}))[0];try{await chrome.tabs.sendMessage(tab.id,{type:'play-pause'},{frameId:0});return true;}catch{return false;}})).toBe(false);
    await unrelated.close();await worker.evaluate(()=>chrome.storage.sync.clear());await page.close();
  });
  if(distribution==='extension') test('popup footer and feedback entry',async()=>{
    await worker.evaluate(async()=>{await chrome.storage.sync.clear();await chrome.storage.sync.set({'cgpt-ra-settings':{enableInlineButtons:true,defaultSpeed:1.5,language:'en'}});});
    const page=await context.newPage();await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await expect(page.locator('.popup-footer').getByRole('link',{name:'Help and troubleshooting'})).toBeVisible();await expect(page.getByText('Inline Speech Buttons',{exact:true})).toHaveCount(0);
    await expect(page.locator('.speed-chip.active')).toHaveText('1.5×');
    const help=page.locator('.popup-footer').getByRole('link',{name:'Help and troubleshooting'});await help.focus();await expect(help).toBeFocused();
    await expect(help).toHaveAttribute('href',/chatgpt-audio-controls\.infoxica\.com\/#help/);
    await page.getByRole('button',{name:'About',exact:true}).click();await expect(page.getByRole('link',{name:/Share a suggestion/})).toHaveAttribute('href',/source=installed/);
    await page.screenshot({path:'build/browser-results/popup-v1.3.0.png'});await page.close();
  });
  if(distribution==='extension') test('popup and dashboard share theme preferences and follow system changes',async()=>{
    await worker.evaluate(()=>chrome.storage.sync.clear());
    const popup=await context.newPage(),dashboard=await context.newPage();
    await popup.emulateMedia({colorScheme:'light'}); await dashboard.emulateMedia({colorScheme:'light'});
    await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await dashboard.goto(`chrome-extension://${extensionId}/src/options/index.html`);
    await expect(popup.locator('html')).toHaveAttribute('data-theme','light');
    await expect(popup.getByRole('radiogroup',{name:'Appearance'}).getByRole('radio')).toHaveCount(3);
    await popup.getByRole('radio',{name:'Dark',exact:true}).click();
    await expect(popup.getByRole('radio',{name:'Dark',exact:true})).toBeChecked();
    await expect(dashboard.locator('html')).toHaveAttribute('data-theme','dark');
    await dashboard.getByRole('radio',{name:'System',exact:true}).click();
    await expect(popup.locator('html')).toHaveAttribute('data-theme','light');
    await popup.emulateMedia({colorScheme:'dark'}); await expect(popup.locator('html')).toHaveAttribute('data-theme','dark');
    await popup.reload(); await expect(popup.getByRole('radio',{name:'System',exact:true})).toBeChecked();
    await popup.getByRole('radio',{name:'System',exact:true}).focus();await popup.keyboard.press('ArrowLeft');
    await expect(popup.getByRole('radio',{name:'Dark',exact:true})).toBeChecked();
    await popup.locator('.theme-selector').screenshot({path:'build/theme-selector-dark.png'});
    await popup.keyboard.press('ArrowLeft');await expect(popup.getByRole('radio',{name:'Light',exact:true})).toBeChecked();
    await expect(dashboard.locator('html')).toHaveAttribute('data-theme','light');
    await popup.getByRole('heading',{level:1}).click();
    await popup.locator('.theme-selector').screenshot({path:'build/theme-selector-light.png'});
    await popup.setViewportSize({width:360,height:740});
    await popup.screenshot({path:'build/theme-selector-popup.png'});
    for(const width of [320,360,390]) {
      await popup.setViewportSize({width,height:740});
      expect(await popup.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await dashboard.setViewportSize({width:1280,height:800});
    await dashboard.evaluate(()=>Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
    await dashboard.screenshot({path:'build/browser-results/dashboard-v1.3.0.png'});
    await popup.close(); await dashboard.close();
  });
  test('laptop viewports retain split controls without clipping at high pixel density',async()=>{
    test.setTimeout(120000);
    const page=await open(1512);await setting(page,{language:'en',hideFloatingControls:false});
    await page.emulateMedia({reducedMotion:'reduce'});
    const cdp=await context.newCDPSession(page);
    await page.locator('#native-read').click();
    for(const [width,height] of [[1512,982],[1536,864],[1512,850],[1335,724],[1440,900],[1280,800],[1728,1117],[1920,1080],[768,800],[390,740],[360,740],[320,740]]) {
      await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:2,mobile:false});
      for(const seekFirst of [true,false]) {
        await layout(page,profile({seekFirst}),profile({preset:'composer',seekFirst}));
        await expect.poll(()=>page.evaluate(()=>{
          const controls=document.querySelector('#cgpt-ra-right'), seek=document.querySelector('#cgpt-ra-left');
          const rect=controls.getBoundingClientRect(), track=seek.getBoundingClientRect();
          const buttons=[...controls.querySelectorAll('button')].filter(el=>el.getClientRects().length && !el.closest('.cgpt-ra-extras'));
          return [rect,track].every(r=>r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight) && buttons.every(el=>{
            const b=el.getBoundingClientRect();return b.width>=44&&b.height>=44&&b.left>=rect.left&&b.right<=rect.right&&b.top>=rect.top&&b.bottom<=rect.bottom;
          });
        })).toBe(true);
        if(width>=1440) {
          await expect.poll(()=>page.evaluate(()=>{
            const c=document.querySelector('form').getBoundingClientRect(),b=document.querySelector('#cgpt-ra-floating-toggle').getBoundingClientRect();
            return Math.abs(b.left-c.right-6)<1;
          })).toBe(true);
        }
      }
      if(width===1512)await page.screenshot({path:`build/browser-results/${distribution}-1512-982.png`});
    }
    await cdp.send('Emulation.clearDeviceMetricsOverride');
    await layout(page);await page.close();
  });

});
