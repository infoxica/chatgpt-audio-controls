// Actual browser-action popup verification in an isolated profile.
// Build first; run: node scripts/verify-support-popup.mjs msedge (or chromium).
import {chromium} from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
const channel=process.argv[2]||'msedge';
const context=await chromium.launchPersistentContext('',{channel,headless:true,ignoreDefaultArgs:['--disable-extensions'],args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`]});
try{
 const page=context.pages()[0];const cdp=await context.newCDPSession(page);
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:10000});
 let seq=0;
 function rpc(sessionId,method,params={}){return new Promise((resolve,reject)=>{const id=++seq;const timeout=setTimeout(()=>{cdp.off('Target.receivedMessageFromTarget',listener);reject(Error('CDP timeout '+method));},10000);const listener=e=>{if(e.sessionId!==sessionId)return;const m=JSON.parse(e.message);if(m.id!==id)return;clearTimeout(timeout);cdp.off('Target.receivedMessageFromTarget',listener);m.error?reject(Error(m.error.message)):resolve(m.result);};cdp.on('Target.receivedMessageFromTarget',listener);cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method,params})}).catch(reject);});}
 for(const locale of ['en','de','ar']){
  await worker.evaluate(locale=>chrome.storage.sync.set({'cgpt-ra-settings.language':locale,'cgpt-ra-settings.theme':locale==='ar'?'dark':'light'}),locale);
  await page.bringToFront();await new Promise(r=>setTimeout(r,350));await worker.evaluate(()=>chrome.action.openPopup());
  const targets=await cdp.send('Target.getTargets');const popup=targets.targetInfos.find(t=>t.url.endsWith('/src/popup/index.html'));if(!popup)throw Error('No real popup target');
  const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:popup.targetId,flatten:false});
  await rpc(sessionId,'Runtime.evaluate',{expression:`new Promise(resolve=>{const wait=()=>document.querySelectorAll('.tab-btn').length===3?resolve(true):setTimeout(wait,50);wait();})`,awaitPromise:true});
  await rpc(sessionId,'Runtime.evaluate',{expression:`document.querySelectorAll('.tab-btn')[2].click()`});
  await rpc(sessionId,'Runtime.evaluate',{expression:`new Promise(resolve=>{const wait=()=>document.querySelector('.donation-amounts')?requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))):setTimeout(wait,50);wait();})`,awaitPromise:true});
  await new Promise(r=>setTimeout(r,400));
  const report=await rpc(sessionId,'Runtime.evaluate',{expression:`JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,amounts:[...document.querySelectorAll('.donation-amounts a')].map(a=>a.textContent),direction:document.documentElement.dir,buttons:[...document.querySelectorAll('.donation-amounts a')].map(a=>({w:a.getBoundingClientRect().width,h:a.getBoundingClientRect().height}))})`,returnByValue:true});
  console.log(channel,locale,report.result.value);
  const data=JSON.parse(report.result.value);if(data.scrollWidth>data.width||data.width<350||data.amounts.length!==4||data.buttons.some(r=>r.w<44||r.h<44))throw Error('Popup bounds failure');
  const screenshot=await rpc(sessionId,'Page.captureScreenshot',{format:'png'});await fs.writeFile(`build/support-popup-${channel}-${locale}.png`,Buffer.from(screenshot.data,'base64'));
  await cdp.send('Target.closeTarget',{targetId:popup.targetId});
 }
}finally{await context.close();}
