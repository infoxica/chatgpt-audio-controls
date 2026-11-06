import { getLucideSvg } from '../content/icons';
import { getTranslations, languageDirection, resolveLanguage } from '../shared/i18n/core';
import { getReleaseCopy } from '../shared/i18n/release-copy';
import { featureCopy } from '../shared/i18n/features';
import { polishCopy } from '../shared/i18n/polish';
import { tourCopy } from '../shared/i18n/tour';
import type { ExtensionSettings } from '../shared/types';

export const TOUR_KEY = 'cgpt-ra-tour-v1';
export function mountTour(host: HTMLElement, settings: Pick<ExtensionSettings, 'language' | 'theme'>,
  finish: (skipped: boolean) => Promise<void>, standalone = false): void {
  const t = getTranslations(settings.language), r = getReleaseCopy(settings.language);
  const c = featureCopy(settings.language), copy = tourCopy(settings.language);
  const direction = languageDirection(settings.language);
  const steps = [
    { title:r.quickStart, body:r.nativeHelp, icons:['volume-2'], caption:t.content.tooltips.readAloud },
    { title:t.popup.tabs.controls, body:r.stepControl, icons:['play','rotate-ccw','rotate-cw'], caption:'0:24 ━━━━━●━━━━ 1:30' },
    { title:t.popup.quickControls.playbackSpeed, body:t.options.general.speedDesc + ' ' + t.options.general.volumeDesc, icons:['play','volume-2'], caption:'0.5×   1×   1.5×   2×   3×' },
    { title:t.content.tooltips.download, body:c.ready + '. ' + r.sourceFormat, icons:['download','check'], caption:c.ready },
    { title:c.layout, body:polishCopy(settings.language).layoutDescription + ' ' + r.hideHint, icons:['grip-vertical','minimize-2','circle-help'], caption:c.saved },
  ];
  const shadow = host.attachShadow({mode:'open'});
  const style = document.createElement('style');
  style.textContent = `
    :host{display:block;color-scheme:light dark;font:16px/1.6 system-ui,sans-serif}
    *{box-sizing:border-box} .tour{--bg:#fff;--surface:#f5f5f5;--text:#202123;--muted:#5d5d5d;--border:#dedede;--accent:#3968c8;background:var(--bg);color:var(--text);padding:24px;width:min(600px,100%);margin:auto;border-radius:20px}
    @media(prefers-color-scheme:dark){.tour:not([data-theme=light]){--bg:#212121;--surface:#2f2f2f;--text:#ececec;--muted:#b4b4b4;--border:#454545;--accent:#7ca9ff}}
    .tour[data-theme=dark]{--bg:#212121;--surface:#2f2f2f;--text:#ececec;--muted:#b4b4b4;--border:#454545;--accent:#7ca9ff}
    header{display:flex;align-items:center;gap:10px;font-size:14px}header svg{width:28px;height:28px;flex:none}header span{flex:1}
    button{font:inherit;font-size:14px;min-height:44px;min-width:44px;padding:8px 16px;border:1px solid var(--border);border-radius:12px;background:transparent;color:inherit;cursor:pointer}button:hover{background:var(--surface)}button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}button:disabled{opacity:.45;cursor:default}
    #skip{border-color:transparent;padding-inline:8px;color:var(--muted)}section{margin:24px 0}#preview{min-height:150px;border-radius:16px;background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:16px;font-size:14px;text-align:center;color:var(--muted)}.demo-controls{display:flex;gap:24px;color:var(--text);direction:ltr}.demo-controls svg{width:28px;height:28px}#progress{color:var(--muted);font-size:13px;margin:20px 0 8px}h1{font-size:clamp(24px,5vw,32px);font-weight:500;line-height:1.25;margin:0 0 14px}#description{margin:0;min-height:104px;color:var(--muted)}footer{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.primary{background:var(--text);color:var(--bg);border-color:var(--text)}.primary:hover{background:var(--text);opacity:.9}#dots{display:flex;gap:6px}#dots span{width:6px;height:6px;border-radius:50%;background:var(--border)}#dots .active{background:var(--accent)}.privacy{font-size:12px;color:var(--muted);margin:24px 0 0}#error{color:var(--text);font-size:14px}
    @media(max-width:400px){.tour{padding:16px}header{flex-wrap:wrap}#description{min-height:140px}#dots{display:none}}
    @media(prefers-reduced-motion:no-preference){#preview{animation:appear .18s ease-out}@keyframes appear{from{transform:translateY(4px);opacity:.5}to{transform:none;opacity:1}}}
  `;
  const main = document.createElement('div'); main.className='tour'; main.dataset.theme=settings.theme;
  main.dir=direction; main.lang=resolveLanguage(settings.language);
  // Markup is static; localized copy is assigned as text below.
  main.innerHTML='<header><span id="brand"></span><button id="skip" type="button"></button></header><section aria-labelledby="title"><div id="preview" aria-hidden="true"></div><p id="progress"></p><div aria-live="polite" aria-atomic="true"><h1 id="title"></h1><p id="description"></p></div></section><footer><button id="back" type="button"></button><div id="dots" aria-hidden="true"></div><button id="next" class="primary" type="button"></button></footer><p class="privacy"></p><p id="error" role="alert"></p>';
  shadow.append(style,main);
  const el = (id: string) => shadow.getElementById(id)!;
  const button = (id:string) => el(id) as HTMLButtonElement;
  const logo = document.createElement('span'); logo.innerHTML=getLucideSvg('chatgpt-audio'); logo.setAttribute('aria-hidden','true'); main.querySelector('header')!.prepend(logo);
  el('brand').textContent=copy.title;
  el('progress').dir='ltr';
  el('progress').style.textAlign=direction==='rtl'?'right':'left';
  button('skip').textContent=copy.skip;
  button('back').textContent=copy.back;
  main.querySelector('.privacy')!.textContent=r.privacyBody;
  let index=0, finishing=false;
  function render() {
    const step=steps[index];
    el('title').textContent=step.title; el('description').textContent=step.body;
    const number=new Intl.NumberFormat(main.lang);
    el('progress').textContent=`${number.format(index+1)} / ${number.format(steps.length)}`;
    el('preview').innerHTML=`<div class="demo-controls">${step.icons.map(name=>getLucideSvg(name)).join('')}</div>`;
    const caption=document.createElement('span'); caption.textContent=step.caption;
    if(index===1 || index===2) caption.dir='ltr'; el('preview').append(caption);
    el('dots').innerHTML=steps.map((_,i)=>`<span class="${i===index?'active':''}"></span>`).join('');
    button('back').disabled=index===0 || finishing;
    button('next').textContent=index===steps.length-1 ? (standalone ? r.dismiss : t.common.openChatGPT) : copy.next;
    button('next').disabled=finishing; button('skip').disabled=finishing;
  }
  async function complete(skipped:boolean) {
    if(finishing) return; finishing=true; render();
    try { await finish(skipped); }
    catch { finishing=false; render(); el('error').textContent=r.savedError; }
  }
  button('next').onclick=()=>{if(index<steps.length-1){index++;render();}else void complete(false);};
  button('back').onclick=()=>{if(index>0){index--;render();}};
  button('skip').onclick=()=>void complete(true);
  main.addEventListener('keydown',event=>{
    if(event.altKey || event.ctrlKey || event.metaKey || finishing) return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();void complete(true);}
    if(event.key===(direction==='rtl'?'ArrowLeft':'ArrowRight') && index<steps.length-1){event.preventDefault();index++;render();}
    if(event.key===(direction==='rtl'?'ArrowRight':'ArrowLeft') && index>0){event.preventDefault();index--;render();}
  });
  render(); button('next').focus();
}

export function openStandaloneTour(settings: ExtensionSettings): void {
  if(document.getElementById('cgpt-ra-tour')) return;
  const previous=document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const dialog=document.createElement('dialog'); dialog.id='cgpt-ra-tour';
  dialog.setAttribute('aria-label',tourCopy(settings.language).title);
  dialog.style.cssText='padding:0;border:0;border-radius:20px;width:min(600px,calc(100vw - 24px));max-height:calc(100dvh - 24px);background:transparent;';
  const root=document.createElement('div'); dialog.append(root); document.body.append(dialog);
  dialog.addEventListener('cancel',event=>event.preventDefault());
  dialog.addEventListener('close',()=>{dialog.remove();previous?.focus();},{once:true});
  dialog.showModal();
  mountTour(root,settings,async skipped=>{
    localStorage.setItem(TOUR_KEY,skipped?'skipped':'completed'); dialog.close();
  },true);
}
