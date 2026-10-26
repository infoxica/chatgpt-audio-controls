import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';

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
    await context.route('https://chatgpt.com/**',route=>route.request().url().endsWith('/speech.wav')?route.fulfill({contentType:'audio/wav',body:wav()}):route.fulfill({contentType:'text/html',body:fixture()}));
  });
  test.afterAll(async()=>{await context?.close();});
  async function open(width=1366){
    const page=await context.newPage();await page.setViewportSize({width,height:800});
    await page.addInitScript(()=>{window.fixtureAudios=[];const Original=window.Audio;window.Audio=function(...args){const audio=new Original(...args);window.fixtureAudios.push(audio);return audio;};});
    await page.goto('https://chatgpt.com/');await expect(page.locator('#cgpt-ra-floating-toggle')).toBeVisible();return page;
  }
  async function time(page){return (await page.locator('.cgpt-ra-current').textContent()).split(':').reduce((total,n)=>total*60+Number(n),0);}
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
    await page.locator('.cgpt-ra-speed-btn').click();await page.locator('[data-speed="1.5"]').click();await expect(page.locator('.cgpt-ra-speed-btn')).toHaveText('1.5×');
    await page.locator('#new-read').click();await expect.poll(()=>page.locator('#host').evaluate(a=>!a.paused&&a.readyState>=2)).toBe(true);await expect.poll(()=>time(page)).toBeLessThan(3);
    await page.evaluate(()=>history.pushState({},'', '/c/another'));await expect(page.locator('#cgpt-ra-right')).toBeHidden({timeout:7000});
    expect(errors).toEqual([]);await page.close();
  });
  test('early pause and rapid toggles preserve the session',async()=>{
    const page=await open();await page.locator('#native-read').click();await expect(page.locator('.cgpt-ra-play')).toBeEnabled();
    await page.locator('.cgpt-ra-play').click();await page.locator('.cgpt-ra-play').click();await page.locator('.cgpt-ra-play').click();
    await expect(page.locator('.cgpt-ra-play polygon')).toHaveCount(1);await page.locator('.cgpt-ra-play').click();await expect.poll(()=>time(page)).toBeGreaterThanOrEqual(1);await page.close();
  });
  test('capsules avoid composer across viewport and content sizes',async()=>{
    const page=await open(2124);await page.locator('#native-read').click();await expect(page.locator('#cgpt-ra-right')).not.toHaveClass(/cgpt-ra-compact/);
    for(const width of [2124,1366,1093,910,800,390]){
      await page.setViewportSize({width,height:800});await page.getByRole('textbox',{name:'Message',exact:true}).fill('Expanded composer\n'.repeat(5));
      await expect.poll(()=>page.evaluate(()=>{const c=document.querySelector('form').getBoundingClientRect();return ['cgpt-ra-left','cgpt-ra-right'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&(r.bottom<=c.top||r.right<=c.left||r.left>=c.right);});})).toBe(true);
    }
    await page.screenshot({path:`build/browser-results/${distribution}-capsules.png`});expect(await page.locator('#native-voice').evaluate(e=>getComputedStyle(e).color)).toBe('rgb(123, 45, 67)');await page.close();
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
    const downloading=page.waitForEvent('download');await page.locator('.cgpt-ra-download').click();const download=await downloading;
    expect(await fs.readFile(await download.path())).toEqual(wav());
    await page.evaluate(()=>{const audio=window.fixtureAudios.at(-1);audio.play=()=>Promise.reject(new DOMException('Fixture rejection','NotAllowedError'));});
    await page.locator('.cgpt-ra-play').click();await expect(page.locator('#cgpt-ra-status')).toContainText('could not resume');
    await expect(page.locator('.cgpt-ra-play')).toHaveAttribute('aria-busy','false');
    await expect(page.locator('.cgpt-ra-play polygon')).toHaveCount(1);await page.close();
  });
  if(distribution==='extension') test('popup footer and feedback entry',async()=>{
    await worker.evaluate(async()=>{await chrome.storage.sync.clear();await chrome.storage.sync.set({'cgpt-ra-settings':{enableInlineButtons:true,defaultSpeed:1.5,language:'en'}});});
    const page=await context.newPage();await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    await expect(page.locator('.popup-footer').getByRole('link',{name:'Help and troubleshooting'})).toBeVisible();await expect(page.getByText('Inline Speech Buttons',{exact:true})).toHaveCount(0);
    await expect(page.locator('.speed-chip.active')).toHaveText('1.5×');
    const help=page.locator('.popup-footer').getByRole('link',{name:'Help and troubleshooting'});await help.focus();await expect(help).toBeFocused();
    await expect(help).toHaveAttribute('href',/chatgpt-audio-controls\/#help/);
    await page.getByRole('button',{name:'About',exact:true}).click();await expect(page.getByRole('link',{name:/Send feedback/})).toHaveAttribute('href',/source=installed/);
    await page.screenshot({path:'build/browser-results/popup-v1.3.0.png'});await page.close();
  });
});
